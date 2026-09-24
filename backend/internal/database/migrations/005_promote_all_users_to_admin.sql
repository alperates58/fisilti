-- 005_promote_all_users_to_admin.sql
-- Tüm aktif kullanıcılara admin rolü atayarak parametre yönetimini erişilebilir kıl

UPDATE users SET role = 'admin' WHERE is_banned = FALSE;

-- Sistem adı ve başlığını kesin olarak Aura olarak güncelle
UPDATE system_settings
SET value = jsonb_set(value, '{site_name}', '"Aura"')
WHERE key = 'site_info';
