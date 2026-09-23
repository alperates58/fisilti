import { create } from "zustand";
import { api } from "@/lib/api";
import { useSocketStore } from "./useSocketStore";
import { User } from "./useAuthStore";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  reply_to_id?: string;
  message_type: string;
  content: string;
  media_url?: string;
  media_metadata?: any;
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
  tick_status: "sent" | "delivered" | "read";
  is_mine: boolean;
  is_edited: boolean;
  is_starred: boolean;
  is_deleted_for_all: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  other_user: User;
  last_message?: Message;
  unread_count: number;
  is_online: boolean;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversation_id -> Message[]
  typingMap: Record<string, boolean>; // conversation_id -> isTyping
  selectedMessageInfo: Message | null;

  loadConversations: () => Promise<void>;
  selectConversation: (convId: string) => Promise<void>;
  loadMessages: (convId: string) => Promise<void>;
  sendMessage: (convId: string, content: string, type?: string) => void;
  sendTyping: (convId: string, isTyping: boolean) => void;
  setSelectedMessageInfo: (msg: Message | null) => void;

  onMessageSent: (tempId: string, confirmed: Message) => void;
  onNewMessage: (msg: Message) => void;
  onMessageDelivered: (messageIds: string[], deliveredAt: string) => void;
  onMessageRead: (convId: string, messageIds: string[], readAt: string) => void;
  onUserTyping: (convId: string, userId: string, isTyping: boolean) => void;
  onPresenceUpdate: (userId: string, status: number, lastSeenAt: string) => void;
  startNewConversation: (recipientId: string) => Promise<string>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingMap: {},
  selectedMessageInfo: null,

  loadConversations: async () => {
    try {
      const res = await api.get<Conversation[]>("/conversations");
      set({ conversations: res.data });
    } catch (err) {
      console.error("Konuşmalar yüklenemedi:", err);
    }
  },

  selectConversation: async (convId: string) => {
    set({ activeConversationId: convId });
    await get().loadMessages(convId);

    // Açılan sohbetteki okunmamış mesajlar için read_ack gönder
    useSocketStore.getState().sendAction("read_ack", {
      conversation_id: convId,
    });

    // Unread count'u sıfırla
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === convId ? { ...c, unread_count: 0 } : c
      ),
    }));
  },

  loadMessages: async (convId: string) => {
    try {
      const res = await api.get<Message[]>(`/conversations/${convId}/messages`);
      set((state) => ({
        messages: {
          ...state.messages,
          [convId]: res.data,
        },
      }));
    } catch (err) {
      console.error("Mesajlar yüklenemedi:", err);
    }
  },

  sendMessage: (convId: string, content: string, type = "text") => {
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: convId,
      sender_id: "",
      recipient_id: "",
      message_type: type,
      content,
      sent_at: new Date().toISOString(),
      tick_status: "sent",
      is_mine: true,
      is_edited: false,
      is_starred: false,
      is_deleted_for_all: false,
      created_at: new Date().toISOString(),
    };

    // İyimser (optimistic) ekleme
    set((state) => ({
      messages: {
        ...state.messages,
        [convId]: [...(state.messages[convId] || []), optimisticMsg],
      },
    }));

    // WebSocket üzerinden gönder
    useSocketStore.getState().sendAction("send_message", {
      conversation_id: convId,
      message_type: type,
      content,
      temp_id: tempId,
    });

    // Yazıyor durumunu durdur
    get().sendTyping(convId, false);
  },

  sendTyping: (convId: string, isTyping: boolean) => {
    const action = isTyping ? "typing_start" : "typing_stop";
    useSocketStore.getState().sendAction(action, { conversation_id: convId });
  },

  setSelectedMessageInfo: (msg: Message | null) => {
    set({ selectedMessageInfo: msg });
  },

  onMessageSent: (tempId: string, confirmed: Message) => {
    set((state) => {
      const convId = confirmed.conversation_id;
      const list = state.messages[convId] || [];
      const updated = list.map((m) => (m.id === tempId ? confirmed : m));

      // Konuşma listesinde son mesajı güncelle
      const updatedConvs = state.conversations.map((c) =>
        c.id === convId ? { ...c, last_message: confirmed } : c
      );

      return {
        messages: { ...state.messages, [convId]: updated },
        conversations: updatedConvs,
      };
    });
  },

  onNewMessage: (msg: Message) => {
    set((state) => {
      const convId = msg.conversation_id;
      const list = state.messages[convId] || [];
      const isCurrentActive = state.activeConversationId === convId;

      const updatedConvs = state.conversations.map((c) => {
        if (c.id === convId) {
          return {
            ...c,
            last_message: msg,
            unread_count: isCurrentActive ? 0 : c.unread_count + 1,
          };
        }
        return c;
      });

      return {
        messages: { ...state.messages, [convId]: [...list, msg] },
        conversations: updatedConvs,
      };
    });
  },

  onMessageDelivered: (messageIds: string[], deliveredAt: string) => {
    set((state) => {
      const newMessages = { ...state.messages };
      for (const convId in newMessages) {
        newMessages[convId] = newMessages[convId].map((m) => {
          if (messageIds.includes(m.id)) {
            return {
              ...m,
              delivered_at: deliveredAt,
              tick_status: m.tick_status === "read" ? "read" : "delivered",
            };
          }
          return m;
        });
      }
      return { messages: newMessages };
    });
  },

  onMessageRead: (convId: string, messageIds: string[], readAt: string) => {
    set((state) => {
      const list = state.messages[convId];
      if (!list) return state;

      const updated = list.map((m) => {
        if (messageIds.length === 0 || messageIds.includes(m.id)) {
          return {
            ...m,
            read_at: readAt,
            tick_status: "read" as const,
          };
        }
        return m;
      });

      return {
        messages: { ...state.messages, [convId]: updated },
      };
    });
  },

  onUserTyping: (convId: string, userId: string, isTyping: boolean) => {
    set((state) => ({
      typingMap: {
        ...state.typingMap,
        [convId]: isTyping,
      },
    }));
  },

  onPresenceUpdate: (userId: string, status: number, lastSeenAt: string) => {
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.other_user.id === userId) {
          return {
            ...c,
            is_online: status === 1,
            other_user: {
              ...c.other_user,
              online_status: status,
              last_seen_at: lastSeenAt,
            },
          };
        }
        return c;
      }),
    }));
  },

  startNewConversation: async (recipientId: string) => {
    const res = await api.post<Conversation>("/conversations", { recipient_id: recipientId });
    await get().loadConversations();
    await get().selectConversation(res.data.id);
    return res.data.id;
  },
}));
