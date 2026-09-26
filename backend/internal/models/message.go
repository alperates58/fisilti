package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Message struct {
	ID               uuid.UUID       `json:"id"`
	ConversationID   uuid.UUID       `json:"conversation_id"`
	SenderID         uuid.UUID       `json:"sender_id"`
	RecipientID      uuid.UUID       `json:"recipient_id"`
	ReplyToID        *uuid.UUID      `json:"reply_to_id,omitempty"`
	MessageType      string          `json:"message_type"` // 'text', 'voice', 'image', 'video', 'file', 'call_log'
	Content          string          `json:"content"`
	MediaURL         string          `json:"media_url"`
	MediaMetadata    json.RawMessage `json:"media_metadata"`
	SentAt           time.Time       `json:"sent_at"`
	DeliveredAt      *time.Time      `json:"delivered_at,omitempty"`
	ReadAt           *time.Time      `json:"read_at,omitempty"`
	IsEdited         bool            `json:"is_edited"`
	IsStarred        bool            `json:"is_starred"`
	IsDeletedForAll  bool            `json:"is_deleted_for_all"`
	DeletedForUsers  []uuid.UUID     `json:"deleted_for_users"`
	Reactions        json.RawMessage `json:"reactions"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

type MessageResponse struct {
	ID              uuid.UUID        `json:"id"`
	ConversationID  uuid.UUID        `json:"conversation_id"`
	SenderID        uuid.UUID        `json:"sender_id"`
	RecipientID     uuid.UUID        `json:"recipient_id"`
	ReplyToID       *uuid.UUID       `json:"reply_to_id,omitempty"`
	ReplyToMessage  *MessageResponse `json:"reply_to_message,omitempty"`
	MessageType     string           `json:"message_type"`
	Content         string           `json:"content"`
	MediaURL        string           `json:"media_url"`
	MediaMetadata   json.RawMessage  `json:"media_metadata"`
	SentAt          time.Time        `json:"sent_at"`
	DeliveredAt     *time.Time       `json:"delivered_at,omitempty"`
	ReadAt          *time.Time       `json:"read_at,omitempty"`
	TickStatus      string           `json:"tick_status"` // "sent", "delivered", "read"
	IsMine          bool             `json:"is_mine"`
	IsEdited        bool             `json:"is_edited"`
	IsStarred       bool             `json:"is_starred"`
	IsDeletedForAll bool             `json:"is_deleted_for_all"`
	Reactions       json.RawMessage  `json:"reactions"`
	CreatedAt       time.Time        `json:"created_at"`
}

func (m *Message) ToResponse(currentUserID uuid.UUID) MessageResponse {
	// WhatsApp Tik Durumunun Belirlenmesi:
	tickStatus := "sent"
	if m.ReadAt != nil {
		tickStatus = "read" // Çift Mavi Tik
	} else if m.DeliveredAt != nil {
		tickStatus = "delivered" // Çift Gri Tik
	}

	content := m.Content
	if m.IsDeletedForAll {
		content = "Bu mesaj silindi."
	}

	return MessageResponse{
		ID:              m.ID,
		ConversationID:  m.ConversationID,
		SenderID:        m.SenderID,
		RecipientID:     m.RecipientID,
		ReplyToID:       m.ReplyToID,
		MessageType:     m.MessageType,
		Content:         content,
		MediaURL:        m.MediaURL,
		MediaMetadata:   m.MediaMetadata,
		SentAt:          m.SentAt,
		DeliveredAt:     m.DeliveredAt,
		ReadAt:          m.ReadAt,
		TickStatus:      tickStatus,
		IsMine:          m.SenderID == currentUserID,
		IsEdited:        m.IsEdited,
		IsStarred:       m.IsStarred,
		IsDeletedForAll: m.IsDeletedForAll,
		Reactions:       m.Reactions,
		CreatedAt:       m.CreatedAt,
	}
}

// WhatsApp Tarzı "Mesaj Bilgisi" Detay Yapısı
type MessageInfoResponse struct {
	MessageID   uuid.UUID  `json:"message_id"`
	SentAt      time.Time  `json:"sent_at"`
	DeliveredAt *time.Time `json:"delivered_at"`
	ReadAt      *time.Time `json:"read_at"`
}

type DeleteMessagesBatchRequest struct {
	ConversationID uuid.UUID   `json:"conversation_id"`
	MessageIDs     []uuid.UUID `json:"message_ids"`
	ForAll         bool        `json:"for_all"`
}
