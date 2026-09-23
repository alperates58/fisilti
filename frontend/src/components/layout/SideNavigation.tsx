"use client";

import { MessageSquare, Users, Star, Settings, LogOut } from "lucide-react";
import { User } from "@/store/useAuthStore";

export type NavTab = "chats" | "contacts" | "starred" | "settings";

interface Props {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  unreadCount?: number;
  starredCount?: number;
  isConnected: boolean;
  user: User | null;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export default function SideNavigation({
  activeTab,
  onTabChange,
  unreadCount = 0,
  starredCount = 0,
  isConnected,
  user,
  onOpenSettings,
  onLogout,
}: Props) {
  return (
    <aside className="hidden md:flex w-[64px] bg-grupo-dark-card border-r border-grupo-dark-border flex-col items-center py-4 justify-between z-20 flex-shrink-0 select-none">
      {/* Üst Kısım: Logo ve Ana Menü Butonları */}
      <div className="flex flex-col items-center gap-5 w-full">
        {/* Fısıltı Logo */}
        <div
          title="Fısıltı Özel Sohbet"
          className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-grupo-accent to-grupo-accent-secondary flex items-center justify-center font-black text-white shadow-lg shadow-pink-500/25 mb-1"
        >
          F
        </div>

        {/* 1. Sohbetler (Chats) */}
        <div className="relative">
          <button
            onClick={() => onTabChange("chats")}
            title="Sohbetler"
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeTab === "chats"
                ? "bg-grupo-accent text-white shadow-lg shadow-pink-500/30 scale-105"
                : "text-slate-400 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-md shadow-rose-500/50">
              {unreadCount}
            </span>
          )}
        </div>

        {/* 2. Kişiler / Rehber (Contacts) */}
        <button
          onClick={() => onTabChange("contacts")}
          title="Kişiler ve Kullanıcılar"
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
            activeTab === "contacts"
              ? "bg-grupo-accent text-white shadow-lg shadow-pink-500/30 scale-105"
              : "text-slate-400 hover:text-white hover:bg-slate-800/80"
          }`}
        >
          <Users className="w-5 h-5" />
        </button>

        {/* 3. Yıldızlı Mesajlar (Starred) */}
        <div className="relative">
          <button
            onClick={() => onTabChange("starred")}
            title="Yıldızlı Mesajlar"
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeTab === "starred"
                ? "bg-grupo-accent text-white shadow-lg shadow-pink-500/30 scale-105"
                : "text-slate-400 hover:text-white hover:bg-slate-800/80"
            }`}
          >
            <Star className="w-5 h-5" />
          </button>
          {starredCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-md">
              {starredCount}
            </span>
          )}
        </div>

        {/* 4. Ayarlar (Settings) */}
        <button
          onClick={() => {
            onTabChange("settings");
            onOpenSettings();
          }}
          title="Ayarlar"
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
            activeTab === "settings"
              ? "bg-grupo-accent text-white shadow-lg shadow-pink-500/30 scale-105"
              : "text-slate-400 hover:text-white hover:bg-slate-800/80"
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Alt Kısım: Kullanıcı Avatarı, WS Durumu ve Çıkış */}
      <div className="flex flex-col items-center gap-4">
        {/* WebSocket Canlılık Noktası */}
        <div
          title={isConnected ? "WebSocket: Bağlı" : "WebSocket: Bağlantı Kesildi"}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            isConnected
              ? "bg-emerald-500 shadow-md shadow-emerald-500/80"
              : "bg-rose-500 animate-pulse"
          }`}
        />

        {/* Kullanıcı Avatarı (Tıklanınca Ayarları Açar) */}
        <button
          onClick={onOpenSettings}
          title={`${user?.display_name || "Profil"} - Ayarları Aç`}
          className="relative group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 group-hover:border-pink-500 flex items-center justify-center font-bold text-xs text-pink-400 overflow-hidden transition-all shadow-md">
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={user.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              user?.display_name?.charAt(0).toUpperCase() || "U"
            )}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-grupo-dark-card" />
        </button>

        {/* Çıkış Butonu */}
        <button
          onClick={onLogout}
          title="Çıkış Yap"
          className="w-10 h-10 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}
