package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type PrivacySettings struct {
	ReadReceipts bool `json:"read_receipts"` // Mavi tik açık/kapalı
	LastSeen     bool `json:"last_seen"`     // Son görülme açık/kapalı
	AllowCalls   bool `json:"allow_calls"`   // Gelen arama izni
}

func DefaultPrivacySettings() PrivacySettings {
	return PrivacySettings{
		ReadReceipts: true,
		LastSeen:     true,
		AllowCalls:   true,
	}
}

type User struct {
	ID              uuid.UUID       `json:"id"`
	Username        string          `json:"username"`
	DisplayName     string          `json:"display_name"`
	Email           string          `json:"email"`
	PasswordHash    string          `json:"-"` // Asla JSON çıktısına verilmez
	AvatarURL       string          `json:"avatar_url"`
	Bio             string          `json:"bio"`
	OnlineStatus    int             `json:"online_status"` // 0: Offline, 1: Online, 2: Away
	LastSeenAt      time.Time       `json:"last_seen_at"`
	PrivacySettings json.RawMessage `json:"privacy_settings"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

type UserResponse struct {
	ID              uuid.UUID       `json:"id"`
	Username        string          `json:"username"`
	DisplayName     string          `json:"display_name"`
	Email           string          `json:"email"`
	AvatarURL       string          `json:"avatar_url"`
	Bio             string          `json:"bio"`
	OnlineStatus    int             `json:"online_status"`
	LastSeenAt      time.Time       `json:"last_seen_at"`
	PrivacySettings json.RawMessage `json:"privacy_settings"`
	CreatedAt       time.Time       `json:"created_at"`
}

func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:              u.ID,
		Username:        u.Username,
		DisplayName:     u.DisplayName,
		Email:           u.Email,
		AvatarURL:       u.AvatarURL,
		Bio:             u.Bio,
		OnlineStatus:    u.OnlineStatus,
		LastSeenAt:      u.LastSeenAt,
		PrivacySettings: u.PrivacySettings,
		CreatedAt:       u.CreatedAt,
	}
}

type RegisterRequest struct {
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Email       string `json:"email"`
	Password    string `json:"password"`
}

type LoginRequest struct {
	Login    string `json:"login"` // Username veya Email
	Password string `json:"password"`
}

type UpdateProfileRequest struct {
	DisplayName string `json:"display_name"`
	Bio         string `json:"bio"`
}

type UpdatePrivacyRequest struct {
	ReadReceipts *bool `json:"read_receipts,omitempty"`
	LastSeen     *bool `json:"last_seen,omitempty"`
	AllowCalls   *bool `json:"allow_calls,omitempty"`
}

type AuthResponse struct {
	User        UserResponse `json:"user"`
	AccessToken string       `json:"access_token,omitempty"`
}
