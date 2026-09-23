package livekit

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type VideoGrant struct {
	Room           string `json:"room,omitempty"`
	RoomJoin       bool   `json:"roomJoin,omitempty"`
	CanPublish     bool   `json:"canPublish,omitempty"`
	CanSubscribe   bool   `json:"canSubscribe,omitempty"`
	CanPublishData bool   `json:"canPublishData,omitempty"`
}

type LiveKitClaims struct {
	Name     string     `json:"name,omitempty"`
	Video    VideoGrant `json:"video"`
	Metadata string     `json:"metadata,omitempty"`
	jwt.RegisteredClaims
}

type LiveKitService struct {
	apiKey    string
	apiSecret string
	publicURL string
}

func NewLiveKitService(apiKey, apiSecret, publicURL string) *LiveKitService {
	return &LiveKitService{
		apiKey:    apiKey,
		apiSecret: apiSecret,
		publicURL: publicURL,
	}
}

func (s *LiveKitService) CreateRoomToken(roomName string, userID uuid.UUID, displayName string) (string, error) {
	now := time.Now()
	claims := LiveKitClaims{
		Name: displayName,
		Video: VideoGrant{
			Room:           roomName,
			RoomJoin:       true,
			CanPublish:     true,
			CanSubscribe:   true,
			CanPublishData: true,
		},
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.apiKey,
			Subject:   userID.String(),
			ExpiresAt: jwt.NewNumericDate(now.Add(6 * time.Hour)),
			NotBefore: jwt.NewNumericDate(now.Add(-1 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(s.apiSecret))
	if err != nil {
		return "", fmt.Errorf("livekit token uretilemedi: %w", err)
	}

	return tokenStr, nil
}

func (s *LiveKitService) GetPublicURL() string {
	return s.publicURL
}
