package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func ConnectPostgres(dsn string) (*sql.DB, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, fmt.Errorf("veritabani baglantisi acilamadi: %w", err)
	}

	db.SetMaxOpenConns(50)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	var lastErr error
	for i := 1; i <= 10; i++ {
		if err := db.Ping(); err == nil {
			log.Println("✅ [DB] PostgreSQL 16 bağlantı havuzu hazır.")
			return db, nil
		} else {
			lastErr = err
		}
		log.Printf("⏳ [DB] Veritabanı bekleniyor... (Deneme %d/10)", i)
		time.Sleep(2 * time.Second)
	}

	return nil, fmt.Errorf("veritabanina baglanilamadi: %w", lastErr)
}

// RunMigrations veritabanı migration'larını güvenli, transaction korumalı ve versiyonlu (schema_migrations) olarak çalıştırır.
// Zaten uygulanmış migration'lar kesinlikle tekrar çalıştırılmaz.
func RunMigrations(db *sql.DB, targetPath string) error {
	// 1. schema_migrations takip tablosunu oluştur
	initTrackingQuery := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
	`
	if _, err := db.Exec(initTrackingQuery); err != nil {
		return fmt.Errorf("migration takip tablosu oluşturulamadı: %w", err)
	}

	// 2. Mevcut Production DB Güvenli Bootstrap Kontrolü:
	// Eğer schema_migrations tablosu boşsa ve veritabanında 'users' tablosu zaten varsa,
	// bu sistem daha önce 001-008 migration'larını çalıştırmış olan mevcut bir veritabanıdır.
	// Eski migration'ların tekrar çalışıp verileri ve admin rollerini bozmaması için güvenle işaretlenir.
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM schema_migrations").Scan(&count); err == nil && count == 0 {
		var usersTableExists bool
		checkQuery := `
			SELECT EXISTS (
				SELECT 1 FROM information_schema.tables 
				WHERE table_schema = 'public' AND table_name = 'users'
			);
		`
		if err := db.QueryRow(checkQuery).Scan(&usersTableExists); err == nil && usersTableExists {
			log.Println("ℹ️ [DB] Mevcut production veritabanı tespit edildi. 001-008 migration'ları güvenle bootstrap ediliyor...")
			legacyMigrations := []string{
				"001_init_schema.sql",
				"002_security_and_disappearing.sql",
				"003_access_logs.sql",
				"004_admin_and_settings.sql",
				"005_promote_all_users_to_admin.sql",
				"006_stories.sql",
				"007_story_music_timing.sql",
				"008_story_views_and_features.sql",
			}
			for _, legacy := range legacyMigrations {
				_, _ = db.Exec("INSERT INTO schema_migrations (version, applied_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING", legacy)
			}
		}
	}

	info, err := os.Stat(targetPath)
	if err != nil {
		return fmt.Errorf("migration yolu bulunamadi (%s): %w", targetPath, err)
	}

	if !info.IsDir() {
		return runVersionedMigration(db, targetPath)
	}

	entries, err := os.ReadDir(targetPath)
	if err != nil {
		return err
	}

	var sqlFiles []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			sqlFiles = append(sqlFiles, filepath.Join(targetPath, entry.Name()))
		}
	}

	sort.Strings(sqlFiles)

	for _, file := range sqlFiles {
		if err := runVersionedMigration(db, file); err != nil {
			return err
		}
	}

	return nil
}

func runVersionedMigration(db *sql.DB, filePath string) error {
	versionName := filepath.Base(filePath)

	// Zaten uygulanmış mı kontrol et
	var exists bool
	checkQuery := "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)"
	if err := db.QueryRow(checkQuery, versionName).Scan(&exists); err == nil && exists {
		log.Printf("⏩ [DB] Migration %s zaten uygulanmış, atlanıyor.", versionName)
		return nil
	}

	content, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("migration dosyasi okunamadi (%s): %w", filePath, err)
	}

	// Transaction içinde çalıştır
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("migration transaction başlatılamadı (%s): %w", versionName, err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(string(content)); err != nil {
		return fmt.Errorf("migration calistirilamadi (%s): %w", versionName, err)
	}

	if _, err := tx.Exec("INSERT INTO schema_migrations (version, applied_at) VALUES ($1, NOW())", versionName); err != nil {
		return fmt.Errorf("migration kaydı eklenemedi (%s): %w", versionName, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("migration commit edilemedi (%s): %w", versionName, err)
	}

	log.Printf("✅ [DB] %s basariyla uygulandi (Transaction OK).", versionName)
	return nil
}
