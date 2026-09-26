"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useStoryStore, Story } from "@/store/useStoryStore";
import { useAuthStore } from "@/store/useAuthStore";
import {
  X,
  Trash2,
  Bookmark,
  Volume2,
  VolumeX,
  FolderHeart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatStoryTime } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/api";
import {
  extractYouTubeVideoId,
  getTextStyleClasses,
  getTextSizeClasses,
} from "./StoryCreatorModal";

export default function StoryHighlightViewerModal() {
  const { user } = useAuthStore();
  const {
    activeHighlight,
    activeHighlightStoryIndex,
    closeHighlightViewer,
    setHighlightStoryIndex,
    removeStoryFromHighlight,
    deleteHighlight,
  } = useStoryStore();

  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const stories = activeHighlight?.stories || [];
  const currentStory = stories[activeHighlightStoryIndex];
  const isOwner = activeHighlight?.user_id === user?.id;

  const handleNext = useCallback(() => {
    if (activeHighlightStoryIndex < stories.length - 1) {
      setHighlightStoryIndex(activeHighlightStoryIndex + 1);
      setProgress(0);
    } else {
      closeHighlightViewer();
    }
  }, [activeHighlightStoryIndex, stories.length, setHighlightStoryIndex, closeHighlightViewer]);

  const handlePrev = useCallback(() => {
    if (activeHighlightStoryIndex > 0) {
      setHighlightStoryIndex(activeHighlightStoryIndex - 1);
      setProgress(0);
    }
  }, [activeHighlightStoryIndex, setHighlightStoryIndex]);

  // Zamanlayıcı (Progress)
  useEffect(() => {
    if (!activeHighlight || !currentStory || isPaused) return;

    const duration = (currentStory.duration_seconds || 10) * 1000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          clearInterval(timer);
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [activeHighlight, currentStory, isPaused, handleNext]);

  if (!activeHighlight || !currentStory) return null;

  const ytVideoId = currentStory.music_url ? extractYouTubeVideoId(currentStory.music_url) : null;
  const hasMusic = Boolean(currentStory.music_url || currentStory.music_title || ytVideoId);

  const handleRemoveCurrentStory = async () => {
    if (!confirm("Bu hikayeyi öne çıkan albümden çıkarmak istediğinize emin misiniz?")) return;
    try {
      await removeStoryFromHighlight(activeHighlight.id, currentStory.id);
      if (stories.length <= 1) {
        closeHighlightViewer();
      } else if (activeHighlightStoryIndex >= stories.length - 1) {
        setHighlightStoryIndex(Math.max(0, stories.length - 2));
      }
    } catch {
      alert("Hikaye albümden çıkarılamadı.");
    }
  };

  const handleDeleteAlbum = async () => {
    if (!confirm(`"${activeHighlight.title}" albümünü tamamen silmek istediğinize emin misiniz?`)) return;
    try {
      if (user?.id) {
        await deleteHighlight(activeHighlight.id, user.id);
      }
      closeHighlightViewer();
    } catch {
      alert("Albüm silinemedi.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Öne Çıkanlar Oynatıcı"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center select-none animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md h-[100dvh] sm:h-[88vh] sm:max-h-[820px] bg-slate-950 sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl border border-slate-800 touch-none">
        {/* Üst Bar: Progress Barlar & Başlık */}
        <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {/* Progress Barlar */}
          <div className="flex items-center gap-1.5 mb-3">
            {stories.map((s, idx) => {
              let fillPercent = 0;
              if (idx < activeHighlightStoryIndex) fillPercent = 100;
              else if (idx === activeHighlightStoryIndex) fillPercent = progress;

              return (
                <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pink-500 transition-all duration-75 rounded-full"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Albüm Bilgisi ve Aksiyonlar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden border border-pink-500/60 flex items-center justify-center">
                {activeHighlight.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveMediaUrl(activeHighlight.cover_url)}
                    alt={activeHighlight.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FolderHeart className="w-5 h-5 text-pink-400" />
                )}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-pink-400" />
                  <span>{activeHighlight.title}</span>
                </h4>
                <p className="text-[10px] text-slate-300">
                  {formatStoryTime(currentStory.created_at)} • {activeHighlightStoryIndex + 1}/{stories.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isOwner && (
                <>
                  <button
                    onClick={handleRemoveCurrentStory}
                    title="Bu Hikayeyi Albümden Çıkar"
                    className="p-2 text-slate-300 hover:text-amber-400 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDeleteAlbum}
                    title="Albümü Tamamen Sil"
                    className="p-2 text-slate-300 hover:text-rose-400 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4 text-rose-400" />
                  </button>
                </>
              )}
              <button
                onClick={closeHighlightViewer}
                title="Kapat"
                className="p-2 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Medya ve İçerik Alanı */}
        <div
          className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {currentStory.media_type === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveMediaUrl(currentStory.media_url)}
              alt="Highlight Story"
              className="w-full h-full object-contain"
            />
          )}

          {currentStory.media_type === "video" && (
            <video
              ref={videoRef}
              src={resolveMediaUrl(currentStory.media_url)}
              autoPlay
              playsInline
              muted={isMuted}
              className="w-full h-full object-contain"
            />
          )}

          {currentStory.media_type === "text" && (
            <div
              className={`w-full h-full flex items-center justify-center p-8 bg-gradient-to-br ${
                currentStory.background_color || "from-pink-900 to-slate-950"
              }`}
            >
              <p className="text-xl sm:text-2xl font-bold text-white text-center drop-shadow-md">
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Dokunmatik Sağ/Sol Geçiş Alanları */}
          <div
            className="absolute inset-y-0 left-0 w-1/3 cursor-pointer z-20"
            onClick={handlePrev}
          />
          <div
            className="absolute inset-y-0 right-0 w-1/3 cursor-pointer z-20"
            onClick={handleNext}
          />

          {/* Caption (Metin / Görsel ise) */}
          {currentStory.media_type !== "text" && currentStory.caption && (
            <div className="absolute bottom-6 inset-x-0 px-6 py-3 bg-black/60 backdrop-blur-sm z-30 text-center">
              <p className="text-xs sm:text-sm text-white font-medium">{currentStory.caption}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
