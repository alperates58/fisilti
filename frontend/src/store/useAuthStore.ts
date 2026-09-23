import { create } from "zustand";
import { api } from "@/lib/api";

export interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string;
  bio: string;
  online_status: number;
  last_seen_at: string;
  privacy_settings: {
    read_receipts: boolean;
    last_seen: boolean;
    allow_calls: boolean;
  };
  created_at: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<boolean>;
  login: (login: string, pass: string) => Promise<void>;
  register: (username: string, displayName: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (displayName: string, bio: string) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  updatePrivacy: (settings: Partial<User["privacy_settings"]>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get<User>("/auth/me");
      set({ user: res.data, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  login: async (login, password) => {
    const res = await api.post<{ user: User }>("/auth/login", { login, password });
    set({ user: res.data.user, isAuthenticated: true });
  },

  register: async (username, displayName, email, password) => {
    const res = await api.post<{ user: User }>("/auth/register", {
      username,
      display_name: displayName,
      email,
      password,
    });
    set({ user: res.data.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      // 1. WebSocket'i manuel olarak kapat ve otomatik yeniden bağlanmasını engelle
      const { useSocketStore } = await import("./useSocketStore");
      useSocketStore.getState().disconnect();

      // 2. ChatStore durumunu sıfırla (aktif sohbeti ve mesajları temizle)
      const { useChatStore } = await import("./useChatStore");
      useChatStore.getState().reset();

      // 3. Arama durumunu sıfırla
      const { useCallStore } = await import("./useCallStore");
      useCallStore.getState().resetCall();

      // 4. Sunucuya logout isteği gönder (sunucu da soketi kapatıp offline yayınlar)
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Çıkış hatası:", err);
    } finally {
      set({ user: null, isAuthenticated: false });
    }
  },

  updateProfile: async (displayName, bio) => {
    const res = await api.put<User>("/users/profile", { display_name: displayName, bio });
    set({ user: res.data });
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await api.post<{ avatar_url: string }>("/users/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, avatar_url: res.data.avatar_url } });
    }
    return res.data.avatar_url;
  },

  updatePrivacy: async (settings) => {
    const res = await api.patch<{ privacy_settings: User["privacy_settings"] }>("/users/privacy", settings);
    const currentUser = get().user;
    if (currentUser) {
      set({
        user: {
          ...currentUser,
          privacy_settings: res.data.privacy_settings,
        },
      });
    }
  },
}));
