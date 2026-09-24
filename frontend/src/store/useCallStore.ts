import { create } from "zustand";
import { api } from "@/lib/api";
import { soundEffects } from "@/lib/sounds";
import { useSocketStore } from "./useSocketStore";

export type CallState = "idle" | "outgoing" | "incoming" | "connected" | "ended";
export type CallType = "audio" | "video";

interface CallerInfo {
  id: string;
  display_name: string;
  avatar_url?: string;
}

interface CallStoreState {
  callState: CallState;
  callType: CallType;
  callId: string | null;
  conversationId: string | null;
  roomName: string | null;
  token: string | null;
  livekitUrl: string;
  caller: CallerInfo | null;
  duration: number; // sn

  initiateCall: (conversationId: string, callType: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => Promise<void>;
  endCall: () => Promise<void>;
  resetCall: () => void;

  onIncomingCall: (payload: any) => void;
  onCallAnswered: (payload?: any) => void;
  onCallRejected: (payload: any) => void;
  onCallEnded: (payload?: any) => void;
}

export function resolveLivekitUrl(serverUrl?: string): string {
  if (typeof window === "undefined") {
    return serverUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || "http://localhost:7880";
  }

  const currentHost = window.location.hostname;
  const currentOrigin = window.location.origin;

  // Yerel geliştirme ortamı
  if (currentHost === "localhost" || currentHost === "127.0.0.1") {
    return serverUrl && !serverUrl.includes("livekit.") ? serverUrl : "http://localhost:7880";
  }

  const candidate = serverUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!candidate) {
    return currentOrigin;
  }

  try {
    const parsed = new URL(candidate);
    // Prod ortamda sunucu localhost döndüyse mevcut origin'e çevir
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return currentOrigin;
    }
    // DNS kaydı bulunmayan varsayılan livekit.<domain> şablonu geldiyse mevcut origin'e düş (Traefik /rtc yönlendirmesiyle çalışır)
    if (parsed.hostname === `livekit.${currentHost}`) {
      return currentOrigin;
    }
    return candidate;
  } catch {
    return currentOrigin;
  }
}

export const useCallStore = create<CallStoreState>((set, get) => ({
  callState: "idle",
  callType: "audio",
  callId: null,
  conversationId: null,
  roomName: null,
  token: null,
  livekitUrl: resolveLivekitUrl(),
  caller: null,
  duration: 0,

  initiateCall: async (conversationId: string, callType: CallType) => {
    try {
      set({
        callState: "outgoing",
        callType,
        conversationId,
        duration: 0,
      });

      const res = await api.post("/calls/initiate", {
        conversation_id: conversationId,
        call_type: callType,
      });

      const { call_id, room_name, token, livekit_url } = res.data;
      set({
        callId: call_id,
        roomName: room_name,
        token: token,
        livekitUrl: resolveLivekitUrl(livekit_url),
      });
    } catch (err: any) {
      const reason = err.response?.data?.error || "Arama başlatılamadı.";
      alert(reason);
      get().resetCall();
    }
  },

  acceptCall: async () => {
    soundEffects.stopRingtone();
    const { callId, conversationId } = get();
    if (!callId || !conversationId) return;

    try {
      await api.post("/calls/accept", {
        call_id: callId,
        conversation_id: conversationId,
      });

      set({ callState: "connected" });
    } catch (err) {
      console.error("Arama kabul edilemedi:", err);
      get().resetCall();
    }
  },

  rejectCall: async (reason = "rejected") => {
    soundEffects.stopRingtone();
    const { callId, conversationId } = get();
    if (callId && conversationId) {
      try {
        await api.post("/calls/reject", {
          call_id: callId,
          conversation_id: conversationId,
          reason,
        });
      } catch (err) {
        console.error("Arama reddedilemedi:", err);
      }
    }
    get().resetCall();
  },

  endCall: async () => {
    soundEffects.stopRingtone();
    const { callId, conversationId, duration } = get();
    if (callId && conversationId) {
      try {
        await api.post("/calls/end", {
          call_id: callId,
          conversation_id: conversationId,
          duration_seconds: duration,
        });
      } catch (err) {
        console.error("Arama sonlandırılamadı:", err);
      }
    }
    get().resetCall();
  },

  resetCall: () => {
    soundEffects.stopRingtone();
    set({
      callState: "idle",
      callId: null,
      conversationId: null,
      roomName: null,
      token: null,
      caller: null,
      duration: 0,
    });
  },

  onIncomingCall: (payload: any) => {
    set({
      callState: "incoming",
      callId: payload.call_id,
      conversationId: payload.conversation_id,
      caller: payload.caller,
      callType: payload.call_type || "audio",
      roomName: payload.room_name,
      token: payload.room_token,
      livekitUrl: resolveLivekitUrl(payload.livekit_url),
      duration: 0,
    });
  },

  onCallAnswered: () => {
    soundEffects.stopRingtone();
    set({ callState: "connected" });
  },

  onCallRejected: (payload: any) => {
    soundEffects.stopRingtone();
    const reasonText =
      payload.reason === "busy" ? "Kullanıcı şu anda meşgul." : "Arama reddedildi.";
    alert(reasonText);
    get().resetCall();
  },

  onCallEnded: () => {
    soundEffects.stopRingtone();
    get().resetCall();
  },
}));
