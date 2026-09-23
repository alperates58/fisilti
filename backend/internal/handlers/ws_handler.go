package handlers

import (
	"strings"

	"fisilti/internal/config"
	"fisilti/internal/middleware"
	fisiltiws "fisilti/internal/websocket"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type WSHandler struct {
	cfg config.Config
	hub *fisiltiws.Hub
}

func NewWSHandler(cfg config.Config, hub *fisiltiws.Hub) *WSHandler {
	return &WSHandler{
		cfg: cfg,
		hub: hub,
	}
}

// WebSocket Upgrade Öncesi Middleware (Kimlik Doğrulama)
func (h *WSHandler) UpgradeMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			// 1. Cookie kontrolü
			tokenStr := c.Cookies("access_token")

			// 2. Query param kontrolü (?token=...)
			if tokenStr == "" {
				tokenStr = c.Query("token")
			}

			// 3. Authorization header kontrolü
			if tokenStr == "" {
				authHeader := c.Get("Authorization")
				if strings.HasPrefix(authHeader, "Bearer ") {
					tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
				}
			}

			// 4. Sec-WebSocket-Protocol kontrolü
			if tokenStr == "" {
				tokenStr = c.Get("Sec-WebSocket-Protocol")
			}

			if tokenStr == "" {
				return fiber.ErrUnauthorized
			}

			claims, err := middleware.ValidateToken(tokenStr, h.cfg.JWTAccessSecret)
			if err != nil || claims.IsRefresh {
				return fiber.ErrUnauthorized
			}

			c.Locals("user_id", claims.UserID)
			c.Locals("username", claims.Username)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	}
}

// WebSocket Bağlantı Karşılayıcı
func (h *WSHandler) HandleConnection() fiber.Handler {
	return websocket.New(func(conn *websocket.Conn) {
		userID := conn.Locals("user_id").(uuid.UUID)
		username := conn.Locals("username").(string)

		client := fisiltiws.NewClient(h.hub, conn, userID, username)
		h.hub.RegisterClient(client)

		go client.WritePump()
		client.ReadPump()
	})
}
