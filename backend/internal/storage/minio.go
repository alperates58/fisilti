package storage

import (
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	"net/url"
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
	if header.Size > 5*1024*1024 {
		return "", errors.New("avatar dosyası en fazla 5MB olabilir")
	}

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

	objectName := fmt.Sprintf("%s_%d%s", userID.String(), time.Now().Unix(), ext)

	_, err := s.client.PutObject(ctx, s.avatarBucket, objectName, file, header.Size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("avatar MinIO'ya yuklenemedi: %w", err)
	}

	avatarURL := fmt.Sprintf("%s/%s/%s", s.publicURL, s.avatarBucket, objectName)
	return avatarURL, nil
}

type MediaUploadResult struct {
	MediaURL string                 `json:"media_url"`
	Metadata map[string]interface{} `json:"media_metadata"`
}

func (s *StorageService) UploadMedia(ctx context.Context, userID uuid.UUID, file multipart.File, header *multipart.FileHeader, mediaCategory string) (*MediaUploadResult, error) {
	ext := strings.ToLower(filepath.Ext(header.Filename))
	fileName := header.Filename
	fileSize := header.Size

	var targetBucket string
	var contentType string

	switch mediaCategory {
	case "voice":
		targetBucket = s.voiceBucket
		contentType = "audio/webm"
		if ext == ".mp3" {
			contentType = "audio/mpeg"
		} else if ext == ".ogg" {
			contentType = "audio/ogg"
		} else if ext == ".wav" {
			contentType = "audio/wav"
		} else if ext == "" {
			ext = ".webm"
		}

	case "image":
		targetBucket = s.mediaBucket
		if ext == ".png" {
			contentType = "image/png"
		} else if ext == ".webp" {
			contentType = "image/webp"
		} else if ext == ".gif" {
			contentType = "image/gif"
		} else {
			contentType = "image/jpeg"
		}

	case "video":
		targetBucket = s.mediaBucket
		if ext == ".webm" {
			contentType = "video/webm"
		} else if ext == ".mov" || ext == ".m4v" {
			contentType = "video/mp4"
		} else {
			contentType = "video/mp4"
		}

	default: // "file" / belge
		targetBucket = s.filesBucket
		contentType = header.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/octet-stream"
		}
	}

	objectName := fmt.Sprintf("%s_%d%s", userID.String(), time.Now().UnixNano(), ext)

	_, err := s.client.PutObject(ctx, targetBucket, objectName, file, fileSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return nil, fmt.Errorf("dosya MinIO'ya yuklenemedi: %w", err)
	}

	mediaURL := fmt.Sprintf("%s/%s/%s", s.publicURL, targetBucket, objectName)

	metadata := map[string]interface{}{
		"file_name": fileName,
		"file_size": fileSize,
		"mime_type": contentType,
		"ext":       ext,
	}

	return &MediaUploadResult{
		MediaURL: mediaURL,
		Metadata: metadata,
	}, nil
}

func (s *StorageService) DeleteMedia(ctx context.Context, mediaURL string) error {
	u, err := url.Parse(mediaURL)
	if err != nil {
		return err
	}

	parts := strings.Split(strings.TrimPrefix(u.Path, "/"), "/")
	if len(parts) < 2 {
		return errors.New("gecersiz medya url")
	}

	bucket := parts[0]
	objectName := strings.Join(parts[1:], "/")

	return s.client.RemoveObject(ctx, bucket, objectName, minio.RemoveObjectOptions{})
}
