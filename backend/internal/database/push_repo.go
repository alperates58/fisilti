package database

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type PushSubscription struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Endpoint  string    `json:"endpoint"`
	P256dh    string    `json:"p256dh"`
	Auth      string    `json:"auth"`
	UserAgent string    `json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`
}

type PushRepository struct {
	db *sql.DB
}

func NewPushRepository(db *sql.DB) *PushRepository {
	return &PushRepository{db: db}
}

func (r *PushRepository) SaveSubscription(ctx context.Context, userID uuid.UUID, endpoint, p256dh, auth, userAgent string) error {
	query := `
		INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (endpoint) DO UPDATE
		SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent, created_at = NOW()
	`
	_, err := r.db.ExecContext(ctx, query, userID, endpoint, p256dh, auth, userAgent)
	return err
}

func (r *PushRepository) DeleteSubscription(ctx context.Context, endpoint string) error {
	query := `DELETE FROM push_subscriptions WHERE endpoint = $1`
	_, err := r.db.ExecContext(ctx, query, endpoint)
	return err
}

func (r *PushRepository) GetSubscriptionsForUser(ctx context.Context, userID uuid.UUID) ([]PushSubscription, error) {
	query := `
		SELECT id, user_id, endpoint, p256dh, auth, user_agent, created_at
		FROM push_subscriptions
		WHERE user_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []PushSubscription
	for rows.Next() {
		var s PushSubscription
		if err := rows.Scan(&s.ID, &s.UserID, &s.Endpoint, &s.P256dh, &s.Auth, &s.UserAgent, &s.CreatedAt); err != nil {
			return nil, err
		}
		subs = append(subs, s)
	}
	return subs, nil
}
