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
} from "lucide-react";

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType =
  | "users"
  | "general"
  | "chat"
  | "calls"
  | "security"
  | "logs"
  | "stats";

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

  // Load initial tab data
  useEffect(() => {
    if (!isOpen) return;

    loadSettings();
    if (activeTab === "users") loadUsers();
    if (activeTab === "stats") loadStats();
    if (activeTab === "logs") loadLogs();
  }, [isOpen, activeTab]);

  const loadSettings = async () => {
    setIsSettingsLoading(true);
    setSettingsError(null);
    try {
      const data = await adminApi.getSettings();
      setSettings(data);
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
      console.error("Kullanıcılar yüklenemedi", e);
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
      ? prompt("Yasaklama nedeni (isteğe bağlı):") || "Yönetici tarafından askıya alındı"
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[88vh] bg-[#12141A] border border-[#232730] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        
        {/* Modal Başlığı */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232730] bg-[#161920]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-950/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Aura Yönetim & Sistem Kontrol Merkezi
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Admin Panel
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tüm sistem parametreleri, kullanıcılar, güvenlik limitleri ve sunucu sağlığı
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full animate-bounce">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {saveSuccess}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sekmeler Menüsü (Grupo Obsidian Dark) */}
        <div className="flex items-center px-6 border-b border-[#232730] bg-[#14171E] overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "users"
                ? "border-rose-500 text-rose-400 bg-rose-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            Kullanıcı Yönetimi ({totalUsers})
          </button>

          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "general"
                ? "border-rose-500 text-rose-400 bg-rose-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Genel Parametreler
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "chat"
                ? "border-rose-500 text-rose-400 bg-rose-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Sohbet & Medya Limitleri
          </button>

          <button
            onClick={() => setActiveTab("calls")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "calls"
                ? "border-rose-500 text-rose-400 bg-rose-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            Arama & WebRTC
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "security"
                ? "border-rose-500 text-rose-400 bg-rose-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Güvenlik & Hız Limitleri
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "logs"
                ? "border-rose-500 text-rose-400 bg-rose-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            Erişim Günlükleri
          </button>

          <button
            onClick={() => setActiveTab("stats")}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === "stats"
                ? "border-rose-500 text-rose-400 bg-rose-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-4 h-4" />
            Sistem Sağlığı & İzleme
          </button>
        </div>

        {/* Sekme İçerik Alanı */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0E1015]">
          
          {/* TAB 1: KULLANICI YÖNETİMİ */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Kullanıcı adı, e-posta veya ad ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadUsers()}
                    className="w-full bg-[#181B22] border border-[#2A2E39] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/60"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-[#181B22] border border-[#2A2E39] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">Tüm Roller</option>
                    <option value="admin">Yöneticiler (Admin)</option>
                    <option value="moderator">Moderatörler</option>
                    <option value="member">Standart Üyeler</option>
                  </select>

                  <button
                    onClick={loadUsers}
                    className="p-2 bg-[#181B22] border border-[#2A2E39] rounded-xl hover:bg-[#232733] text-slate-300 transition-colors"
                    title="Yenile"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Kullanıcı Tablosu */}
              <div className="border border-[#232730] rounded-xl overflow-hidden bg-[#14161D]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#181B24] border-b border-[#232730] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Kullanıcı</th>
                      <th className="py-3 px-4">E-posta</th>
                      <th className="py-3 px-4">Rol</th>
                      <th className="py-3 px-4">Durum</th>
                      <th className="py-3 px-4 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D212B]">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-[#1A1D27] transition-colors">
                        <td className="py-3 px-4 flex items-center gap-3">
                          <img
                            src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                            alt={u.username}
                            className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 object-cover"
                          />
                          <div>
                            <p className="font-semibold text-white">{u.display_name}</p>
                            <p className="text-[11px] text-slate-400">@{u.username}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{u.email}</td>
                        <td className="py-3 px-4">
                          <select
                            value={u.role || "member"}
                            onChange={(e) => handleUpdateUserRole(u, e.target.value)}
                            className="bg-[#1C202B] border border-[#2B3040] rounded-lg px-2.5 py-1 text-[11px] text-slate-200 focus:outline-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="moderator">Moderatör</option>
                            <option value="member">Üye</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          {u.is_banned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              <Ban className="w-3 h-3" />
                              Yasaklı
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <UserCheck className="w-3 h-3" />
                              Aktif
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleUserBan(u)}
                              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                                u.is_banned
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                  : "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                              }`}
                              title={u.is_banned ? "Yasağı Kaldır" : "Kullanıcıyı Yasakla"}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="p-1.5 rounded-lg border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Kullanıcıyı Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                          Kullanıcı bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PARAMETRE YÜKLENİYOR / HATA DURUMU */}
          {["general", "chat", "calls", "security"].includes(activeTab) && isSettingsLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Sistem parametreleri yükleniyor...</span>
            </div>
          )}
          {["general", "chat", "calls", "security"].includes(activeTab) && !isSettingsLoading && settingsError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-xs flex items-center justify-between">
              <span>{settingsError}</span>
              <button onClick={loadSettings} className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors">
                Tekrar Dene
              </button>
            </div>
          )}

          {/* TAB 2: GENEL PARAMETRELER */}
          {activeTab === "general" && settings && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-[#14161D] border border-[#232730] p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-rose-500" />
                  Site ve Platform Kimliği
                </h3>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Site Başlığı (Site Name)</label>
                  <input
                    type="text"
                    value={settings.site_info.site_name}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        site_info: { ...settings.site_info, site_name: e.target.value },
                      })
                    }
                    className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Site Sloganı (Tagline)</label>
                  <input
                    type="text"
                    value={settings.site_info.site_tagline}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        site_info: { ...settings.site_info, site_tagline: e.target.value },
                      })
                    }
                    className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Özel Logo URL'si</label>
                  <input
                    type="text"
                    placeholder="https://... veya boş bırakın"
                    value={settings.site_info.logo_url}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        site_info: { ...settings.site_info, logo_url: e.target.value },
                      })
                    }
                    className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="pt-2 border-t border-[#232730] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">Yeni Kullanıcı Kaydına İzin Ver</p>
                    <p className="text-[11px] text-slate-400">Kapatıldığında kayıt sayfası devre dışı kalır.</p>
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
                    className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                  />
                </div>

                <div className="pt-2 border-t border-[#232730] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">Bakım Modu (Maintenance Mode)</p>
                    <p className="text-[11px] text-slate-400">Yöneticiler hariç tüm kullanıcılara bakım ekranı gösterilir.</p>
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
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => handleSaveSetting("site_info", settings.site_info)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Genel Parametreleri Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SOHBET & MEDYA LİMİTLERİ */}
          {activeTab === "chat" && settings && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-[#14161D] border border-[#232730] p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-rose-500" />
                  Medya ve Mesajlaşma Kısıtlamaları
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Maksimum Dosya Yükleme Sınırı (MB)</label>
                    <input
                      type="number"
                      value={settings.media_limits.max_file_size_mb}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          media_limits: {
                            ...settings.media_limits,
                            max_file_size_mb: parseInt(e.target.value) || 10,
                          },
                        })
                      }
                      className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Sesli Not Maks. Süre (Saniye)</label>
                    <input
                      type="number"
                      value={settings.media_limits.max_voice_seconds}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          media_limits: {
                            ...settings.media_limits,
                            max_voice_seconds: parseInt(e.target.value) || 60,
                          },
                        })
                      }
                      className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Mesaj Düzenleme İzni Süresi (Dakika)</label>
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
                      className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Herkesten Silme Süresi (Dakika)</label>
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
                      className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#232730] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">Sosyal Medya Kartları & Zengin Önizlemeler</p>
                    <p className="text-[11px] text-slate-400">YouTube, IG, FB linkleri sohbette mini kart olarak gösterilir.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.chat_settings.enable_social_embeds}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        chat_settings: { ...settings.chat_settings, enable_social_embeds: e.target.checked },
                      })
                    }
                    className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    onClick={async () => {
                      try {
                        await adminApi.updateSetting("media_limits", settings.media_limits);
                        await adminApi.updateSetting("chat_settings", settings.chat_settings);
                        setSaveSuccess("Medya ve sohbet parametreleri kaydedildi!");
                        setTimeout(() => setSaveSuccess(null), 3000);
                        loadSettings();
                      } catch (e) {
                        alert("Ayar kaydedilirken bir hata oluştu.");
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Medya & Sohbet Ayarlarını Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ARAMA & WEBRTC */}
          {activeTab === "calls" && settings && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-[#14161D] border border-[#232730] p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-rose-500" />
                  LiveKit SFU & WebRTC Parametreleri
                </h3>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-300">Self-Hosted LiveKit SFU Aktif</p>
                    <p className="text-[11px] text-emerald-400/80">Port 7880 (Signal) & 7881 (WebRTC UDP) kendi Docker konteynerinizde çalışıyor.</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#232730] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">Sesli Aramayı Etkinleştir</p>
                    <p className="text-[11px] text-slate-400">Kullanıcılar arasında 1-e-1 sesli aramaya izin verir.</p>
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
                    className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                  />
                </div>

                <div className="pt-2 border-t border-[#232730] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">Görüntülü Aramayı Etkinleştir</p>
                    <p className="text-[11px] text-slate-400">1-e-1 video görüşmelerine izin verir.</p>
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
                    className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                  />
                </div>

                <div className="pt-2 border-t border-[#232730] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">Ekran Paylaşımı İzni</p>
                    <p className="text-[11px] text-slate-400">Görüşme sırasında masaüstü/sekme ekran paylaşımına izin verir.</p>
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
                    className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => handleSaveSetting("call_settings", settings.call_settings)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Arama Parametrelerini Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GÜVENLİK & HIZ LİMİTLERİ */}
          {activeTab === "security" && settings && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-[#14161D] border border-[#232730] p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  Spam ve Rate Limiting Parametreleri
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Saniye Başına Maks. Mesaj (Flood Limit)</label>
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
                      className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Dakika Başına Maks. Mesaj Limiti</label>
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
                      className="w-full bg-[#181B24] border border-[#292D38] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#232730] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">Güçlü Şifre Zorunluluğu</p>
                    <p className="text-[11px] text-slate-400">Yeni üyeliklerde en az 8 karakter ve rakam kontrolü uygular.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.security_settings.require_strong_passwords}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security_settings: { ...settings.security_settings, require_strong_passwords: e.target.checked },
                      })
                    }
                    className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => handleSaveSetting("security_settings", settings.security_settings)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Güvenlik Parametrelerini Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ERİŞİM GÜNLÜKLERİ (ACCESS LOGS) */}
          {activeTab === "logs" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Son giriş yapan kullanıcıların IP adresi, işletim sistemi ve tarayıcı kayıtları
                </p>
                <button
                  onClick={loadLogs}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181B24] border border-[#292D38] rounded-xl text-xs text-slate-300 hover:text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Yenile
                </button>
              </div>

              <div className="border border-[#232730] rounded-xl overflow-hidden bg-[#14161D]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#181B24] border-b border-[#232730] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Kullanıcı</th>
                      <th className="py-3 px-4">Cihaz & Tarayıcı</th>
                      <th className="py-3 px-4">IP Adresi</th>
                      <th className="py-3 px-4 text-right">Tarih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D212B]">
                    {accessLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#1A1D27] transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          {log.display_name ? `${log.display_name} (@${log.username})` : `@${log.username}`}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{log.device_info || "Bilinmeyen Cihaz"}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{log.ip_address}</td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {new Date(log.created_at).toLocaleString("tr-TR")}
                        </td>
                      </tr>
                    ))}
                    {accessLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500 text-xs">
                          Henüz bir giriş kaydı yok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: SİSTEM SAĞLIĞI & İZLEME */}
          {activeTab === "stats" && stats && (
            <div className="space-y-6">
              {/* Servis Durum Kartları */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-[#14161D] border border-[#232730] rounded-2xl flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">PostgreSQL 16</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-emerald-400 capitalize">
                      {stats.system_health.postgres}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-[#14161D] border border-[#232730] rounded-2xl flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Redis 7</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-emerald-400 capitalize">
                      {stats.system_health.redis}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-[#14161D] border border-[#232730] rounded-2xl flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">LiveKit SFU</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-emerald-400 capitalize">
                      {stats.system_health.livekit}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-[#14161D] border border-[#232730] rounded-2xl flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">MinIO S3 Storage</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-emerald-400 capitalize">
                      {stats.system_health.minio}
                    </span>
                  </div>
                </div>
              </div>

              {/* İstatistik Sayaçları */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-[#14161D] border border-[#232730] rounded-2xl">
                  <p className="text-xs text-slate-400">Toplam Kullanıcı</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.total_users}</p>
                  <p className="text-[11px] text-emerald-400 mt-1">{stats.online_users} Çevrimiçi</p>
                </div>

                <div className="p-4 bg-[#14161D] border border-[#232730] rounded-2xl">
                  <p className="text-xs text-slate-400">Toplam Mesaj</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.total_messages}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{stats.total_media} Medya Dosyası</p>
                </div>

                <div className="p-4 bg-[#14161D] border border-[#232730] rounded-2xl">
                  <p className="text-xs text-slate-400">Toplam Görüşme</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.total_calls}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{Math.round(stats.total_call_seconds / 60)} Dakika</p>
                </div>

                <div className="p-4 bg-[#14161D] border border-[#232730] rounded-2xl">
                  <p className="text-xs text-slate-400">Go Goroutine / RAM</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.system_health.goroutines}</p>
                  <p className="text-[11px] text-indigo-400 mt-1">{stats.system_health.allocated_ram_mb} MB RAM</p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
