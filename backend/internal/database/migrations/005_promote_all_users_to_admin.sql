-- 005_promote_all_users_to_admin.sql
-- GÜVENLİK HARDENING: Toplu admin terfi sorgusu güvenlik açığı oluşturduğu için devre dışı bırakıldı.
-- Mevcut canlı roller korunur; yeni ve mevcut üyelerin yetki aşımı engellenmiştir.
-- (Devre dışı: UPDATE users SET role = 'admin' WHERE is_banned = FALSE;)

-- Sistem adı ve başlığını kesin olarak Aura olarak güncelle
UPDATE system_settings
SET value = jsonb_set(value, '{site_name}', '"Aura"')
WHERE key = 'site_info';

