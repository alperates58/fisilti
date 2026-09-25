-- 008_story_views_and_features.sql - Ölçeklenebilir izlenme takibi, reaksiyonlar, yakın arkadaşlar ve gizlilik

-- 1. story_views tablosu (Ölçeklenebilir, zaman damgalı, tekil izlenme)
CREATE TABLE IF NOT EXISTS story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_story_viewer UNIQUE(story_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_views_user ON story_views(user_id);

-- Legacy views[] dizisini story_views tablosuna sahte zaman üretmeden backfill yap (viewed_at = NULL)
INSERT INTO story_views (story_id, user_id, viewed_at)
SELECT s.id, u_id, NULL
FROM stories s, unnest(s.views) AS u_id
WHERE s.views IS NOT NULL AND cardinality(s.views) > 0
ON CONFLICT (story_id, user_id) DO NOTHING;

-- 2. story_reactions tablosu (Hikaye emoji tepkileri)
CREATE TABLE IF NOT EXISTS story_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON story_reactions(story_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_reactions_user ON story_reactions(user_id);

-- 3. user_close_friends tablosu (Yakın arkadaşlar listesi)
CREATE TABLE IF NOT EXISTS user_close_friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_user_close_friend UNIQUE(user_id, friend_id),
    CONSTRAINT chk_diff_close_friend CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_close_friends_user ON user_close_friends(user_id);

-- 4. stories tablosuna audience (hedef kitle) kolonu ekleme
ALTER TABLE stories ADD COLUMN IF NOT EXISTS audience VARCHAR(20) DEFAULT 'everyone';
CREATE INDEX IF NOT EXISTS idx_stories_audience ON stories(audience);

-- 5. messages tablosuna hikaye referansı (story reply context) ekleme
ALTER TABLE messages ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES stories(id) ON DELETE SET NULL;
