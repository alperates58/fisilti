"use client";

import React, { useState, useEffect } from "react";
import {
  adminApi,
  SystemSettings,
  AdminStatsResponse,
  AdminAccessLog,
} from "@/lib/admin_api";
import { User } from "@/store/useAuthStore";
import {
  ShieldAlert,
  Users,
  Sliders,
  MessageSquare,
  PhoneCall,
  Activity,
  FileText,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Save,
  RefreshCw,
  Ban,
  UserCheck,
  Palette,
  Sparkles,
  Lock,
  Globe,
  Radio,
  Check,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType =
  | "users"
  | "theme"
  | "general"
  | "chat"
  | "calls"
  | "security"
  | "logs"
  | "stats";

const COLOR_PRESETS = [
  { name: "Grupo Pembe", color: "#E91E63", hover: "#D81B60" },
  { name: "Zümrüt Yeşili", color: "#10B981", hover: "#059669" },
  { name: "Okyanus Mavisi", color: "#0284C7", hover: "#0369A1" },
  { name: "Gece Mavisi", color: "#3B82F6", hover: "#2563EB" },
  { name: "Kraliyet Moru", color: "#8B5CF6", hover: "#7C3AED" },
  { name: "Gün Batımı", color: "#F59E0B", hover: "#D97706" },
  { name: "Yakut Kırmızı", color: "#EF4444", hover: "#DC2626" },
  { name: "Siber Turkuaz", color: "#06B6D4", hover: "#0891B2" },
];

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Stats & Logs state
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [accessLogs, setAccessLogs] = useState<AdminAccessLog[]>([]);

  // Theme customizer state
  const [accentColor, setAccentColor] = useState("#E91E63");
  const [cardBgColor, setCardBgColor] = useState("#16191E");
  const [borderColor, setBorderColor] = useState("#1E293B");
  const [outgoingBubble, setOutgoingBubble] = useState("#BE185D");
  const [fontFamily, setFontFamily] = useState("Inter");

  // Load initial tab data
  useEffect(() => {
    if (!isOpen) return;

    loadSettings();
    if (activeTab === "users") loadUsers();
    if (activeTab === "stats") loadStats();
    if (activeTab === "logs") loadLogs();
  }, [isOpen, activeTab]);

  const applyThemeToDocument = (
    accent: string,
    card: string,
    border: string
  ) => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--accent", accent);
      document.documentElement.style.setProperty("--card", card);
      document.documentElement.style.setProperty("--border", border);
    }
  };

  const loadSettings = async () => {
    setIsSettingsLoading(true);
    setSettingsError(null);
    try {
      const data = await adminApi.getSettings();
      setSettings(data);
      if (data.theme_settings) {
        setAccentColor(data.theme_settings.primary_color || "#E91E63");
        setCardBgColor(data.theme_settings.card_bg || "#16191E");
        setBorderColor(data.theme_settings.border_color || "#1E293B");
        setOutgoingBubble(data.theme_settings.outgoing_bubble || "#BE185D");
        setFontFamily(data.theme_settings.font_family || "Inter");
        applyThemeToDocument(
          data.theme_settings.primary_color || "#E91E63",
          data.theme_settings.card_bg || "#16191E",
          data.theme_settings.border_color || "#1E293B"
        );
      }
    } catch (e: any) {
      console.error("Ayarlar yüklenemedi", e);
      setSettingsError(e.response?.data?.error || "Ayarlar yüklenemedi.");
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getUsers({
        search: searchQuery,
        role: roleFilter,
        limit: 50,
      });
      setUsers(res.users);
      setTotalUsers(res.total);
    } catch (e) {
      console.error("Kullanıcılar alınamadı", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getStats();
      setStats(res);
    } catch (e) {
      console.error("İstatistikler alınamadı", e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getAccessLogs(50);
      setAccessLogs(res);
    } catch (e) {
      console.error("Günlükler alınamadı", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSetting = async (key: string, value: any) => {
    try {
      await adminApi.updateSetting(key, value);
      setSaveSuccess(`"${key}" parametreleri kaydedildi!`);
      setTimeout(() => setSaveSuccess(null), 3000);
      loadSettings();
    } catch (e) {
      alert("Ayar kaydedilirken bir hata oluştu.");
    }
  };

  const handleSaveTheme = async () => {
    const updatedTheme = {
      primary_color: accentColor,
      card_bg: cardBgColor,
      nav_bg: "#0F1115",
      main_bg: "#0B0C0F",
      border_color: borderColor,
      outgoing_bubble: outgoingBubble,
      incoming_bubble: cardBgColor,
      font_family: fontFamily,
      border_radius: "rounded-2xl",
    };
    applyThemeToDocument(accentColor, cardBgColor, borderColor);
    await handleSaveSetting("theme_settings", updatedTheme);
  };

  const handleUpdateUserRole = async (user: User, newRole: string) => {
    try {
      await adminApi.updateUser(user.id, {
        role: newRole,
        is_banned: user.is_banned || false,
        ban_reason: user.ban_reason || "",
      });
      loadUsers();
    } catch (e) {
      alert("Rol güncellenemedi.");
    }
  };

  const handleToggleUserBan = async (user: User) => {
    const nextBanStatus = !user.is_banned;
    const reason = nextBanStatus
      ? prompt("Yasaklama gerekçesi (isteğe bağlı):") || "Yönetici tarafından askıya alındı"
      : "";

    try {
      await adminApi.updateUser(user.id, {
        role: user.role || "member",
        is_banned: nextBanStatus,
        ban_reason: reason,
      });
      loadUsers();
    } catch (e) {
      alert("Kullanıcı durumu güncellenemedi.");
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`@${username} kullanıcısını ve tüm verilerini kalıcı olarak silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await adminApi.deleteUser(userId);
      loadUsers();
    } catch (e) {
      alert("Kullanıcı silinemedi.");
    }
  };

  if (!isOpen) return null;

  const NAV_ITEMS = [
    { id: "users", label: `Kullanıcılar (${totalUsers})`, icon: Users },
    { id: "theme", label: "Tema & Renkler", icon: Palette, badge: "Yeni" },
    { id: "general", label: "Genel & Markalama", icon: Globe },
    { id: "chat", label: "Sohbet & Medya", icon: MessageSquare },
    { id: "calls", label: "Arama & WebRTC", icon: PhoneCall },
    { id: "security", label: "Güvenlik & Limitler", icon: Lock },
    { id: "logs", label: "Erişim Günlükleri", icon: FileText },
    { id: "stats", label: "Sistem Sağlığı", icon: Activity },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Karartma Katmanı (Backdrop) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* GRUPO TARZI SOL ÇEKMECE PANELİ (Left Sidebar Drawer) */}
      <div className="fixed inset-y-0 left-0 max-w-full flex z-50">
        <div className="w-screen max-w-2xl sm:max-w-3xl bg-[#0D0F14] border-r border-[#222631] shadow-2xl flex flex-col animate-in slide-in-from-left duration-250 text-slate-200">
          
          {/* Çekmece Üst Başlığı (Header) */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#222631] bg-[#12151C] flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-pink-950/40">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    Sistem Yönetim & Parametre Kontrolü
                  </h2>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30">
                    Grupo Pro
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Aura yapılandırması, temalar, kullanıcı izinleri ve canlı limitler
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {saveSuccess}
                </span>
              )}
              <button
                onClick={onClose}
                title="Paneli Kapat"
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Ana Gövde: 2 Sütunlu İç Navigasyon & Form Alanı */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* 1. SÜTUN: Sol Kategori Menüsü (Grupo Sub-Rail) */}
            <div className="w-48 sm:w-56 bg-[#0F1218] border-r border-[#222631] flex flex-col p-2 space-y-1 flex-shrink-0 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Menü Grupları
              </div>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as TabType)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                      isActive
                        ? "bg-pink-600/15 text-pink-400 border border-pink-500/30 shadow-xs"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-pink-400" : "text-slate-400"}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="mt-auto pt-4 border-t border-[#222631]/60 px-3">
                <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>Sunucu: Çevrimiçi</span>
                </div>
              </div>
            </div>

            {/* 2. SÜTUN: Sağ İçerik & Parametre Form Alanı */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#0B0D12]">
              
              {/* TAB 1: KULLANICI YÖNETİMİ */}
              {activeTab === "users" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Kullanıcı adı veya ad ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && loadUsers()}
                        className="w-full bg-[#141720] border border-[#252936] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/60"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-[#141720] border border-[#252936] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="all">Tüm Roller</option>
                        <option value="admin">Admin</option>
                        <option value="moderator">Moderatör</option>
                        <option value="member">Üye</option>
                      </select>

                      <button
                        onClick={loadUsers}
                        className="p-2 bg-[#141720] border border-[#252936] rounded-xl hover:bg-[#202534] text-slate-300 transition-colors cursor-pointer"
                        title="Yenile"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>

                  <div className="border border-[#222631] rounded-2xl overflow-hidden bg-[#10131A]">
                    <div className="divide-y divide-[#1D212B]">
                      {users.map((u) => (
                        <div key={u.id} className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-[#151922] transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center font-bold text-xs text-pink-400 overflow-hidden flex-shrink-0">
                              {u.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={u.avatar_url} alt={u.display_name} className="w-full h-full object-cover" />
                              ) : (
                                u.display_name?.charAt(0).toUpperCase() || "U"
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white truncate">{u.display_name}</span>
                                {u.is_banned && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold">
                                    YASAKLI
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">@{u.username} • {u.email}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <select
                              value={u.role || "member"}
                              onChange={(e) => handleUpdateUserRole(u, e.target.value)}
                              className="bg-[#141720] border border-[#252936] text-[11px] text-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                            >
                              <option value="member">Üye</option>
                              <option value="moderator">Moderatör</option>
                              <option value="admin">Admin</option>
                            </select>

                            <button
                              onClick={() => handleToggleUserBan(u)}
                              title={u.is_banned ? "Yasağı Kaldır" : "Kullanıcıyı Yasakla"}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                u.is_banned
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                  : "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                              }`}
                            >
                              {u.is_banned ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              title="Kullanıcıyı Kalıcı Sil"
                              className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {users.length === 0 && (
                        <div className="p-8 text-center text-xs text-slate-500">
                          Kriterlere uygun kullanıcı bulunamadı.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TEMA & RENKLER (GRUPO CUSTOMIZER) */}
              {activeTab === "theme" && (
                <div className="space-y-6">
                  {/* Bilgi Kutusu */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/10 to-indigo-500/10 border border-pink-500/20 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Grupo Canlı Tema & Renk Yönetimi</h4>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                        Burada seçtiğiniz vurgu renkleri, butonlar, arama ekranı ve mesajlaşma arayüzüne anında uygulanır.
                      </p>
                    </div>
                  </div>

                  {/* Vurgu Rengi Seçici (Accent Palette) */}
                  <div className="p-4 rounded-2xl bg-[#12151D] border border-[#222631] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white">Ana Vurgu Rengi (Accent Color)</label>
                      <span className="font-mono text-xs text-pink-400">{accentColor}</span>
                    </div>

                    {/* Hızlı Renk Paletleri */}
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
                      {COLOR_PRESETS.map((p) => (
                        <button
                          key={p.color}
                          type="button"
                          onClick={() => {
                            setAccentColor(p.color);
                            applyThemeToDocument(p.color, cardBgColor, borderColor);
                          }}
                          className={`h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border-2 ${
                            accentColor.toLowerCase() === p.color.toLowerCase()
                              ? "border-white scale-105 shadow-md shadow-black/50"
                              : "border-transparent hover:scale-102"
                          }`}
                          style={{ backgroundColor: p.color }}
                          title={p.name}
                        >
                          {accentColor.toLowerCase() === p.color.toLowerCase() && (
                            <Check className="w-4 h-4 text-white drop-shadow-md" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Manuel Hex Girişi & Renk Seçici */}
                    <div className="flex items-center gap-3 pt-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={accentColor}
                          onChange={(e) => {
                            setAccentColor(e.target.value);
                            applyThemeToDocument(e.target.value, cardBgColor, borderColor);
                          }}
                          placeholder="#E91E63"
                          className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-pink-500"
                        />
                      </div>
                      <input
                        type="color"
                        value={accentColor.startsWith("#") ? accentColor : "#E91E63"}
                        onChange={(e) => {
                          setAccentColor(e.target.value);
                          applyThemeToDocument(e.target.value, cardBgColor, borderColor);
                        }}
                        className="w-10 h-8 rounded-lg bg-transparent cursor-pointer border-0"
                      />
                    </div>
                  </div>

                  {/* Arka Plan ve Kart Renkleri */}
                  <div className="p-4 rounded-2xl bg-[#12151D] border border-[#222631] space-y-4">
                    <h4 className="text-xs font-bold text-white">Yüzey & Kart Renkleri</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                          Sohbet Kart Arka Planı
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={cardBgColor}
                            onChange={(e) => {
                              setCardBgColor(e.target.value);
                              applyThemeToDocument(accentColor, e.target.value, borderColor);
                            }}
                            className="flex-1 bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                          />
                          <input
                            type="color"
                            value={cardBgColor.startsWith("#") ? cardBgColor : "#16191E"}
                            onChange={(e) => {
                              setCardBgColor(e.target.value);
                              applyThemeToDocument(accentColor, e.target.value, borderColor);
                            }}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                          Kenarlık & Ayraç Rengi
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={borderColor}
                            onChange={(e) => {
                              setBorderColor(e.target.value);
                              applyThemeToDocument(accentColor, cardBgColor, e.target.value);
                            }}
                            className="flex-1 bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                          />
                          <input
                            type="color"
                            value={borderColor.startsWith("#") ? borderColor : "#1E293B"}
                            onChange={(e) => {
                              setBorderColor(e.target.value);
                              applyThemeToDocument(accentColor, cardBgColor, e.target.value);
                            }}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Yazı Tipi & Arayüz Stili */}
                  <div className="p-4 rounded-2xl bg-[#12151D] border border-[#222631] space-y-4">
                    <h4 className="text-xs font-bold text-white">Tipografi & Kenar Yumuşatma</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                          Yazı Tipi (Font Family)
                        </label>
                        <select
                          value={fontFamily}
                          onChange={(e) => setFontFamily(e.target.value)}
                          className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="Inter">Inter (Grupo Varsayılan)</option>
                          <option value="Roboto">Roboto</option>
                          <option value="Poppins">Poppins Modern</option>
                          <option value="Outfit">Outfit Minimalist</option>
                          <option value="System">Sistem Varsayılanı</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                          Giden Mesaj Balon Rengi
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={outgoingBubble}
                            onChange={(e) => setOutgoingBubble(e.target.value)}
                            className="flex-1 bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                          />
                          <input
                            type="color"
                            value={outgoingBubble.startsWith("#") ? outgoingBubble : "#BE185D"}
                            onChange={(e) => setOutgoingBubble(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Canlı Önizleme Kartı */}
                  <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: cardBgColor, borderColor: borderColor }}>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Canlı Tema Önizlemesi
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ backgroundColor: accentColor }}>
                          A
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Canlı Vurgu Butonu</div>
                          <div className="text-[10px] text-slate-400">Temanız bu şekilde gözükecek</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-md cursor-default"
                        style={{ backgroundColor: accentColor }}
                      >
                        Vurgu Butonu
                      </button>
                    </div>
                  </div>

                  {/* Kaydet Butonu */}
                  <button
                    type="button"
                    onClick={handleSaveTheme}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-pink-600 hover:bg-pink-500 shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Temayı Canlı Uygula ve Veritabanına Kaydet</span>
                  </button>
                </div>
              )}

              {/* TAB 3: GENEL & MARKALAMA */}
              {activeTab === "general" && settings && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#12151D] border border-[#222631] rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold text-white">Site Bilgileri & Markalama</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Platform Başlığı</label>
                        <input
                          type="text"
                          value={settings.site_info.site_name}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              site_info: { ...settings.site_info, site_name: e.target.value },
                            })
                          }
                          className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Slogan / Açıklama</label>
                        <input
                          type="text"
                          value={settings.site_info.site_tagline}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              site_info: { ...settings.site_info, site_tagline: e.target.value },
                            })
                          }
                          className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Logo URL</label>
                      <input
                        type="text"
                        value={settings.site_info.logo_url}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            site_info: { ...settings.site_info, logo_url: e.target.value },
                          })
                        }
                        className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        placeholder="https://..."
                      />
                    </div>

                    <div className="pt-2 border-t border-[#222631] space-y-3">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-semibold text-white block">Yeni Üye Kaydına İzin Ver</span>
                          <span className="text-[11px] text-slate-400">Kapatılırsa yalnız mevcut kullanıcılar giriş yapabilir</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.site_info.allow_registration}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              site_info: { ...settings.site_info, allow_registration: e.target.checked },
                            })
                          }
                          className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-semibold text-rose-400 block">Bakım Modu (Maintenance)</span>
                          <span className="text-[11px] text-slate-400">Yöneticiler hariç tüm kullanıcılara erişim durdurulur</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.site_info.maintenance_mode}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              site_info: { ...settings.site_info, maintenance_mode: e.target.checked },
                            })
                          }
                          className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                        />
                      </label>
                    </div>

                    <button
                      onClick={() => handleSaveSetting("site_info", settings.site_info)}
                      className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Genel Ayarları Kaydet</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: SOHBET & MEDYA LİMİTLERİ */}
              {activeTab === "chat" && settings && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#12151D] border border-[#222631] rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold text-white">Medya & Depolama Limitleri</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Maksimum Dosya Boyutu (MB)</label>
                        <input
                          type="number"
                          value={settings.media_limits.max_file_size_mb}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              media_limits: {
                                ...settings.media_limits,
                                max_file_size_mb: parseInt(e.target.value) || 50,
                              },
                            })
                          }
                          className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Maks. Ses Kayıt Süresi (Saniye)</label>
                        <input
                          type="number"
                          value={settings.media_limits.max_voice_seconds}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              media_limits: {
                                ...settings.media_limits,
                                max_voice_seconds: parseInt(e.target.value) || 300,
                              },
                            })
                          }
                          className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-[#222631]">
                      <div>
                        <span className="text-xs font-semibold text-white block">Otomatik Görsel & Video Sıkıştırma</span>
                        <span className="text-[11px] text-slate-400">Yüklenen medyaları FFmpeg ile evrensel optimize formatlara dönüştür</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.media_limits.enable_compression}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            media_limits: {
                              ...settings.media_limits,
                              enable_compression: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                      />
                    </label>

                    <button
                      onClick={() => handleSaveSetting("media_limits", settings.media_limits)}
                      className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Medya Limitlerini Kaydet</span>
                    </button>
                  </div>

                  <div className="p-4 bg-[#12151D] border border-[#222631] rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold text-white">Mesaj Düzenleme & Silme Kuralları</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Düzenleme Süre Sınırı (Dakika)</label>
                        <input
                          type="number"
                          value={settings.chat_settings.edit_time_limit_minutes}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              chat_settings: {
                                ...settings.chat_settings,
                                edit_time_limit_minutes: parseInt(e.target.value) || 15,
                              },
                            })
                          }
                          className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Herkesten Silme Süre Sınırı (Dakika)</label>
                        <input
                          type="number"
                          value={settings.chat_settings.delete_time_limit_minutes}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              chat_settings: {
                                ...settings.chat_settings,
                                delete_time_limit_minutes: parseInt(e.target.value) || 60,
                              },
                            })
                          }
                          className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-[#222631]">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs font-semibold text-white">Mesaj Düzenlemeye İzin Ver</span>
                        <input
                          type="checkbox"
                          checked={settings.chat_settings.allow_message_edit}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              chat_settings: { ...settings.chat_settings, allow_message_edit: e.target.checked },
                            })
                          }
                          className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs font-semibold text-white">Herkesten Silmeye İzin Ver</span>
                        <input
                          type="checkbox"
                          checked={settings.chat_settings.allow_delete_for_all}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              chat_settings: { ...settings.chat_settings, allow_delete_for_all: e.target.checked },
                            })
                          }
                          className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs font-semibold text-white">Otomatik Link Önizlemeleri</span>
                        <input
                          type="checkbox"
                          checked={settings.chat_settings.enable_link_previews}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              chat_settings: { ...settings.chat_settings, enable_link_previews: e.target.checked },
                            })
                          }
                          className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                        />
                      </label>
                    </div>

                    <button
                      onClick={() => handleSaveSetting("chat_settings", settings.chat_settings)}
                      className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Sohbet Kurallarını Kaydet</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: ARAMA & WEBRTC */}
              {activeTab === "calls" && settings && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#12151D] border border-[#222631] rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold text-white">LiveKit SFU Sesli & Görüntülü Arama</h3>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-semibold text-white block">Sesli Aramalar</span>
                          <span className="text-[11px] text-slate-400">1-e-1 yüksek kaliteli şifreli sesli görüşmeler</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.call_settings.enable_audio_calls}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              call_settings: { ...settings.call_settings, enable_audio_calls: e.target.checked },
                            })
                          }
                          className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-semibold text-white block">Görüntülü Aramalar</span>
                          <span className="text-[11px] text-slate-400">LiveKit SFU üzerinden WebRTC HD video akışı</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.call_settings.enable_video_calls}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              call_settings: { ...settings.call_settings, enable_video_calls: e.target.checked },
                            })
                          }
                          className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-xs font-semibold text-white block">Ekran Paylaşımı (Screen Share)</span>
                          <span className="text-[11px] text-slate-400">Görüşme sırasında masaüstü / pencere yayını</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.call_settings.enable_screen_share}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              call_settings: { ...settings.call_settings, enable_screen_share: e.target.checked },
                            })
                          }
                          className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="pt-2 border-t border-[#222631]">
                      <label className="text-[11px] text-slate-400 block mb-1">Maksimum Arama Süresi (Dakika)</label>
                      <input
                        type="number"
                        value={settings.call_settings.max_call_duration_minutes}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            call_settings: {
                              ...settings.call_settings,
                              max_call_duration_minutes: parseInt(e.target.value) || 120,
                            },
                          })
                        }
                        className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={() => handleSaveSetting("call_settings", settings.call_settings)}
                      className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Arama Ayarlarını Kaydet</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 6: GÜVENLİK & LİMİTLER */}
              {activeTab === "security" && settings && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#12151D] border border-[#222631] rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold text-white">Rate Limit & Spam Koruması</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Saniyede Maks. Mesaj</label>
                        <input
                          type="number"
                          value={settings.security_settings.max_messages_per_second}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              security_settings: {
                                ...settings.security_settings,
                                max_messages_per_second: parseInt(e.target.value) || 5,
                              },
                            })
                          }
                          className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Dakikada Maks. Mesaj</label>
                        <input
                          type="number"
                          value={settings.security_settings.max_messages_per_minute}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              security_settings: {
                                ...settings.security_settings,
                                max_messages_per_minute: parseInt(e.target.value) || 60,
                              },
                            })
                          }
                          className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-[#222631]">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs font-semibold text-white">Güçlü Şifre Zorunluluğu</span>
                        <input
                          type="checkbox"
                          checked={settings.security_settings.require_strong_passwords}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              security_settings: {
                                ...settings.security_settings,
                                require_strong_passwords: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                        />
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Hatalı Giriş Kilidi (Deneme)</label>
                          <input
                            type="number"
                            value={settings.security_settings.lockout_attempts}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                security_settings: {
                                  ...settings.security_settings,
                                  lockout_attempts: parseInt(e.target.value) || 5,
                                },
                              })
                            }
                            className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Oturum Süresi (Gün)</label>
                          <input
                            type="number"
                            value={settings.security_settings.session_timeout_days}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                security_settings: {
                                  ...settings.security_settings,
                                  session_timeout_days: parseInt(e.target.value) || 30,
                                },
                              })
                            }
                            className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSaveSetting("security_settings", settings.security_settings)}
                      className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Güvenlik Parametrelerini Kaydet</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 7: ERİŞİM GÜNLÜKLERİ */}
              {activeTab === "logs" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Giriş yapan kullanıcıların IP adresi, cihaz ve tarayıcı kayıtları
                    </p>
                    <button
                      onClick={loadLogs}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141720] border border-[#252936] rounded-xl text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Yenile
                    </button>
                  </div>

                  <div className="border border-[#222631] rounded-2xl overflow-hidden bg-[#10131A]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#141720] border-b border-[#222631] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3.5">Kullanıcı</th>
                            <th className="py-2.5 px-3.5">Cihaz & Tarayıcı</th>
                            <th className="py-2.5 px-3.5">IP Adresi</th>
                            <th className="py-2.5 px-3.5 text-right">Tarih</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1D212B]">
                          {accessLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-[#151922] transition-colors">
                              <td className="py-2.5 px-3.5 font-semibold text-white">
                                {log.display_name ? `${log.display_name} (@${log.username})` : `@${log.username}`}
                              </td>
                              <td className="py-2.5 px-3.5 text-slate-300 truncate max-w-[160px]">
                                {log.device_info || "Bilinmeyen Cihaz"}
                              </td>
                              <td className="py-2.5 px-3.5 font-mono text-slate-400">{log.ip_address}</td>
                              <td className="py-2.5 px-3.5 text-right text-slate-500 whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString("tr-TR")}
                              </td>
                            </tr>
                          ))}
                          {accessLogs.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-slate-500 text-xs">
                                Henüz bir erişim kaydı yok.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 8: SİSTEM SAĞLIĞI & İZLEME */}
              {activeTab === "stats" && stats && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-[#12151D] border border-[#222631] rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">PostgreSQL 16</span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-400 capitalize">
                          {stats.system_health.postgres}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#12151D] border border-[#222631] rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Redis 7</span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-400 capitalize">
                          {stats.system_health.redis}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#12151D] border border-[#222631] rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">LiveKit SFU</span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-400 capitalize">
                          {stats.system_health.livekit}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#12151D] border border-[#222631] rounded-2xl flex flex-col justify-between">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">MinIO S3</span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-400 capitalize">
                          {stats.system_health.minio}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-[#12151D] border border-[#222631] rounded-2xl">
                      <p className="text-[11px] text-slate-400">Toplam Üye</p>
                      <p className="text-xl font-bold text-white mt-1">{stats.total_users}</p>
                      <p className="text-[10px] text-emerald-400 mt-0.5">{stats.online_users} Çevrimiçi</p>
                    </div>

                    <div className="p-3.5 bg-[#12151D] border border-[#222631] rounded-2xl">
                      <p className="text-[11px] text-slate-400">Toplam Mesaj</p>
                      <p className="text-xl font-bold text-white mt-1">{stats.total_messages}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{stats.total_media} Medya</p>
                    </div>

                    <div className="p-3.5 bg-[#12151D] border border-[#222631] rounded-2xl">
                      <p className="text-[11px] text-slate-400">Toplam Görüşme</p>
                      <p className="text-xl font-bold text-white mt-1">{stats.total_calls}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{Math.round(stats.total_call_seconds / 60)} Dk.</p>
                    </div>

                    <div className="p-3.5 bg-[#12151D] border border-[#222631] rounded-2xl">
                      <p className="text-[11px] text-slate-400">Goroutine / RAM</p>
                      <p className="text-xl font-bold text-white mt-1">{stats.system_health.goroutines}</p>
                      <p className="text-[10px] text-pink-400 mt-0.5">{stats.system_health.allocated_ram_mb} MB RAM</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
