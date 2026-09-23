import { create } from "zustand";
import { useChatStore } from "./useChatStore";
import { soundEffects } from "@/lib/sounds";
import { notificationManager } from "@/lib/notifications";

interface SocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  connect: (token?: string) => void;
  disconnect: () => void;
  sendAction: (action: string, payload: any) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (token?: string) => {
    if (get().socket) {
      return; // Zaten bağlı
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";
    const url = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("⚡ [WS] WebSocket bağlantısı kuruldu.");
      set({ socket: ws, isConnected: true });
    };

    ws.onclose = () => {
      console.log("🔌 [WS] WebSocket bağlantısı kapandı.");
      set({ socket: null, isConnected: false });
      // 3 saniye sonra otomatik yeniden bağlan
      setTimeout(() => {
        if (!get().socket) {
          get().connect(token);
        }
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error("❌ [WS] Hata:", err);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const chatStore = useChatStore.getState();

        switch (data.action) {
          case "message_sent":
            soundEffects.playSent();
            chatStore.onMessageSent(data.payload.temp_id, data.payload.message);
            break;

          case "new_message":
            soundEffects.playReceived();
            notificationManager.notify("Fısıltı - Yeni Mesaj", data.payload.content || "Yeni bir mesaj aldınız.");
            notificationManager.flashTitle(1);
            chatStore.onNewMessage(data.payload);
            // Mesajın ulaştığını onayla
            get().sendAction("delivered_ack", { message_ids: [data.payload.id] });
            // Eğer aktif açık sohbetse anında okundu da yolla
            if (chatStore.activeConversationId === data.payload.conversation_id) {
              get().sendAction("read_ack", {
                conversation_id: data.payload.conversation_id,
                message_ids: [data.payload.id],
              });
            }
            break;

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
    const ws = get().socket;
    if (ws) {
      ws.close();
      set({ socket: null, isConnected: false });
    }
  },

  sendAction: (action: string, payload: any) => {
    const ws = get().socket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action, payload }));
    }
  },
}));
