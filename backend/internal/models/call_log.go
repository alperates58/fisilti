package models

import (
	"time"

	"github.com/google/uuid"
)

type CallLog struct {
	ID              uuid.UUID  `json:"id"`
	ConversationID  uuid.UUID  `json:"conversation_id"`
	CallerID        uuid.UUID  `json:"caller_id"`
	ReceiverID      uuid.UUID  `json:"receiver_id"`
	CallType        string     `json:"call_type"` // "audio", "video"
	Status          string     `json:"status"`    // "missed", "rejected", "completed", "busy"
	StartedAt       *time.Time `json:"started_at,omitempty"`
	EndedAt         *time.Time `json:"ended_at,omitempty"`
	DurationSeconds int        `json:"duration_seconds"`
	CreatedAt       time.Time  `json:"created_at"`
}

type CallLogResponse struct {
	ID              uuid.UUID `json:"id"`
	ConversationID  uuid.UUID `json:"conversation_id"`
	CallerID        uuid.UUID `json:"caller_id"`
	ReceiverID      uuid.UUID `json:"receiver_id"`
	CallType        string    `json:"call_type"`
	Status          string    `json:"status"`
	DurationSeconds int       `json:"duration_seconds"`
	IsCaller        bool      `json:"is_caller"`
	CreatedAt       string    `json:"created_at"`
}
