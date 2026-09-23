package middleware

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

func NewRateLimiter(rdb *redis.Client, maxRequests int, window time.Duration) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var identifier string
		if uID, ok := c.Locals("user_id").(uuid.UUID); ok && uID != uuid.Nil {
			identifier = uID.String()
		} else {
			identifier = c.IP()
		}

		key := fmt.Sprintf("rate_limit:%s:%s", c.Path(), identifier)

		ctx := c.Context()
		count, err := rdb.Incr(ctx, key).Result()
		if err != nil {
			// Redis hatasında trafiği kesmeyelim
			return c.Next()
		}

		if count == 1 {
			rdb.Expire(ctx, key, window)
		}

		if count > int64(maxRequests) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":       "Çok hızlı istek gönderiyorsunuz. Lütfen birkaç saniye bekleyin.",
				"retry_after": window.Seconds(),
			})
		}

		return c.Next()
	}
}
