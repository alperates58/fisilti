"use client";

import React, { useState, useEffect } from "react";
import { useStoryStore, StoryHighlight, Story } from "@/store/useStoryStore";
import { useAuthStore } from "@/store/useAuthStore";
import {
  X,
  Plus,
  Bookmark,
  Check,
  Trash2,
  FolderHeart,
  Sparkles,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { resolveMediaUrl } from "@/lib/api";

interface AddToHighlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: Story;
}

export function AddToHighlightModal({ isOpen, onClose, story }: AddToHighlightModalProps) {
  const { user } = useAuthStore();
  const {
    userHighlights,
    loadUserHighlights,
    createHighlight,
    addStoriesToHighlight,
  } = useStoryStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const highlights = user?.id ? userHighlights[user.id] || [] : [];

  useEffect(() => {
    if (isOpen && user?.id) {
      loadUserHighlights(user.id);
    }
  }, [isOpen, user?.id, loadUserHighlights]);

  if (!isOpen) return null;

  const handleSelectExisting = async (hl: StoryHighlight) => {
    setIsLoading(true);
    try {
      await addStoriesToHighlight(hl.id, [story.id]);
      setFeedback(`"${hl.title}" albümüne eklendi! ✨`);
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1500);
    } catch (err) {
      alert("Albüme eklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsLoading(true);
    try {
      const created = await createHighlight(
        newTitle.trim(),
        story.media_url || "",
        [story.id]
      );
      setFeedback(`"${created.title}" oluşturuldu ve eklendi! ✨`);
      setTimeout(() => {
        setFeedback(null);
        setIsCreatingNew(false);
        setNewTitle("");
        onClose();
      }, 1500);
    } catch (err) {
      alert("Öne çıkan albüm oluşturulamadı.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Öne Çıkanlara Ekle"
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-white relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık ve Kapat */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-pink-500" />
            <h3 className="font-bold text-sm sm:text-base">Öne Çıkanlara Ekle</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedback ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white">{feedback}</p>
          </div>
        ) : isCreatingNew ? (
          <form onSubmit={handleCreateNew} className="space-y-4 py-2">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Albüm Başlığı</label>
              <input
                type="text"
                autoFocus
                placeholder="Örn: Tatil, Müzik, Anılar..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={40}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={isLoading || !newTitle.trim()}
                className="flex-1 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-pink-600/30"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Oluştur ve Ekle"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {/* Yeni Albüm Butonu */}
            <button
              onClick={() => setIsCreatingNew(true)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-pink-400 transition-colors text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-pink-600/20 border border-pink-500/40 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-pink-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">Yeni Öne Çıkan Albüm</p>
                <p className="text-[11px] text-pink-300/80">Yeni bir başlıkla öne çıkar</p>
              </div>
              <ChevronRight className="w-4 h-4 text-pink-400" />
            </button>

            {/* Mevcut Albümler */}
            {highlights.length > 0 && (
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                <p className="text-[11px] font-semibold text-slate-400 px-1 pt-1">
                  Mevcut Albümlerine Ekle:
                </p>
                {highlights.map((hl) => (
                  <button
                    key={hl.id}
                    disabled={isLoading}
                    onClick={() => handleSelectExisting(hl)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 transition-colors text-left cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden border border-slate-700 flex items-center justify-center flex-shrink-0">
                      {hl.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveMediaUrl(hl.cover_url)}
                          alt={hl.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FolderHeart className="w-4 h-4 text-pink-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{hl.title}</p>
                      <p className="text-[10px] text-slate-400">{hl.story_count || 0} hikaye</p>
                    </div>
                    <Plus className="w-4 h-4 text-slate-500 group-hover:text-pink-400 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Öne Çıkanlar Albüm Barı (Profil veya Drawer için)
export function HighlightsBar({
  userId,
  isOwnProfile,
}: {
  userId: string;
  isOwnProfile: boolean;
}) {
  const { userHighlights, loadUserHighlights, openHighlightViewer, loadHighlightDetails } =
    useStoryStore();
  const highlights = userHighlights[userId] || [];

  useEffect(() => {
    if (userId) {
      loadUserHighlights(userId);
    }
  }, [userId, loadUserHighlights]);

  if (highlights.length === 0 && !isOwnProfile) {
    return null;
  }

  const handleOpenHighlight = async (hl: StoryHighlight) => {
    try {
      const detailed = await loadHighlightDetails(hl.id);
      if (detailed && detailed.stories && detailed.stories.length > 0) {
        openHighlightViewer(detailed, 0);
      } else {
        alert("Bu öne çıkan albümde henüz görüntülenebilecek hikaye yok.");
      }
    } catch {
      alert("Öne çıkan yüklenirken hata oluştu.");
    }
  };

  return (
    <div className="py-2">
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        {highlights.map((hl) => (
          <button
            key={hl.id}
            onClick={() => handleOpenHighlight(hl)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 group-hover:scale-105 transition-transform shadow-md">
              <div className="w-full h-full rounded-full bg-slate-950 p-[2px] overflow-hidden">
                {hl.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveMediaUrl(hl.cover_url)}
                    alt={hl.title}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-pink-400">
                    <FolderHeart className="w-5 h-5" />
                  </div>
                )}
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-300 max-w-[64px] truncate text-center group-hover:text-white transition-colors">
              {hl.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
