package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/redis/go-redis/v9"
)

type Config struct {
	Port         string
	DatabaseURL  string
	RedisAddr    string
	MinioEndpoint string
	MinioUser    string
	MinioPass    string
	MinioUseSSL  bool
	LiveKitURL   string
}

func loadConfig() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://fisilti_user:fisilti_secure_pass_2026@postgres:5432/fisilti?sslmode=disable"
	}

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "redis:6379"
	}

	minioEndpoint := os.Getenv("MINIO_ENDPOINT")
	if minioEndpoint == "" {
		minioEndpoint = "minio:9000"
	}

	minioUser := os.Getenv("MINIO_ROOT_USER")
	if minioUser == "" {
		minioUser = "fisilti_admin"
	}

	minioPass := os.Getenv("MINIO_ROOT_PASSWORD")
	if minioPass == "" {
		minioPass = "fisilti_minio_secret_2026"
	}

	livekitURL := os.Getenv("LIVEKIT_URL")
	if livekitURL == "" {
		livekitURL = "http://livekit:7880"
	}

	return Config{
		Port:          port,
		DatabaseURL:   dbURL,
		RedisAddr:     redisAddr,
		MinioEndpoint: minioEndpoint,
		MinioUser:     minioUser,
		MinioPass:     minioPass,
		MinioUseSSL:   false,
		LiveKitURL:    livekitURL,
	}
}

// Otomatik şema migration'ı çalıştırır
func runMigrations(db *sql.DB) error {
	migrationPath := "internal/database/migrations/001_init_schema.sql"
	content, err := os.ReadFile(migrationPath)
	if err != nil {
		return fmt.Errorf("migration dosyasi okunamadi (%s): %w", migrationPath, err)
	}

	_, err = db.Exec(string(content))
	if err != nil {
		return fmt.Errorf("migration calistirilamadi: %w", err)
	}

	log.Println("✅ [DB] 001_init_schema.sql basariyla uygulandi.")
	return nil
}

func main() {
	cfg := loadConfig()
	log.Printf("🚀 Fısıltı Backend başlatılıyor... Port: %s", cfg.Port)

	// 1. PostgreSQL Bağlantısı (Retry mekanizmalı)
	var db *sql.DB
	var dbErr error
	for i := 1; i <= 10; i++ {
		db, dbErr = sql.Open("pgx", cfg.DatabaseURL)
		if dbErr == nil && db.Ping() == nil {
			log.Println("✅ [DB] PostgreSQL 16 bağlantısı başarılı.")
			break
		}
		log.Printf("⏳ [DB] Veritabanı bekleniyor... (Deneme %d/10)", i)
		time.Sleep(2 * time.Second)
	}
	if dbErr != nil || db == nil || db.Ping() != nil {
		log.Printf("⚠️ [DB] PostgreSQL bağlantı hatası: %v", dbErr)
	} else {
		defer db.Close()
		if err := runMigrations(db); err != nil {
			log.Printf("⚠️ [DB] Migration hatası: %v", err)
		}
	}

	// 2. Redis Bağlantısı
	rdb := redis.NewClient(&redis.Options{
		Addr: cfg.RedisAddr,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("⚠️ [Redis] Bağlantı hatası (%s): %v", cfg.RedisAddr, err)
	} else {
		log.Println("✅ [Redis] Redis 7 bağlantısı başarılı.")
	}
	defer rdb.Close()

	// 3. MinIO Bağlantısı
	minioClient, minioErr := minio.New(cfg.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioUser, cfg.MinioPass, ""),
		Secure: cfg.MinioUseSSL,
	})
	if minioErr != nil {
		log.Printf("⚠️ [MinIO] İstemci hatası: %v", minioErr)
	} else {
		log.Printf("✅ [MinIO] S3 depolama servisi bağlandı (%s).", cfg.MinioEndpoint)
	}

	// 4. Fiber Web Uygulaması
	app := fiber.New(fiber.Config{
		AppName:      "Fısıltı API v1.0",
		ServerHeader: "Fisilti-Server",
		BodyLimit:    50 * 1024 * 1024, // 50MB dosya yükleme sınırı
	})

	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000, http://127.0.0.1:3000",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
	}))

	// Kök karşılama rotası
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"app":         "Fısıltı Özel Sohbet Platformu",
			"version":     "1.0.0",
			"status":      "running",
			"environment": os.Getenv("ENVIRONMENT"),
			"time":        time.Now().Format(time.RFC3339),
		})
	})

	// Sağlık kontrolü (Healthcheck)
	app.Get("/api/v1/health", func(c *fiber.Ctx) error {
		dbStatus := "down"
		if db != nil && db.Ping() == nil {
			dbStatus = "connected"
		}

		redisStatus := "down"
		rCtx, rCancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer rCancel()
		if rdb != nil && rdb.Ping(rCtx).Err() == nil {
			redisStatus = "connected"
		}

		minioStatus := "down"
		if minioClient != nil {
			// Bucket kontrolü ile liveness doğrula
			mCtx, mCancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer mCancel()
			_, err := minioClient.ListBuckets(mCtx)
			if err == nil {
				minioStatus = "connected"
			}
		}

		// LiveKit HTTP kontrolü
		livekitStatus := "down"
		lkClient := http.Client{Timeout: 2 * time.Second}
		resp, err := lkClient.Get(cfg.LiveKitURL)
		if err == nil && resp.StatusCode > 0 {
			livekitStatus = "connected"
			resp.Body.Close()
		}

		allOk := dbStatus == "connected" && redisStatus == "connected"

		status := "ok"
		if !allOk {
			status = "degraded"
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"status":    status,
			"timestamp": time.Now().Format(time.RFC3339),
			"services": fiber.Map{
				"postgres": dbStatus,
				"redis":    redisStatus,
				"minio":    minioStatus,
				"livekit":  livekitStatus,
			},
		})
	})

	// Graceful Shutdown
	go func() {
		if err := app.Listen(":" + cfg.Port); err != nil {
			log.Printf("⚠️ Sunucu dinleme sonlandı: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Fısıltı Backend kapatılıyor...")
	_ = app.Shutdown()
	log.Println("👋 Sunucu güvenli bir şekilde kapatıldı.")
}
