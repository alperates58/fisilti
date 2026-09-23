package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"fisilti/internal/config"
	"fisilti/internal/database"
	"fisilti/internal/handlers"
	"fisilti/internal/middleware"
	fisiltiredis "fisilti/internal/redis"
	"fisilti/internal/storage"
	fisiltiws "fisilti/internal/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg := config.LoadConfig()
	log.Printf("🚀 Fısıltı Backend başlatılıyor... Ortam: %s, Port: %s", cfg.Environment, cfg.Port)

	// 1. PostgreSQL 16 Bağlantısı ve Migration
	db, err := database.ConnectPostgres(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("❌ [DB] Veritabanı başlatılamadı: %v", err)
	}
	defer db.Close()

	if err := database.RunMigrations(db, "internal/database/migrations/001_init_schema.sql"); err != nil {
		log.Printf("⚠️ [DB] Migration uyarısı: %v", err)
	}

	// 2. Redis 7 Bağlantısı
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPass,
	})
	rCtx, rCancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer rCancel()
	if err := rdb.Ping(rCtx).Err(); err != nil {
		log.Printf("⚠️ [Redis] Bağlantı hatası (%s): %v", cfg.RedisAddr, err)
	} else {
		log.Println("✅ [Redis] Redis 7 bağlantısı başarılı.")
	}
	defer rdb.Close()

	// 3. MinIO S3 Depolama Servisi
	storageService, err := storage.NewStorageService(
		cfg.MinioEndpoint,
		cfg.MinioUser,
		cfg.MinioPass,
		cfg.MinioPublicURL,
		cfg.MinioUseSSL,
		cfg.MinioBucketAvatars,
		cfg.MinioBucketMedia,
		cfg.MinioBucketVoice,
		cfg.MinioBucketFiles,
	)
	if err != nil {
		log.Fatalf("❌ [MinIO] S3 servisi başlatılamadı: %v", err)
	}
	log.Printf("✅ [MinIO] S3 depolama servisi bağlandı (%s).", cfg.MinioEndpoint)

	// 4. Redis Servisleri
	presenceService := fisiltiredis.NewPresenceService(rdb)
	typingService := fisiltiredis.NewTypingService(rdb)

	// 5. Repositories
	userRepo := database.NewUserRepository(db)
	chatRepo := database.NewChatRepository(db)

	// 6. WebSocket Hub Motoru
	hub := fisiltiws.NewHub(chatRepo, userRepo, presenceService, typingService)
	go hub.Run()
	log.Println("⚡ [WS Hub] Gerçek zamanlı WebSocket Hub motoru başlatıldı.")

	// 7. Handlers
	authHandler := handlers.NewAuthHandler(cfg, userRepo)
	userHandler := handlers.NewUserHandler(userRepo, storageService)
	chatHandler := handlers.NewChatHandler(chatRepo, userRepo, presenceService)
	wsHandler := handlers.NewWSHandler(cfg, hub)

	// 8. Fiber Web Uygulaması
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
		AllowOrigins:     "http://localhost:3000, http://localhost:3002, http://127.0.0.1:3000, http://127.0.0.1:3002",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, Sec-WebSocket-Protocol",
		AllowCredentials: true,
	}))

	// Kök karşılama rotası
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"app":         "Fısıltı Özel Sohbet Platformu",
			"version":     "1.0.0",
			"status":      "running",
			"environment": cfg.Environment,
			"time":        time.Now().Format(time.RFC3339),
		})
	})

	// Sağlık kontrolü (Healthcheck)
	app.Get("/api/v1/health", func(c *fiber.Ctx) error {
		dbStatus := "down"
		if db.Ping() == nil {
			dbStatus = "connected"
		}

		redisStatus := "down"
		hCtx, hCancel := context.WithTimeout(context.Background(), 1*time.Second)
		defer hCancel()
		if rdb.Ping(hCtx).Err() == nil {
			redisStatus = "connected"
		}

		// LiveKit HTTP kontrolü
		livekitStatus := "down"
		lkClient := http.Client{Timeout: 2 * time.Second}
		resp, err := lkClient.Get(cfg.LiveKitURL)
		if err == nil && resp.StatusCode > 0 {
			livekitStatus = "connected"
			resp.Body.Close()
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"status":    "ok",
			"timestamp": time.Now().Format(time.RFC3339),
			"services": fiber.Map{
				"postgres": dbStatus,
				"redis":    redisStatus,
				"minio":    "connected",
				"livekit":  livekitStatus,
			},
		})
	})

	// WebSocket Uç Noktası
	app.Use("/ws", wsHandler.UpgradeMiddleware())
	app.Get("/ws", wsHandler.HandleConnection())

	// API v1 Rotaları
	v1 := app.Group("/api/v1")

	// Kimlik Doğrulama Rotaları (Açık)
	auth := v1.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
	auth.Post("/refresh", authHandler.Refresh)
	auth.Post("/logout", authHandler.Logout)

	// Korumalı Rotalar (JWT Korumalı)
	authProtected := auth.Group("", middleware.JWTMiddleware(cfg.JWTAccessSecret))
	authProtected.Get("/me", authHandler.Me)

	users := v1.Group("/users", middleware.JWTMiddleware(cfg.JWTAccessSecret))
	users.Put("/profile", userHandler.UpdateProfile)
	users.Post("/avatar", userHandler.UploadAvatar)
	users.Patch("/privacy", userHandler.UpdatePrivacy)
	users.Get("/search", userHandler.SearchUsers)

	// Sohbet ve Mesajlaşma Rotaları (JWT Korumalı)
	conversations := v1.Group("/conversations", middleware.JWTMiddleware(cfg.JWTAccessSecret))
	conversations.Post("/", chatHandler.StartConversation)
	conversations.Get("/", chatHandler.GetConversations)
	conversations.Get("/:id/messages", chatHandler.GetMessages)
	conversations.Delete("/:id/clear", chatHandler.ClearHistory)

	v1.Get("/messages/:id/info", middleware.JWTMiddleware(cfg.JWTAccessSecret), chatHandler.GetMessageInfo)

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
