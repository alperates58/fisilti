package handlers

import (
	"fisilti/internal/database"
	"fisilti/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type StoryHandler struct {
	storyRepo *database.StoryRepository
	userRepo  *database.UserRepository
}

func NewStoryHandler(storyRepo *database.StoryRepository, userRepo *database.UserRepository) *StoryHandler {
	return &StoryHandler{
		storyRepo: storyRepo,
		userRepo:  userRepo,
	}
}

// GetActiveStories - 24 saatlik aktif hikayeleri kullanıcı bazlı gruplanmış olarak döner
func (h *StoryHandler) GetActiveStories(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	groups, err := h.storyRepo.GetActiveStories(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"story_groups": groups})
}

// CreateStory - Yeni hikaye paylaşır (fotoğraf, video, ses, müzik, çıkartma)
func (h *StoryHandler) CreateStory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	var req models.CreateStoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz hikaye verisi."})
	}

	if req.MediaType == "" {
		req.MediaType = "image"
	}
	if req.BackgroundColor == "" {
		req.BackgroundColor = "from-pink-900 to-slate-950"
	}

	durationSec := req.DurationSeconds
	if durationSec <= 0 {
		durationSec = 10
	}

	story := &models.Story{
		UserID:          userID,
		MediaType:       req.MediaType,
		MediaURL:        req.MediaURL,
		Caption:         req.Caption,
		BackgroundColor: req.BackgroundColor,
		MusicTitle:      req.MusicTitle,
		MusicArtist:     req.MusicArtist,
		MusicURL:        req.MusicURL,
		DurationSeconds: durationSec,
		MusicStart:      req.MusicStart,
		MusicEnd:        req.MusicEnd,
		Stickers:        req.Stickers,
	}

	if err := h.storyRepo.CreateStory(c.Context(), story); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(story)
}

// MarkStoryViewed - Hikayeyi görüldü olarak işaretler
func (h *StoryHandler) MarkStoryViewed(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	storyIDStr := c.Params("id")
	storyID, err := uuid.Parse(storyIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz hikaye ID'si."})
	}

	if err := h.storyRepo.MarkStoryViewed(c.Context(), storyID, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "ok"})
}

// GetStoryViewers - Hikayeyi görenlerin listesini döner (Yalnızca hikaye sahibi görebilir)
func (h *StoryHandler) GetStoryViewers(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	storyIDStr := c.Params("id")
	storyID, err := uuid.Parse(storyIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz hikaye ID'si."})
	}

	viewers, err := h.storyRepo.GetStoryViewers(c.Context(), storyID, userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Görüntüleme yetkiniz yok."})
	}

	return c.JSON(fiber.Map{"viewers": viewers})
}

// DeleteStory - Hikayeyi siler (Sahibi veya Admin silebilir)
func (h *StoryHandler) DeleteStory(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	storyIDStr := c.Params("id")
	storyID, err := uuid.Parse(storyIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz hikaye ID'si."})
	}

	isAdmin := false
	if u, err := h.userRepo.GetUserByID(c.Context(), userID); err == nil && u != nil {
		isAdmin = (u.Role == "admin")
	}

	if err := h.storyRepo.DeleteStory(c.Context(), storyID, userID, isAdmin); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "deleted"})
}
