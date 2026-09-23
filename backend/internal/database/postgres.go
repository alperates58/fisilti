package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func ConnectPostgres(dbURL string) (*sql.DB, error) {
	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		return nil, fmt.Errorf("veritabani surucusu acilamadi: %w", err)
	}

	// Havuz yapılandırması
	db.SetMaxOpenConns(50)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(15 * time.Minute)

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

func RunMigrations(db *sql.DB, migrationFile string) error {
	content, err := os.ReadFile(migrationFile)
	if err != nil {
		return fmt.Errorf("migration dosyasi okunamadi (%s): %w", migrationFile, err)
	}

	_, err = db.Exec(string(content))
	if err != nil {
		return fmt.Errorf("migration calistirilamadi: %w", err)
	}

	log.Printf("✅ [DB] %s basariyla uygulandi.", migrationFile)
	return nil
}
