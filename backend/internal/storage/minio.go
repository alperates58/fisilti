package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"fisilti/internal/transcoder"
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

	// Gelen dosyayı geçici bir dosyaya yaz (FFmpeg dönüştürme ve boyut kontrolü için)
	tmpIn, err := os.CreateTemp("", "fisilti_upload_*"+ext)
	if err != nil {
		return nil, fmt.Errorf("geçici dosya oluşturulamadı: %w", err)
	}
	defer os.Remove(tmpIn.Name())

	if _, err := io.Copy(tmpIn, file); err != nil {
		_ = tmpIn.Close()
		return nil, fmt.Errorf("geçici dosyaya yazılamadı: %w", err)
	}
	_ = tmpIn.Close()

	uploadFilePath := tmpIn.Name()
	var uploadDuration float64 = 0

	// Dosya uzantısına göre kategoriyi otomatik doğrula (frontend yanlış göndermiş olsa bile):
	switch ext {
	case ".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv", ".3gp":
		mediaCategory = "video"
	case ".mp3", ".m4a", ".aac", ".wav", ".ogg", ".opus", ".weba":
		mediaCategory = "voice"
	case ".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif", ".svg", ".bmp":
		mediaCategory = "image"
	}

	switch mediaCategory {
	case "voice":
		targetBucket = s.voiceBucket
		// iOS ve Android dahil her cihazda sorunsuz oynatmak için MP3'e çevir:
		if transcoder.IsAvailable() && ext != ".mp3" {
			if convertedPath, dur, err := transcoder.ConvertAudioToMP3(uploadFilePath); err == nil {
				defer os.Remove(convertedPath)
				uploadFilePath = convertedPath
				ext = ".mp3"
				contentType = "audio/mpeg"
				fileName = strings.TrimSuffix(fileName, filepath.Ext(fileName)) + ".mp3"
				uploadDuration = dur
			} else {
				contentType = detectAudioContentType(ext)
			}
		} else {
			contentType = detectAudioContentType(ext)
		}

	case "image":
		targetBucket = s.mediaBucket
		if (ext == ".heic" || ext == ".heif") && transcoder.IsAvailable() {
			if convertedPath, err := transcoder.ConvertImageToJPEG(uploadFilePath); err == nil {
				defer os.Remove(convertedPath)
				uploadFilePath = convertedPath
				ext = ".jpg"
				contentType = "image/jpeg"
				fileName = strings.TrimSuffix(fileName, filepath.Ext(fileName)) + ".jpg"
			} else {
				contentType = "image/jpeg"
			}
		} else {
			if ext == ".png" {
				contentType = "image/png"
			} else if ext == ".webp" {
				contentType = "image/webp"
			} else if ext == ".gif" {
				contentType = "image/gif"
			} else {
				contentType = "image/jpeg"
			}
		}

	case "video":
		targetBucket = s.mediaBucket
		// iOS ve Android evrensel H.264 Baseline + AAC MP4 (+faststart) formatına çevir:
		if transcoder.IsAvailable() {
			if convertedPath, err := transcoder.ConvertVideoToUniversalMP4(uploadFilePath); err == nil {
				defer os.Remove(convertedPath)
				uploadFilePath = convertedPath
				ext = ".mp4"
				contentType = "video/mp4"
				fileName = strings.TrimSuffix(fileName, filepath.Ext(fileName)) + ".mp4"
			} else {
				if ext == ".webm" {
					contentType = "video/webm"
				} else if ext == ".mov" {
					contentType = "video/quicktime"
				} else {
					contentType = "video/mp4"
				}
			}
		} else {
			if ext == ".webm" {
				contentType = "video/webm"
			} else if ext == ".mov" {
				contentType = "video/quicktime"
			} else {
				contentType = "video/mp4"
			}
		}

	default: // "file" / belge
		targetBucket = s.filesBucket
		contentType = header.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/octet-stream"
		}
	}

	// Yüklenecek dosyanın son boyutunu al
	info, err := os.Stat(uploadFilePath)
	if err == nil {
		fileSize = info.Size()
	}

	uploadF, err := os.Open(uploadFilePath)
	if err != nil {
		return nil, fmt.Errorf("yüklenecek dosya açılamadı: %w", err)
	}
	defer uploadF.Close()

	objectName := fmt.Sprintf("%s_%d%s", userID.String(), time.Now().UnixNano(), ext)

	_, err = s.client.PutObject(ctx, targetBucket, objectName, uploadF, fileSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return nil, fmt.Errorf("dosya MinIO'ya yuklenemedi: %w", err)
	}

	mediaURL := fmt.Sprintf("/api/v1/media/file/%s/%s", targetBucket, objectName)

	metadata := map[string]interface{}{
		"file_name": fileName,
		"file_size": fileSize,
		"mime_type": contentType,
		"ext":       ext,
	}
	if uploadDuration > 0 {
		metadata["duration"] = uploadDuration
	}

	return &MediaUploadResult{
		MediaURL: mediaURL,
		Metadata: metadata,
	}, nil
}

func detectAudioContentType(ext string) string {
	switch ext {
	case ".mp3":
		return "audio/mpeg"
	case ".m4a", ".mp4":
		return "audio/mp4"
	case ".aac":
		return "audio/aac"
	case ".ogg":
		return "audio/ogg"
	case ".wav":
		return "audio/wav"
	default:
		return "audio/webm"
	}
}

func (s *StorageService) GetObject(ctx context.Context, bucket, objectName string, opts minio.GetObjectOptions) (*minio.Object, minio.ObjectInfo, error) {
	obj, err := s.client.GetObject(ctx, bucket, objectName, opts)
	if err != nil {
		return nil, minio.ObjectInfo{}, err
	}
	stat, err := obj.Stat()
	if err != nil {
		return nil, minio.ObjectInfo{}, err
	}
	return obj, stat, nil
}

func (s *StorageService) StatObject(ctx context.Context, bucket, objectName string) (minio.ObjectInfo, error) {
	return s.client.StatObject(ctx, bucket, objectName, minio.StatObjectOptions{})
}

func (s *StorageService) FGetObject(ctx context.Context, bucket, objectName, filePath string, opts minio.GetObjectOptions) error {
	return s.client.FGetObject(ctx, bucket, objectName, filePath, opts)
}

func (s *StorageService) FPutObject(ctx context.Context, bucket, objectName, filePath string, opts minio.PutObjectOptions) (minio.UploadInfo, error) {
	return s.client.FPutObject(ctx, bucket, objectName, filePath, opts)
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
