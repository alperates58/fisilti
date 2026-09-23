// admin_api.ts - Yönetim Paneli & Sistem Parametreleri API İstemcisi

import { api } from "./api";
import { User } from "@/store/useAuthStore";

export interface SystemSettings {
  site_info: {
    site_name: string;
    site_tagline: string;
    site_url: string;
    logo_url: string;
    allow_registration: boolean;
    default_theme: string;
    maintenance_mode: boolean;
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
  security_settings: {
    max_messages_per_second: number;
    max_messages_per_minute: number;
    require_strong_passwords: boolean;
    lockout_attempts: number;
    session_timeout_days: number;
  };
  notification_settings: {
    enable_web_push: boolean;
    enable_sound_alerts: boolean;
    vapid_public_key: string;
  };
}

export interface AdminUsersResponse {
  users: User[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminStatsResponse {
  total_users: number;
  online_users: number;
  banned_users: number;
  total_messages: number;
  total_media: number;
  total_calls: number;
  total_call_seconds: number;
  system_health: {
    postgres: string;
    redis: string;
    livekit: string;
    minio: string;
    goroutines: number;
    allocated_ram_mb: number;
    sys_ram_mb: number;
    num_gc: number;
  };
}

export interface AdminAccessLog {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  ip_address: string;
  user_agent: string;
  device_info: string;
  created_at: string;
}

export const adminApi = {
  getSettings: async (): Promise<SystemSettings> => {
    const res = await api.get<SystemSettings>("/admin/settings");
    return res.data;
  },

  updateSetting: async (key: string, value: any): Promise<void> => {
    await api.put("/admin/settings", { key, value });
  },

  getUsers: async (params?: {
    search?: string;
    role?: string;
    banned?: string;
    limit?: number;
    offset?: number;
  }): Promise<AdminUsersResponse> => {
    const res = await api.get<AdminUsersResponse>("/admin/users", { params });
    return res.data;
  },

  updateUser: async (
    id: string,
    data: { role: string; is_banned: boolean; ban_reason: string }
  ): Promise<void> => {
    await api.put(`/admin/users/${id}`, data);
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

  getStats: async (): Promise<AdminStatsResponse> => {
    const res = await api.get<AdminStatsResponse>("/admin/stats");
    return res.data;
  },

  getAccessLogs: async (limit: number = 50): Promise<AdminAccessLog[]> => {
    const res = await api.get<AdminAccessLog[]>("/admin/access-logs", {
      params: { limit },
    });
    return res.data;
  },
};
