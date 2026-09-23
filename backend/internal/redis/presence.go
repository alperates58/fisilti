package redis

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type PresenceService struct {
	rdb *redis.Client
}

func NewPresenceService(rdb *redis.Client) *PresenceService {
	return &PresenceService{rdb: rdb}
}

func (s *PresenceService) SetUserOnline(ctx context.Context, userID uuid.UUID) error {
	key := fmt.Sprintf("user:%s:online", userID.String())
	return s.rdb.Set(ctx, key, "1", 0).Err()
}

func (s *PresenceService) SetUserOffline(ctx context.Context, userID uuid.UUID) error {
	key := fmt.Sprintf("user:%s:online", userID.String())
	return s.rdb.Del(ctx, key).Err()
}

func (s *PresenceService) IsUserOnline(ctx context.Context, userID uuid.UUID) bool {
	key := fmt.Sprintf("user:%s:online", userID.String())
	val, err := s.rdb.Exists(ctx, key).Result()
	return err == nil && val > 0
}
