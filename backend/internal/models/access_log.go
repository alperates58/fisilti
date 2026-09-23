package models

import (
	"time"

	"github.com/google/uuid"
)

type AccessLog struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"user_id"`
	IPAddress  string    `json:"ip_address"`
	UserAgent  string    `json:"user_agent"`
	DeviceInfo string    `json:"device_info"`
	CreatedAt  time.Time `json:"created_at"`
}

type AccessLogWithUser struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	AvatarURL   string    `json:"avatar_url"`
	IPAddress   string    `json:"ip_address"`
	UserAgent   string    `json:"user_agent"`
	DeviceInfo  string    `json:"device_info"`
	CreatedAt   time.Time `json:"created_at"`
}
