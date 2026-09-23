// notifications.ts - Tarayıcı sekme başlığı ve Web Notifications yönetimi

class NotificationManager {
  private defaultTitle = "Fısıltı - Özel & Güvenli Sohbet";
  private flashInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  init() {
    if (typeof window === "undefined" || this.isInitialized) return;
    this.isInitialized = true;

    // Kullanıcı sekmeye odaklandığında, tıkladığında veya sekme görünür olduğunda yanıp sönmeyi anında durdur
    window.addEventListener("focus", () => {
      this.stopFlash();
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && document.visibilityState === "visible") {
        this.stopFlash();
      }
    });

    window.addEventListener("click", () => {
      this.stopFlash();
    });
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

  flashTitle(unreadCount: number = 1) {
    if (typeof document === "undefined" || unreadCount <= 0) return;

    // Kullanıcı zaten aktif olarak sekmeye odaklanmış ve görüyorsa ASLA yanıp söndürme
    if (!document.hidden && document.visibilityState === "visible" && document.hasFocus()) {
      this.stopFlash();
      return;
    }

    this.stopFlash();

    let state = false;
    this.flashInterval = setInterval(() => {
      // Eğer kullanıcı bu esnada sayfaya döndüyse anında durdur
      if (!document.hidden && document.visibilityState === "visible" && document.hasFocus()) {
        this.stopFlash();
        return;
      }

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
      document.title = this.defaultTitle;
    }
  }

  isFlashing(): boolean {
    return this.flashInterval !== null;
  }
}

export const notificationManager = new NotificationManager();
