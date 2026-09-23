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
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getPushSubscription,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  sendTestPushNotification,
} from "@/lib/push_notifications";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const { user, updateProfile, uploadAvatar, updatePrivacy, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"profile" | "privacy" | "notifications" | "access_logs">("profile");
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [readReceipts, setReadReceipts] = useState(user?.privacy_settings?.read_receipts ?? true);
  const [lastSeen, setLastSeen] = useState(user?.privacy_settings?.last_seen ?? true);
  const [allowCalls, setAllowCalls] = useState(user?.privacy_settings?.allow_calls ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

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
    } else {
      const res = await subscribeUserToPush();
      setIsPushSubscribed(res.success);
      setPushStatusMessage(res.message);
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

  const handleLogout = async () => {
    onClose();
    await logout();
    router.push("/login");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-grupo-dark-card border border-grupo-dark-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Başlık Barı */}
        <div className="px-6 py-4 border-b border-grupo-dark-border flex items-center justify-between bg-slate-900/60">
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

        {/* Tab Butonları */}
        <div className="flex border-b border-grupo-dark-border px-6 pt-2 bg-slate-900/40">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "profile"
                ? "border-grupo-accent text-pink-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profilim</span>
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "privacy"
                ? "border-grupo-accent text-pink-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Gizlilik</span>
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "notifications"
                ? "border-grupo-accent text-pink-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Web Push</span>
          </button>
          <button
            onClick={() => setActiveTab("access_logs")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "access_logs"
                ? "border-grupo-accent text-pink-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Giriş Kayıtları</span>
          </button>
        </div>

        {/* Tab İçerikleri */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
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
                    placeholder="Müsait, Fısıltı kullanıyor..."
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
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-grupo-dark-border flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">Okundu Bilgisi (Mavi Tik)</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Kapalıysa karşı taraf mesajları okuduğunuzu göremez.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePrivacyToggle("read_receipts", !readReceipts)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    readReceipts ? "bg-grupo-accent" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      readReceipts ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Son Görülme Zamanı */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-grupo-dark-border flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">Son Görülme Zamanı</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Çevrimiçi olmadığınızda son görülme bilginiz gizlenir.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePrivacyToggle("last_seen", !lastSeen)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    lastSeen ? "bg-grupo-accent" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      lastSeen ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Sesli / Görüntülü Arama İzni */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-grupo-dark-border flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">Gelen Aramaları Kabul Et</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Kapalıysa gelen tüm WebRTC aramaları otomatik meşgule düşer.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handlePrivacyToggle("allow_calls", !allowCalls)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    allowCalls ? "bg-grupo-accent" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      allowCalls ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs text-pink-300">
                <Lock className="w-4 h-4 flex-shrink-0" />
                <span>Tüm iletişim ve görüşmeler self-hosted sunucumuzda şifrelenir.</span>
              </div>
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
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-grupo-dark-border flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    Anlık Cihaz Bildirimleri
                    {isPushSubscribed ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
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
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isPushSubscribed ? "bg-grupo-accent" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      isPushSubscribed ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
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
                  Fısıltı, Google FCM veya Apple Push sunucularına doğrudan şifreli RFC standardında VAPID istekleri gönderir. Sekmeniz tamamen kapalı olsa dahi telefonunuz uyanır.
                </p>
              </div>
            </div>
          )}

          {activeTab === "access_logs" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-grupo-dark-border">
                <div>
                  <h4 className="text-sm font-bold text-white">Son Giriş Kayıtları (Access Logs)</h4>
                  <p className="text-xs text-slate-400">
                    Hesabınıza yapılan son oturum açma işlemleri ve kullanılan cihazlar.
                  </p>
                </div>
                <History className="w-5 h-5 text-pink-400" />
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
                        className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-pink-400">
                            {isMobile ? (
                              <Smartphone className="w-4 h-4" />
                            ) : (
                              <Laptop className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate flex items-center gap-2">
                              <span>{log.device_info || "Bilinmeyen Cihaz"}</span>
                              {idx === 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                  Son Giriş
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span className="flex items-center gap-1 font-mono">
                                <Globe className="w-3 h-3 text-slate-500" />
                                {log.ip_address}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 text-right flex-shrink-0">
                          {new Date(log.created_at).toLocaleString("tr-TR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alt Bar: Çıkış Butonu */}
        <div className="p-4 border-t border-grupo-dark-border bg-slate-900/80 flex items-center justify-between">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Hesaptan Çıkış Yap</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
