// notifications.ts - Tarayıcı sekme başlığı ve Web Notifications yönetimi

class NotificationManager {
  private originalTitle = "Fısıltı - Özel & Güvenli Sohbet";
  private flashInterval: NodeJS.Timeout | null = null;

  init() {
    if (typeof document !== "undefined") {
      this.originalTitle = document.title || "Fısıltı - Özel & Güvenli Sohbet";
    }
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission !== "denied") {
      const res = await Notification.requestPermission();
      return res === "granted";
    }
    return false;
  }

  notify(title: string, body: string, icon = "/icon-192.png") {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "granted" && document.hidden) {
      try {
        new Notification(title, {
          body,
          icon,
          badge: icon,
        });
      } catch (e) {
        console.warn("Bildirim gösterilemedi:", e);
      }
    }
  }

  flashTitle(unreadCount: number) {
    if (typeof document === "undefined" || unreadCount <= 0) return;

    this.stopFlash();

    let state = false;
    this.flashInterval = setInterval(() => {
      document.title = state
        ? `(${unreadCount}) Yeni Mesaj! - Fısıltı`
        : `💬 Fısıltı Özel Mesaj`;
      state = !state;
    }, 1000);
  }

  stopFlash() {
    if (this.flashInterval) {
      clearInterval(this.flashInterval);
      this.flashInterval = null;
    }
    if (typeof document !== "undefined") {
      document.title = this.originalTitle;
    }
  }
}

export const notificationManager = new NotificationManager();
