package storage

import (
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type StorageService struct {
	client       *minio.Client
	publicURL    string
	avatarBucket string
	mediaBucket  string
	voiceBucket  string
	filesBucket  string
}

func NewStorageService(endpoint, accessKey, secretKey, publicURL string, useSSL bool, avatarBucket, mediaBucket, voiceBucket, filesBucket string) (*StorageService, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("minio istemcisi baslatilamadi: %w", err)
	}

	return &StorageService{
		client:       client,
		publicURL:    strings.TrimSuffix(publicURL, "/"),
		avatarBucket: avatarBucket,
		mediaBucket:  mediaBucket,
		voiceBucket:  voiceBucket,
		filesBucket:  filesBucket,
	}, nil
}

func (s *StorageService) UploadAvatar(ctx context.Context, userID uuid.UUID, file multipart.File, header *multipart.FileHeader) (string, error) {
	// 1. Boyut kontrolü (Max 5MB)
	if header.Size > 5*1024*1024 {
		return "", errors.New("avatar dosyası en fazla 5MB olabilir")
	}

	// 2. Uzantı ve format kontrolü
	ext := strings.ToLower(filepath.Ext(header.Filename))
	validExts := map[string]string{
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".webp": "image/webp",
	}
	contentType, ok := validExts[ext]
	if !ok {
		return "", errors.New("sadece JPG, PNG veya WEBP formatında görseller yüklenebilir")
	}

	// 3. Benzersiz dosya adı
	objectName := fmt.Sprintf("%s_%d%s", userID.String(), time.Now().Unix(), ext)

	// 4. MinIO'ya yükle
	_, err := s.client.PutObject(ctx, s.avatarBucket, objectName, file, header.Size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("avatar MinIO'ya yuklenemedi: %w", err)
	}

	// 5. İstemciye dönecek genel URL
	avatarURL := fmt.Sprintf("%s/%s/%s", s.publicURL, s.avatarBucket, objectName)
	return avatarURL, nil
}
