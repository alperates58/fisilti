-- 006_stories.sql - 24 Saatlik WhatsApp & Instagram Tarzı Durumlar / Hikayeler

CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL DEFAULT 'image', -- 'image', 'video', 'text', 'audio'
    media_url TEXT DEFAULT '',
    caption TEXT DEFAULT '',
    background_color VARCHAR(100) DEFAULT 'from-pink-900 to-slate-950',
    music_title VARCHAR(150) DEFAULT '',
    music_artist VARCHAR(150) DEFAULT '',
    music_url TEXT DEFAULT '',
    stickers JSONB DEFAULT '[]'::jsonb,
    views UUID[] DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
