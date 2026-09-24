import { create } from "zustand";
import { getApiBaseUrl } from "@/lib/api";
import axios from "axios";

export interface PublicSettings {
  site_info: {
    site_name: string;
    site_tagline: string;
    site_url: string;
    logo_url: string;
    allow_registration: boolean;
    default_theme: string;
    maintenance_mode: boolean;
  };
  theme_settings: {
    primary_color: string;
    card_bg: string;
    nav_bg: string;
    main_bg: string;
    border_color: string;
    outgoing_bubble: string;
    incoming_bubble: string;
    font_family: string;
    border_radius: string;
  };
  media_limits: {
    max_file_size_mb: number;
    allowed_extensions: string[];
    max_voice_seconds: number;
    enable_compression: boolean;
  };
  chat_settings: {
    allow_message_edit: boolean;
    edit_time_limit_minutes: number;
    allow_delete_for_all: boolean;
    delete_time_limit_minutes: number;
    disappearing_messages_default: number;
    enable_link_previews: boolean;
    enable_social_embeds: boolean;
  };
  call_settings: {
    enable_audio_calls: boolean;
    enable_video_calls: boolean;
    enable_screen_share: boolean;
    max_call_duration_minutes: number;
  };
}

export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  site_info: {
    site_name: "Aura",
    site_tagline: "",
    site_url: "",
    logo_url: "",
    allow_registration: true,
    default_theme: "dark",
    maintenance_mode: false,
  },
  theme_settings: {
    primary_color: "#E91E63",
    card_bg: "#16191E",
    nav_bg: "#0F1115",
    main_bg: "#0D0F12",
    border_color: "#23272F",
    outgoing_bubble: "#BE185D",
    incoming_bubble: "#1E232B",
    font_family: "Inter",
    border_radius: "rounded-2xl",
  },
  media_limits: {
    max_file_size_mb: 50,
    allowed_extensions: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".webm", ".mov", ".pdf", ".zip", ".docx", ".txt"],
    max_voice_seconds: 300,
    enable_compression: true,
  },
  chat_settings: {
    allow_message_edit: true,
    edit_time_limit_minutes: 15,
    allow_delete_for_all: true,
    delete_time_limit_minutes: 60,
    disappearing_messages_default: 0,
    enable_link_previews: true,
    enable_social_embeds: true,
  },
  call_settings: {
    enable_audio_calls: true,
    enable_video_calls: true,
    enable_screen_share: true,
    max_call_duration_minutes: 120,
  },
};

export const applyThemeToDocument = (theme: Partial<PublicSettings["theme_settings"]>) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme.primary_color) {
    root.style.setProperty("--accent", theme.primary_color);
    root.style.setProperty("--primary", theme.primary_color);
  }
  if (theme.card_bg) {
    root.style.setProperty("--card", theme.card_bg);
  }
  if (theme.border_color) {
    root.style.setProperty("--border", theme.border_color);
  }
  if (theme.outgoing_bubble) {
    root.style.setProperty("--outgoing-bubble", theme.outgoing_bubble);
  }
  if (theme.incoming_bubble) {
    root.style.setProperty("--incoming-bubble", theme.incoming_bubble);
  }
};

interface SettingsStore {
  settings: PublicSettings;
  isLoaded: boolean;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettingLocally: (key: string, value: any) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_PUBLIC_SETTINGS,
  isLoaded: false,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const url = `${getApiBaseUrl()}/public/settings`;
      const res = await axios.get<PublicSettings>(url, { withCredentials: true, timeout: 5000 });
      if (res.data && res.data.site_info) {
        set({ settings: res.data, isLoaded: true, isLoading: false });
        if (res.data.theme_settings) {
          applyThemeToDocument(res.data.theme_settings);
        }
        if (res.data.site_info.site_name && typeof document !== "undefined") {
          document.title = res.data.site_info.site_name;
        }
      }
    } catch (e) {
      console.warn("Aura sistem parametreleri yüklenemedi:", e);
      set({ isLoading: false, isLoaded: true });
    }
  },

  updateSettingLocally: (key: string, value: any) => {
    set((state) => {
      const updated = { ...state.settings, [key]: value };
      if (key === "theme_settings") {
        applyThemeToDocument(value);
      }
      return { settings: updated };
    });
  },
}));
