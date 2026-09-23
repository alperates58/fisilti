"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Users,
  Star,
  Settings,
  LogOut,
  ShieldAlert,
  Activity,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
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
  onOpenAdmin?: () => void;
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
  onOpenAdmin,
  onLogout,
}: Props) {
  // Sidebar genişletilmiş / daraltılmış durumu (localStorage ile hatırlar)
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem("fisilti_sidebar_expanded");
    if (saved !== null) {
      setIsExpanded(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    localStorage.setItem("fisilti_sidebar_expanded", String(next));
  };

  const isAdminOrMod = user?.role === "admin" || user?.role === "moderator";

  return (
    <aside
      className={`hidden md:flex ${
        isExpanded ? "w-[240px]" : "w-[68px]"
      } bg-[#14161D] border-r border-[#222631] flex-col justify-between py-4 z-20 flex-shrink-0 select-none transition-all duration-300 ease-in-out relative`}
    >
      {/* Üst Kısım: Logo ve Menü Öğeleri */}
      <div className="flex flex-col w-full px-2.5">
        
        {/* Başlık / Logo & Daralt/Genişlet Butonu (Grupo style) */}
        <div className="flex items-center justify-between mb-5 px-1.5 h-11">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              title="Fısıltı"
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 flex items-center justify-center font-black text-white shadow-lg shadow-rose-950/50 flex-shrink-0 cursor-pointer"
              onClick={toggleSidebar}
            >
              F
            </div>
            {isExpanded && (
              <div className="flex flex-col overflow-hidden whitespace-nowrap animate-fadeIn">
                <span className="font-extrabold text-sm text-white tracking-wide flex items-center gap-1.5">
                  Fısıltı
                  <span className="text-[9px] font-mono uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.2 rounded">
                    v3.15
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">Özel & Güvenli Sohbet</span>
              </div>
            )}
          </div>

          {/* Daralt / Genişlet Toggle Butonu */}
          <button
            onClick={toggleSidebar}
            title={isExpanded ? "Menüyü Daralt" : "Menüyü Genişlet"}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-[#1E222D] transition-colors flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Menü Linkleri */}
        <div className="space-y-1.5 w-full">
          {/* 1. Sohbetler (Chats) */}
          <button
            onClick={() => onTabChange("chats")}
            title="Sohbetler"
            className={`w-full h-11 rounded-xl flex items-center gap-3 px-3 transition-all cursor-pointer ${
              activeTab === "chats"
                ? "bg-rose-600 text-white shadow-md shadow-rose-950/50 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-[#1E222D]"
            }`}
          >
            <div className="relative flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && !isExpanded && (
                <span className="absolute -top-1.5 -right-2 px-1 py-0.2 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow">
                  {unreadCount}
                </span>
              )}
            </div>
            {isExpanded && (
              <div className="flex-1 flex items-center justify-between text-xs whitespace-nowrap overflow-hidden">
                <span>Sohbetler</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
            )}
          </button>

          {/* 2. Kişiler / Rehber (Contacts) */}
          <button
            onClick={() => onTabChange("contacts")}
            title="Kişiler ve Kullanıcılar"
            className={`w-full h-11 rounded-xl flex items-center gap-3 px-3 transition-all cursor-pointer ${
              activeTab === "contacts"
                ? "bg-rose-600 text-white shadow-md shadow-rose-950/50 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-[#1E222D]"
            }`}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            {isExpanded && <span className="text-xs whitespace-nowrap">Kişiler & Rehber</span>}
          </button>

          {/* 3. Yıldızlı Mesajlar (Starred) */}
          <button
            onClick={() => onTabChange("starred")}
            title="Yıldızlı Mesajlar"
            className={`w-full h-11 rounded-xl flex items-center gap-3 px-3 transition-all cursor-pointer ${
              activeTab === "starred"
                ? "bg-rose-600 text-white shadow-md shadow-rose-950/50 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-[#1E222D]"
            }`}
          >
            <div className="relative flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5" />
              {starredCount > 0 && !isExpanded && (
                <span className="absolute -top-1.5 -right-2 px-1 py-0.2 min-w-[16px] h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center shadow">
                  {starredCount}
                </span>
              )}
            </div>
            {isExpanded && (
              <div className="flex-1 flex items-center justify-between text-xs whitespace-nowrap overflow-hidden">
                <span>Yıldızlılar</span>
                {starredCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                    {starredCount}
                  </span>
                )}
              </div>
            )}
          </button>

          {/* 4. Profil & Ayarlar */}
          <button
            onClick={() => {
              onTabChange("settings");
              onOpenSettings();
            }}
            title="Profil & Gizlilik Ayarları"
            className={`w-full h-11 rounded-xl flex items-center gap-3 px-3 transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-rose-600 text-white shadow-md shadow-rose-950/50 font-semibold"
                : "text-slate-400 hover:text-white hover:bg-[#1E222D]"
            }`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {isExpanded && <span className="text-xs whitespace-nowrap">Profil & Ayarlar</span>}
          </button>

          {/* 5. YÖNETİM PANELİ (Admin Control Center - Grupo) */}
          {isAdminOrMod && onOpenAdmin && (
            <div className="pt-2 border-t border-[#222631] mt-2 space-y-1">
              <button
                onClick={onOpenAdmin}
                title="Yönetim Paneli & Site Parametreleri"
                className="w-full h-11 rounded-xl flex items-center gap-3 px-3 text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer shadow-sm group"
              >
                <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-400 group-hover:scale-110 transition-transform" />
                {isExpanded && (
                  <div className="flex items-center justify-between flex-1 text-xs whitespace-nowrap overflow-hidden font-semibold">
                    <span>Yönetim Paneli</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                      Admin
                    </span>
                  </div>
                )}
              </button>

              <button
                onClick={onOpenAdmin}
                title="Sistem Sağlığı & İzleme"
                className="w-full h-10 rounded-xl flex items-center gap-3 px-3 text-slate-400 hover:text-white hover:bg-[#1E222D] transition-all cursor-pointer"
              >
                <Activity className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                {isExpanded && <span className="text-xs whitespace-nowrap">Sistem İzleme</span>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alt Kısım: Kullanıcı Kartı, WS Durumu ve Çıkış */}
      <div className="flex flex-col w-full px-2.5 pt-3 border-t border-[#222631] gap-2">
        {/* Bağlantı Durumu */}
        <div
          title={isConnected ? "WebSocket: Bağlı" : "WebSocket: Bağlantı Kesildi"}
          className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] ${
            isConnected ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isConnected
                ? "bg-emerald-500 shadow-md shadow-emerald-500/80"
                : "bg-rose-500 animate-pulse"
            }`}
          />
          {isExpanded && (
            <span className="text-[10px] font-mono">
              {isConnected ? "Canlı Bağlantı" : "Bağlantı Kesildi"}
            </span>
          )}
        </div>

        {/* Kullanıcı Kartı & Çıkış Yap */}
        {user && (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-[#1A1D26] transition-colors">
            <div
              onClick={onOpenSettings}
              className="flex items-center gap-2.5 overflow-hidden cursor-pointer"
              title={`${user.display_name} (@${user.username})`}
            >
              <img
                src={
                  user.avatar_url ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`
                }
                alt={user.display_name}
                className="w-8 h-8 rounded-xl object-cover border border-slate-700 bg-slate-800 flex-shrink-0"
              />
              {isExpanded && (
                <div className="flex flex-col overflow-hidden text-left whitespace-nowrap">
                  <span className="text-xs font-semibold text-white truncate">
                    {user.display_name}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    @{user.username}
                  </span>
                </div>
              )}
            </div>

            {isExpanded && (
              <button
                onClick={onLogout}
                title="Çıkış Yap"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
