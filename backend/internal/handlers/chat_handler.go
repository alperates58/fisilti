package handlers

import (
	"strconv"
	"time"

	"fisilti/internal/database"
	"fisilti/internal/models"
	fisiltiredis "fisilti/internal/redis"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ChatHandler struct {
	chatRepo        *database.ChatRepository
	userRepo        *database.UserRepository
	presenceService *fisiltiredis.PresenceService
}

func NewChatHandler(
	chatRepo *database.ChatRepository,
	userRepo *database.UserRepository,
	presenceService *fisiltiredis.PresenceService,
) *ChatHandler {
	return &ChatHandler{
		chatRepo:        chatRepo,
		userRepo:        userRepo,
		presenceService: presenceService,
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

	// Her konuşma için anlık Redis çevrimiçi durumunu doldur
	for i := range convs {
		convs[i].IsOnline = h.presenceService.IsUserOnline(c.Context(), convs[i].OtherUser.ID)
	}

	return c.JSON(convs)
}

func (h *ChatHandler) GetMessages(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)
	convID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz konuşma ID."})
	}

	limit, _ := strconv.Atoi(c.Query("limit", "30"))
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
