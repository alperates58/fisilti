-- 010_story_highlights.sql - Hikaye Öne Çıkanlar (Story Highlights)
CREATE TABLE IF NOT EXISTS story_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    cover_url TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_highlights_user ON story_highlights(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS story_highlight_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    highlight_id UUID NOT NULL REFERENCES story_highlights(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    position INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_highlight_story UNIQUE(highlight_id, story_id)
);

CREATE INDEX IF NOT EXISTS idx_story_highlight_items_hl ON story_highlight_items(highlight_id, position ASC);
CREATE INDEX IF NOT EXISTS idx_story_highlight_items_story ON story_highlight_items(story_id);
