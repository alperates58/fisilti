package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Story struct {
	ID              uuid.UUID       `json:"id"`
	UserID          uuid.UUID       `json:"user_id"`
	MediaType       string          `json:"media_type"` // "image", "video", "text", "audio"
	MediaURL        string          `json:"media_url"`
	Caption         string          `json:"caption"`
	BackgroundColor string          `json:"background_color"`
	MusicTitle      string          `json:"music_title"`
	MusicArtist     string          `json:"music_artist"`
	MusicURL        string          `json:"music_url"`
	Stickers        json.RawMessage `json:"stickers"`
	Views           []uuid.UUID     `json:"views"`
	ViewsCount      int             `json:"views_count"`
	HasViewed       bool            `json:"has_viewed"`
	ExpiresAt       time.Time       `json:"expires_at"`
	CreatedAt       time.Time       `json:"created_at"`
}

type UserStoriesGroup struct {
	User        UserStoryAuthor `json:"user"`
	Stories     []Story         `json:"stories"`
	HasUnviewed bool            `json:"has_unviewed"`
	LatestStory time.Time       `json:"latest_story"`
}

type UserStoryAuthor struct {
	ID          uuid.UUID `json:"id"`
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	AvatarURL   string    `json:"avatar_url"`
}

type CreateStoryRequest struct {
	MediaType       string          `json:"media_type"`
	MediaURL        string          `json:"media_url"`
	Caption         string          `json:"caption"`
	BackgroundColor string          `json:"background_color"`
	MusicTitle      string          `json:"music_title"`
	MusicArtist     string          `json:"music_artist"`
	MusicURL        string          `json:"music_url"`
	Stickers        json.RawMessage `json:"stickers"`
}
