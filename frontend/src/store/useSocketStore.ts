import { create } from "zustand";
import { useChatStore } from "./useChatStore";

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
            chatStore.onMessageSent(data.payload.temp_id, data.payload.message);
            break;

          case "new_message":
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
