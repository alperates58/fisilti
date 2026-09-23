-- 002: Süreli (Otomatik Kaybolan) Mesajlar ve Güvenlik
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS disappearing_seconds INT DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at) WHERE expires_at IS NOT NULL;
