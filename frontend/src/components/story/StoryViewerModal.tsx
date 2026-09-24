"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useStoryStore, StoryAuthor } from "@/store/useStoryStore";
import { useAuthStore } from "@/store/useAuthStore";
import {
  X,
  Trash2,
  Eye,
  Music2,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
} from "lucide-react";
import { formatStoryTime } from "@/lib/utils";
import { api } from "@/lib/api";

export default function StoryViewerModal() {
  const { user } = useAuthStore();
  const {
    activeViewerGroup,
    activeViewerStoryIndex,
    closeViewer,
    setViewerStoryIndex,
    markStoryViewed,
    deleteStory,
    getStoryViewers,
    storyGroups,
    openViewer,
  } = useStoryStore();

  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [viewersModalOpen, setViewersModalOpen] = useState(false);
  const [viewersList, setViewersList] = useState<StoryAuthor[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentStory = activeViewerGroup?.stories[activeViewerStoryIndex];
  const isOwnStory = activeViewerGroup?.user.id === user?.id;

  // Hikaye süresi: Video ise video süresi, değilse 6 saniye
  const storyDuration = 6000;

  // İleri git
  const handleNext = useCallback(() => {
    if (!activeViewerGroup) return;
    if (activeViewerStoryIndex < activeViewerGroup.stories.length - 1) {
      setViewerStoryIndex(activeViewerStoryIndex + 1);
      setProgress(0);
    } else {
      // Bir sonraki kullanıcının hikaye grubuna geç
      const currentIndex = storyGroups.findIndex(
        (g) => g.user.id === activeViewerGroup.user.id
      );
      if (currentIndex !== -1 && currentIndex < storyGroups.length - 1) {
        openViewer(storyGroups[currentIndex + 1], 0);
        setProgress(0);
      } else {
        closeViewer();
      }
    }
  }, [activeViewerGroup, activeViewerStoryIndex, storyGroups, setViewerStoryIndex, openViewer, closeViewer]);

  // Geri git
  const handlePrev = useCallback(() => {
    if (!activeViewerGroup) return;
    if (activeViewerStoryIndex > 0) {
      setViewerStoryIndex(activeViewerStoryIndex - 1);
      setProgress(0);
    } else {
      // Bir önceki kullanıcının hikayesine geç
      const currentIndex = storyGroups.findIndex(
        (g) => g.user.id === activeViewerGroup.user.id
      );
      if (currentIndex > 0) {
        const prevGroup = storyGroups[currentIndex - 1];
        openViewer(prevGroup, prevGroup.stories.length - 1);
        setProgress(0);
      }
    }
  }, [activeViewerGroup, activeViewerStoryIndex, storyGroups, setViewerStoryIndex, openViewer]);

  // Hikaye değiştiğinde görüldü olarak işaretle
  useEffect(() => {
    if (currentStory && !isOwnStory && !currentStory.has_viewed) {
      markStoryViewed(currentStory.id);
    }
    setProgress(0);
  }, [currentStory, isOwnStory, markStoryViewed]);

  // Otomatik ilerleme zamanlayıcısı
  useEffect(() => {
    if (!currentStory || isPaused || viewersModalOpen) return;

    const interval = 50; // 50ms adım
    const step = (interval / storyDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentStory, isPaused, viewersModalOpen, storyDuration, handleNext]);

  // Müzik çalma kontrolü
  useEffect(() => {
    if (currentStory?.music_url && audioRef.current) {
      if (isPaused) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentStory, isPaused]);

  if (!activeViewerGroup || !currentStory) return null;

  // Hikaye silme
  const handleDelete = async () => {
    if (confirm("Bu hikayeyi silmek istediğinizden emin misiniz?")) {
      await deleteStory(currentStory.id);
    }
  };

  // İzleyenler modalını aç
  const handleOpenViewers = async () => {
    setIsPaused(true);
    const viewers = await getStoryViewers(currentStory.id);
    setViewersList(viewers);
    setViewersModalOpen(true);
  };

  // Hikayeye mesajla yanıt ver
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSendingReply) return;

    setIsSendingReply(true);
    try {
      // 1. Karşı tarafla konuşmayı bul veya oluştur
      const convRes = await api.post("/conversations", {
        recipient_id: activeViewerGroup.user.id,
      });
      const conversationId = convRes.data.id;

      // 2. Mesaj gönder (hikaye alıntısıyla)
      const storyContext = `📸 [Hikaye Yanıtı]: ${currentStory.caption || "Hikaye"} \n${replyText}`;
      await api.post(`/conversations/${conversationId}/messages`, {
        content: storyContext,
        message_type: "text",
      });

      setReplyText("");
      alert("Yanıtınız mesaj olarak iletildi!");
    } catch (err) {
      console.error("Yanıt gönderilemedi:", err);
      alert("Yanıt iletilemedi.");
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center select-none animate-in fade-in duration-200">
      {/* HİKAYE KARTI KAPSAYICISI (9:16 Mobil Oranı) */}
      <div
        className="relative w-full max-w-md h-[100dvh] sm:h-[88vh] sm:max-h-[820px] bg-slate-950 sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl border border-slate-800"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* 1. ÜST BAR: Progress Barlar & Yazar Bilgisi */}
        <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {/* Çoklu Parçalı Progress Barlar */}
          <div className="flex items-center gap-1.5 mb-3">
            {activeViewerGroup.stories.map((story, idx) => {
              let fillPercent = 0;
              if (idx < activeViewerStoryIndex) fillPercent = 100;
              else if (idx === activeViewerStoryIndex) fillPercent = progress;

              return (
                <div
                  key={story.id}
                  className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-all duration-75 rounded-full"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Yazar Bilgisi ve Aksiyon Butonları */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden border border-white/40 flex items-center justify-center font-bold text-xs text-pink-400">
                {activeViewerGroup.user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeViewerGroup.user.avatar_url}
                    alt={activeViewerGroup.user.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  activeViewerGroup.user.display_name.charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white drop-shadow-md">
                    {activeViewerGroup.user.display_name}
                  </span>
                  {isOwnStory && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-500/80 text-white font-semibold">
                      Sen
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-white/70">
                  {formatStoryTime(currentStory.created_at)}
                </span>
              </div>
            </div>

            {/* Sağ Üst Kontroller (Ses, Sil, Kapat) */}
            <div className="flex items-center gap-1">
              {currentStory.music_url && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}

              {isOwnStory && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  title="Hikayeyi Sil"
                  className="p-2 text-white/80 hover:text-rose-400 rounded-full hover:bg-white/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeViewer();
                }}
                className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. MERKEZ MEDYA ALANI */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
          {/* Görsel Hikaye */}
          {currentStory.media_type === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentStory.media_url}
              alt="Story"
              className="w-full h-full object-contain pointer-events-none"
            />
          )}

          {/* Video Hikaye */}
          {currentStory.media_type === "video" && (
            <video
              ref={videoRef}
              src={currentStory.media_url}
              autoPlay
              playsInline
              muted={isMuted}
              className="w-full h-full object-contain pointer-events-none"
            />
          )}

          {/* Metin veya Ses Hikayesi (Renkli Gradient Arka Plan) */}
          {(currentStory.media_type === "text" || currentStory.media_type === "audio") && (
            <div
              className={`w-full h-full bg-gradient-to-br ${
                currentStory.background_color || "from-pink-900 to-slate-950"
              } flex flex-col items-center justify-center p-8 text-center`}
            >
              {currentStory.media_type === "audio" && (
                <div className="w-24 h-24 rounded-full bg-black/40 border-2 border-pink-500/60 flex items-center justify-center mb-6 shadow-2xl animate-spin duration-7000">
                  <Music2 className="w-10 h-10 text-pink-400" />
                </div>
              )}

              <p className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg leading-relaxed max-w-sm">
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* STICKERLAR (Avatar & Çıkartmalar) */}
          {Array.isArray(currentStory.stickers) &&
            currentStory.stickers.map((st, i) => {
              if (st.type === "avatar" && st.avatar_url) {
                return (
                  <div
                    key={i}
                    style={{
                      left: `${st.x || 50}%`,
                      top: `${st.y || 40}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className="absolute z-20 w-16 h-16 rounded-full border-2 border-pink-400 shadow-2xl overflow-hidden pointer-events-none animate-bounce"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={st.avatar_url}
                      alt="Avatar Sticker"
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              }
              return null;
            })}

          {/* YOUTUBE MUSIC ROZETİ */}
          {currentStory.music_title && (
            <div className="absolute top-20 left-4 z-20 flex items-center gap-2 bg-black/65 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5 shadow-xl text-white">
              <div className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center text-white flex-shrink-0 animate-pulse">
                <Music2 className="w-3.5 h-3.5" />
              </div>
              <div className="text-left pr-1 min-w-0 max-w-[180px]">
                <div className="text-[11px] font-bold truncate">
                  {currentStory.music_title}
                </div>
                <div className="text-[9px] text-white/70 truncate flex items-center gap-1">
                  <span>{currentStory.music_artist || "YouTube Music"}</span>
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span className="text-[8px] text-emerald-400 font-mono">Çalıyor</span>
                </div>
              </div>
            </div>
          )}

          {/* Arka Planda Müzik Varsa Çal */}
          {currentStory.music_url && (
            <audio
              ref={audioRef}
              src={currentStory.music_url}
              autoPlay
              muted={isMuted}
              loop
            />
          )}

          {/* Sol / Sağ Tıklama Navigasyon Alanları */}
          <div
            onClick={handlePrev}
            className="absolute left-0 inset-y-0 w-1/3 z-10 cursor-pointer"
            title="Önceki"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 inset-y-0 w-2/3 z-10 cursor-pointer"
            title="Sonraki"
          />
        </div>

        {/* 3. ALT ALAN: Başlık / Altyazı & İzleyenler veya Yanıt Kutusu */}
        <div className="relative z-30 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2.5">
          {/* Başlık / Altyazı (Görsel ve video için) */}
          {currentStory.media_type !== "text" &&
            currentStory.media_type !== "audio" &&
            currentStory.caption && (
              <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 text-center text-xs text-white drop-shadow-md">
                {currentStory.caption}
              </div>
            )}

          {/* Sahibi ise: İzleyenler Butonu */}
          {isOwnStory ? (
            <button
              onClick={handleOpenViewers}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>
                {currentStory.views_count > 0
                  ? `${currentStory.views_count} Kişi Gördü`
                  : "Henüz kimse görmedi"}
              </span>
            </button>
          ) : (
            /* Başkası ise: Hikayeye Yanıt Gönder Kutusu */
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Hikayeye yanıt ver..."
                className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-white/60 backdrop-blur-md focus:outline-none focus:border-pink-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || isSendingReply}
                className="p-2 rounded-2xl bg-pink-500 hover:bg-pink-400 disabled:opacity-40 text-white transition-all cursor-pointer flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* İZLEYENLER BOTTOM SHEET / MODAL */}
      {viewersModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col max-h-[70vh] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Görüntüleyenler ({viewersList.length})</span>
              </div>
              <button
                onClick={() => {
                  setViewersModalOpen(false);
                  setIsPaused(false);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 py-2">
              {viewersList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Henüz kimse bu hikayeyi görmedi.
                </div>
              ) : (
                viewersList.map((viewer) => (
                  <div key={viewer.id} className="py-2.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-xs text-pink-400">
                      {viewer.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={viewer.avatar_url}
                          alt={viewer.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        viewer.display_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {viewer.display_name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        @{viewer.username}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
