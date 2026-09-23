package handlers

import (
	"net/mail"
	"regexp"
	"strings"
	"time"

	"fisilti/internal/config"
	"fisilti/internal/database"
	"fisilti/internal/middleware"
	"fisilti/internal/models"
	fisiltiredis "fisilti/internal/redis"
	fisiltiws "fisilti/internal/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,30}$`)

type AuthHandler struct {
	cfg             config.Config
	userRepo        *database.UserRepository
	presenceService *fisiltiredis.PresenceService
	hub             *fisiltiws.Hub
}

func NewAuthHandler(
	cfg config.Config,
	userRepo *database.UserRepository,
	presenceService *fisiltiredis.PresenceService,
	hub *fisiltiws.Hub,
) *AuthHandler {
	return &AuthHandler{
		cfg:             cfg,
		userRepo:        userRepo,
		presenceService: presenceService,
		hub:             hub,
	}
}

func (h *AuthHandler) setAuthCookies(c *fiber.Ctx, accessToken, refreshToken string) {
	isSecure := h.cfg.Environment == "production"

	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Expires:  time.Now().Add(time.Duration(h.cfg.JWTAccessExpiryMin) * time.Minute),
		HTTPOnly: true,
		Secure:   isSecure,
		SameSite: "Lax",
		Path:     "/",
	})

	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Expires:  time.Now().Add(time.Duration(h.cfg.JWTRefreshExpiryDays) * 24 * time.Hour),
		HTTPOnly: true,
		Secure:   isSecure,
		SameSite: "Lax",
		Path:     "/",
	})
}

func (h *AuthHandler) clearAuthCookies(c *fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Path:     "/",
	})
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Path:     "/",
	})
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Geçersiz istek formatı.",
		})
	}

	req.Username = strings.TrimSpace(req.Username)
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	// Doğrulamalar
	if !usernameRegex.MatchString(req.Username) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Kullanıcı adı 3-30 karakter uzunluğunda olmalı ve sadece harf, rakam veya alt çizgi içermelidir.",
		})
	}

	if req.DisplayName == "" {
		req.DisplayName = req.Username
	}

	if _, err := mail.ParseAddress(req.Email); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Lütfen geçerli bir e-posta adresi girin.",
		})
	}

	if len(req.Password) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Şifreniz en az 6 karakter olmalıdır.",
		})
	}

	// Benzersizlik denetimi
	exists, msg, err := h.userRepo.CheckUserExists(c.Context(), req.Username, req.Email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Veritabanı kontrolü başarısız.",
		})
	}
	if exists {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": msg,
		})
	}

	// Şifre hash'leme
	hash, err := middleware.HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Şifre şifrelenemedi.",
		})
	}

	user := models.User{
		Username:     req.Username,
		DisplayName:  req.DisplayName,
		Email:        req.Email,
		PasswordHash: hash,
		AvatarURL:    "",
		Bio:          "Merhaba, ben Fısıltı kullanıyorum!",
		OnlineStatus: 0, // WebSocket bağlanana kadar offline
	}

	if err := h.userRepo.CreateUser(c.Context(), &user); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Kullanıcı kaydı oluşturulamadı.",
		})
	}

	// Token üretimi
	accessToken, err := middleware.GenerateAccessToken(user.ID, user.Username, h.cfg.JWTAccessSecret, h.cfg.JWTAccessExpiryMin)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Erişim anahtarı üretilemedi."})
	}

	refreshToken, err := middleware.GenerateRefreshToken(user.ID, h.cfg.JWTRefreshSecret, h.cfg.JWTRefreshExpiryDays)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Yenileme anahtarı üretilemedi."})
	}

	h.setAuthCookies(c, accessToken, refreshToken)

	return c.Status(fiber.StatusCreated).JSON(models.AuthResponse{
		User:        user.ToResponse(),
		AccessToken: accessToken,
	})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Geçersiz giriş bilgileri.",
		})
	}

	req.Login = strings.TrimSpace(req.Login)
	if req.Login == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Kullanıcı adı/e-posta ve şifre zorunludur.",
		})
	}

	user, err := h.userRepo.GetUserByLogin(c.Context(), req.Login)
	if err != nil || user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Kullanıcı adı veya şifre hatalı.",
		})
	}

	if !middleware.CheckPasswordHash(req.Password, user.PasswordHash) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Kullanıcı adı veya şifre hatalı.",
		})
	}

	accessToken, err := middleware.GenerateAccessToken(user.ID, user.Username, h.cfg.JWTAccessSecret, h.cfg.JWTAccessExpiryMin)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Oturum anahtarı üretilemedi."})
	}

	refreshToken, err := middleware.GenerateRefreshToken(user.ID, h.cfg.JWTRefreshSecret, h.cfg.JWTRefreshExpiryDays)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Yenileme anahtarı üretilemedi."})
	}

	h.setAuthCookies(c, accessToken, refreshToken)

	return c.JSON(models.AuthResponse{
		User:        user.ToResponse(),
		AccessToken: accessToken,
	})
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	refreshToken := c.Cookies("refresh_token")
	if refreshToken == "" {
		var body struct {
			RefreshToken string `json:"refresh_token"`
		}
		_ = c.BodyParser(&body)
		refreshToken = body.RefreshToken
	}

	if refreshToken == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Yenileme tokenı bulunamadı.",
		})
	}

	claims, err := middleware.ValidateToken(refreshToken, h.cfg.JWTRefreshSecret)
	if err != nil || !claims.IsRefresh {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Geçersiz veya süresi dolmuş yenileme tokenı.",
		})
	}

	user, err := h.userRepo.GetUserByID(c.Context(), claims.UserID)
	if err != nil || user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Kullanıcı hesabı bulunamadı.",
		})
	}

	newAccessToken, err := middleware.GenerateAccessToken(user.ID, user.Username, h.cfg.JWTAccessSecret, h.cfg.JWTAccessExpiryMin)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Yeni token üretilemedi."})
	}

	h.setAuthCookies(c, newAccessToken, refreshToken)

	return c.JSON(fiber.Map{
		"access_token": newAccessToken,
		"user":         user.ToResponse(),
	})
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	var userID uuid.UUID
	if id, ok := c.Locals("user_id").(uuid.UUID); ok {
		userID = id
	} else {
		tokenStr := c.Cookies("access_token")
		if tokenStr == "" {
			authHeader := c.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}
		if tokenStr != "" {
			if claims, err := middleware.ValidateToken(tokenStr, h.cfg.JWTAccessSecret); err == nil {
				userID = claims.UserID
			}
		}
	}

	if userID != uuid.Nil {
		ctx := c.Context()
		if h.hub != nil {
			h.hub.DisconnectUser(userID)
		}
		if h.presenceService != nil {
			_ = h.presenceService.SetUserOffline(ctx, userID)
		}
		if h.userRepo != nil {
			_ = h.userRepo.UpdateOnlineStatus(ctx, userID, 0)
		}
	}

	h.clearAuthCookies(c)
	return c.JSON(fiber.Map{
		"message": "Oturum başarıyla kapatıldı.",
	})
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Yetkisiz istek."})
	}

	user, err := h.userRepo.GetUserByID(c.Context(), userID)
	if err != nil || user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Kullanıcı bulunamadı."})
	}

	return c.JSON(user.ToResponse())
}
