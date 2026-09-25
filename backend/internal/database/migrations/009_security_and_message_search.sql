-- 009_security_and_message_search.sql
-- Mesaj arama ve güvenlik indeksleri

-- 1. Konuşma blok durumunu hızlandırmak için indeksler
CREATE INDEX IF NOT EXISTS idx_conversations_blocked ON conversations(is_blocked) WHERE is_blocked = TRUE;
CREATE INDEX IF NOT EXISTS idx_conversations_blocked_by ON conversations(blocked_by) WHERE blocked_by IS NOT NULL;

-- 2. Konuşma içi mesaj arama performans indeksi
CREATE INDEX IF NOT EXISTS idx_messages_conversation_search ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON messages(sender_id, recipient_id);

-- 3. Arama optimizasyonu (Metin içi arama sorguları için)
CREATE INDEX IF NOT EXISTS idx_messages_content_pattern ON messages(conversation_id, id) WHERE is_deleted_for_all = FALSE;
