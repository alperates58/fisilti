"use client";

import { useState, useRef, useEffect } from "react";
import { Conversation } from "@/store/useChatStore";
import { formatLastSeen } from "@/lib/utils";
import { Trash2, MoreVertical, Eraser, AlertCircle } from "lucide-react";

interface Props {
  conversation: Conversation;
  isActive: boolean;
  isTyping: boolean;
  onSelect: () => void;
  onDelete: () => Promise<void>;
  onClearHistory: () => Promise<void>;
}

export default function ConversationListItem({
  conversation,
  isActive,
  isTyping,
  onSelect,
  onDelete,
  onClearHistory,
}: Props) {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiped, setIsSwiped] = useState(false);
  const [showDesktopMenu, setShowDesktopMenu] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<"delete" | "clear" | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwiping = useRef<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Menü dışına tıklandığında menüyü kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowDesktopMenu(false);
      }
    };
    if (showDesktopMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDesktopMenu]);

  // Mobil Dokunma ve Kaydırma Hareketleri (Swipe Gestures)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // Dikey kaydırma yapılıyorsa yatay hareketi engelleme (sayfa akıcı kalsın)
    if (Math.abs(diffY) > Math.abs(diffX) && !isSwiping.current) {
      return;
    }

    isSwiping.current = true;

    // Sola veya sağa kaydırma sınırları (-85px ile +85px arası)
    if (diffX < 0) {
      // Sola çekiş: sağdan kırmızı buton çıkar
      setTranslateX(Math.max(diffX, -85));
    } else if (diffX > 0) {
      // Sağa çekiş: soldan kırmızı buton çıkar
      setTranslateX(Math.min(diffX, 85));
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = null;
    touchStartY.current = null;
    isSwiping.current = false;

    // Eşik değeri 40px
    if (translateX < -40) {
      setTranslateX(-80);
      setIsSwiped(true);
    } else if (translateX > 40) {
      setTranslateX(80);
      setIsSwiped(true);
    } else {
      setTranslateX(0);
      setIsSwiped(false);
    }
  };

  const resetSwipe = () => {
    setTranslateX(0);
    setIsSwiped(false);
  };

  const handleCardClick = () => {
    if (isSwiped || translateX !== 0) {
      resetSwipe();
      return;
    }
    onSelect();
  };

  const confirmAction = async () => {
    setIsDeleting(true);
    try {
      if (showConfirmModal === "delete") {
        await onDelete();
      } else if (showConfirmModal === "clear") {
        await onClearHistory();
      }
    } catch (err) {
      alert("İşlem gerçekleştirilemedi.");
    } finally {
      setIsDeleting(false);
      setShowConfirmModal(null);
      resetSwipe();
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl group select-none">
        {/* ARKA PLAN EYLEM BUTONLARI (Mobilde Kaydırınca Görünür) */}
        {/* 1. Sola Kaydırınca Sağda Beliren Kırmızı Sil Butonu */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirmModal("delete");
          }}
          className="absolute inset-y-0 right-0 w-20 bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer z-0 shadow-inner"
        >
          <Trash2 className="w-5 h-5 animate-pulse" />
          <span className="text-[11px] font-bold">Sil</span>
        </button>

        {/* 2. Sağa Kaydırınca Solda Beliren Kırmızı Sil Butonu */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirmModal("delete");
          }}
          className="absolute inset-y-0 left-0 w-20 bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer z-0 shadow-inner"
        >
          <Trash2 className="w-5 h-5 animate-pulse" />
          <span className="text-[11px] font-bold">Sil</span>
        </button>

        {/* ÖN PLAN SOHBET KARTI (Kaydırılan Asıl Kart) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleCardClick}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowDesktopMenu(true);
          }}
          style={{
            transform: `translateX(${translateX}px)`,
            transition: isSwiping.current
              ? "none"
              : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className={`relative z-10 w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-colors cursor-pointer bg-grupo-dark-card border ${
            isActive
              ? "bg-slate-800/95 border-slate-700/90 shadow-md"
              : "hover:bg-slate-800/50 border-transparent"
          }`}
        >
          {/* Avatar & Canlı Durum */}
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-pink-400 overflow-hidden">
              {conversation.other_user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={conversation.other_user.avatar_url}
                  alt={conversation.other_user.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                conversation.other_user.display_name.charAt(0).toUpperCase()
              )}
            </div>
            {conversation.is_online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-grupo-dark-card shadow-sm" />
            )}
          </div>

          {/* Sohbet Bilgileri */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-white truncate">
                {conversation.other_user.display_name}
              </span>
              <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">
                {conversation.is_online ? (
                  <span className="text-emerald-400 font-medium">Çevrimiçi</span>
                ) : (
                  formatLastSeen(
                    conversation.other_user.last_seen_at,
                    conversation.other_user.privacy_settings?.last_seen
                  ) || "Çevrimdışı"
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="truncate max-w-[170px] sm:max-w-[190px]">
                {isTyping ? (
                  <span className="text-pink-400 font-medium animate-pulse">yazıyor...</span>
                ) : conversation.last_message ? (
                  conversation.last_message.message_type === "voice" ? (
                    "🎤 Sesli Mesaj"
                  ) : conversation.last_message.message_type === "image" ? (
                    "📷 Fotoğraf"
                  ) : conversation.last_message.message_type === "location" ? (
                    "📍 Konum"
                  ) : (
                    conversation.last_message.content
                  )
                ) : (
                  <span className="italic text-slate-600">Sohbeti başlatın</span>
                )}
              </span>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {conversation.unread_count > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-grupo-accent text-white text-[10px] font-bold shadow-sm shadow-pink-500/50">
                    {conversation.unread_count}
                  </span>
                )}

                {/* WEB / MASAÜSTÜ İÇİN HOVER AKSİYON MENÜSÜ BUTONU */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDesktopMenu(!showDesktopMenu);
                    }}
                    title="Seçenekler"
                    className="hidden md:flex p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/80 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Desktop Dropdown Açılır Menü */}
                  {showDesktopMenu && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-7 w-44 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                    >
                      <button
                        onClick={() => {
                          setShowDesktopMenu(false);
                          setShowConfirmModal("clear");
                        }}
                        className="w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Eraser className="w-3.5 h-3.5 text-amber-400" />
                        <span>Geçmişi Temizle</span>
                      </button>
                      <div className="h-px bg-slate-800 my-1" />
                      <button
                        onClick={() => {
                          setShowDesktopMenu(false);
                          setShowConfirmModal("delete");
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
            </div>
          </div>
        </div>
      </div>

      {/* SİLME / TEMİZLEME ONAY MODALI */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {showConfirmModal === "delete" ? "Sohbeti Sil" : "Geçmişi Temizle"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  @{conversation.other_user.username} ile olan sohbet
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {showConfirmModal === "delete"
                ? "Bu sohbeti listenizden silmek istediğinize emin misiniz? Sohbet ve mesajlar sizin için kaldırılacaktır."
                : "Bu sohbetteki tüm mesajları temizlemek istediğinize emin misiniz? Mesajlar sizin için görünmez olacaktır."}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmAction}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-600/30"
              >
                {isDeleting ? (
                  <span>Siliniyor...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{showConfirmModal === "delete" ? "Sohbeti Sil" : "Temizle"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
