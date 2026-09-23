package cron

import (
	"context"
	"database/sql"
	"log"
	"time"

	"fisilti/internal/storage"
	fisiltiws "fisilti/internal/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ExpiredMessagesCleaner struct {
	db      *sql.DB
	storage *storage.StorageService
	hub     *fisiltiws.Hub
}

func NewExpiredMessagesCleaner(db *sql.DB, storage *storage.StorageService, hub *fisiltiws.Hub) *ExpiredMessagesCleaner {
	return &ExpiredMessagesCleaner{
		db:      db,
		storage: storage,
		hub:     hub,
	}
}

func (c *ExpiredMessagesCleaner) Start(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		log.Printf("🧹 [Cleaner] Süresi dolan mesajları temizleme servisi başlatıldı (Aralık: %v).", interval)
		for {
			select {
			case <-ctx.Done():
				ticker.Stop()
				log.Println("🛑 [Cleaner] Temizleme servisi durduruldu.")
				return
			case <-ticker.C:
				c.cleanupExpiredMessages(ctx)
			}
		}
	}()
}

func (c *ExpiredMessagesCleaner) cleanupExpiredMessages(ctx context.Context) {
	query := `
		SELECT id, conversation_id, sender_id, recipient_id, media_url
		FROM messages
		WHERE expires_at IS NOT NULL AND expires_at <= NOW()
		LIMIT 100
	`
	rows, err := c.db.QueryContext(ctx, query)
	if err != nil {
		log.Printf("⚠️ [Cleaner] Süresi dolan mesajlar sorgulanamadı: %v", err)
		return
	}
	defer rows.Close()

	type ExpiredItem struct {
		ID             uuid.UUID
		ConversationID uuid.UUID
		SenderID       uuid.UUID
		RecipientID    uuid.UUID
		MediaURL       string
	}

	var items []ExpiredItem
	for rows.Next() {
		var item ExpiredItem
		if err := rows.Scan(&item.ID, &item.ConversationID, &item.SenderID, &item.RecipientID, &item.MediaURL); err == nil {
			items = append(items, item)
		}
	}

	if len(items) == 0 {
		return
	}

	log.Printf("🧹 [Cleaner] %d adet süresi dolan mesaj temizleniyor...", len(items))

	for _, item := range items {
		// MinIO'daki dosyayı sil
		if item.MediaURL != "" {
			_ = c.storage.DeleteMedia(ctx, item.MediaURL)
		}

		// Veritabanından sil
		_, _ = c.db.ExecContext(ctx, "DELETE FROM messages WHERE id = $1", item.ID)

		// WebSocket ile istemcilere silindi bildir
		delPayload, _ := fisiltiws.NewWSMessage("message_deleted", fiber.Map{
			"message_id":         item.ID,
			"conversation_id":    item.ConversationID,
			"is_deleted_for_all": false,
		})
		c.hub.SendToUser(item.SenderID, delPayload)
		c.hub.SendToUser(item.RecipientID, delPayload)
	}
}
