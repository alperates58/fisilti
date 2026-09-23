package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"fisilti/internal/models"
	"github.com/google/uuid"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) CreateUser(ctx context.Context, u *models.User) error {
	query := `
		INSERT INTO users (username, display_name, email, password_hash, avatar_url, bio, online_status, privacy_settings, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	if len(u.PrivacySettings) == 0 {
		defaultPrivacy, _ := json.Marshal(models.DefaultPrivacySettings())
		u.PrivacySettings = defaultPrivacy
	}

	err := r.db.QueryRowContext(ctx, query,
		strings.ToLower(strings.TrimSpace(u.Username)),
		strings.TrimSpace(u.DisplayName),
		strings.ToLower(strings.TrimSpace(u.Email)),
		u.PasswordHash,
		u.AvatarURL,
		u.Bio,
		u.OnlineStatus,
		u.PrivacySettings,
	).Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)

	if err != nil {
		return fmt.Errorf("kullanici olusturulamadi: %w", err)
	}
	return nil
}

func (r *UserRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	query := `
		SELECT id, username, display_name, email, password_hash, avatar_url, bio, online_status, last_seen_at, privacy_settings, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	var u models.User
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&u.ID, &u.Username, &u.DisplayName, &u.Email, &u.PasswordHash,
		&u.AvatarURL, &u.Bio, &u.OnlineStatus, &u.LastSeenAt,
		&u.PrivacySettings, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("kullanici getirilemedi: %w", err)
	}
	return &u, nil
}

func (r *UserRepository) GetUserByLogin(ctx context.Context, login string) (*models.User, error) {
	cleanLogin := strings.ToLower(strings.TrimSpace(login))
	query := `
		SELECT id, username, display_name, email, password_hash, avatar_url, bio, online_status, last_seen_at, privacy_settings, created_at, updated_at
		FROM users
		WHERE LOWER(username) = $1 OR LOWER(email) = $1
		LIMIT 1
	`
	var u models.User
	err := r.db.QueryRowContext(ctx, query, cleanLogin).Scan(
		&u.ID, &u.Username, &u.DisplayName, &u.Email, &u.PasswordHash,
		&u.AvatarURL, &u.Bio, &u.OnlineStatus, &u.LastSeenAt,
		&u.PrivacySettings, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("kullanici bulunamadi: %w", err)
	}
	return &u, nil
}

func (r *UserRepository) CheckUserExists(ctx context.Context, username, email string) (bool, string, error) {
	var existingUsername, existingEmail string

	cleanUsername := strings.ToLower(strings.TrimSpace(username))
	cleanEmail := strings.ToLower(strings.TrimSpace(email))

	query := `
		SELECT username, email FROM users
		WHERE LOWER(username) = $1 OR LOWER(email) = $2
		LIMIT 1
	`
	err := r.db.QueryRowContext(ctx, query, cleanUsername, cleanEmail).Scan(&existingUsername, &existingEmail)
	if errors.Is(err, sql.ErrNoRows) {
		return false, "", nil
	}
	if err != nil {
		return false, "", err
	}

	if strings.EqualFold(existingUsername, cleanUsername) {
		return true, "Bu kullanıcı adı zaten kullanımda.", nil
	}
	return true, "Bu e-posta adresi zaten kayıtlı.", nil
}

func (r *UserRepository) UpdateProfile(ctx context.Context, userID uuid.UUID, displayName, bio string) error {
	query := `
		UPDATE users
		SET display_name = $1, bio = $2, updated_at = NOW()
		WHERE id = $3
	`
	_, err := r.db.ExecContext(ctx, query, strings.TrimSpace(displayName), strings.TrimSpace(bio), userID)
	return err
}

func (r *UserRepository) UpdateAvatar(ctx context.Context, userID uuid.UUID, avatarURL string) error {
	query := `
		UPDATE users
		SET avatar_url = $1, updated_at = NOW()
		WHERE id = $2
	`
	_, err := r.db.ExecContext(ctx, query, avatarURL, userID)
	return err
}

func (r *UserRepository) UpdatePrivacy(ctx context.Context, userID uuid.UUID, settings models.PrivacySettings) error {
	data, err := json.Marshal(settings)
	if err != nil {
		return err
	}
	query := `
		UPDATE users
		SET privacy_settings = $1, updated_at = NOW()
		WHERE id = $2
	`
	_, err = r.db.ExecContext(ctx, query, data, userID)
	return err
}

func (r *UserRepository) UpdateOnlineStatus(ctx context.Context, userID uuid.UUID, status int) error {
	query := `
		UPDATE users
		SET online_status = $1, last_seen_at = NOW(), updated_at = NOW()
		WHERE id = $2
	`
	_, err := r.db.ExecContext(ctx, query, status, userID)
	return err
}

func (r *UserRepository) SearchUsers(ctx context.Context, search string, excludeUserID uuid.UUID, limit int) ([]models.UserResponse, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	cleanSearch := "%" + strings.ToLower(strings.TrimSpace(search)) + "%"
	query := `
		SELECT id, username, display_name, email, avatar_url, bio, online_status, last_seen_at, privacy_settings, created_at
		FROM users
		WHERE id != $1 AND (LOWER(username) LIKE $2 OR LOWER(display_name) LIKE $2)
		ORDER BY display_name ASC
		LIMIT $3
	`

	rows, err := r.db.QueryContext(ctx, query, excludeUserID, cleanSearch, limit)
	if err != nil {
		return nil, fmt.Errorf("kullanici aranamadi: %w", err)
	}
	defer rows.Close()

	var results []models.UserResponse
	for rows.Next() {
		var u models.UserResponse
		if err := rows.Scan(
			&u.ID, &u.Username, &u.DisplayName, &u.Email, &u.AvatarURL, &u.Bio,
			&u.OnlineStatus, &u.LastSeenAt, &u.PrivacySettings, &u.CreatedAt,
		); err != nil {
			return nil, err
		}
		results = append(results, u)
	}

	if results == nil {
		results = []models.UserResponse{}
	}
	return results, nil
}
