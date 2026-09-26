package models

import (
	"time"

	"github.com/google/uuid"
)

type StoryHighlight struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"user_id"`
	Title      string    `json:"title"`
	CoverURL   string    `json:"cover_url"`
	StoryCount int       `json:"story_count,omitempty"`
	Stories    []Story   `json:"stories,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type CreateHighlightRequest struct {
	Title    string      `json:"title"`
	CoverURL string      `json:"cover_url"`
	StoryIDs []uuid.UUID `json:"story_ids"`
}

type UpdateHighlightRequest struct {
	Title    string `json:"title"`
	CoverURL string `json:"cover_url"`
}

type AddStoriesToHighlightRequest struct {
	StoryIDs []uuid.UUID `json:"story_ids"`
}
