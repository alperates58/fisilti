package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"fisilti/internal/models"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type StoryRepository struct {
	db *sql.DB
}

func NewStoryRepository(db *sql.DB) *StoryRepository {
	return &StoryRepository{db: db}
}

func (r *StoryRepository) CreateStory(ctx context.Context, story *models.Story) error {
	query := `
		INSERT INTO stories (
			user_id, media_type, media_url, caption, background_color,
			music_title, music_artist, music_url, duration_seconds, music_start, music_end,
			audience, stickers, expires_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
		)
		RETURNING id, views, created_at
	`
	if story.ExpiresAt.IsZero() {
		story.ExpiresAt = time.Now().Add(24 * time.Hour)
	}
	if len(story.Stickers) == 0 {
		story.Stickers = json.RawMessage("[]")
	}
	if story.DurationSeconds <= 0 {
		story.DurationSeconds = 10
	}
	if story.Audience == "" {
		story.Audience = "everyone"
	}

	var rawViews []string
	err := r.db.QueryRowContext(
		ctx,
		query,
		story.UserID,
		story.MediaType,
		story.MediaURL,
		story.Caption,
		story.BackgroundColor,
		story.MusicTitle,
		story.MusicArtist,
		story.MusicURL,
		story.DurationSeconds,
		story.MusicStart,
		story.MusicEnd,
		story.Audience,
		story.Stickers,
		story.ExpiresAt,
	).Scan(&story.ID, pq.Array(&rawViews), &story.CreatedAt)

	if err != nil {
		return fmt.Errorf("hikaye olusturulamadi: %w", err)
	}

	story.ViewsCount = len(rawViews)
	return nil
}

func (r *StoryRepository) GetActiveStories(ctx context.Context, currentUserID uuid.UUID) ([]models.UserStoriesGroup, error) {
	// Blok filtreli, hedef kitle filtreli ve tekil izlenme tablolu sorgu
	query := `
		SELECT 
			s.id, s.user_id, s.media_type, s.media_url, s.caption, s.background_color,
			s.music_title, s.music_artist, s.music_url,
			COALESCE(s.duration_seconds, 10), COALESCE(s.music_start, 0), COALESCE(s.music_end, 0),
			COALESCE(s.audience, 'everyone'),
			s.stickers, s.views, s.expires_at, s.created_at,
			u.id, u.username, u.display_name, u.avatar_url,
			EXISTS(SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.user_id = $1) AS has_viewed_table,
			(SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id) AS views_count_table
		FROM stories s
		JOIN users u ON s.user_id = u.id
		WHERE s.expires_at > NOW()
		  AND (
		      s.user_id = $1
		      OR s.audience = 'everyone'
		      OR (s.audience = 'close_friends' AND EXISTS(
		          SELECT 1 FROM user_close_friends ucf WHERE ucf.user_id = s.user_id AND ucf.friend_id = $1
		      ))
		  )
		  AND NOT EXISTS(
		      SELECT 1 FROM conversations c
		      WHERE ((c.user_one_id = s.user_id AND c.user_two_id = $1) OR (c.user_one_id = $1 AND c.user_two_id = s.user_id))
		        AND c.is_blocked = TRUE
		  )
		ORDER BY s.created_at ASC
		LIMIT 250
	`

	rows, err := r.db.QueryContext(ctx, query, currentUserID)
	if err != nil {
		return nil, fmt.Errorf("hikayeler alinamadi: %w", err)
	}
	defer rows.Close()

	userMap := make(map[uuid.UUID]*models.UserStoriesGroup)
	var orderedUserIDs []uuid.UUID

	for rows.Next() {
		var s models.Story
		var author models.UserStoryAuthor
		var rawViews []string
		var stickersBytes []byte
		var hasViewedTable bool
		var viewsCountTable int

		err := rows.Scan(
			&s.ID, &s.UserID, &s.MediaType, &s.MediaURL, &s.Caption, &s.BackgroundColor,
			&s.MusicTitle, &s.MusicArtist, &s.MusicURL,
			&s.DurationSeconds, &s.MusicStart, &s.MusicEnd,
			&s.Audience,
			&stickersBytes, pq.Array(&rawViews), &s.ExpiresAt, &s.CreatedAt,
			&author.ID, &author.Username, &author.DisplayName, &author.AvatarURL,
			&hasViewedTable, &viewsCountTable,
		)
		if err != nil {
			continue
		}

		s.Stickers = json.RawMessage(stickersBytes)

		// İzlenme sayısı: story_views tablosu varsa oradan, yoksa legacy views dizisinden
		if viewsCountTable > 0 {
			s.ViewsCount = viewsCountTable
		} else {
			s.ViewsCount = len(rawViews)
		}

		// Kullanıcı bu hikayeyi gördü mü kontrolü (story_views tablosu veya legacy views dizisi)
		hasViewed := hasViewedTable
		if !hasViewed {
			for _, v := range rawViews {
				if v == currentUserID.String() {
					hasViewed = true
					break
				}
			}
		}
		s.HasViewed = hasViewed

		group, exists := userMap[author.ID]
		if !exists {
			group = &models.UserStoriesGroup{
				User:            author,
				Stories:         []models.Story{},
				HasUnviewed:     false,
				HasCloseFriends: false,
				LatestStory:     s.CreatedAt,
			}
			userMap[author.ID] = group
			orderedUserIDs = append(orderedUserIDs, author.ID)
		}

		group.Stories = append(group.Stories, s)
		if !s.HasViewed && s.UserID != currentUserID {
			group.HasUnviewed = true
			if s.Audience == "close_friends" {
				group.HasCloseFriends = true
			}
		}
		if s.CreatedAt.After(group.LatestStory) {
			group.LatestStory = s.CreatedAt
		}
	}

	// Kendi hikayeni en başa al, ardından okunmamışları, sonra okunanları sırala
	var ownGroup *models.UserStoriesGroup
	var unviewedGroups []models.UserStoriesGroup
	var viewedGroups []models.UserStoriesGroup

	for _, uid := range orderedUserIDs {
		group := userMap[uid]
		if uid == currentUserID {
			ownGroup = group
		} else if group.HasUnviewed {
			unviewedGroups = append(unviewedGroups, *group)
		} else {
			viewedGroups = append(viewedGroups, *group)
		}
	}

	var result []models.UserStoriesGroup
	if ownGroup != nil {
		result = append(result, *ownGroup)
	}
	result = append(result, unviewedGroups...)
	result = append(result, viewedGroups...)

	if result == nil {
		result = []models.UserStoriesGroup{}
	}

	return result, nil
}

