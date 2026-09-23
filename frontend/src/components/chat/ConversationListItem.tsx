"use client";

import { useState, useRef, useEffect } from "react";
import { Conversation } from "@/store/useChatStore";
import { formatLastSeen } from "@/lib/utils";
import { Trash2, Eraser, AlertCircle, MoreHorizontal } from "lucide-react";

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
  const [showContextMenu, setShowContextMenu] = useState(false);
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
        setShowContextMenu(false);
      }
    };
    if (showContextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showContextMenu]);

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

    // Dikey sayfa kaydırması yapılıyorsa yatay hareketi engelle
    if (Math.abs(diffY) > Math.abs(diffX) && !isSwiping.current) {
      return;
    }

    isSwiping.current = true;

    // Sola veya sağa kaydırma sınırları (-85px ile +85px arası)
    if (diffX < 0) {
      setTranslateX(Math.max(diffX, -85));
    } else if (diffX > 0) {
      setTranslateX(Math.min(diffX, 85));
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = null;
    touchStartY.current = null;
    isSwiping.current = false;

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
        {/* ARKA PLAN MOBİL SİLME BUTONLARI (Sadece mobilde ve kart sürüklenirken DOM'da görünür) */}
        {translateX !== 0 && (
          <div className="md:hidden">
            {translateX < 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirmModal("delete");
                }}
                className="absolute inset-y-0 right-0 w-20 bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer z-0"
              >
                <Trash2 className="w-5 h-5 animate-pulse" />
                <span className="text-[11px] font-bold">Sil</span>
              </button>
            )}

            {translateX > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirmModal("delete");
                }}
                className="absolute inset-y-0 left-0 w-20 bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer z-0"
              >
                <Trash2 className="w-5 h-5 animate-pulse" />
                <span className="text-[11px] font-bold">Sil</span>
              </button>
            )}
          </div>
        )}

        {/* ASIL SOHBET KARTI (Opak, temiz Grupo temalı) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleCardClick}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowContextMenu(true);
          }}
          style={{
            transform: translateX !== 0 ? `translateX(${translateX}px)` : undefined,
            transition: isSwiping.current
              ? "none"
              : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className={`relative z-10 w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-colors cursor-pointer border ${
            isActive
              ? "bg-[#1E232B] border-slate-700/80 shadow-md"
              : "bg-[#16191E] hover:bg-[#1D2128] border-transparent hover:border-slate-800/80"
          }`}
        >
          {/* Avatar & Canlı Durum */}
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center font-bold text-sm text-pink-400 overflow-hidden">
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
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#16191E] shadow-sm" />
            )}
          </div>

          {/* Sohbet Bilgileri */}
          <div className="flex-1 min-w-0">
            {/* Üst Satır: İsim + (Hover'da Sil Butonu / Son Görülme) */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-white truncate">
                {conversation.other_user.display_name}
              </span>

              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                {/* Masaüstünde kartın üzerine gelince beliren zarif Sil butonu */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirmModal("delete");
                  }}
                  title="Sohbeti Sil"
                  className="hidden md:flex p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Masaüstü Ek Menü (Geçmişi Temizle vb.) */}
                <div className="relative hidden md:block" ref={menuRef}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowContextMenu(!showContextMenu);
                    }}
                    title="Seçenekler"
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>

                  {/* Masaüstü Dropdown Açılır Menü */}
                  {showContextMenu && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-6 w-44 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                    >
                      <button
                        onClick={() => {
                          setShowContextMenu(false);
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
                          setShowContextMenu(false);
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

                {/* Durum / Saat */}
                <span className="text-[10px] text-slate-400">
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
            </div>

            {/* Alt Satır: Son Mesaj İçeriği + Okunmamış Rozet */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="truncate max-w-[210px] sm:max-w-[230px]">
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

              {conversation.unread_count > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-grupo-accent text-white text-[10px] font-bold shadow-sm shadow-pink-500/50 flex-shrink-0">
                  {conversation.unread_count}
                </span>
              )}
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
