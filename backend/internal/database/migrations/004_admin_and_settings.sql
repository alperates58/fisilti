-- 004_admin_and_settings.sql

-- 1. Kullanıcılara rol ve yasaklama (ban) özellikleri ekleme
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'member'; -- 'admin', 'moderator', 'member'
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT DEFAULT '';

-- İlk kayıtlı kullanıcıyı otomatik olarak admin yap
UPDATE users SET role = 'admin' WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1);

-- 2. Sistem Ayarları ve Parametreleri Tablosu
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Varsayılan sistem parametrelerini ekleme
INSERT INTO system_settings (key, value) VALUES
('site_info', '{
    "site_name": "Fısıltı",
    "site_tagline": "Yeni Nesil Güvenli ve Özel Sohbet",
    "site_url": "http://localhost:3002",
    "logo_url": "",
    "allow_registration": true,
    "default_theme": "dark",
    "maintenance_mode": false
}'::jsonb),
('media_limits', '{
    "max_file_size_mb": 50,
    "allowed_extensions": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".webm", ".mov", ".pdf", ".zip", ".docx", ".txt"],
    "max_voice_seconds": 300,
    "enable_compression": true
}'::jsonb),
('chat_settings', '{
    "allow_message_edit": true,
    "edit_time_limit_minutes": 15,
    "allow_delete_for_all": true,
    "delete_time_limit_minutes": 60,
    "disappearing_messages_default": 0,
    "enable_link_previews": true,
    "enable_social_embeds": true
}'::jsonb),
('call_settings', '{
    "enable_audio_calls": true,
    "enable_video_calls": true,
    "enable_screen_share": true,
    "max_call_duration_minutes": 120
}'::jsonb),
('security_settings', '{
    "max_messages_per_second": 5,
    "max_messages_per_minute": 60,
    "require_strong_passwords": true,
    "lockout_attempts": 5,
    "session_timeout_days": 30
}'::jsonb),
('notification_settings', '{
    "enable_web_push": true,
    "enable_sound_alerts": true,
    "vapid_public_key": "BNh5aJj8u5u8K6H0qC-wX0zT0kM2_f1kE3hP-nL4sO9aB2cD5eF8gH1iJ3kL5mN7oP9qR1sT3uV5wX7yZ9"
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Web Push Bildirim Abonelikleri Tablosu
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
