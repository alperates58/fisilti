package handlers

import (
	"encoding/json"
	"strconv"

	"fisilti/internal/storage"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type MediaHandler struct {
	storage *storage.StorageService
}

func NewMediaHandler(storage *storage.StorageService) *MediaHandler {
	return &MediaHandler{storage: storage}
}

func (h *MediaHandler) UploadMedia(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uuid.UUID)

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Lütfen yüklenecek bir dosya seçin.",
		})
	}

	category := c.FormValue("category", "file") // voice, image, video, file
	durationStr := c.FormValue("duration", "0")
	waveformStr := c.FormValue("waveform", "")

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Dosya okunamadı.",
		})
	}
	defer file.Close()

	res, err := h.storage.UploadMedia(c.Context(), userID, file, fileHeader, category)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Süre ve dalga formu metadatasını ekle
	if duration, err := strconv.ParseFloat(durationStr, 64); err == nil && duration > 0 {
		res.Metadata["duration"] = duration
	}
	if waveformStr != "" {
		var wf []float64
		if err := json.Unmarshal([]byte(waveformStr), &wf); err == nil {
			res.Metadata["waveform"] = wf
		}
	}

	return c.JSON(res)
}
