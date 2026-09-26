import { soundEffects } from "./sounds";
import { resolveMediaUrl } from "./api";

// notifications.ts - Tarayıcı sekme başlığı ve Web Notifications yönetimi

class NotificationManager {
  private defaultTitle = "Aura";
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

  async notify(title: string, body: string, icon?: string, silent?: boolean, forceSystem?: boolean) {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const basePath = rawBasePath.startsWith("/")
      ? rawBasePath.replace(/\/+$/, "")
      : rawBasePath
      ? "/" + rawBasePath.replace(/\/+$/, "")
      : "";
    const defaultIcon = basePath ? `${basePath}/favicon.ico` : "/favicon.ico";
    const notifIcon = icon ? resolveMediaUrl(icon) : defaultIcon;
    const isSilent = silent !== undefined ? silent : !soundEffects.isSoundEnabled();

    // Kullanıcı pencereye odaklı değilse veya sekme arka plandaysa bildir
    const isBackground = document.hidden || !document.hasFocus();

    if (Notification.permission === "granted" && (isBackground || forceSystem)) {
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            const options: any = {
              body,
              icon: notifIcon,
              badge: notifIcon,
              tag: "aura-message",
              silent: isSilent,
              renotify: !isSilent,
            };
            if (!isSilent) {
              options.vibrate = [200, 100, 200];
            }
            await reg.showNotification(title, options);
            return;
          }
        } catch (swErr) {
          console.warn("ServiceWorker bildirim hatası:", swErr);
        }
      }

      try {
        new Notification(title, {
          body,
          icon: notifIcon,
          badge: notifIcon,
          silent: isSilent,
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
        ? `(${unreadCount}) Yeni Mesaj! - Aura`
        : `💬 Aura`;
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
