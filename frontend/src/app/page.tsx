"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { useSocketStore } from "@/store/useSocketStore";
import { useCallStore } from "@/store/useCallStore";
import IncomingCallModal from "@/components/call/IncomingCallModal";
import ActiveCallModal from "@/components/call/ActiveCallModal";
import SideNavigation, { NavTab } from "@/components/layout/SideNavigation";
import MobileNavigation from "@/components/layout/MobileNavigation";
import SettingsModal from "@/components/chat/SettingsModal";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInfoModal from "@/components/chat/MessageInfoModal";
import ReplyBar from "@/components/chat/ReplyBar";
import MediaUploadMenu from "@/components/chat/MediaUploadMenu";
import AudioRecorder from "@/components/chat/AudioRecorder";
import { api } from "@/lib/api";
import {
  MessageSquare,
  LogOut,
  Send,
  Search,
  UserPlus,
  ShieldCheck,
  Sparkles,
  Phone,
  Video,
  ArrowLeft,
  Mic,
  Star,
  Users,
  Info,
  X,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  const {
    conversations,
    activeConversationId,
    messages,
    typingMap,
    loadConversations,
    selectConversation,
    deselectConversation,
    sendMessage,
    sendTyping,
    startNewConversation,
  } = useChatStore();
  const { connect, isConnected } = useSocketStore();
  const initiateCall = useCallStore((state) => state.initiateCall);

  const [activeTab, setActiveTab] = useState<NavTab>("chats");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showContactDrawer, setShowContactDrawer] = useState(false);

  const [inputMessage, setInputMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Oturum Kontrolü
  useEffect(() => {
    checkAuth().then((authed) => {
      if (!authed) {
        router.push("/login");
      }
    });
  }, [checkAuth, router]);

  // 2. WebSocket ve Konuşmaları Yükle
  useEffect(() => {
    if (isAuthenticated) {
      connect();
      loadConversations();
    }
  }, [isAuthenticated, connect, loadConversations]);

  // 3. Mesaj listesi otomatik en alta kaydırma
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeConversationId]);

  // 4. Kişiler sekmesine geçildiğinde tüm kullanıcıları yükle
  useEffect(() => {
    if (activeTab === "contacts" && isAuthenticated) {
      setIsLoadingContacts(true);
      api
        .get("/users/search?q=")
        .then((res) => {
          setContactsList(res.data);
        })
        .catch((err) => console.error("Kişiler yüklenemedi:", err))
        .finally(() => setIsLoadingContacts(false));
    }
  }, [activeTab, isAuthenticated]);

  // 5. Kullanıcı Arama
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const delay = setTimeout(async () => {
        try {
          const res = await api.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
          setSearchResults(res.data);
        } catch (e) {
          console.error("Arama hatası:", e);
        }
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const activeMessages = activeConversationId ? messages[activeConversationId] || [] : [];
  const isOtherTyping = activeConversationId ? typingMap[activeConversationId] : false;

  // Toplam okunmamış mesaj sayısı
  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  // Yıldızlı mesajlar listesi
  const starredMessages = Object.values(messages)
    .flat()
    .filter((m) => m.is_starred);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConversationId) return;

    sendMessage(activeConversationId, inputMessage.trim());
    setInputMessage("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    if (!activeConversationId) return;

    sendTyping(activeConversationId, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (activeConversationId) {
        sendTyping(activeConversationId, false);
      }
    }, 2000);
  };

  const handleStartChat = async (targetUserId: string) => {
    setSearchQuery("");
    setSearchResults([]);
    setActiveTab("chats");
    await startNewConversation(targetUserId);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] w-screen items-center justify-center bg-grupo-dark-bg text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-medium">Fısıltı yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-screen bg-grupo-dark-bg text-slate-100 select-none overflow-hidden">
      {/* 1. SÜTUN: Grupo 64px Sol Dikey Menü (SideNavigation) */}
      <SideNavigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "settings") setIsSettingsOpen(true);
        }}
        unreadCount={totalUnreadCount}
        starredCount={starredMessages.length}
        isConnected={isConnected}
        user={user}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
      />

      {/* 2. SÜTUN: Sohbet / Rehber / Yıldızlı Listesi (AsideList - 340px) */}
      <aside
        className={`${
          activeConversationId ? "hidden md:flex" : "flex w-full"
        } md:w-[340px] bg-grupo-dark-card border-r border-grupo-dark-border flex-col z-10 flex-shrink-0 h-full`}
      >
        {/* Kullanıcı Profili Üst Barı (Mobilde görünür) */}
        <div className="p-3.5 sm:p-4 border-b border-grupo-dark-border flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="relative flex-shrink-0 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-pink-400 overflow-hidden">
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
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-grupo-dark-card ${
                  isConnected ? "bg-emerald-500" : "bg-rose-500"
                }`}
              ></span>
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate">{user?.display_name}</h2>
              <p className="text-xs text-slate-400 truncate">@{user?.username}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Çıkış Yap"
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Canlı Arama Kutusu */}
        <div className="p-3 border-b border-grupo-dark-border">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "contacts"
                  ? "Kişilerde ara..."
                  : activeTab === "starred"
                  ? "Yıldızlılarda ara..."
                  : "Sohbet veya kişi ara..."
              }
              className="w-full bg-slate-900/80 border border-grupo-dark-border rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-grupo-accent transition-colors"
            />
          </div>
        </div>

        {/* Arama Sonuçları Varsa */}
        {searchQuery.trim().length >= 2 ? (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              Arama Sonuçları ({searchResults.length})
            </div>
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => handleStartChat(u.id)}
                className="w-full p-2.5 rounded-xl hover:bg-slate-800/60 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-pink-400 overflow-hidden">
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt={u.display_name} className="w-full h-full object-cover" />
                    ) : (
                      u.display_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{u.display_name}</div>
                    <div className="text-xs text-slate-400">@{u.username}</div>
                  </div>
                </div>
                <UserPlus className="w-4 h-4 text-grupo-accent" />
              </button>
            ))}
          </div>
        ) : activeTab === "contacts" ? (
          /* TAB 2: Kişiler / Rehber Listesi */
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              Kayıtlı Kişiler ({contactsList.length})
            </div>
            {isLoadingContacts ? (
              <div className="p-8 text-center text-xs text-slate-500">Kişiler yükleniyor...</div>
            ) : contactsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Sistemde henüz başka kayıtlı kullanıcı yok.
              </div>
            ) : (
              contactsList.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleStartChat(contact.id)}
                  className="w-full p-3 rounded-2xl hover:bg-slate-800/60 flex items-center gap-3 text-left transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-pink-400 overflow-hidden flex-shrink-0">
                    {contact.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={contact.avatar_url} alt={contact.display_name} className="w-full h-full object-cover" />
                    ) : (
                      contact.display_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{contact.display_name}</div>
                    <div className="text-xs text-slate-400 truncate">@{contact.username}</div>
                  </div>
                  <UserPlus className="w-4 h-4 text-pink-400" />
                </button>
              ))
            )}
          </div>
        ) : activeTab === "starred" ? (
          /* TAB 3: Yıldızlı Mesajlar Listesi */
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <Star className="w-3 h-3 fill-amber-400" />
              <span>Yıldızlı Mesajlar ({starredMessages.length})</span>
            </div>
            {starredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Star className="w-10 h-10 mb-2 opacity-30 text-amber-400" />
                <p className="text-xs">Yıldızlı mesajınız bulunmuyor.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Önemli mesajların menüsünden &quot;Yıldızla&quot; seçeneğini kullanabilirsiniz.
                </p>
              </div>
            ) : (
              starredMessages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => selectConversation(msg.conversation_id)}
                  className="w-full p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:bg-slate-800/60 text-left transition-colors cursor-pointer"
                >
                  <div className="text-xs text-amber-400 font-semibold mb-1 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{msg.is_mine ? "Sen" : "Karşı Taraf"}</span>
                  </div>
                  <p className="text-sm text-slate-200 line-clamp-2 leading-relaxed">
                    {msg.message_type === "voice"
                      ? "🎤 Sesli Mesaj"
                      : msg.message_type === "image"
                      ? "📷 Fotoğraf"
                      : msg.content}
                  </p>
                </button>
              ))
            )}
          </div>
        ) : (
          /* TAB 1: Sohbetler Listesi */
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs">Henüz bir sohbet yok.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  &quot;Kişiler&quot; sekmesine geçerek bir kullanıcıyla sohbete başlayabilirsiniz.
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer ${
                      isActive
                        ? "bg-slate-800/90 border border-slate-700/80 shadow-md"
                        : "hover:bg-slate-800/40 border border-transparent"
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-pink-400 overflow-hidden">
                        {conv.other_user.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={conv.other_user.avatar_url}
                            alt={conv.other_user.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          conv.other_user.display_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      {conv.is_online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-grupo-dark-card shadow-sm"></span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-white truncate">
                          {conv.other_user.display_name}
                        </span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {conv.is_online ? (
                            <span className="text-emerald-400 font-medium">Çevrimiçi</span>
                          ) : (
                            "Çevrimdışı"
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate max-w-[180px]">
                          {typingMap[conv.id] ? (
                            <span className="text-pink-400 font-medium animate-pulse">
                              yazıyor...
                            </span>
                          ) : conv.last_message ? (
                            conv.last_message.message_type === "voice" ? (
                              "🎤 Sesli Mesaj"
                            ) : conv.last_message.message_type === "image" ? (
                              "📷 Fotoğraf"
                            ) : (
                              conv.last_message.content
                            )
                          ) : (
                            <span className="italic text-slate-600">Sohbeti başlatın</span>
                          )}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-grupo-accent text-white text-[10px] font-bold shadow-sm shadow-pink-500/50">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Mobilde Alt Navigasyon Barı (Sohbet açık değilken) */}
        {!activeConversationId && (
          <MobileNavigation
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              if (tab === "settings") setIsSettingsOpen(true);
            }}
            unreadCount={totalUnreadCount}
            starredCount={starredMessages.length}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </aside>

      {/* 3. SÜTUN: Merkez Sohbet Penceresi (Flex-1) */}
      <main
        className={`${
          activeConversationId ? "flex w-full" : "hidden md:flex"
        } md:flex-1 flex-col bg-grupo-dark-bg relative h-full`}
      >
        {activeConv ? (
          <>
            {/* Sohbet Üst Başlığı (ChatHeader) */}
            <header className="h-16 border-b border-grupo-dark-border px-3 sm:px-6 flex items-center justify-between bg-grupo-dark-card/60 backdrop-blur-md z-10 flex-shrink-0">
              <div
                onClick={() => setShowContactDrawer(!showContactDrawer)}
                className="flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer"
              >
                {/* Mobilde Geri Butonu (<-- Geri) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deselectConversation();
                  }}
                  title="Geri Dön"
                  className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer -ml-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-pink-400 overflow-hidden">
                    {activeConv.other_user.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeConv.other_user.avatar_url}
                        alt={activeConv.other_user.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      activeConv.other_user.display_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {activeConv.is_online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-grupo-dark-card"></span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {activeConv.other_user.display_name}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    {isOtherTyping ? (
                      <span className="text-pink-400 font-semibold animate-pulse">
                        yazıyor...
                      </span>
                    ) : activeConv.is_online ? (
                      <span className="text-emerald-400 font-medium">Çevrimiçi</span>
                    ) : (
                      "Son görülme yakınlarda"
                    )}
                  </p>
                </div>
              </div>

              {/* Sesli / Görüntülü Arama & Profil Butonları */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => initiateCall(activeConv.id, "audio")}
                  title="Sesli Arama Başlat"
                  className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => initiateCall(activeConv.id, "video")}
                  title="Görüntülü Arama Başlat"
                  className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-pink-400 transition-colors cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowContactDrawer(!showContactDrawer)}
                  title="Kişi Bilgisi"
                  className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Mesaj Akışı */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
              {activeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                  <Sparkles className="w-8 h-8 text-pink-500/50 mb-2" />
                  <p className="text-sm font-medium">Bu sohbette henüz mesaj yok.</p>
                  <p className="text-xs text-slate-600 mt-1">İlk mesajı göndererek başlayın!</p>
                </div>
              ) : (
                activeMessages.map((m) => <MessageBubble key={m.id} message={m} />)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Mesaj Giriş Barı & Alıntılama & Medya Menüsü */}
            <footer className="p-2.5 sm:p-4 border-t border-grupo-dark-border bg-grupo-dark-card/40 backdrop-blur-md flex-shrink-0">
              <ReplyBar />

              <div className="flex items-center gap-2 sm:gap-3">
                <MediaUploadMenu
                  conversationId={activeConv.id}
                  onStartVoice={() => setIsRecordingVoice(true)}
                />

                {isRecordingVoice ? (
                  <AudioRecorder
                    conversationId={activeConv.id}
                    onCancel={() => setIsRecordingVoice(false)}
                    onComplete={() => setIsRecordingVoice(false)}
                  />
                ) : (
                  <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={handleInputChange}
                      placeholder="Bir mesaj yazın..."
                      className="flex-1 bg-slate-900/90 border border-grupo-dark-border rounded-2xl py-3 px-4 sm:py-3.5 sm:px-5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-grupo-accent transition-colors"
                      autoFocus
                    />

                    {inputMessage.trim() ? (
                      <button
                        type="submit"
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-grupo-accent hover:bg-grupo-accent-hover text-white flex items-center justify-center shadow-lg shadow-pink-500/25 transition-all cursor-pointer flex-shrink-0"
                      >
                        <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsRecordingVoice(true)}
                        title="Sesli Mesaj Kaydet"
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-grupo-dark-border flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                      >
                        <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                  </form>
                )}
              </div>
            </footer>
          </>
        ) : (
          /* Aktif Konuşma Yokken Karşılama Ekranı (Desktop) */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-pink-400 mb-4 shadow-xl">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Fısıltı Özel Mesajlaşma</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              Sol taraftan bir sohbet seçin veya &quot;Kişiler&quot; menüsünden birini bularak mesajlaşmaya başlayın.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>WhatsApp Tipi 3 Aşamalı Durum Takibi Devrede</span>
            </div>
          </div>
        )}

        {/* 4. SÜTUN: Grupo Sağ Çekmece (SlideOverDrawer - 340px) */}
        {showContactDrawer && activeConv && (
          <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-[340px] bg-grupo-dark-card border-l border-grupo-dark-border z-30 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-grupo-dark-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Kişi Bilgisi</h3>
              <button
                onClick={() => setShowContactDrawer(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center text-center border-b border-grupo-dark-border">
              <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-pink-500/40 flex items-center justify-center font-bold text-2xl text-pink-400 overflow-hidden mb-3 shadow-lg">
                {activeConv.other_user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeConv.other_user.avatar_url}
                    alt={activeConv.other_user.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  activeConv.other_user.display_name.charAt(0).toUpperCase()
                )}
              </div>
              <h4 className="text-base font-bold text-white">{activeConv.other_user.display_name}</h4>
              <p className="text-xs text-slate-400">@{activeConv.other_user.username}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-slate-800/80">
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeConv.is_online ? "bg-emerald-500" : "bg-slate-500"
                  }`}
                />
                <span className={activeConv.is_online ? "text-emerald-400" : "text-slate-400"}>
                  {activeConv.is_online ? "Çevrimiçi" : "Çevrimdışı"}
                </span>
              </div>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-1">Hakkında</span>
                <p className="text-slate-200 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  {activeConv.other_user.bio || "Henüz bir durum mesajı eklenmemiş."}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-2">Paylaşılan Medya</span>
                <div className="grid grid-cols-3 gap-2">
                  {activeMessages
                    .filter((m) => m.media_url && m.message_type === "image")
                    .slice(0, 6)
                    .map((m) => (
                      <div key={m.id} className="aspect-square rounded-lg overflow-hidden bg-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.media_url} alt="medya" className="w-full h-full object-cover" />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* WhatsApp Mesaj Bilgisi Modalı */}
        <MessageInfoModal />

        {/* Ayarlar ve Profil Modalı */}
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

        {/* Canlı Sesli & Görüntülü Arama Modalları (LiveKit WebRTC) */}
        <IncomingCallModal />
        <ActiveCallModal />
      </main>
    </div>
  );
}
