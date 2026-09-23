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

func RunMigrations(db *sql.DB, targetPath string) error {
	info, err := os.Stat(targetPath)
	if err != nil {
		return fmt.Errorf("migration yolu bulunamadi (%s): %w", targetPath, err)
	}

	if !info.IsDir() {
		return runSingleMigration(db, targetPath)
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
		if err := runSingleMigration(db, file); err != nil {
			return err
		}
	}

	return nil
}

func runSingleMigration(db *sql.DB, filePath string) error {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("migration dosyasi okunamadi (%s): %w", filePath, err)
	}

	_, err = db.Exec(string(content))
	if err != nil {
		return fmt.Errorf("migration calistirilamadi (%s): %w", filePath, err)
	}

	log.Printf("✅ [DB] %s basariyla uygulandi.", filePath)
	return nil
}
