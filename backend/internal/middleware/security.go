package middleware

import (
	"github.com/gofiber/fiber/v2"
)

func SecurityHeadersMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Set("X-Frame-Options", "DENY")
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-XSS-Protection", "1; mode=block")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		c.Set("Permissions-Policy", "camera=(self), microphone=(self), display-capture=(self), geolocation=()")

		return c.Next()
	}
}
