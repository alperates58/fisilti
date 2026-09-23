package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type TypingService struct {
	rdb *redis.Client
}

func NewTypingService(rdb *redis.Client) *TypingService {
	return &TypingService{rdb: rdb}
}

// SetTyping: Veritabanına hiç dokunmadan, 5 saniye TTL ile Redis'e yazar.
func (s *TypingService) SetTyping(ctx context.Context, conversationID, userID uuid.UUID) error {
	key := fmt.Sprintf("typing:%s:%s", conversationID.String(), userID.String())
	return s.rdb.Set(ctx, key, "1", 5*time.Second).Err()
}

func (s *TypingService) RemoveTyping(ctx context.Context, conversationID, userID uuid.UUID) error {
	key := fmt.Sprintf("typing:%s:%s", conversationID.String(), userID.String())
	return s.rdb.Del(ctx, key).Err()
}

func (s *TypingService) IsTyping(ctx context.Context, conversationID, userID uuid.UUID) bool {
	key := fmt.Sprintf("typing:%s:%s", conversationID.String(), userID.String())
	val, err := s.rdb.Exists(ctx, key).Result()
	return err == nil && val > 0
}