func (r *StoryRepository) MarkStoryViewed(ctx context.Context, storyID uuid.UUID, viewerID uuid.UUID) error {
	// 1. Hikaye aktif mi ve izleyici bloklu mu kontrolü
	var authorID uuid.UUID
	var expiresAt time.Time
	checkQuery := `SELECT user_id, expires_at FROM stories WHERE id = $1`
	if err := r.db.QueryRowContext(ctx, checkQuery, storyID).Scan(&authorID, &expiresAt); err != nil {
		return errors.New("hikaye bulunamadi")
	}
	if time.Now().After(expiresAt) {
		return errors.New("hikayenin suresi dolmus")
	}

	var isBlocked bool
	blockQuery := `
		SELECT EXISTS(
			SELECT 1 FROM conversations
			WHERE ((user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1))
			  AND is_blocked = TRUE
		)
	`
	if err := r.db.QueryRowContext(ctx, blockQuery, viewerID, authorID).Scan(&isBlocked); err == nil && isBlocked {
		return errors.New("engellenmis kullanici")
	}

	// 2. story_views tablosuna ekle
	insertViewQuery := `
		INSERT INTO story_views (story_id, user_id, viewed_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (story_id, user_id) DO NOTHING
	`
	_, _ = r.db.ExecContext(ctx, insertViewQuery, storyID, viewerID)

	// 3. Legacy views[] array'ine de ekle (geriye dönük uyumluluk)
	legacyQuery := `
		UPDATE stories
		SET views = array_append(views, $1::uuid)
		WHERE id = $2 AND NOT ($1::uuid = ANY(views))
	`
	_, err := r.db.ExecContext(ctx, legacyQuery, viewerID, storyID)
	return err
}

func (r *StoryRepository) GetStoryMediaAndAuthor(ctx context.Context, storyID uuid.UUID) (string, uuid.UUID, error) {
	var mediaURL string
	var authorID uuid.UUID
	query := `SELECT media_url, user_id FROM stories WHERE id = $1`
	err := r.db.QueryRowContext(ctx, query, storyID).Scan(&mediaURL, &authorID)
	return mediaURL, authorID, err
}

func (r *StoryRepository) DeleteStory(ctx context.Context, storyID uuid.UUID, userID uuid.UUID, isAdmin bool) error {
	var query string
	var err error

	if isAdmin {
		query = `DELETE FROM stories WHERE id = $1`
		_, err = r.db.ExecContext(ctx, query, storyID)
	} else {
		query = `DELETE FROM stories WHERE id = $1 AND user_id = $2`
		_, err = r.db.ExecContext(ctx, query, storyID, userID)
	}

	return err
}

func (r *StoryRepository) GetStoryViewers(ctx context.Context, storyID uuid.UUID, ownerID uuid.UUID) ([]models.StoryViewerDetail, error) {
	// Sadece hikayenin sahibi izleyenleri görebilir
	var isOwner bool
	err := r.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM stories WHERE id = $1 AND user_id = $2)", storyID, ownerID).Scan(&isOwner)
	if err != nil || !isOwner {
		return nil, fmt.Errorf("yetkisiz erisim")
	}

	query := `
		SELECT u.id, u.username, u.display_name, u.avatar_url, sv.viewed_at
		FROM story_views sv
		JOIN users u ON sv.user_id = u.id
		WHERE sv.story_id = $1
		ORDER BY sv.viewed_at DESC NULLS LAST, u.display_name ASC
	`
	rows, err := r.db.QueryContext(ctx, query, storyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var viewers []models.StoryViewerDetail
	for rows.Next() {
		var a models.StoryViewerDetail
		if err := rows.Scan(&a.ID, &a.Username, &a.DisplayName, &a.AvatarURL, &a.ViewedAt); err == nil {
			viewers = append(viewers, a)
		}
	}

	if viewers == nil {
		viewers = []models.StoryViewerDetail{}
	}
	return viewers, nil
}

