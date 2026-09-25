import { create } from "zustand";
import { useChatStore } from "./useChatStore";
import { useAuthStore } from "./useAuthStore";
import { soundEffects } from "@/lib/sounds";
import { notificationManager } from "@/lib/notifications";

interface SocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  isManualDisconnect: boolean;
  connect: (token?: string) => void;
  disconnect: () => void;
  sendAction: (action: string, payload: any) => void;
}

let activeWs: WebSocket | null = null;

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  isManualDisconnect: false,

  connect: (token?: string) => {
    // Oturum açık değilse soket açma
    const isAuthed = useAuthStore.getState().isAuthenticated;
    if (!isAuthed && !token) {
      return;
    }

    if (activeWs && (activeWs.readyState === WebSocket.OPEN || activeWs.readyState === WebSocket.CONNECTING)) {
      return;
    }

    set({ isManualDisconnect: false });

    let wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (typeof window !== "undefined") {
      const isHttps = window.location.protocol === "https:";
      const proto = isHttps ? "wss:" : "ws:";
      const host = window.location.hostname;
      const isLocalhost = host === "localhost" || host === "127.0.0.1";

      if (isLocalhost) {
        if (!wsUrl) wsUrl = "ws://localhost:8080/ws";
      } else {
        // Üretim ortamında: Eğer açıkça harici WS URL'i verilmediyse (localhost içermeyen):
        if (wsUrl && !wsUrl.includes("localhost") && !wsUrl.includes("127.0.0.1")) {
          // Var olan geçerli wsUrl'i kullan
        } else {
          // Subpath tespiti (Örn: /b)
          let basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
          if (!basePath) {
            const match = window.location.pathname.match(/^(\/[a-zA-Z0-9_-]+)/);
            if (match && !["/login", "/register", "/chat", "/settings", "/api"].includes(match[1])) {
              basePath = match[1];
            }
          }
          basePath = basePath.replace(/\/+$/, "");
          if (basePath && !basePath.startsWith("/")) {
            basePath = "/" + basePath;
          }

          const port = window.location.port ? `:${window.location.port}` : "";
          wsUrl = `${proto}//${host}${port}${basePath}/ws`;
        }
      }
    }
    if (!wsUrl) {
      wsUrl = "ws://localhost:8080/ws";
    }
    const url = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;

    if (activeWs) {
      try {
        activeWs.onopen = null;
        activeWs.onclose = null;
        activeWs.onerror = null;
        activeWs.onmessage = null;
        activeWs.close();
      } catch (e) {}
      activeWs = null;
    }

    const ws = new WebSocket(url);
    activeWs = ws;
    set({ socket: ws, isConnected: false });

    ws.onopen = () => {
      if (activeWs !== ws) return;
      console.log("⚡ [WS] WebSocket bağlantısı kuruldu.");
      set({ socket: ws, isConnected: true });
    };

    ws.onclose = () => {
      if (activeWs === ws) {
        console.log("🔌 [WS] WebSocket bağlantısı kapandı.");
        activeWs = null;
        set({ socket: null, isConnected: false });
        // Eğer kullanıcı çıkış yapmadıysa ve hala giriş yapmış durumdaysa yeniden bağlan
        if (!get().isManualDisconnect && useAuthStore.getState().isAuthenticated) {
          setTimeout(() => {
            if (!activeWs && !get().isManualDisconnect && useAuthStore.getState().isAuthenticated) {
              get().connect(token);
            }
          }, 3000);
        }
      }
    };

    ws.onerror = (err) => {
      console.error("❌ [WS] Hata:", err);
    };

    ws.onmessage = (event) => {
      // Oturum kapatıldıysa mesajları işleme ve ACK gönderme
      if (!useAuthStore.getState().isAuthenticated) {
        return;
      }
      try {
        const data = JSON.parse(event.data);
        const chatStore = useChatStore.getState();

        switch (data.action) {
          case "message_sent":
            soundEffects.playSent();
            chatStore.onMessageSent(data.payload.temp_id, data.payload.message);
            break;

          case "new_message": {
            const currentList = chatStore.messages[data.payload.conversation_id] || [];
            const isDuplicate = currentList.some((m) => m.id === data.payload.id);

            chatStore.onNewMessage(data.payload);

            // Sadece ilk kez alındığında ses çal
            if (!isDuplicate) {
              soundEffects.playReceived();
            }

            // Mesajın ulaştığını onayla
            get().sendAction("delivered_ack", { message_ids: [data.payload.id] });

            // Kullanıcı şu an bu sohbette mi ve ekran açık/odaklanmış mı?
            const isVisibleAndFocused =
              typeof document !== "undefined" &&
              !document.hidden &&
              document.visibilityState === "visible" &&
              document.hasFocus();

            const isCurrentChatActive =
              isVisibleAndFocused && chatStore.activeConversationId === data.payload.conversation_id;

            if (isCurrentChatActive) {
              // Kullanıcı zaten aktif olarak bu sohbet ekranında!
              // Yanıp sönmeyi durdur ve anında okundu bilgisi gönder
              notificationManager.stopFlash();
              get().sendAction("read_ack", {
                conversation_id: data.payload.conversation_id,
                message_ids: [data.payload.id],
              });
            } else if (!isDuplicate) {
              // Kullanıcı başka sohbette veya tarayıcı arka planda / telefon kilitli
              notificationManager.notify("Aura - Yeni Mesaj", data.payload.content || "Yeni bir mesaj aldınız.");
              notificationManager.flashTitle(1);
            }
            break;
          }

          case "message_delivered":
            chatStore.onMessageDelivered(data.payload.message_ids, data.payload.delivered_at);
            break;

          case "message_read":
            chatStore.onMessageRead(
              data.payload.conversation_id,
              data.payload.message_ids,
              data.payload.read_at
            );
            break;

          case "user_typing":
            chatStore.onUserTyping(
              data.payload.conversation_id,
              data.payload.user_id,
              data.payload.is_typing
            );
            break;

          case "presence_update":
            chatStore.onPresenceUpdate(
              data.payload.user_id,
              data.payload.status,
              data.payload.last_seen_at
            );
            break;

          case "message_edited":
            chatStore.onMessageEdited(data.payload.message_id, data.payload.content);
            break;

          case "message_deleted":
            chatStore.onMessageDeleted(data.payload.message_id, data.payload.is_deleted_for_all);
            break;

          case "message_reaction":
            chatStore.onMessageReaction(data.payload.message_id, data.payload.reactions);
            break;

          case "system_settings_updated":
            import("./useSettingsStore").then(({ useSettingsStore }) => {
              useSettingsStore.getState().updateSettingLocally(data.payload.key, data.payload.value);
            });
            break;

          case "incoming_call":
            soundEffects.startRingtone();
            import("./useCallStore").then(({ useCallStore }) => {
              useCallStore.getState().onIncomingCall(data.payload);
            });
            break;

          case "call_answered":
            soundEffects.stopRingtone();
            import("./useCallStore").then(({ useCallStore }) => {
              useCallStore.getState().onCallAnswered(data.payload);
            });
            break;

          case "call_rejected":
            soundEffects.stopRingtone();
            import("./useCallStore").then(({ useCallStore }) => {
              useCallStore.getState().onCallRejected(data.payload);
            });
            break;

          case "call_ended":
            soundEffects.stopRingtone();
            import("./useCallStore").then(({ useCallStore }) => {
              useCallStore.getState().onCallEnded(data.payload);
            });
            break;
        }
      } catch (e) {
        console.error("Mesaj parse edilemedi:", e);
      }
    };
  },

  disconnect: () => {
    set({ isManualDisconnect: true, socket: null, isConnected: false });
    if (activeWs) {
      try {
        activeWs.onopen = null;
        activeWs.onclose = null;
        activeWs.onerror = null;
        activeWs.onmessage = null;
        activeWs.close(1000, "User logged out");
      } catch (e) {
        console.error("Soket kapatılırken hata:", e);
      }
      activeWs = null;
    }
  },

  sendAction: (action: string, payload: any) => {
    const ws = get().socket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action, payload }));
    }
  },
}));
