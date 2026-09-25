"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import {
  X,
  User,
  Shield,
  Upload,
  Check,
  LogOut,
  Camera,
  Loader2,
  Lock,
  History,
  Laptop,
  Smartphone,
  Globe,
  Bell,
  Send,
  Sliders,
  Palette,
  Volume2,
  VolumeX,
  Sparkles,
  Save,
  CheckCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getPushSubscription,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  sendTestPushNotification,
} from "@/lib/push_notifications";
import { soundEffects } from "@/lib/sounds";
import { applyThemeToDocument } from "@/store/useSettingsStore";
import { getContrastTextColor } from "@/lib/utils";

const THEME_PRESETS = [
  {
    id: "linear-obsidian",
    name: "Linear Obsidian",
    badge: "Varsayılan SaaS",
    description: "Linear & Vercel ilhamlı; göz yormayan derin çivit ve gece mavisi.",
    color: "#6366F1",
    bubble: "#4F46E5",
    text: "#FFFFFF",
    main_bg: "#090A0F",
    card_bg: "#11141E",
    border_color: "#1E2333",
    incoming_bubble: "#181C28",
  },
  {
    id: "supabase-emerald",
    name: "Supabase Emerald",
    badge: "Siber Zümrüt",
    description: "Supabase tarzı fütüristik zümrüt yeşili ve mat antrasit zemin.",
    color: "#10B981",
    bubble: "#059669",
    text: "#FFFFFF",
    main_bg: "#080E0B",
    card_bg: "#0E1713",
    border_color: "#192B23",
    incoming_bubble: "#14221C",
  },
  {
    id: "raycast-midnight",
    name: "Raycast Midnight",
    badge: "Kozmik Mor",
    description: "Raycast Theme Studio esintili, asil ve derin elektrik moru tonları.",
    color: "#A855F7",
    bubble: "#7E22CE",
    text: "#FFFFFF",
    main_bg: "#0C0A14",
    card_bg: "#141021",
    border_color: "#241C38",
    incoming_bubble: "#1C162E",
  },
  {
    id: "telegram-amoled",
    name: "Telegram AMOLED",
    badge: "Zifiri Siyah",
    description: "OLED ekranlar için pil tasarruflu gerçek %100 siyah (#000000).",
    color: "#229ED9",
    bubble: "#1E4E79",
    text: "#FFFFFF",
    main_bg: "#000000",
    card_bg: "#0D0D0D",
    border_color: "#222222",
    incoming_bubble: "#181818",
  },
  {
    id: "whatsapp-stealth",
    name: "WhatsApp Stealth",
    badge: "Klasik Koyu",
    description: "Koyu petrol mavisi-yeşili ve kurşun zemin uyumu.",
    color: "#25D366",
    bubble: "#005C4B",
    text: "#E9EDEF",
    main_bg: "#0C1317",
    card_bg: "#111B21",
    border_color: "#222D34",
    incoming_bubble: "#202C33",
  },
  {
    id: "nordic-arctic",
    name: "Nordic Arctic",
    badge: "Soğuk Grafit",
    description: "macOS ve GitHub Dark soğuk grafit ve gök mavisi.",
    color: "#38BDF8",
    bubble: "#0284C7",
    text: "#FFFFFF",
    main_bg: "#0B111A",
    card_bg: "#111923",
    border_color: "#1E2D3D",
    incoming_bubble: "#192535",
  },
  {
    id: "cyber-crimson",
    name: "Cyber Crimson",
    badge: "Aura Rose",
    description: "Modern neon gül ve yakut kadife tonlarıyla lüks bir hava.",
    color: "#F43F5E",
    bubble: "#BE123C",
    text: "#FFFFFF",
    main_bg: "#0D080A",
    card_bg: "#160F13",
    border_color: "#2B1922",
    incoming_bubble: "#1F141A",
  },
  {
    id: "warm-amber",
    name: "Warm Amber",
    badge: "Sıcak Kehribar",
    description: "Espresso, kavrulmuş fındık ve yumuşak altın tonları.",
    color: "#F59E0B",
    bubble: "#B45309",
    text: "#FFFFFF",
    main_bg: "#0E0C0A",
    card_bg: "#161310",
    border_color: "#2B231C",
    incoming_bubble: "#211C17",
  },
  {
    id: "titanium-mono",
    name: "Titanium Mono",
    badge: "Minimalist Mat",
    description: "Ultra sade, dikkat dağıtmayan titanyum mat koyu gri.",
    color: "#94A3B8",
    bubble: "#334155",
    text: "#F8FAFC",
    main_bg: "#0B0C0E",
    card_bg: "#131519",
    border_color: "#23272F",
    incoming_bubble: "#1C1F26",
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdmin?: () => void;
}

export default function SettingsModal({ isOpen, onClose, onOpenAdmin }: Props) {
  const router = useRouter();
  const { user, updateProfile, uploadAvatar, updatePrivacy, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"profile" | "privacy" | "theme" | "notifications" | "access_logs">("profile");
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [readReceipts, setReadReceipts] = useState(user?.privacy_settings?.read_receipts ?? true);
  const [lastSeen, setLastSeen] = useState(user?.privacy_settings?.last_seen ?? true);
  const [allowCalls, setAllowCalls] = useState(user?.privacy_settings?.allow_calls ?? true);
  const [soundAlerts, setSoundAlerts] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aura_sound_alerts");
      if (saved !== null) return saved !== "false";
    }
    return user?.privacy_settings?.sound_alerts ?? true;
  });

  const [userOutgoingBubble, setUserOutgoingBubble] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aura_user_theme");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.outgoing_bubble) return parsed.outgoing_bubble;
        } catch (e) {}
      }
    }
    return "#4F46E5";
  });

  const [userAccentColor, setUserAccentColor] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aura_user_theme");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.primary_color) return parsed.primary_color;
        } catch (e) {}
      }
    }
    return "#6366F1";
  });

  const [userOutgoingText, setUserOutgoingText] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aura_user_theme");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.outgoing_text) return parsed.outgoing_text;
        } catch (e) {}
      }
    }
    return "auto";
  });

  const [userMainBg, setUserMainBg] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aura_user_theme");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.main_bg) return parsed.main_bg;
        } catch (e) {}
      }
    }
    return "#090A0F";
  });

  const [userCardBg, setUserCardBg] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aura_user_theme");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.card_bg) return parsed.card_bg;
        } catch (e) {}
      }
    }
    return "#11141E";
  });

  const [userBorderColor, setUserBorderColor] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aura_user_theme");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.border_color) return parsed.border_color;
        } catch (e) {}
      }
    }
    return "#1E2333";
  });

  const [userIncomingBubble, setUserIncomingBubble] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aura_user_theme");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.incoming_bubble) return parsed.incoming_bubble;
        } catch (e) {}
      }
    }
    return "#181C28";
  });

  const effectiveTextColor =
    userOutgoingText === "auto"
      ? getContrastTextColor(userOutgoingBubble)
      : userOutgoingText;

  const [themeSuccess, setThemeSuccess] = useState(false);

  useEffect(() => {
    if (user?.privacy_settings?.sound_alerts !== undefined) {
      setSoundAlerts(user.privacy_settings.sound_alerts);
      soundEffects.setSoundEnabled(user.privacy_settings.sound_alerts);
      if (typeof window !== "undefined") {
        localStorage.setItem("aura_sound_alerts", String(user.privacy_settings.sound_alerts));
      }
    }
  }, [user?.privacy_settings?.sound_alerts]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const showToast = (msg: string = "Ayarlar başarıyla kaydedildi!") => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Push notifications state
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);
  const [isPushLoading, setIsPushLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getPushSubscription().then((sub) => setIsPushSubscribed(!!sub));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === "access_logs") {
      setIsLoadingLogs(true);
      api
        .get("/users/access-logs")
        .then((res) => setAccessLogs(res.data))
        .catch((err) => console.error("Access log hatası:", err))
        .finally(() => setIsLoadingLogs(false));
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile(displayName, bio);
      setSaveSuccess(true);
      showToast("Profil ayarları başarıyla kaydedildi!");
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert("Profil güncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrivacyToggle = async (key: "read_receipts" | "last_seen" | "allow_calls", val: boolean) => {
    if (key === "read_receipts") setReadReceipts(val);
    if (key === "last_seen") setLastSeen(val);
    if (key === "allow_calls") setAllowCalls(val);

    try {
      await updatePrivacy({ [key]: val });
      showToast("Gizlilik tercihleri kaydedildi!");
    } catch (err) {
      console.error("Gizlilik güncellenemedi:", err);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      await uploadAvatar(file);
      showToast("Profil fotoğrafı güncellendi!");
    } catch (err) {
      alert("Profil resmi yüklenemedi.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleTogglePush = async () => {
    setIsPushLoading(true);
    setPushStatusMessage(null);
    if (isPushSubscribed) {
      const res = await unsubscribeUserFromPush();
      setIsPushSubscribed(false);
      setPushStatusMessage(res.message);
      showToast(res.message);
    } else {
      const res = await subscribeUserToPush();
      setIsPushSubscribed(res.success);
      setPushStatusMessage(res.message);
      showToast(res.message);
    }
    setIsPushLoading(false);
    setTimeout(() => setPushStatusMessage(null), 4000);
  };

  const handleTestPush = async () => {
    setIsPushLoading(true);
    const res = await sendTestPushNotification();
    setPushStatusMessage(res.message);
    setIsPushLoading(false);
    setTimeout(() => setPushStatusMessage(null), 4000);
  };

  const handleToggleSound = async () => {
    const nextVal = !soundAlerts;
    setSoundAlerts(nextVal);
    soundEffects.setSoundEnabled(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("aura_sound_alerts", String(nextVal));
    }
    try {
      await updatePrivacy({ sound_alerts: nextVal });
      showToast(
        nextVal
          ? "Bildirim sesleri açıldı (Sesli mod)"
          : "Bildirim sesleri kapatıldı (Sessiz mod)"
      );
    } catch (e) {
      console.error("Ses ayarı kaydedilemedi:", e);
    }
  };

  const handleApplyUserTheme = (
    accent: string,
    bubble: string,
    text: string = userOutgoingText,
    main_bg: string = userMainBg,
    card_bg: string = userCardBg,
    border_color: string = userBorderColor,
    incoming_bubble: string = userIncomingBubble
  ) => {
    setUserAccentColor(accent);
    setUserOutgoingBubble(bubble);
    setUserOutgoingText(text);
    setUserMainBg(main_bg);
    setUserCardBg(card_bg);
    setUserBorderColor(border_color);
    setUserIncomingBubble(incoming_bubble);

    const fullTheme = {
      primary_color: accent,
      outgoing_bubble: bubble,
      outgoing_text: text,
      main_bg,
      card_bg,
      border_color,
      incoming_bubble,
    };

    applyThemeToDocument(fullTheme);

    if (typeof window !== "undefined") {
      localStorage.setItem("aura_user_theme", JSON.stringify(fullTheme));
    }
  };

  const handleSaveUserTheme = () => {
    const fullTheme = {
      primary_color: userAccentColor,
      outgoing_bubble: userOutgoingBubble,
      outgoing_text: userOutgoingText,
      main_bg: userMainBg,
      card_bg: userCardBg,
      border_color: userBorderColor,
      incoming_bubble: userIncomingBubble,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("aura_user_theme", JSON.stringify(fullTheme));
      applyThemeToDocument(fullTheme);
    }
    setThemeSuccess(true);
    showToast("Tema ayarları başarıyla kaydedildi ve uygulandı!");
    setTimeout(() => setThemeSuccess(false), 2500);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    router.push("/login");
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in select-none"
    >
      <div className="w-full max-w-lg bg-grupo-dark-card border border-grupo-dark-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] relative">
        {/* Ayarlar Kaydedildi Kayan Toast Bildirimi */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-emerald-600/95 text-white text-xs font-bold shadow-2xl shadow-emerald-950/80 border border-emerald-400/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-none backdrop-blur-md whitespace-nowrap">
            <CheckCircle className="w-4 h-4 text-emerald-200 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Başlık Barı */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-grupo-dark-border flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center font-bold">
              ⚙️
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Ayarlar ve Profil</h2>
              <p className="text-xs text-slate-400">Hesabınızı ve tercihlerinizi yönetin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Butonları (Mobilde tam genişlik ve responsive etiketler) */}
        <div className="flex items-center overflow-x-auto scrollbar-none border-b border-grupo-dark-border px-1.5 sm:px-6 pt-1 sm:pt-2 bg-slate-900/40">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold border-b-2 transition-colors cursor-pointer flex-shrink-0 whitespace-nowrap ${
              activeTab === "profile"
                ? "border-grupo-accent text-pink-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Profilim</span>
            <span className="sm:hidden">Profil</span>
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold border-b-2 transition-colors cursor-pointer flex-shrink-0 whitespace-nowrap ${
              activeTab === "privacy"
                ? "border-grupo-accent text-pink-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>Gizlilik</span>
          </button>
          <button
            onClick={() => setActiveTab("theme")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold border-b-2 transition-colors cursor-pointer flex-shrink-0 whitespace-nowrap ${
              activeTab === "theme"
                ? "border-grupo-accent text-pink-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Tema & Görünüm</span>
            <span className="sm:hidden">Tema</span>
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold border-b-2 transition-colors cursor-pointer flex-shrink-0 whitespace-nowrap ${
              activeTab === "notifications"
                ? "border-grupo-accent text-pink-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Web Push</span>
            <span className="sm:hidden">Push</span>
          </button>
          <button
            onClick={() => setActiveTab("access_logs")}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold border-b-2 transition-colors cursor-pointer flex-shrink-0 whitespace-nowrap ${
              activeTab === "access_logs"
                ? "border-grupo-accent text-pink-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Giriş Kayıtları</span>
            <span className="sm:hidden">Girişler</span>
          </button>
        </div>

        {/* Tab İçerikleri */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 sm:space-y-6">
          {activeTab === "profile" && (
            <div className="space-y-6">
              {/* Avatar Yükleme */}
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-pink-500/40 flex items-center justify-center font-bold text-xl text-pink-400 overflow-hidden shadow-lg">
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
                  <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    {isUploadingAvatar ? (
                      <Loader2 className="w-6 h-6 animate-spin text-pink-400" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mb-0.5" />
                        <span className="text-[10px] font-medium">Değiştir</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                      disabled={isUploadingAvatar}
                    />
                  </label>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{user?.display_name}</h3>
                  <p className="text-xs text-slate-400">@{user?.username}</p>
                  <p className="text-[11px] text-pink-400/80 mt-1">
                    Görseli değiştirmek için üzerine tıklayın
                  </p>
                </div>
              </div>

              {/* Profil Düzenleme Formu */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Görünen Ad
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-slate-900 border border-grupo-dark-border rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-grupo-accent transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Hakkımda / Durum
                  </label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Müsait, Aura kullanıyor..."
                    className="w-full bg-slate-900 border border-grupo-dark-border rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-grupo-accent transition-colors"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-grupo-accent hover:bg-grupo-accent-hover text-white text-xs font-bold shadow-lg shadow-pink-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Değişiklikleri Kaydet</span>
                  </button>

                  {saveSuccess && (
                    <span className="text-xs text-emerald-400 font-medium animate-in fade-in">
                      ✓ Profil güncellendi!
                    </span>
                  )}
                </div>
              </form>

              {/* Hesap Bilgileri */}
              <div className="pt-4 border-t border-grupo-dark-border space-y-2 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Kayıtlı E-posta:</span>
                  <span className="text-slate-200 font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kullanıcı Kimliği:</span>
                  <span className="font-mono text-[11px] text-slate-500">{user?.id}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-5">
              {/* Okundu Bilgisi (Mavi Tik) */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-grupo-dark-border flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white">Okundu Bilgisi (Mavi Tik)</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Kapalıysa karşı taraf mesajları okuduğunuzu göremez.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePrivacyToggle("read_receipts", !readReceipts)}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer flex-shrink-0 ${
                    readReceipts ? "bg-pink-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      readReceipts ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Son Görülme Zamanı */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-grupo-dark-border flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white">Son Görülme Zamanı</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Çevrimiçi olmadığınızda son görülme bilginiz gizlenir.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePrivacyToggle("last_seen", !lastSeen)}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer flex-shrink-0 ${
                    lastSeen ? "bg-pink-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      lastSeen ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Sesli / Görüntülü Arama İzni */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-grupo-dark-border flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white">Gelen Aramaları Kabul Et</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Kapalıysa gelen tüm WebRTC aramaları otomatik meşgule düşer.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePrivacyToggle("allow_calls", !allowCalls)}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer flex-shrink-0 ${
                    allowCalls ? "bg-pink-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      allowCalls ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Bildirim Sesleri Aç / Kapat */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-grupo-dark-border flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                    {soundAlerts ? <Volume2 className="w-4 h-4 text-pink-400 flex-shrink-0" /> : <VolumeX className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                    <span>Bildirim Sesleri ve Uyarılar</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        soundAlerts
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {soundAlerts ? "Sesli" : "Sessiz"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {soundAlerts
                      ? "Yeni mesaj geldiğinde ses efekti çalınır."
                      : "Telefonunuz seslide olsa dahi bildirimler sessiz iletilir ve ses çalmaz."}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer flex-shrink-0 ${
                    soundAlerts ? "bg-pink-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${
                      soundAlerts ? "translate-x-5" : "translate-x-0"
                    }`}
                  >
                    {soundAlerts ? (
                      <Volume2 className="w-2.5 h-2.5 text-pink-600" />
                    ) : (
                      <VolumeX className="w-2.5 h-2.5 text-slate-500" />
                    )}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs text-pink-300">
                <Lock className="w-4 h-4 flex-shrink-0" />
                <span>Tüm iletişim ve görüşmeler self-hosted sunucumuzda şifrelenir.</span>
              </div>
            </div>
          )}

          {activeTab === "theme" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-grupo-dark-border">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Premium SaaS Koyu Temalar</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Dark-First
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Linear, Supabase ve Raycast standartlarında göz yormayan profesyonel koyu mod temalarını seçin veya her rengi özelleştirin.
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Palette className="w-5 h-5" />
                </div>
              </div>

              {themeSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2 animate-fadeIn">
                  <Check className="w-4 h-4" />
                  <span>Kişisel tema tercihleriniz anında uygulandı ve cihazınıza kaydedildi!</span>
                </div>
              )}

              {/* 1. Küratörlü Premium Koyu Tema Kartları */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Özel Koyu Mod Koleksiyonu</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Tek tıkla tüm ekranı dönüştürün</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {THEME_PRESETS.map((p) => {
                    const isSelected =
                      userOutgoingBubble.toLowerCase() === p.bubble.toLowerCase() &&
                      userAccentColor.toLowerCase() === p.color.toLowerCase() &&
                      userMainBg.toLowerCase() === p.main_bg.toLowerCase();

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          handleApplyUserTheme(
                            p.color,
                            p.bubble,
                            p.text || "auto",
                            p.main_bg,
                            p.card_bg,
                            p.border_color,
                            p.incoming_bubble
                          )
                        }
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 relative group overflow-hidden ${
                          isSelected
                            ? "border-indigo-400/80 bg-slate-800/80 shadow-lg shadow-indigo-950/40 ring-2 ring-indigo-500/50 scale-[1.02]"
                            : "border-slate-800/90 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-850/80"
                        }`}
                      >
                        {/* Başlık ve Rozet */}
                        <div className="flex items-center justify-between gap-1 w-full">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              <span>{p.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                              {p.description}
                            </div>
                          </div>
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 border"
                            style={{
                              backgroundColor: `${p.color}18`,
                              color: p.color,
                              borderColor: `${p.color}35`,
                            }}
                          >
                            {p.badge}
                          </span>
                        </div>

                        {/* Mini Arayüz / Balon Mockup Görseli */}
                        <div
                          className="w-full rounded-xl p-2.5 border space-y-1.5 shadow-inner"
                          style={{
                            backgroundColor: p.main_bg,
                            borderColor: p.border_color,
                          }}
                        >
                          {/* Mini Gelen Mesaj */}
                          <div className="flex justify-start">
                            <div
                              className="px-2 py-1 rounded-lg rounded-bl-none text-[10px] text-slate-300 border max-w-[85%]"
                              style={{
                                backgroundColor: p.incoming_bubble,
                                borderColor: p.border_color,
                              }}
                            >
                              SaaS koyu mod harika!
                            </div>
                          </div>

                          {/* Mini Giden Mesaj */}
                          <div className="flex justify-end">
                            <div
                              className="px-2 py-1 rounded-lg rounded-br-none text-[10px] shadow-sm max-w-[85%]"
                              style={{
                                backgroundColor: p.bubble,
                                color: p.text,
                              }}
                            >
                              Kusursuz görünüyor ✓✓
                            </div>
                          </div>
                        </div>

                        {/* Alt Palet Renk Noktaları & Seçim İşareti */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/5 w-full">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs"
                              style={{ backgroundColor: p.color }}
                              title={`Vurgu: ${p.color}`}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs"
                              style={{ backgroundColor: p.bubble }}
                              title={`Giden Balon: ${p.bubble}`}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs"
                              style={{ backgroundColor: p.incoming_bubble }}
                              title={`Gelen Balon: ${p.incoming_bubble}`}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs"
                              style={{ backgroundColor: p.main_bg }}
                              title={`Arka Plan: ${p.main_bg}`}
                            />
                          </div>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-400">
                              <Check className="w-3.5 h-3.5" />
                              <span>Aktif</span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Özel Renk İnce Ayarı */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-grupo-dark-border space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>Özel Renk İnce Ayarı</span>
                  </div>
                  <span className="text-[10px] text-indigo-400 font-medium">Anında Canlı Önizleme</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Ana Vurgu Rengi */}
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Ana Vurgu Rengi (Butonlar/İkonlar)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={userAccentColor}
                        onChange={(e) =>
                          handleApplyUserTheme(
                            e.target.value,
                            userOutgoingBubble,
                            userOutgoingText,
                            userMainBg,
                            userCardBg,
                            userBorderColor,
                            userIncomingBubble
                          )
                        }
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="color"
                        value={userAccentColor.startsWith("#") ? userAccentColor : "#6366F1"}
                        onChange={(e) =>
                          handleApplyUserTheme(
                            e.target.value,
                            userOutgoingBubble,
                            userOutgoingText,
                            userMainBg,
                            userCardBg,
                            userBorderColor,
                            userIncomingBubble
                          )
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        title="Vurgu Rengi Seç"
                      />
                    </div>
                  </div>

                  {/* Giden Balon Rengi */}
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Giden Mesaj Balon Rengi
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={userOutgoingBubble}
                        onChange={(e) =>
                          handleApplyUserTheme(
                            userAccentColor,
                            e.target.value,
                            userOutgoingText,
                            userMainBg,
                            userCardBg,
                            userBorderColor,
                            userIncomingBubble
                          )
                        }
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="color"
                        value={userOutgoingBubble.startsWith("#") ? userOutgoingBubble : "#4F46E5"}
                        onChange={(e) =>
                          handleApplyUserTheme(
                            userAccentColor,
                            e.target.value,
                            userOutgoingText,
                            userMainBg,
                            userCardBg,
                            userBorderColor,
                            userIncomingBubble
                          )
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        title="Giden Balon Rengi Seç"
                      />
                    </div>
                  </div>

                  {/* Giden Mesaj Yazı Rengi */}
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Giden Mesaj Yazı Rengi
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={
                          userOutgoingText === "auto" ||
                          userOutgoingText === "#FFFFFF" ||
                          userOutgoingText === "#0F172A"
                            ? userOutgoingText
                            : "custom"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== "custom") {
                            handleApplyUserTheme(
                              userAccentColor,
                              userOutgoingBubble,
                              val,
                              userMainBg,
                              userCardBg,
                              userBorderColor,
                              userIncomingBubble
                            );
                          }
                        }}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                      >
                        <option value="auto">Otomatik (Akıllı Kontrast)</option>
                        <option value="#FFFFFF">Beyaz (#FFFFFF)</option>
                        <option value="#0F172A">Koyu Siyah (#0F172A)</option>
                        <option value="custom">Özel Renk Seç...</option>
                      </select>
                      <input
                        type="color"
                        value={effectiveTextColor.startsWith("#") ? effectiveTextColor : "#FFFFFF"}
                        onChange={(e) =>
                          handleApplyUserTheme(
                            userAccentColor,
                            userOutgoingBubble,
                            e.target.value,
                            userMainBg,
                            userCardBg,
                            userBorderColor,
                            userIncomingBubble
                          )
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        title="Özel Yazı Rengi Seç"
                      />
                    </div>
                  </div>

                  {/* Gelen Balon Rengi */}
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Gelen Mesaj Balon Rengi
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={userIncomingBubble}
                        onChange={(e) =>
                          handleApplyUserTheme(
                            userAccentColor,
                            userOutgoingBubble,
                            userOutgoingText,
                            userMainBg,
                            userCardBg,
                            userBorderColor,
                            e.target.value
                          )
                        }
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="color"
                        value={userIncomingBubble.startsWith("#") ? userIncomingBubble : "#181C28"}
                        onChange={(e) =>
                          handleApplyUserTheme(
                            userAccentColor,
                            userOutgoingBubble,
                            userOutgoingText,
                            userMainBg,
                            userCardBg,
                            userBorderColor,
                            e.target.value
                          )
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        title="Gelen Balon Rengi Seç"
                      />
                    </div>
                  </div>

                  {/* Kart & Panel Rengi */}
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Panel ve Kart Zemin Rengi
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={userCardBg}
                        onChange={(e) =>
                          handleApplyUserTheme(
                            userAccentColor,
                            userOutgoingBubble,
                            userOutgoingText,
                            userMainBg,
                            e.target.value,
                            userBorderColor,
                            userIncomingBubble
                          )
                        }
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="color"
                        value={userCardBg.startsWith("#") ? userCardBg : "#11141E"}
                        onChange={(e) =>
                          handleApplyUserTheme(
                            userAccentColor,
                            userOutgoingBubble,
                            userOutgoingText,
                            userMainBg,
                            e.target.value,
                            userBorderColor,
                            userIncomingBubble
                          )
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        title="Kart Rengi Seç"
                      />
                    </div>
                  </div>

                  {/* Ana Zemin Rengi */}
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Ana Sayfa Arka Plan Rengi
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={userMainBg}
                        onChange={(e) =>
                          handleApplyUserTheme(
                            userAccentColor,
                            userOutgoingBubble,
                            userOutgoingText,
                            e.target.value,
                            userCardBg,
                            userBorderColor,
                            userIncomingBubble
                          )
                        }
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="color"
                        value={userMainBg.startsWith("#") ? userMainBg : "#090A0F"}
                        onChange={(e) =>
                          handleApplyUserTheme(
                            userAccentColor,
                            userOutgoingBubble,
                            userOutgoingText,
                            e.target.value,
                            userCardBg,
                            userBorderColor,
                            userIncomingBubble
                          )
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        title="Ana Zemin Rengi Seç"
                      />
                    </div>
                  </div>
                </div>

                {/* Bilgilendirme */}
                <div className="flex items-center gap-2 text-[11px] text-slate-300 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    <strong>Akıllı Yazı Rengi:</strong> Otomatik mod açıkken giden balonun tonuna göre yazı rengi maksimum okunabilirlik için anında adapte edilir.
                  </span>
                </div>
              </div>

              {/* 3. Canlı Sohbet Simülatörü / Önizleme */}
              <div
                className="p-4 rounded-2xl border space-y-3 transition-colors duration-200 shadow-xl"
                style={{
                  backgroundColor: userMainBg,
                  borderColor: userBorderColor,
                }}
              >
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: userBorderColor }}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                      style={{
                        backgroundColor: userCardBg,
                        color: userAccentColor,
                        border: `1px solid ${userBorderColor}`,
                      }}
                    >
                      A
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white leading-tight">Antigravity Aura</div>
                      <div className="text-[10px] text-emerald-400 font-medium leading-tight">Çevrimiçi</div>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Canlı Sohbet Önizlemesi
                  </div>
                </div>

                {/* Mesaj Akışı */}
                <div className="space-y-2 py-1">
                  {/* Gelen Mesaj */}
                  <div className="flex justify-start">
                    <div
                      className="px-3.5 py-2 rounded-2xl rounded-bl-xs text-xs text-slate-200 border max-w-[85%] shadow-sm transition-colors duration-200"
                      style={{
                        backgroundColor: userIncomingBubble,
                        borderColor: userBorderColor,
                      }}
                    >
                      <div>Yeni SaaS koyu mod teması nasıl duruyor?</div>
                      <div className="text-[10px] text-slate-400 text-right mt-0.5">14:30</div>
                    </div>
                  </div>

                  {/* Giden Mesaj */}
                  <div className="flex justify-end">
                    <div
                      className="px-3.5 py-2 rounded-2xl rounded-br-xs text-xs shadow-md max-w-[85%] transition-all duration-200"
                      style={{
                        backgroundColor: userOutgoingBubble,
                        color: effectiveTextColor,
                      }}
                    >
                      <div>Kusursuz! Gözü hiç yormuyor ve tam aradığım premium havayı veriyor.</div>
                      <div className="text-[10px] text-right mt-0.5" style={{ opacity: 0.8 }}>
                        14:31 ✓✓
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mock Yazma Barı */}
                <div
                  className="p-1.5 rounded-xl border flex items-center gap-2"
                  style={{
                    backgroundColor: userCardBg,
                    borderColor: userBorderColor,
                  }}
                >
                  <div className="flex-1 px-3 py-1.5 rounded-lg text-xs text-slate-400 bg-slate-900/60">
                    Bir mesaj yazın...
                  </div>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0"
                    style={{
                      backgroundColor: userAccentColor,
                      color: getContrastTextColor(userAccentColor),
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* 4. Kaydet Butonu */}
              <button
                type="button"
                onClick={handleSaveUserTheme}
                style={{
                  backgroundColor: userAccentColor,
                  color: getContrastTextColor(userAccentColor),
                }}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-bold shadow-lg hover:brightness-110 active:scale-[0.99] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Temayı Kaydet ve Herkese Uygula</span>
              </button>

              {themeSuccess && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-semibold py-1 animate-in fade-in">
                  <Check className="w-4 h-4" />
                  <span>Tema ayarları başarıyla kaydedildi!</span>
                </div>
              )}
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-grupo-dark-border">
                <div>
                  <h4 className="text-sm font-bold text-white">Web Push Bildirimleri (VAPID)</h4>
                  <p className="text-xs text-slate-400">
                    Tarayıcı kapalıyken veya telefon kilitliyken bile anlık mesaj bildirimleri alın.
                  </p>
                </div>
                <Bell className="w-5 h-5 text-pink-400" />
              </div>

              {pushStatusMessage && (
                <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs text-pink-300 animate-fadeIn">
                  {pushStatusMessage}
                </div>
              )}

              {/* Web Push Aç / Kapat */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-grupo-dark-border flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Anlık Cihaz Bildirimleri</span>
                    {isPushSubscribed ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                        Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 whitespace-nowrap">
                        Kapalı
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Yeni bir mesaj geldiğinde cihazınızda zil sesi ve önizleme ile bildirim çıkar.
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isPushLoading}
                  onClick={handleTogglePush}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer flex-shrink-0 ${
                    isPushSubscribed ? "bg-grupo-accent" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      isPushSubscribed ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Sesli Bildirim ve Zil Sesi Aç / Kapat */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-grupo-dark-border flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    {soundAlerts ? <Volume2 className="w-4 h-4 text-pink-400 flex-shrink-0" /> : <VolumeX className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                    <span>Bildirim Sesleri ve Zil Sesi</span>
                    {soundAlerts ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                        Sesli
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 whitespace-nowrap">
                        Sessiz
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Telefonunuz seslide olsa dahi bildirimler sessiz iletilir ve mesaj sesi çalmaz.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer flex-shrink-0 ${
                    soundAlerts ? "bg-pink-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${
                      soundAlerts ? "translate-x-5" : "translate-x-0"
                    }`}
                  >
                    {soundAlerts ? (
                      <Volume2 className="w-2.5 h-2.5 text-pink-600" />
                    ) : (
                      <VolumeX className="w-2.5 h-2.5 text-slate-500" />
                    )}
                  </span>
                </button>
              </div>

              {/* Test Bildirimi Butonu */}
              {isPushSubscribed && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-grupo-dark-border flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">Test Bildirimi Gönder</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Bildirimlerin cihazınıza ulaştığını hemen test edin.
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isPushLoading}
                    onClick={handleTestPush}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-pink-400 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Test Et</span>
                  </button>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">💡 Nasıl Çalışır?</p>
                <p>
                  Aura, Google FCM veya Apple Push sunucularına doğrudan şifreli RFC standardında VAPID istekleri gönderir. Sekmeniz tamamen kapalı olsa dahi telefonunuz uyanır.
                </p>
              </div>
            </div>
          )}

          {activeTab === "access_logs" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-grupo-dark-border gap-2">
                <div className="min-w-0 pr-1">
                  <h4 className="text-sm font-bold text-white">Son Giriş Kayıtları (Access Logs)</h4>
                  <p className="text-xs text-slate-400">
                    Hesabınıza yapılan son oturum açma işlemleri ve kullanılan cihazlar.
                  </p>
                </div>
                <History className="w-5 h-5 text-pink-400 flex-shrink-0" />
              </div>

              {isLoadingLogs ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                  <span>Kayıtlar yükleniyor...</span>
                </div>
              ) : accessLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Henüz kayıtlı bir giriş geçmişi bulunamadı.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {accessLogs.map((log: any, idx: number) => {
                    const isMobile =
                      log.device_info?.toLowerCase().includes("iphone") ||
                      log.device_info?.toLowerCase().includes("android");

                    return (
                      <div
                        key={log.id || idx}
                        className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs transition-colors hover:border-slate-700/80"
                      >
                        <div className="flex items-start sm:items-center justify-between gap-3">
                          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-pink-400 mt-0.5 sm:mt-0">
                              {isMobile ? (
                                <Smartphone className="w-4 h-4" />
                              ) : (
                                <Laptop className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center flex-wrap gap-1.5">
                                <span className="font-semibold text-white truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
                                  {log.device_info || "Bilinmeyen Cihaz"}
                                </span>
                                {idx === 0 && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 whitespace-nowrap flex-shrink-0">
                                    Son Giriş
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="flex items-center gap-1 font-mono">
                                  <Globe className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                  {log.ip_address}
                                </span>
                                <span className="text-slate-600 sm:hidden">•</span>
                                <span className="text-[11px] text-slate-400 sm:hidden font-medium">
                                  {new Date(log.created_at).toLocaleString("tr-TR", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Geniş ekranda sağ tarafta tarih */}
                          <div className="hidden sm:block text-[11px] text-slate-400 text-right flex-shrink-0 font-medium">
                            {new Date(log.created_at).toLocaleString("tr-TR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alt Bar: Parametreler & Çıkış Butonu */}
        <div className="p-3 sm:p-4 border-t border-grupo-dark-border bg-slate-900/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>Çıkış Yap</span>
            </button>
            {onOpenAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAdmin();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Sliders className="w-4 h-4 flex-shrink-0" />
                <span>Aura Parametreleri</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3.5 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
