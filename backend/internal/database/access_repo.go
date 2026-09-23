package database

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"fisilti/internal/models"
	"github.com/google/uuid"
)

type AccessRepository struct {
	db *sql.DB
}

func NewAccessRepository(db *sql.DB) *AccessRepository {
	return &AccessRepository{db: db}
}

func (r *AccessRepository) LogAccess(ctx context.Context, userID uuid.UUID, ipAddress, userAgent string) error {
	deviceInfo := ParseUserAgent(userAgent)

	query := `
		INSERT INTO access_logs (user_id, ip_address, user_agent, device_info, created_at)
		VALUES ($1, $2, $3, $4, NOW())
	`
	_, err := r.db.ExecContext(ctx, query, userID, ipAddress, userAgent, deviceInfo)
	return err
}

func (r *AccessRepository) GetUserAccessLogs(ctx context.Context, userID uuid.UUID, limit int) ([]models.AccessLog, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	query := `
		SELECT id, user_id, ip_address, user_agent, device_info, created_at
		FROM access_logs
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("erisim kayitlari sorgulanamadi: %w", err)
	}
	defer rows.Close()

	var logs []models.AccessLog
	for rows.Next() {
		var l models.AccessLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.IPAddress, &l.UserAgent, &l.DeviceInfo, &l.CreatedAt); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}

	if logs == nil {
		logs = []models.AccessLog{}
	}
	return logs, nil
}

func ParseUserAgent(ua string) string {
	lower := strings.ToLower(ua)

	// İşletim sistemi tespiti
	os := "Bilinmeyen Cihaz"
	if strings.Contains(lower, "iphone") {
		os = "Apple iPhone"
	} else if strings.Contains(lower, "ipad") {
		os = "Apple iPad"
	} else if strings.Contains(lower, "android") {
		os = "Android Cihaz"
	} else if strings.Contains(lower, "windows") {
		os = "Windows PC"
	} else if strings.Contains(lower, "macintosh") || strings.Contains(lower, "mac os") {
		os = "Apple Mac"
	} else if strings.Contains(lower, "linux") {
		os = "Linux PC"
	}

	// Tarayıcı tespiti
	browser := ""
	if strings.Contains(lower, "edg") {
		browser = "Edge"
	} else if strings.Contains(lower, "chrome") && !strings.Contains(lower, "edg") {
		browser = "Chrome"
	} else if strings.Contains(lower, "safari") && !strings.Contains(lower, "chrome") {
		browser = "Safari"
	} else if strings.Contains(lower, "firefox") {
		browser = "Firefox"
	}

	if browser != "" {
		return fmt.Sprintf("%s (%s)", os, browser)
	}
	return os
}
