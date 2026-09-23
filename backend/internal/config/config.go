package config

import (
	"os"
	"strconv"
)

type Config struct {
	Environment          string
	Port                 string
	DatabaseURL          string
	RedisAddr            string
	RedisPass            string
	MinioEndpoint        string
	MinioPublicURL       string
	MinioUser            string
	MinioPass            string
	MinioUseSSL          bool
	MinioBucketAvatars   string
	MinioBucketVoice     string
	MinioBucketMedia     string
	MinioBucketFiles     string
	LiveKitURL           string
	LiveKitAPIKey        string
	LiveKitAPISecret     string
	JWTAccessSecret      string
	JWTRefreshSecret     string
	JWTAccessExpiryMin   int
	JWTRefreshExpiryDays int
}

func LoadConfig() Config {
	port := getEnv("PORT", "8080")
	env := getEnv("ENVIRONMENT", "development")
	dbURL := getEnv("DATABASE_URL", "postgres://fisilti_user:fisilti_secure_pass_2026@postgres:5432/fisilti?sslmode=disable")
	redisAddr := getEnv("REDIS_ADDR", "redis:6379")
	redisPass := getEnv("REDIS_PASSWORD", "")

	minioEndpoint := getEnv("MINIO_ENDPOINT", "minio:9000")
	minioPublicURL := getEnv("MINIO_PUBLIC_URL", "http://localhost:9000")
	minioUser := getEnv("MINIO_ROOT_USER", "fisilti_admin")
	minioPass := getEnv("MINIO_ROOT_PASSWORD", "fisilti_minio_secret_2026")
	minioUseSSL, _ := strconv.ParseBool(getEnv("MINIO_USE_SSL", "false"))

	minioBucketAvatars := getEnv("MINIO_BUCKET_AVATARS", "avatars")
	minioBucketVoice := getEnv("MINIO_BUCKET_VOICE", "audio-messages")
	minioBucketMedia := getEnv("MINIO_BUCKET_MEDIA", "media")
	minioBucketFiles := getEnv("MINIO_BUCKET_FILES", "files")

	livekitURL := getEnv("LIVEKIT_URL", "http://livekit:7880")
	livekitAPIKey := getEnv("LIVEKIT_API_KEY", "API_KEY_FISILTI")
	livekitAPISecret := getEnv("LIVEKIT_API_SECRET", "SECRET_KEY_SUPER_SECURE_FISILTI_2026")

	jwtAccessSecret := getEnv("JWT_ACCESS_SECRET", "fisilti_jwt_access_secret_super_key_32bytes_long")
	jwtRefreshSecret := getEnv("JWT_REFRESH_SECRET", "fisilti_jwt_refresh_secret_super_key_32bytes_long")
	jwtAccessExpiryMin, _ := strconv.Atoi(getEnv("JWT_ACCESS_EXPIRY_MINUTES", "15"))
	jwtRefreshExpiryDays, _ := strconv.Atoi(getEnv("JWT_REFRESH_EXPIRY_DAYS", "30"))

	return Config{
		Environment:          env,
		Port:                 port,
		DatabaseURL:          dbURL,
		RedisAddr:            redisAddr,
		RedisPass:            redisPass,
		MinioEndpoint:        minioEndpoint,
		MinioPublicURL:       minioPublicURL,
		MinioUser:            minioUser,
		MinioPass:            minioPass,
		MinioUseSSL:          minioUseSSL,
		MinioBucketAvatars:   minioBucketAvatars,
		MinioBucketVoice:     minioBucketVoice,
		MinioBucketMedia:     minioBucketMedia,
		MinioBucketFiles:     minioBucketFiles,
		LiveKitURL:           livekitURL,
		LiveKitAPIKey:        livekitAPIKey,
		LiveKitAPISecret:     livekitAPISecret,
		JWTAccessSecret:      jwtAccessSecret,
		JWTRefreshSecret:     jwtRefreshSecret,
		JWTAccessExpiryMin:   jwtAccessExpiryMin,
		JWTRefreshExpiryDays: jwtRefreshExpiryDays,
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
