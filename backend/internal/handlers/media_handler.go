package handlers

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"fisilti/internal/preview"
	"fisilti/internal/storage"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
)

type MediaHandler struct {
	storage *storage.StorageService
	preview *preview.PreviewService
}

func NewMediaHandler(storage *storage.StorageService, preview *preview.PreviewService) *MediaHandler {
	return &MediaHandler{
		storage: storage,
		preview: preview,
	}
}

func (h *MediaHandler) GetLinkPreview(c *fiber.Ctx) error {
	rawURL := strings.TrimSpace(c.Query("url"))
	if rawURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Lütfen geçerli bir url parametresi belirtin.",
		})
	}

	if h.preview == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Önizleme servisi hazır değil.",
		})
	}

	meta, err := h.preview.GetLinkPreview(c.Context(), rawURL)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(meta)
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

func (h *MediaHandler) GetMediaFile(c *fiber.Ctx) error {
	bucket := c.Params("bucket")
	objectName := c.Params("*")
	if bucket == "" || objectName == "" {
		return c.Status(fiber.StatusBadRequest).SendString("Geçersiz medya yolu")
	}

	rangeHeader := c.Get("Range")
	var opts minio.GetObjectOptions

	var start, end int64 = -1, -1
	if rangeHeader != "" && strings.HasPrefix(rangeHeader, "bytes=") {
		parts := strings.Split(strings.TrimPrefix(rangeHeader, "bytes="), "-")
		if len(parts) >= 1 && parts[0] != "" {
			if s, err := strconv.ParseInt(parts[0], 10, 64); err == nil {
				start = s
			}
		}
		if len(parts) >= 2 && parts[1] != "" {
			if e, err := strconv.ParseInt(parts[1], 10, 64); err == nil {
				end = e
			}
		}
		if start >= 0 {
			if end >= 0 {
				_ = opts.SetRange(start, end)
			} else {
				_ = opts.SetRange(start, 0)
			}
		}
	}

	obj, info, err := h.storage.GetObject(c.Context(), bucket, objectName, opts)
	if err != nil {
		return c.Status(fiber.StatusNotFound).SendString("Dosya bulunamadı")
	}

	contentType := info.ContentType
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	c.Set("Content-Type", contentType)
	c.Set("Accept-Ranges", "bytes")
	c.Set("Access-Control-Allow-Origin", "*")
	c.Set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
	c.Set("Access-Control-Allow-Headers", "Range, Accept, Content-Type")
	c.Set("Cache-Control", "public, max-age=31536000, immutable")

	if start >= 0 {
		actualEnd := info.Size - 1
		if end >= 0 && end < info.Size {
			actualEnd = end
		}
		contentLength := actualEnd - start + 1
		c.Status(fiber.StatusPartialContent)
		c.Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, actualEnd, info.Size))
		c.Set("Content-Length", strconv.FormatInt(contentLength, 10))
		return c.SendStream(obj, int(contentLength))
	}

	c.Status(fiber.StatusOK)
	c.Set("Content-Length", strconv.FormatInt(info.Size, 10))
	return c.SendStream(obj, int(info.Size))
}
