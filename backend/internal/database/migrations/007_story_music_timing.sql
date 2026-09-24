-- 007_story_music_timing.sql - Hikaye süresi ve müzik başlangıç/bitiş zamanlaması desteği
ALTER TABLE stories ADD COLUMN IF NOT EXISTS duration_seconds INT DEFAULT 10;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS music_start INT DEFAULT 0;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS music_end INT DEFAULT 0;
