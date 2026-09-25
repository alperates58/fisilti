"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { useSocketStore } from "@/store/useSocketStore";
import { useCallStore } from "@/store/useCallStore";
import { useStoryStore } from "@/store/useStoryStore";
import { useBackNavigation } from "@/lib/useBackNavigation";
import { useSettingsStore, applyThemeToDocument } from "@/store/useSettingsStore";
import IncomingCallModal from "@/components/call/IncomingCallModal";
import ActiveCallModal from "@/components/call/ActiveCallModal";
import SideNavigation, { NavTab } from "@/components/layout/SideNavigation";
import MobileNavigation from "@/components/layout/MobileNavigation";
import SettingsModal from "@/components/chat/SettingsModal";
import { AdminPanelModal } from "@/components/admin/AdminPanelModal";
import StoriesBar from "@/components/story/StoriesBar";
import StoryViewerModal from "@/components/story/StoryViewerModal";
import StoryCreatorModal from "@/components/story/StoryCreatorModal";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInfoModal from "@/components/chat/MessageInfoModal";
import ReplyBar from "@/components/chat/ReplyBar";
import MediaUploadMenu from "@/components/chat/MediaUploadMenu";
import AudioRecorder from "@/components/chat/AudioRecorder";
import { api, resolveMediaUrl } from "@/lib/api";
import { formatLastSeen } from "@/lib/utils";
import { notificationManager } from "@/lib/notifications";
import ConversationListItem from "@/components/chat/ConversationListItem";
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
  StarOff,
  Users,
  Info,
  X,
  FileText,
  Image as ImageIcon,
  Trash2,
  Eraser,
  MoreVertical,
  AlertCircle,
  Sliders,
  Play,
  Download,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const isSameCalendarDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const formatMessageDateDivider = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameCalendarDay(date, today)) return "Bugün";
  if (isSameCalendarDay(date, yesterday)) return "Dün";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  }).format(date);
};

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  const settings = useSettingsStore((state) => state.settings);
  const {
    conversations,
    activeConversationId,
    messages,
    typingMap,
    loadConversations,
    selectConversation,
    deselectConversation,
    deleteConversation,
    clearConversation,
    sendMessage,
    sendTyping,
    startNewConversation,
    starredMessages,
    loadStarredMessages,
    toggleStar,
    selectedMessageInfo,
    setSelectedMessageInfo,
  } = useChatStore();
  const { connect, isConnected } = useSocketStore();
  const initiateCall = useCallStore((state) => state.initiateCall);
  const { activeViewerGroup, closeViewer, isCreatorOpen, closeCreator } = useStoryStore();

  const [activeTab, setActiveTab] = useState<NavTab>("chats");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showContactDrawer, setShowContactDrawer] = useState(false);
  const [showActiveChatMenu, setShowActiveChatMenu] = useState(false);
  const [showActiveDeleteConfirm, setShowActiveDeleteConfirm] = useState<"delete" | "clear" | null>(null);
  const [isDeletingActive, setIsDeletingActive] = useState(false);
  const [confirmCallType, setConfirmCallType] = useState<"audio" | "video" | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{
    url: string;
    type: "image" | "video";
    name?: string;
  } | null>(null);

  // Sohbet İçi Arama Durumları (WhatsApp Tarzı)
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Android Sistem Geri Tuşu & Tarayıcı Geri Gezinme Yönetimi
  const { handleBackToChatList, showExitToast } = useBackNavigation({
    activeConversationId,
    onCloseChat: deselectConversation,
    previewMedia,
    onClosePreviewMedia: () => setPreviewMedia(null),
    showContactDrawer,
    onCloseContactDrawer: () => setShowContactDrawer(false),
    isChatSearchOpen,
    onCloseChatSearch: () => {
      setIsChatSearchOpen(false);
      setChatSearchQuery("");
      setCurrentMatchIndex(0);
    },
    confirmCallType,
    onCloseConfirmCallType: () => setConfirmCallType(null),
    showActiveDeleteConfirm,
    onCloseActiveDeleteConfirm: () => setShowActiveDeleteConfirm(null),
    isSettingsOpen,
    onCloseSettings: () => {
      setIsSettingsOpen(false);
      if (activeTab === "settings") setActiveTab("chats");
    },
    isAdminPanelOpen,
    onCloseAdminPanel: () => setIsAdminPanelOpen(false),
    selectedMessageInfo,
    onCloseMessageInfo: () => setSelectedMessageInfo(null),
    isStoryViewerOpen: !!activeViewerGroup,
    onCloseStoryViewer: closeViewer,
    isStoryCreatorOpen: isCreatorOpen,
    onCloseStoryCreator: closeCreator,
  });

  const [inputMessage, setInputMessage] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [viewportTop, setViewportTop] = useState<number>(0);

  const updateViewportMetrics = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.visualViewport) {
      setViewportHeight(window.visualViewport.height);
      setViewportTop(window.visualViewport.offsetTop || 0);
    } else {
      setViewportHeight(window.innerHeight);
      setViewportTop(0);
    }
  }, []);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Akıllı ve güvenli en alta kaydırma fonksiyonu (Sadece mesaj konteynerini kaydırır, tarayıcı penceresini/document'ı kaydırmaz)
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesContainerRef.current) {
      const el = messagesContainerRef.current;
      el.scrollTo({
        top: el.scrollHeight,
        behavior,
      });
    }
  }, []);

  useEffect(() => {
    updateViewportMetrics();

    const handleViewportChange = () => {
      updateViewportMetrics();
      scrollToBottom("auto");
    };

    const handleWindowScroll = () => {
      if (typeof window !== "undefined" && window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleWindowScroll, { passive: true });

    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (vv) {
      vv.addEventListener("resize", handleViewportChange);
      vv.addEventListener("scroll", handleViewportChange);
    }

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleWindowScroll);
      if (vv) {
        vv.removeEventListener("resize", handleViewportChange);
        vv.removeEventListener("scroll", handleViewportChange);
      }
    };
  }, [updateViewportMetrics, scrollToBottom]);

  const isKeyboardOpen =
    typeof window !== "undefined" && viewportHeight
      ? viewportHeight < window.innerHeight * 0.82
      : false;

  // 1. Oturum Kontrolü & Kullanıcı Temasını Uygula
  useEffect(() => {
    checkAuth().then((authed) => {
      if (!authed) {
        router.push("/login");
      }
    });

    // Eski yerel tema kalıntılarını temizle (tek merkez parametreler)
    if (typeof window !== "undefined") {
      localStorage.removeItem("aura_user_theme");
    }
  }, [checkAuth, router]);

  // 2. WebSocket ve Konuşmaları Yükle
  useEffect(() => {
    if (isAuthenticated) {
      connect();
      loadConversations();
      loadStarredMessages();
    }
  }, [isAuthenticated, connect, loadConversations, loadStarredMessages]);

  // 3. Mesaj listesi otomatik en alta kaydırma
  useEffect(() => {
    if (!activeConversationId) return;

    if (!isFirstLoadRef.current[activeConversationId]) {
      isFirstLoadRef.current[activeConversationId] = true;
      scrollToBottom("auto");
      setTimeout(() => scrollToBottom("auto"), 50);
      setTimeout(() => scrollToBottom("auto"), 150);
      return;
    }

    scrollToBottom("smooth");
  }, [messages, activeConversationId, scrollToBottom]);

  // 3b. Kullanıcı telefon kilidini açtığında veya sekmeye geri döndüğünde bağlantıyı tazele ve konuşmaları yükle
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      const isVisible =
        typeof document !== "undefined" &&
        !document.hidden &&
        document.visibilityState === "visible";

      if (isVisible) {
        notificationManager.stopFlash();

        updateViewportMetrics();

        // Kilit açıldığında document scroll'unu sıfırla ve mesajları tam tabana çek
        if (typeof window !== "undefined") {
          window.scrollTo(0, 0);
          document.body.scrollTop = 0;
          document.documentElement.scrollTop = 0;
        }
        scrollToBottom("auto");
        setTimeout(() => scrollToBottom("auto"), 60);
        setTimeout(() => scrollToBottom("auto"), 200);

        // 1. WebSocket kopmuşsa yeniden bağla (eğer CONNECTING aşamasındaysa tekrar açma)
        const socketState = useSocketStore.getState();
        if (
          !socketState.socket ||
          (socketState.socket.readyState !== WebSocket.OPEN &&
            socketState.socket.readyState !== WebSocket.CONNECTING)
        ) {
          socketState.connect();
        }

        // 2. Kilit açıldığında güncel konuşmaları ve okunmamış sayılarını çek
        loadConversations();

        // 3. Eğer açık bir sohbet varsa mesajları tazele ve read_ack gönder
        if (activeConversationId) {
          useChatStore.getState().loadMessages(activeConversationId);
          const convMessages = messages[activeConversationId] || [];
          const unreadIds = convMessages
            .filter((m) => !m.is_mine && !m.read_at)
            .map((m) => m.id);

          if (unreadIds.length > 0) {
            useSocketStore.getState().sendAction("read_ack", {
              conversation_id: activeConversationId,
              message_ids: unreadIds,
            });
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("online", handleVisibilityOrFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("online", handleVisibilityOrFocus);
    };
  }, [activeConversationId, messages, loadConversations, scrollToBottom, updateViewportMetrics]);

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

  // Sohbet değiştiğinde aramayı sıfırla
  useEffect(() => {
    setIsChatSearchOpen(false);
    setChatSearchQuery("");
    setCurrentMatchIndex(0);
  }, [activeConversationId]);

  // Sohbet İçi Arama ve Eşleşmeler (WhatsApp Tarzı)
  const searchFilteredMessages = useMemo(() => {
    if (!chatSearchQuery.trim()) return [];
    const q = chatSearchQuery.trim().toLowerCase();
    return activeMessages.filter(
      (m) =>
        !m.is_deleted_for_all &&
        (m.content?.toLowerCase().includes(q) ||
          m.media_metadata?.file_name?.toLowerCase().includes(q))
    );
  }, [activeMessages, chatSearchQuery]);

  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const handleJumpToMessage = async (conversationId: string, messageId: string) => {
    if (activeConversationId !== conversationId) {
      await selectConversation(conversationId);
    }
    setShowContactDrawer(false);
    setHighlightedMessageId(messageId);
    setTimeout(() => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 200);
  };

  useEffect(() => {
    if (highlightedMessageId) {
      const timer = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [highlightedMessageId]);

  const activeMatchedMessageId =
    highlightedMessageId ||
    (searchFilteredMessages.length > 0
      ? searchFilteredMessages[currentMatchIndex]?.id
      : null);

  useEffect(() => {
    if (activeMatchedMessageId) {
      const el = document.getElementById(`msg-${activeMatchedMessageId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeMatchedMessageId, currentMatchIndex]);

  const handleNextMatch = () => {
    if (searchFilteredMessages.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % searchFilteredMessages.length);
  };

  const handlePrevMatch = () => {
    if (searchFilteredMessages.length === 0) return;
    setCurrentMatchIndex((prev) =>
      prev === 0 ? searchFilteredMessages.length - 1 : prev - 1
    );
  };

  // Toplam okunmamış mesaj sayısı
  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  // Yıldızlı mesajlar listesi (DB ve hafızadaki yıldızlılar birleşimi)
  const combinedStarredMessages = useMemo(() => {
    const memoryStarred = Object.values(messages).flat().filter((m) => m.is_starred);
    const map = new Map<string, any>();
    (starredMessages || []).forEach((m) => map.set(m.id, m));
    memoryStarred.forEach((m) => {
      if (m.is_starred) map.set(m.id, m);
      else map.delete(m.id);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [messages, starredMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConversationId) return;

    sendMessage(activeConversationId, inputMessage.trim());
    setInputMessage("");
    setTimeout(() => scrollToBottom("smooth"), 50);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTyping(activeConversationId, false);
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
          <div className="w-10 h-10 border-3 border-grupo-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-medium">Aura yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-0 flex w-full bg-grupo-dark-bg text-slate-100 select-none overflow-hidden"
      style={{
        top: `${viewportTop}px`,
        height: viewportHeight ? `${viewportHeight}px` : "100%",
        maxHeight: viewportHeight ? `${viewportHeight}px` : "100%",
      }}
    >
      {/* 1. SÜTUN: Grupo Açılır/Kapanır Sol Dikey Menü (SideNavigation) */}
      <SideNavigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "settings") setIsSettingsOpen(true);
        }}
        unreadCount={totalUnreadCount}
        starredCount={combinedStarredMessages.length}
        isConnected={isConnected}
        user={user}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAdmin={() => setIsAdminPanelOpen(true)}
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
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-grupo-accent overflow-hidden">
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

          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={() => setIsAdminPanelOpen(true)}
              title="Aura Parametre Yönetimi"
              className="p-2 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              title="Çıkış Yap"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
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

        {/* 24 Saatlik Hikayeler / Durumlar Barı (WhatsApp & Instagram Modu) */}
        {!searchQuery.trim() && activeTab === "chats" && (
          <StoriesBar />
        )}

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
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-grupo-accent overflow-hidden">
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
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-grupo-accent overflow-hidden">
                      {contact.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={contact.avatar_url} alt={contact.display_name} className="w-full h-full object-cover" />
                      ) : (
                        contact.display_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {contact.online_status === 1 && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-grupo-dark-card"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-white truncate">{contact.display_name}</div>
                      {contact.online_status === 1 ? (
                        <span className="text-[10px] text-emerald-400 font-medium">Çevrimiçi</span>
                      ) : (
                        <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          {formatLastSeen(contact.last_seen_at, contact.privacy_settings?.last_seen)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate">@{contact.username}</div>
                  </div>
                  <UserPlus className="w-4 h-4 text-grupo-accent flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        ) : activeTab === "starred" ? (
          /* TAB 3: Yıldızlı Mesajlar Listesi */
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Yıldızlı Mesajlar ({combinedStarredMessages.length})</span>
            </div>
            {combinedStarredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Star className="w-10 h-10 mb-2 opacity-30 text-amber-400" />
                <p className="text-xs font-medium">Yıldızlı mesajınız bulunmuyor.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Önemli mesajların menüsünden &quot;Yıldızla&quot; seçeneğini kullanabilirsiniz.
                </p>
              </div>
            ) : (
              combinedStarredMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleJumpToMessage(msg.conversation_id, msg.id)}
                  className="group relative w-full p-3 rounded-2xl bg-slate-900/70 border border-slate-800 hover:bg-slate-850 hover:border-amber-500/50 text-left transition-all cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{msg.is_mine ? "Sen" : "Karşı Taraf"}</span>
                      {msg.sent_at && (
                        <span className="text-[10px] text-slate-500 font-normal">
                          • {new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    {/* Yıldızı Kaldır Butonu */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(msg.id);
                      }}
                      title="Yıldızı Kaldır"
                      className="p-1.5 rounded-xl text-amber-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <StarOff className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                    {msg.message_type === "voice"
                      ? "🎤 Sesli Mesaj"
                      : msg.message_type === "image"
                      ? "📷 Fotoğraf"
                      : msg.message_type === "video"
                      ? "🎬 Video"
                      : msg.message_type === "file"
                      ? "📄 Belge"
                      : msg.content}
                  </p>
                </div>
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
              conversations.map((conv) => (
                <ConversationListItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConversationId}
                  isTyping={!!typingMap[conv.id]}
                  onSelect={() => selectConversation(conv.id)}
                  onDelete={() => deleteConversation(conv.id)}
                  onClearHistory={() => clearConversation(conv.id)}
                />
              ))
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
            starredCount={combinedStarredMessages.length}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAdmin={() => setIsAdminPanelOpen(true)}
          />
        )}
      </aside>

      {/* 3. SÜTUN: Merkez Sohbet Penceresi (Flex-1) */}
      <main
        className={`${
          activeConversationId ? "flex w-full" : "hidden md:flex"
        } md:flex-1 flex-col bg-grupo-dark-bg relative h-full min-h-0 max-h-full overflow-hidden`}
      >
        {activeConv ? (
          <>
            {/* Sohbet Üst Başlığı (ChatHeader) */}
            <header className="h-16 border-b border-grupo-dark-border px-2.5 sm:px-6 flex items-center justify-between bg-grupo-dark-card/60 backdrop-blur-md z-10 flex-shrink-0">
              <div
                onClick={() => setShowContactDrawer(!showContactDrawer)}
                className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2 cursor-pointer"
              >
                {/* Mobilde Geri Butonu (<-- Geri) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBackToChatList();
                  }}
                  title="Geri Dön"
                  className="md:hidden p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer -ml-1 flex-shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-grupo-accent overflow-hidden">
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
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white truncate leading-tight">
                    {activeConv.other_user.display_name}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate leading-tight mt-0.5">
                    {isOtherTyping ? (
                      <span
                        style={{ color: "var(--accent, #6366F1)" }}
                        className="font-semibold animate-pulse"
                      >
                        yazıyor...
                      </span>
                    ) : activeConv.is_online ? (
                      <span className="text-emerald-400 font-medium">Çevrimiçi</span>
                    ) : (
                      formatLastSeen(
                        activeConv.other_user.last_seen_at,
                        activeConv.other_user.privacy_settings?.last_seen
                      ) || "Çevrimdışı"
                    )}
                  </p>
                </div>
              </div>

              {/* Sesli / Görüntülü Arama & Profil Butonları */}
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {settings?.call_settings?.enable_audio_calls !== false && (
                  <button
                    onClick={() => setConfirmCallType("audio")}
                    title="Sesli Arama Başlat"
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                )}
                {settings?.call_settings?.enable_video_calls !== false && (
                  <button
                    onClick={() => setConfirmCallType("video")}
                    title="Görüntülü Arama Başlat"
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-grupo-accent transition-colors cursor-pointer"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                )}
                {/* Sohbet İçi Arama Butonu (Masaüstünde doğrudan görünür, mobilde 3 nokta menüsünde) */}
                <button
                  onClick={() => {
                    setIsChatSearchOpen(!isChatSearchOpen);
                    if (isChatSearchOpen) {
                      setChatSearchQuery("");
                      setCurrentMatchIndex(0);
                    }
                  }}
                  title="Sohbette Ara"
                  className={`hidden sm:flex p-2 sm:p-2.5 rounded-xl transition-colors cursor-pointer ${
                    isChatSearchOpen
                      ? "text-white shadow-md"
                      : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white"
                  }`}
                  style={
                    isChatSearchOpen
                      ? {
                          backgroundColor: "var(--accent, #6366F1)",
                          color: "var(--accent-text, #ffffff)",
                          boxShadow: "0 4px 12px var(--accent-shadow, rgba(99, 102, 241, 0.3))",
                        }
                      : undefined
                  }
                >
                  <Search className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowContactDrawer(!showContactDrawer)}
                  title="Kişi Bilgisi"
                  className="hidden sm:flex p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                </button>

                {/* Sohbet İşlemleri Menüsü (Web & Mobil) */}
                <div className="relative">
                  <button
                    onClick={() => setShowActiveChatMenu(!showActiveChatMenu)}
                    title="Sohbet Seçenekleri"
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showActiveChatMenu && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-11 w-44 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95"
                    >
                      <button
                        onClick={() => {
                          setShowActiveChatMenu(false);
                          setShowContactDrawer(true);
                        }}
                        className="w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer sm:hidden"
                      >
                        <Info className="w-3.5 h-3.5 text-sky-400" />
                        <span>Kişi Bilgisi</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowActiveChatMenu(false);
                          setIsChatSearchOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" style={{ color: "var(--accent, #6366F1)" }} />
                        <span>Sohbette Ara</span>
                      </button>
                      <div className="h-px bg-slate-800 my-1" />
                      <button
                        onClick={() => {
                          setShowActiveChatMenu(false);
                          setShowActiveDeleteConfirm("clear");
                        }}
                        className="w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Eraser className="w-3.5 h-3.5 text-amber-400" />
                        <span>Geçmişi Temizle</span>
                      </button>
                      <div className="h-px bg-slate-800 my-1" />
                      <button
                        onClick={() => {
                          setShowActiveChatMenu(false);
                          setShowActiveDeleteConfirm("delete");
                        }}
                        className="w-full px-3 py-2 text-left text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Sohbeti Sil</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* WHATSAPP TARZI SOHBET İÇİ ARAMA BARI */}
            {isChatSearchOpen && (
              <div className="bg-slate-900/95 border-b border-grupo-dark-border px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-3 shadow-lg z-10 animate-in slide-in-from-top-2 duration-150 flex-shrink-0">
                <div className="flex-1 flex items-center gap-2 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5 focus-within:border-grupo-accent transition-colors">
                  <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={chatSearchQuery}
                    onChange={(e) => {
                      setChatSearchQuery(e.target.value);
                      setCurrentMatchIndex(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (e.shiftKey) handlePrevMatch();
                        else handleNextMatch();
                      } else if (e.key === "Escape") {
                        setIsChatSearchOpen(false);
                        setChatSearchQuery("");
                        setCurrentMatchIndex(0);
                      }
                    }}
                    placeholder="Sohbette ara (Enter: sonraki, Shift+Enter: önceki)..."
                    className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                    autoFocus
                  />
                  {chatSearchQuery && (
                    <button
                      onClick={() => {
                        setChatSearchQuery("");
                        setCurrentMatchIndex(0);
                      }}
                      className="p-0.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sonuç Sayacı ve Gezinme Okları (WhatsApp Web Style) */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {chatSearchQuery.trim() && (
                    <span className="text-[11px] font-semibold text-slate-400 px-2 py-1 rounded-lg bg-slate-800">
                      {searchFilteredMessages.length > 0
                        ? `${currentMatchIndex + 1} / ${searchFilteredMessages.length}`
                        : "Sonuç yok"}
                    </span>
                  )}

                  <button
                    onClick={handlePrevMatch}
                    disabled={searchFilteredMessages.length === 0}
                    title="Önceki Eşleşme (Yukarı)"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:opacity-30 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleNextMatch}
                    disabled={searchFilteredMessages.length === 0}
                    title="Sonraki Eşleşme (Aşağı)"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:opacity-30 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setIsChatSearchOpen(false);
                      setChatSearchQuery("");
                      setCurrentMatchIndex(0);
                    }}
                    title="Aramayı Kapat (Esc)"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Mesaj Akışı */}
            <div
              ref={messagesContainerRef}
              className="flex-1 min-h-0 p-3 sm:p-6 overflow-y-auto overflow-x-hidden overscroll-contain"
              style={{ scrollBehavior: "auto" }}
            >
              {activeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                  <Sparkles className="w-8 h-8 text-grupo-accent/50 mb-2" />
                  <p className="text-sm font-medium">Bu sohbette henüz mesaj yok.</p>
                  <p className="text-xs text-slate-600 mt-1">İlk mesajı göndererek başlayın!</p>
                </div>
              ) : (
                activeMessages.map((m, index) => {
                  const prevMsg = index > 0 ? activeMessages[index - 1] : null;
                  const currentTimestamp = m.sent_at || m.created_at;
                  const prevTimestamp = prevMsg?.sent_at || prevMsg?.created_at;
                  const showDateDivider =
                    !prevTimestamp ||
                    (currentTimestamp &&
                      !isSameCalendarDay(
                        new Date(currentTimestamp),
                        new Date(prevTimestamp)
                      ));

                  return (
                    <div key={m.id}>
                      {showDateDivider && currentTimestamp && (
                        <div className="flex justify-center my-3 sticky top-1 z-10 pointer-events-none">
                          <span className="px-3.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/90 backdrop-blur-md text-slate-400 border border-slate-800 shadow-md pointer-events-auto select-none">
                            {formatMessageDateDivider(currentTimestamp)}
                          </span>
                        </div>
                      )}
                      <div id={`msg-${m.id}`} className="transition-all duration-300">
                        <MessageBubble
                          message={m}
                          searchQuery={chatSearchQuery}
                          isHighlightedMatch={m.id === activeMatchedMessageId}
                          onJumpToMessage={(targetId) => handleJumpToMessage(activeConv.id, targetId)}
                          otherUserName={activeConv.other_user.display_name}
                        />
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} className="h-1 flex-shrink-0" />
            </div>

            {/* Mesaj Giriş Barı & Alıntılama & Medya Menüsü */}
            <footer
              className={`p-2.5 sm:p-4 ${
                isKeyboardOpen
                  ? "pb-2.5 sm:pb-4"
                  : "pb-[max(0.625rem,env(safe-area-inset-bottom))]"
              } border-t border-grupo-dark-border bg-grupo-dark-card/40 backdrop-blur-md flex-shrink-0`}
            >
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
                      onFocus={() => {
                        setIsInputFocused(true);
                        setTimeout(() => {
                          updateViewportMetrics();
                          scrollToBottom("auto");
                        }, 100);
                        setTimeout(() => {
                          updateViewportMetrics();
                          scrollToBottom("auto");
                        }, 300);
                      }}
                      onBlur={() => {
                        setIsInputFocused(false);
                        setTimeout(() => {
                          updateViewportMetrics();
                          scrollToBottom("auto");
                        }, 60);
                      }}
                      placeholder="Bir mesaj yazın..."
                      style={{
                        borderColor:
                          isInputFocused || inputMessage.trim()
                            ? "var(--accent, #6366F1)"
                            : undefined,
                        boxShadow: isInputFocused
                          ? "0 0 0 1px var(--accent, #6366F1)"
                          : undefined,
                      }}
                      className="flex-1 bg-slate-900/90 border border-grupo-dark-border rounded-2xl py-3 px-4 sm:py-3.5 sm:px-5 text-[16px] sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                    />

                    {inputMessage.trim() ? (
                      <button
                        type="submit"
                        style={{
                          backgroundColor: "var(--accent, #6366F1)",
                          color: "var(--accent-text, #ffffff)",
                          boxShadow:
                            "0 10px 15px -3px var(--accent-shadow, rgba(99, 102, 241, 0.35))",
                        }}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl hover:brightness-110 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
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
            <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-grupo-accent mb-4 shadow-xl">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Aura</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              Sol taraftan bir sohbet seçin veya &quot;Kişiler&quot; menüsünden birini bularak mesajlaşmaya başlayın.
            </p>
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
              <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-grupo-accent/40 flex items-center justify-center font-bold text-2xl text-grupo-accent overflow-hidden mb-3 shadow-lg">
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
                  {activeConv.is_online
                    ? "Çevrimiçi"
                    : formatLastSeen(
                        activeConv.other_user.last_seen_at,
                        activeConv.other_user.privacy_settings?.last_seen
                      ) || "Çevrimdışı"}
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
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 font-semibold">Paylaşılan Medya</span>
                  {(() => {
                    const count = activeMessages.filter(
                      (m) =>
                        m.media_url &&
                        !m.is_deleted_for_all &&
                        (m.message_type === "image" ||
                          m.message_type === "video" ||
                          /\.(mp4|mov|webm|m4v|mkv|avi|3gp|png|jpg|jpeg|webp|gif)($|\?)/i.test(m.media_url || ""))
                    ).length;
                    return count > 0 ? (
                      <span className="text-[10px] text-slate-500 font-medium">{count} medya</span>
                    ) : null;
                  })()}
                </div>

                {(() => {
                  const mediaList = activeMessages.filter(
                    (m) =>
                      m.media_url &&
                      !m.is_deleted_for_all &&
                      (m.message_type === "image" ||
                        m.message_type === "video" ||
                        /\.(mp4|mov|webm|m4v|mkv|avi|3gp|png|jpg|jpeg|webp|gif)($|\?)/i.test(m.media_url || ""))
                  );

                  if (mediaList.length === 0) {
                    return (
                      <p className="text-slate-500 italic text-[11px] py-2">
                        Henüz paylaşılan fotoğraf veya video bulunmuyor.
                      </p>
                    );
                  }

                  return (
                    <div className="grid grid-cols-3 gap-2">
                      {mediaList.slice(0, 9).map((m) => {
                        const isVid =
                          m.message_type === "video" ||
                          /\.(mp4|mov|webm|m4v|mkv|avi|3gp)($|\?)/i.test(m.media_url || "");
                        const finalUrl = resolveMediaUrl(m.media_url);
                        return (
                          <div
                            key={m.id}
                            onClick={() =>
                              setPreviewMedia({
                                url: finalUrl,
                                type: isVid ? "video" : "image",
                                name: m.media_metadata?.file_name,
                              })
                            }
                            className="aspect-square rounded-xl overflow-hidden bg-slate-800 relative cursor-pointer group hover:scale-[1.03] hover:ring-2 hover:ring-grupo-accent/60 transition-all duration-150 shadow-sm"
                            title="Büyütmek için tıkla"
                          >
                            {isVid ? (
                              <div className="w-full h-full relative bg-black flex items-center justify-center">
                                <video
                                  src={finalUrl}
                                  className="w-full h-full object-cover pointer-events-none opacity-80"
                                  preload="metadata"
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                                  <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
                                    <Play className="w-3 h-3 fill-white ml-0.5" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={finalUrl}
                                alt="medya"
                                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                                loading="lazy"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Sohbet Temizleme ve Silme Butonları */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <button
                  onClick={() => setShowActiveDeleteConfirm("clear")}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Eraser className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sohbet Geçmişini Temizle</span>
                </button>
                <button
                  onClick={() => setShowActiveDeleteConfirm("delete")}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sohbeti Sil</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* AKTİF SOHBETİ SİL / TEMİZLE ONAY MODALI */}
        {showActiveDeleteConfirm && activeConv && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {showActiveDeleteConfirm === "delete" ? "Sohbeti Sil" : "Geçmişi Temizle"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    @{activeConv.other_user.username} ile olan sohbet
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {showActiveDeleteConfirm === "delete"
                  ? "Bu sohbeti listenizden silmek istediğinize emin misiniz? Sohbet ve mesajlar sizin için kaldırılacaktır."
                  : "Bu sohbetteki tüm mesajları temizlemek istediğinize emin misiniz? Mesajlar sizin için görünmez olacaktır."}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowActiveDeleteConfirm(null)}
                  disabled={isDeletingActive}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsDeletingActive(true);
                    try {
                      if (showActiveDeleteConfirm === "delete") {
                        await deleteConversation(activeConv.id);
                        setShowContactDrawer(false);
                      } else {
                        await clearConversation(activeConv.id);
                      }
                    } catch (e) {
                      alert("İşlem gerçekleştirilemedi.");
                    } finally {
                      setIsDeletingActive(false);
                      setShowActiveDeleteConfirm(null);
                    }
                  }}
                  disabled={isDeletingActive}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-600/30"
                >
                  {isDeletingActive ? (
                    <span>İşleniyor...</span>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{showActiveDeleteConfirm === "delete" ? "Sohbeti Sil" : "Temizle"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ARAMA BAŞLATMA ONAY MODALI */}
        {confirmCallType && activeConv && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    confirmCallType === "audio"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-grupo-accent/20 text-grupo-accent"
                  }`}
                >
                  {confirmCallType === "audio" ? (
                    <Phone className="w-6 h-6 animate-pulse" />
                  ) : (
                    <Video className="w-6 h-6 animate-pulse" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {confirmCallType === "audio" ? "Sesli Arama Başlat" : "Görüntülü Arama Başlat"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    @{activeConv.other_user.username}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-white">{activeConv.other_user.display_name}</span> ile{" "}
                <span className="font-semibold text-white">
                  {confirmCallType === "audio" ? "sesli arama" : "görüntülü arama"}
                </span>{" "}
                başlatmak istediğinize emin misiniz?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmCallType(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const type = confirmCallType;
                    setConfirmCallType(null);
                    initiateCall(activeConv.id, type);
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-2 shadow-lg ${
                    confirmCallType === "audio"
                      ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                      : "bg-grupo-accent hover:brightness-110 shadow-lg"
                  }`}
                >
                  {confirmCallType === "audio" ? (
                    <>
                      <Phone className="w-3.5 h-3.5" />
                      <span>Aramayı Başlat</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-3.5 h-3.5" />
                      <span>Aramayı Başlat</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Modallar (Mobilde sohbet açık değilken <main> hidden olsa dahi her zaman erişilebilir) */}
      {/* WhatsApp Mesaj Bilgisi Modalı */}
      <MessageInfoModal />

      {/* Ayarlar ve Profil Modalı */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          if (activeTab === "settings") {
            setActiveTab("chats");
          }
        }}
        onOpenAdmin={() => setIsAdminPanelOpen(true)}
      />

      {/* Yönetim Paneli Modalı (Aura Admin) */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
      />

      {/* 24 Saatlik Hikaye / Durum Modalları (WhatsApp & Instagram Tarzı) */}
      <StoryViewerModal />
      <StoryCreatorModal />

      {/* Canlı Sesli & Görüntülü Arama Modalları (LiveKit WebRTC) */}
      <IncomingCallModal />
      <ActiveCallModal />

      {/* PAYLAŞILAN MEDYA BÜYÜTME / OYNATMA MODALI (LIGHTBOX) */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Üst Kapatma Butonu */}
            <div className="absolute -top-12 right-0 flex items-center gap-2">
              <button
                onClick={() => setPreviewMedia(null)}
                className="p-2 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white transition-colors cursor-pointer shadow-lg"
                title="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* İçerik */}
            {previewMedia.type === "video" ? (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl bg-black object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewMedia.url}
                alt={previewMedia.name || "Büyük Görsel"}
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
              />
            )}
          </div>
        </div>
      )}

      {/* Ana Ekran Geri Tuşu Çift Dokunma Bilgilendirme Kartı */}
      {showExitToast && (
        <div className="fixed bottom-16 sm:bottom-6 inset-x-0 mx-auto w-fit z-50 px-4 py-2 bg-slate-900/95 border border-slate-700 text-white text-xs font-medium rounded-full shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-none select-none">
          Çıkmak için tekrar dokunun
        </div>
      )}
    </div>
  );
}
