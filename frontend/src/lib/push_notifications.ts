// push_notifications.ts - Web Push Notifications & Service Worker Entegrasyonu

import { api } from "./api";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function isPushNotificationSupported(): Promise<boolean> {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!(await isPushNotificationSupported())) return null;
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription();
}

export async function subscribeUserToPush(): Promise<{ success: boolean; message: string }> {
  try {
    if (!(await isPushNotificationSupported())) {
      return { success: false, message: "Tarayıcınız Web Push bildirimlerini desteklemiyor." };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, message: "Bildirim izni verilmedi." };
    }

    // 1. Backend'den VAPID public key al
    const res = await api.get<{ public_key: string }>("/notifications/vapid-key");
    const vapidPublicKey = res.data.public_key;
    if (!vapidPublicKey) {
      return { success: false, message: "VAPID anahtarı alınamadı." };
    }

    // 2. Service Worker push subscription oluştur
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    // 3. Backend'e kaydet
    const subJSON = subscription.toJSON();
    await api.post("/notifications/subscribe", {
      endpoint: subJSON.endpoint,
      p256dh: subJSON.keys?.p256dh,
      auth: subJSON.keys?.auth,
    });

    return { success: true, message: "Web Push bildirimleri başarıyla aktifleştirildi." };
  } catch (err: any) {
    console.error("Push subscription hatası:", err);
    return { success: false, message: err.response?.data?.error || err.message || "Bildirim aboneliği oluşturulamadı." };
  }
}

export async function unsubscribeUserFromPush(): Promise<{ success: boolean; message: string }> {
  try {
    const subscription = await getPushSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      try {
        await api.post("/notifications/unsubscribe", { endpoint });
      } catch (e) {
        // Hata olsa da yerel abonelik kalktı
      }
    }
    return { success: true, message: "Push bildirimleri kapatıldı." };
  } catch (err: any) {
    return { success: false, message: err.message || "Abonelik iptal edilemedi." };
  }
}

export async function sendTestPushNotification(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await api.post<{ message: string; sent_count: number }>("/notifications/test");
    return { success: true, message: res.data.message };
  } catch (err: any) {
    return { success: false, message: err.response?.data?.error || "Test bildirimi gönderilemedi." };
  }
}
