package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

type SettingsRepository struct {
	db *sql.DB
}

func NewSettingsRepository(db *sql.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

func (r *SettingsRepository) GetAllSettings(ctx context.Context) (map[string]json.RawMessage, error) {
	rows, err := r.db.QueryContext(ctx, "SELECT key, value FROM system_settings")
	if err != nil {
		return nil, fmt.Errorf("ayarlar alinamadi: %w", err)
	}
	defer rows.Close()

	settings := make(map[string]json.RawMessage)
	for rows.Next() {
		var key string
		var val json.RawMessage
		if err := rows.Scan(&key, &val); err != nil {
			return nil, err
		}
		settings[key] = val
	}
	return settings, nil
}

func (r *SettingsRepository) GetSetting(ctx context.Context, key string) (json.RawMessage, error) {
	var val json.RawMessage
	err := r.db.QueryRowContext(ctx, "SELECT value FROM system_settings WHERE key = $1", key).Scan(&val)
	if err != nil {
		return nil, err
	}
	return val, nil
}

func (r *SettingsRepository) UpdateSetting(ctx context.Context, key string, value json.RawMessage) error {
	query := `
		INSERT INTO system_settings (key, value, updated_at)
		VALUES ($1, $2::jsonb, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
	`
	_, err := r.db.ExecContext(ctx, query, key, string(value))
	return err
}
