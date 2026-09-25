package middleware

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestPasswordHashing(t *testing.T) {
	password := "SecretAura123!"
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword error: %v", err)
	}

	if !CheckPasswordHash(password, hash) {
		t.Errorf("CheckPasswordHash başarısız oldu, doğru şifre doğrulanmalıydı")
	}

	if CheckPasswordHash("WrongPassword!", hash) {
		t.Errorf("CheckPasswordHash yanlış şifreyi onaylamamalıydı")
	}
}

func TestJWTGenerationAndValidation(t *testing.T) {
	secret := "super-secure-aura-secret-key-32chars"
	userID := uuid.New()
	username := "auratester"

	// 1. Access Token Test
	token, err := GenerateAccessToken(userID, username, secret, 15)
	if err != nil {
		t.Fatalf("GenerateAccessToken failed: %v", err)
	}

	claims, err := ValidateToken(token, secret)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("UserID mismatch: got %v, want %v", claims.UserID, userID)
	}
	if claims.Username != username {
		t.Errorf("Username mismatch: got %v, want %v", claims.Username, username)
	}
	if claims.Issuer != "aura" {
		t.Errorf("Issuer mismatch: got %v, want 'aura'", claims.Issuer)
	}
	if claims.IsRefresh {
		t.Errorf("Access token is_refresh flag must be false")
	}

	// 2. Refresh Token Test
	refreshToken, err := GenerateRefreshToken(userID, secret, 7)
	if err != nil {
		t.Fatalf("GenerateRefreshToken failed: %v", err)
	}

	refreshClaims, err := ValidateToken(refreshToken, secret)
	if err != nil {
		t.Fatalf("ValidateToken on refresh token failed: %v", err)
	}
	if !refreshClaims.IsRefresh {
		t.Errorf("Refresh token is_refresh flag must be true")
	}
	if refreshClaims.Issuer != "aura" {
		t.Errorf("Refresh token issuer mismatch: got %v, want 'aura'", refreshClaims.Issuer)
	}

	// 3. Yanlış secret ile doğrulama reddedilmeli
	_, err = ValidateToken(token, "wrong-secret-key-1234567890123456")
	if err == nil {
		t.Errorf("ValidateToken must fail with wrong secret")
	}
}

func TestExpiredTokenValidation(t *testing.T) {
	secret := "super-secure-aura-secret-key-32chars"
	userID := uuid.New()

	// Geçmiş tarihli token
	token, err := GenerateAccessToken(userID, "test", secret, -10)
	if err != nil {
		t.Fatalf("GenerateAccessToken failed: %v", err)
	}

	time.Sleep(10 * time.Millisecond)
	_, err = ValidateToken(token, secret)
	if err == nil {
		t.Errorf("Expired token must fail validation")
	}
}
