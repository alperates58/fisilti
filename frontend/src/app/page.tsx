"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, Conversation } from "@/store/useChatStore";
import { useSocketStore } from "@/store/useSocketStore";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInfoModal from "@/components/chat/MessageInfoModal";
import { api } from "@/lib/api";
import {
  MessageSquare,
  LogOut,
  Send,
  Search,
  UserPlus,
  ShieldCheck,
  CheckCheck,
  Sparkles,
  Phone,
  Video,
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
    sendMessage,
    sendTyping,
    startNewConversation,
  } = useChatStore();
  const { connect, isConnected } = useSocketStore();

  const [inputMessage, setInputMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
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

  // 4. Kullanıcı Arama
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConversationId) return;

    sendMessage(activeConversationId, inputMessage.trim());
    setInputMessage("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    if (!activeConversationId) return;

    // Yazıyor bildirimini ilet
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
    await startNewConversation(targetUserId);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-grupo-dark-bg text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Fısıltı yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-grupo-dark-bg text-slate-100 select-none overflow-hidden">
      {/* 1. SÜTUN: Sol Dikey Menü (64px) */}
      <aside className="w-[64px] bg-grupo-dark-card border-r border-grupo-dark-border flex flex-col items-center py-4 justify-between z-20">
        <div className="flex flex-col items-center gap-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-grupo-accent to-grupo-accent-secondary flex items-center justify-center font-bold text-white shadow-lg shadow-pink-500/25">
            F
          </div>
          <button className="w-10 h-10 rounded-xl bg-grupo-accent text-white flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-105">
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div
            title={isConnected ? "WebSocket Bağlı" : "Bağlantı Kesildi"}
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" : "bg-rose-500"
            }`}
          />
          <button
            onClick={() => logout().then(() => router.push("/login"))}
            title="Çıkış Yap"
            className="w-10 h-10 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* 2. SÜTUN: Sohbet & Arama Listesi (340px) */}
      <aside className="w-[340px] bg-grupo-dark-card border-r border-grupo-dark-border flex flex-col z-10">
        {/* Kullanıcı Profili Üst Barı */}
        <div className="p-4 border-b border-grupo-dark-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-pink-400">
                {user?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={user.display_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  user?.display_name?.charAt(0).toUpperCase() || "U"
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-grupo-dark-card"></span>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate">{user?.display_name}</h2>
              <p className="text-xs text-slate-400 truncate">@{user?.username}</p>
            </div>
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
              placeholder="Sohbet veya kişi ara..."
              className="w-full bg-slate-900/80 border border-grupo-dark-border rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-grupo-accent transition-colors"
            />
          </div>
        </div>

        {/* Arama Sonuçları Varsa */}
        {searchQuery.trim().length >= 2 ? (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              Kullanıcılar ({searchResults.length})
            </div>
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => handleStartChat(u.id)}
                className="w-full p-2.5 rounded-xl hover:bg-slate-800/60 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-pink-400">
                    {u.display_name.charAt(0).toUpperCase()}
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
        ) : (
          /* Konuşmalar Listesi */
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs">Henüz bir sohbet yok.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Yukarıdaki arama çubuğundan kullanıcı arayıp sohbete başlayın.
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
                      <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-pink-400">
                        {conv.other_user.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={conv.other_user.avatar_url}
                            alt={conv.other_user.display_name}
                            className="w-full h-full rounded-full object-cover"
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
                            conv.last_message.content
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
      </aside>

      {/* 3. SÜTUN: Merkez Sohbet Penceresi (Flex-1) */}
      <main className="flex-1 flex flex-col bg-grupo-dark-bg relative">
        {activeConv ? (
          <>
            {/* Sohbet Üst Başlığı */}
            <header className="h-16 border-b border-grupo-dark-border px-6 flex items-center justify-between bg-grupo-dark-card/60 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-pink-400">
                    {activeConv.other_user.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeConv.other_user.avatar_url}
                        alt={activeConv.other_user.display_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      activeConv.other_user.display_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {activeConv.is_online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-grupo-dark-card"></span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {activeConv.other_user.display_name}
                  </h3>
                  <p className="text-xs text-slate-400">
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

              {/* Sesli / Görüntülü Arama Butonları (Hazırlık) */}
              <div className="flex items-center gap-2">
                <button
                  title="Sesli Arama (Faz 5)"
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  title="Görüntülü Arama (Faz 5)"
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Mesaj Akışı */}
            <div className="flex-1 p-6 overflow-y-auto">
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

            {/* Mesaj Giriş Barı */}
            <footer className="p-4 border-t border-grupo-dark-border bg-grupo-dark-card/40 backdrop-blur-md">
              <form onSubmit={handleSend} className="flex items-center gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={handleInputChange}
                  placeholder="Bir mesaj yazın..."
                  className="flex-1 bg-slate-900/90 border border-grupo-dark-border rounded-2xl py-3.5 px-5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-grupo-accent transition-colors"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="w-12 h-12 rounded-2xl bg-grupo-accent hover:bg-grupo-accent-hover text-white flex items-center justify-center shadow-lg shadow-pink-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          /* Aktif Konuşma Yokken Karşılama Ekranı */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-pink-400 mb-4 shadow-xl">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Fısıltı Özel Mesajlaşma</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              Sol taraftan bir sohbet seçin veya arama çubuğundan birini bularak mesajlaşmaya başlayın.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>WhatsApp Tipi 3 Aşamalı Durum Takibi Devrede</span>
            </div>
          </div>
        )}

        {/* WhatsApp Mesaj Bilgisi Modalı */}
        <MessageInfoModal />
      </main>
    </div>
  );
}