// UpdateStory - Mevcut hikayeyi günceller (süre, müzik aralığı, metin, çıkartmalar)
func (r *StoryRepository) UpdateStory(ctx context.Context, story *models.Story) error {
	query := `
		UPDATE stories
		SET caption = $1,
		    background_color = $2,
		    music_title = $3,
		    music_artist = $4,
		    music_url = $5,
		    duration_seconds = $6,
		    music_start = $7,
		    music_end = $8,
		    stickers = $9
		WHERE id = $10 AND user_id = $11
	`
	if len(story.Stickers) == 0 {
		story.Stickers = json.RawMessage("[]")
	}
	if story.DurationSeconds <= 0 {
		story.DurationSeconds = 10
	}

	res, err := r.db.ExecContext(
		ctx,
		query,
		story.Caption,
		story.BackgroundColor,
		story.MusicTitle,
		story.MusicArtist,
		story.MusicURL,
		story.DurationSeconds,
		story.MusicStart,
		story.MusicEnd,
		story.Stickers,
		story.ID,
		story.UserID,
	)
	if err != nil {
		return fmt.Errorf("hikaye guncellenemedi: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil || rows == 0 {
		return errors.New("hikaye bulunamadi veya duzenleme yetkisi yok")
	}

	return nil
}

// AddStoryReaction - Hikayeye emoji reaksiyonu ekler
func (r *StoryRepository) AddStoryReaction(ctx context.Context, storyID uuid.UUID, userID uuid.UUID, reaction string) error {
	// 1. Hikaye aktif mi ve blok kontrolü
	var authorID uuid.UUID
	var expiresAt time.Time
	checkQuery := `SELECT user_id, expires_at FROM stories WHERE id = $1`
	if err := r.db.QueryRowContext(ctx, checkQuery, storyID).Scan(&authorID, &expiresAt); err != nil {
		return errors.New("hikaye bulunamadi")
	}
	if time.Now().After(expiresAt) {
		return errors.New("hikayenin suresi dolmus")
	}

	var isBlocked bool
	blockQuery := `
		SELECT EXISTS(
			SELECT 1 FROM conversations
			WHERE ((user_one_id = $1 AND user_two_id = $2) OR (user_one_id = $2 AND user_two_id = $1))
			  AND is_blocked = TRUE
		)
	`
	if err := r.db.QueryRowContext(ctx, blockQuery, userID, authorID).Scan(&isBlocked); err == nil && isBlocked {
		return errors.New("engellenmis kullanici")
	}

	// 2. Reaksiyon ekle (son 2 dakika içinde aynı reaksiyon varsa spam yapma)
	insertQuery := `
		INSERT INTO story_reactions (story_id, user_id, reaction, created_at)
		VALUES ($1, $2, $3, NOW())
	`
	_, err := r.db.ExecContext(ctx, insertQuery, storyID, userID, reaction)
	return err
}

// GetCloseFriends - Kullanıcının yakın arkadaşlarını getirir
func (r *StoryRepository) GetCloseFriends(ctx context.Context, userID uuid.UUID) ([]models.UserStoryAuthor, error) {
	query := `
		SELECT u.id, u.username, u.display_name, u.avatar_url
		FROM user_close_friends ucf
		JOIN users u ON ucf.friend_id = u.id
		WHERE ucf.user_id = $1
		ORDER BY u.display_name ASC
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var friends []models.UserStoryAuthor
	for rows.Next() {
		var a models.UserStoryAuthor
		if err := rows.Scan(&a.ID, &a.Username, &a.DisplayName, &a.AvatarURL); err == nil {
			friends = append(friends, a)
		}
	}
	if friends == nil {
		friends = []models.UserStoryAuthor{}
	}
	return friends, nil
}

// AddCloseFriend - Yakın arkadaş ekler
func (r *StoryRepository) AddCloseFriend(ctx context.Context, userID uuid.UUID, friendID uuid.UUID) error {
	if userID == friendID {
		return errors.New("kendinizi yakin arkadas olarak ekleyemezsiniz")
	}
	query := `
		INSERT INTO user_close_friends (user_id, friend_id, created_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (user_id, friend_id) DO NOTHING
	`
	_, err := r.db.ExecContext(ctx, query, userID, friendID)
	return err
}

// RemoveCloseFriend - Yakın arkadaşı siler
func (r *StoryRepository) RemoveCloseFriend(ctx context.Context, userID uuid.UUID, friendID uuid.UUID) error {
	query := `DELETE FROM user_close_friends WHERE user_id = $1 AND friend_id = $2`
	_, err := r.db.ExecContext(ctx, query, userID, friendID)
	return err
}
