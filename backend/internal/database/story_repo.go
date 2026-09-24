package database

import (
	"context"
	"database/sql"
	"encoding/json"
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
			music_title, music_artist, music_url, stickers, expires_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10
		)
		RETURNING id, views, created_at
	`
	if story.ExpiresAt.IsZero() {
		story.ExpiresAt = time.Now().Add(24 * time.Hour)
	}
	if len(story.Stickers) == 0 {
		story.Stickers = json.RawMessage("[]")
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
	query := `
		SELECT 
			s.id, s.user_id, s.media_type, s.media_url, s.caption, s.background_color,
			s.music_title, s.music_artist, s.music_url, s.stickers, s.views, s.expires_at, s.created_at,
			u.id, u.username, u.display_name, u.avatar_url
		FROM stories s
		JOIN users u ON s.user_id = u.id
		WHERE s.expires_at > NOW()
		ORDER BY s.created_at ASC
	`

	rows, err := r.db.QueryContext(ctx, query)
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

		err := rows.Scan(
			&s.ID, &s.UserID, &s.MediaType, &s.MediaURL, &s.Caption, &s.BackgroundColor,
			&s.MusicTitle, &s.MusicArtist, &s.MusicURL, &stickersBytes, pq.Array(&rawViews), &s.ExpiresAt, &s.CreatedAt,
			&author.ID, &author.Username, &author.DisplayName, &author.AvatarURL,
		)
		if err != nil {
			continue
		}

		s.Stickers = json.RawMessage(stickersBytes)
		s.ViewsCount = len(rawViews)

		// Kullanıcı bu hikayeyi gördü mü kontrolü
		hasViewed := false
		for _, v := range rawViews {
			if v == currentUserID.String() {
				hasViewed = true
				break
			}
		}
		s.HasViewed = hasViewed

		group, exists := userMap[author.ID]
		if !exists {
			group = &models.UserStoriesGroup{
				User:        author,
				Stories:     []models.Story{},
				HasUnviewed: false,
				LatestStory: s.CreatedAt,
			}
			userMap[author.ID] = group
			orderedUserIDs = append(orderedUserIDs, author.ID)
		}

		group.Stories = append(group.Stories, s)
		if !s.HasViewed && s.UserID != currentUserID {
			group.HasUnviewed = true
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
	query := `
		UPDATE stories
		SET views = array_append(views, $1::uuid)
		WHERE id = $2 AND NOT ($1::uuid = ANY(views))
	`
	_, err := r.db.ExecContext(ctx, query, viewerID, storyID)
	return err
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

func (r *StoryRepository) GetStoryViewers(ctx context.Context, storyID uuid.UUID, ownerID uuid.UUID) ([]models.UserStoryAuthor, error) {
	// Sadece hikayenin sahibi izleyenleri görebilir
	var isOwner bool
	err := r.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM stories WHERE id = $1 AND user_id = $2)", storyID, ownerID).Scan(&isOwner)
	if err != nil || !isOwner {
		return nil, fmt.Errorf("yetkisiz erisim")
	}

	query := `
		SELECT u.id, u.username, u.display_name, u.avatar_url
		FROM users u
		WHERE u.id = ANY(SELECT unnest(views) FROM stories WHERE id = $1)
		ORDER BY u.display_name ASC
	`
	rows, err := r.db.QueryContext(ctx, query, storyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var viewers []models.UserStoryAuthor
	for rows.Next() {
		var a models.UserStoryAuthor
		if err := rows.Scan(&a.ID, &a.Username, &a.DisplayName, &a.AvatarURL); err == nil {
			viewers = append(viewers, a)
		}
	}

	if viewers == nil {
		viewers = []models.UserStoryAuthor{}
	}
	return viewers, nil
}
