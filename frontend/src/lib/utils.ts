// ==========================================
// FISILTI - WhatsApp Tarzı Tarih ve Saat Araçları
// ==========================================

/**
 * WhatsApp tarzı Son Görülme (Last Seen) formatlayıcı
 * @param lastSeenAt ISO8601 tarih damgası
 * @param allowLastSeen Gizlilik ayarı (false ise son görülme gizlenir)
 */
export function formatLastSeen(lastSeenAt?: string | null, allowLastSeen: boolean = true): string {
  if (allowLastSeen === false) {
    return "";
  }

  if (!lastSeenAt) {
    return "son görülme yakınlarda";
  }

  const date = new Date(lastSeenAt);
  if (isNaN(date.getTime()) || date.getFullYear() <= 1970) {
    return "son görülme yakınlarda";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Henüz gerçekleşmiş veya 1 dakikadan az
  if (diffMs < 60 * 1000 && diffMs >= 0) {
    return "son görülme az önce";
  }

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const timeStr = `${hours}:${minutes}`;

  // Bugün mü?
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return `son görülme bugün ${timeStr}`;
  }

  // Dün mü?
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `son görülme dün ${timeStr}`;
  }

  // Bu yıl içinde mi?
  if (date.getFullYear() === now.getFullYear()) {
    const months = [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];
    return `son görülme ${date.getDate()} ${months[date.getMonth()]} ${timeStr}`;
  }

  // Daha eski bir yıl
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `son görülme ${day}.${month}.${date.getFullYear()} ${timeStr}`;
}

/**
 * Mesaj saati formatlayıcı (Örn: 14:32)
 */
export function formatMessageTime(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
