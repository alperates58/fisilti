package handlers

import (
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"fisilti/internal/database"
	"fisilti/internal/models"
	fisiltiredis "fisilti/internal/redis"
	"fisilti/internal/storage"
	fisiltiws "fisilti/internal/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ChatHandler struct {
	chatRepo        *database.ChatRepository
	userRepo        *database.UserRepository
	presenceService *fisiltiredis.PresenceService
	storage         *storage.StorageService
	hub             *fisiltiws.Hub
}

func NewChatHandler(
	chatRepo *database.ChatRepository,
	userRepo *database.UserRepository,
	presenceService *fisiltiredis.PresenceService,
	storage *storage.StorageService,
	hub *fisiltiws.Hub,
) *ChatHandler {
	return &ChatHandler{
		chatRepo:        chatRepo,
		userRepo:        userRepo,
		presenceService: presenceService,
		storage:         storage,
		hub:             hub,
	}
}

func (h *ChatHandler) StartConversation(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	var req models.StartConversationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Geçersiz istek formatı.",
		})
	}

	if req.RecipientID == userID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Kendinizle sohbet başlatamazsınız.",
		})
	}

	otherUser, err := h.userRepo.GetUserByID(c.Context(), req.RecipientID)
	if err != nil || otherUser == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Sohbet başlatılacak kullanıcı bulunamadı.",
		})
	}

	conv, err := h.chatRepo.GetOrCreateConversation(c.Context(), userID, req.RecipientID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Sohbet oluşturulamadı.",
		})
	}

	isOnline := h.presenceService.IsUserOnline(c.Context(), otherUser.ID)

	return c.JSON(models.ConversationResponse{
		ID:          conv.ID,
		OtherUser:   otherUser.ToResponse(),
		UnreadCount: 0,
		IsOnline:    isOnline,
		IsBlocked:   conv.IsBlocked,
		CreatedAt:   conv.CreatedAt,
		UpdatedAt:   conv.UpdatedAt,
	})
}

func (h *ChatHandler) GetConversations(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	convs, err := h.chatRepo.GetUserConversations(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Konuşmalar listelenemedi.",
		})
	}

	for i := range convs {
		isOnline := h.presenceService.IsUserOnline(c.Context(), convs[i].OtherUser.ID)
		convs[i].IsOnline = isOnline
		if isOnline {
			convs[i].OtherUser.OnlineStatus = 1
		} else {
			convs[i].OtherUser.OnlineStatus = 0
		}
	}

	return c.JSON(convs)
}

func (h *ChatHandler) GetMessages(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	convID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz konuşma ID."})
	}

	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	var beforeTime *time.Time
	if beforeStr := c.Query("before"); beforeStr != "" {
		if t, err := time.Parse(time.RFC3339, beforeStr); err == nil {
			beforeTime = &t
		}
	}

	messages, err := h.chatRepo.GetMessages(c.Context(), convID, userID, limit, beforeTime)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Mesajlar getirilemedi.",
		})
	}

	return c.JSON(messages)
}

func (h *ChatHandler) ClearHistory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	convID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz konuşma ID."})
	}

	if err := h.chatRepo.ClearConversationHistory(c.Context(), convID, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Sohbet geçmişi temizlenemedi.",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Sohbet geçmişi başarıyla temizlendi.",
	})
}

func (h *ChatHandler) GetMessageInfo(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	msgID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz mesaj ID."})
	}

	info, err := h.chatRepo.GetMessageInfo(c.Context(), msgID, userID)
	if err != nil || info == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Mesaj bilgisi bulunamadı."})
	}

	return c.JSON(info)
}

func (h *ChatHandler) EditMessage(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	msgID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz mesaj ID."})
	}

	var req struct {
		Content string `json:"content"`
	}
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Content) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Mesaj içeriği boş olamaz."})
	}

	if err := h.chatRepo.EditMessage(c.Context(), msgID, userID, strings.TrimSpace(req.Content)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// WebSocket ile karşı tarafa mesaj düzenleme bildirimi bas
	msg, _ := h.chatRepo.GetMessageByID(c.Context(), msgID)
	if msg != nil {
		editPayload, _ := fisiltiws.NewWSMessage("message_edited", fiber.Map{
			"message_id": msgID,
			"content":    req.Content,
		})
		h.hub.SendToUser(msg.RecipientID, editPayload)
		h.hub.SendToUser(msg.SenderID, editPayload)
	}

	return c.JSON(fiber.Map{"message": "Mesaj başarıyla düzenlendi."})
}

func (h *ChatHandler) DeleteMessage(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	msgID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz mesaj ID."})
	}

	deleteType := c.Query("type", "for_me") // "for_me" veya "for_all"

	if deleteType == "for_all" {
		deletedMsg, err := h.chatRepo.DeleteMessageForAll(c.Context(), msgID, userID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}

		// MinIO'daki dosyayı sil
		if deletedMsg.MediaURL != "" {
			_ = h.storage.DeleteMedia(c.Context(), deletedMsg.MediaURL)
		}

		// WebSocket ile iki tarafa da anında silindi bildirimi bas
		delPayload, _ := fisiltiws.NewWSMessage("message_deleted", fiber.Map{
			"message_id":         msgID,
			"conversation_id":    deletedMsg.ConversationID,
			"is_deleted_for_all": true,
		})
		h.hub.SendToUser(deletedMsg.RecipientID, delPayload)
		h.hub.SendToUser(deletedMsg.SenderID, delPayload)

		return c.JSON(fiber.Map{"message": "Mesaj herkesten silindi."})
	}

	// Sadece benden sil
	if err := h.chatRepo.DeleteMessageForMe(c.Context(), msgID, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Mesaj silinemedi."})
	}

	return c.JSON(fiber.Map{"message": "Mesaj sizden silindi."})
}

func (h *ChatHandler) ToggleReaction(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	msgID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz mesaj ID."})
	}

	var req struct {
		Emoji string `json:"emoji"`
	}
	if err := c.BodyParser(&req); err != nil || req.Emoji == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Lütfen geçerli bir emoji belirtin."})
	}

	reactions, err := h.chatRepo.ToggleReaction(c.Context(), msgID, userID, req.Emoji)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	msg, _ := h.chatRepo.GetMessageByID(c.Context(), msgID)
	if msg != nil {
		rxPayload, _ := fisiltiws.NewWSMessage("message_reaction", fiber.Map{
			"message_id": msgID,
			"reactions":  reactions,
		})
		h.hub.SendToUser(msg.RecipientID, rxPayload)
		h.hub.SendToUser(msg.SenderID, rxPayload)
	}

	return c.JSON(fiber.Map{
		"message":   "Reaksiyon güncellendi.",
		"reactions": reactions,
	})
}

func (h *ChatHandler) ToggleStar(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	msgID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz mesaj ID."})
	}

	starred, err := h.chatRepo.ToggleStar(c.Context(), msgID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "İşlem başarısız."})
	}

	return c.JSON(fiber.Map{"is_starred": starred})
}

// Unused warning prevention
var _ = json.Marshal
