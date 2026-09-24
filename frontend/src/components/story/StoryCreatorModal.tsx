"use client";

import React, { useState, useRef, useEffect } from "react";
import { useStoryStore } from "@/store/useStoryStore";
import { useAuthStore } from "@/store/useAuthStore";
import { compressImage } from "@/lib/compression";
import { api, resolveMediaUrl } from "@/lib/api";
import {
  X,
  Camera,
  Image as ImageIcon,
  Video,
  Type,
  Music,
  Smile,
  Sparkles,
  Check,
  Send,
  Loader2,
  Play,
  Square,
  Clock,
  Sliders,
  Volume2,
} from "lucide-react";

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/|music\.youtube\.com\/(?:watch\?v=|.*[?&]v=))([a-zA-Z0-9_-]{11})/i
  );
  return match ? match[1] : null;
}

export function formatTimeSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export interface StoryTextSticker {
  id: string;
  type: "text";
  text: string;
  style: "classic_black" | "classic_white" | "neon_pink" | "vibrant_yellow" | "emerald" | "transparent";
  fontSize: "sm" | "base" | "lg" | "xl";
  x: number;
  y: number;
}

export function getTextStyleClasses(style: StoryTextSticker["style"]): string {
  switch (style) {
    case "classic_white":
      return "bg-white/95 text-slate-900 border border-slate-200 shadow-xl";
    case "neon_pink":
      return "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xl shadow-pink-500/40";
    case "vibrant_yellow":
      return "bg-amber-400 text-slate-950 font-black shadow-xl";
    case "emerald":
      return "bg-emerald-600 text-white shadow-xl";
    case "transparent":
      return "bg-transparent text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] font-extrabold";
    case "classic_black":
    default:
      return "bg-black/80 text-white border border-white/20 shadow-xl backdrop-blur-sm";
  }
}

export function getTextSizeClasses(size: StoryTextSticker["fontSize"]): string {
  switch (size) {
    case "sm":
      return "text-xs sm:text-sm";
    case "lg":
      return "text-base sm:text-lg font-bold";
    case "xl":
      return "text-lg sm:text-xl font-black";
    case "base":
    default:
      return "text-sm sm:text-base font-semibold";
  }
}

const GRADIENT_PRESETS = [
  "from-pink-900 via-purple-900 to-slate-950",
  "from-rose-600 via-pink-600 to-amber-500",
  "from-indigo-900 via-blue-900 to-slate-950",
  "from-emerald-900 via-teal-900 to-slate-950",
  "from-amber-700 via-orange-800 to-slate-950",
  "from-slate-900 via-purple-950 to-black",
];

const MUSIC_PRESETS = [
  { title: "Blinding Lights", artist: "The Weeknd", url: "https://music.youtube.com/watch?v=4NRXx6U8ABQ" },
  { title: "Starboy", artist: "The Weeknd ft. Daft Punk", url: "https://music.youtube.com/watch?v=34Na4j8AVgA" },
  { title: "Flowers", artist: "Miley Cyrus", url: "https://music.youtube.com/watch?v=G7KNmW9a75Y" },
  { title: "Aura Chill Beats", artist: "Lofi Beats Collection", url: "https://music.youtube.com/watch?v=jfKfPfyJRdk" },
  { title: "Nightcall", artist: "Kavinsky", url: "https://music.youtube.com/watch?v=MV_3Dpw-BRY" },
  { title: "As It Was", artist: "Harry Styles", url: "https://music.youtube.com/watch?v=H5v3kku4y6Q" },
];

export default function StoryCreatorModal() {
  const { user } = useAuthStore();
  const { isCreatorOpen, closeCreator, createStory } = useStoryStore();

  const [mode, setMode] = useState<"media" | "text">("media");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0]);

  // Müzik seçimi ve zamanlama
  const [musicTitle, setMusicTitle] = useState("");
  const [musicArtist, setMusicArtist] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState<number>(10);
  const [musicStart, setMusicStart] = useState<number>(0);
  const [musicEnd, setMusicEnd] = useState<number>(10);
  const [isMusicPickerOpen, setIsMusicPickerOpen] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Avatar çıkartması ekleme
  const [hasAvatarSticker, setHasAvatarSticker] = useState(false);

  // Metin Katmanı (Instagram Tarzı Yazı Ekleme)
  const [textStickers, setTextStickers] = useState<StoryTextSticker[]>([]);
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [editingStickerId, setEditingStickerId] = useState<string | null>(null);
  const [currentStickerText, setCurrentStickerText] = useState("");
  const [currentStickerStyle, setCurrentStickerStyle] = useState<StoryTextSticker["style"]>("classic_black");
  const [currentStickerSize, setCurrentStickerSize] = useState<StoryTextSticker["fontSize"]>("base");
  const [currentStickerY, setCurrentStickerY] = useState<number>(50);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const extractedVideoId = extractYouTubeVideoId(musicUrl);

  // Modal kapandığında state temizle
  useEffect(() => {
    if (!isCreatorOpen) {
      setTextStickers([]);
      setIsTextEditorOpen(false);
      setEditingStickerId(null);
      setCurrentStickerText("");
      setMediaFile(null);
      setMediaPreview("");
      setCaption("");
      setMusicTitle("");
      setMusicArtist("");
      setMusicUrl("");
      setHasAvatarSticker(false);
      setIsPreviewPlaying(false);
    }
  }, [isCreatorOpen]);

  const handleOpenTextEditor = (stickerToEdit?: StoryTextSticker) => {
    if (stickerToEdit) {
      setEditingStickerId(stickerToEdit.id);
      setCurrentStickerText(stickerToEdit.text);
      setCurrentStickerStyle(stickerToEdit.style);
      setCurrentStickerSize(stickerToEdit.fontSize);
      setCurrentStickerY(stickerToEdit.y);
    } else {
      setEditingStickerId(null);
      setCurrentStickerText("");
      setCurrentStickerStyle("classic_black");
      setCurrentStickerSize("base");
      setCurrentStickerY(50);
    }
    setIsTextEditorOpen(true);
  };

  const handleSaveTextSticker = () => {
    if (!currentStickerText.trim()) return;

    if (editingStickerId) {
      setTextStickers((prev) =>
        prev.map((s) =>
          s.id === editingStickerId
            ? {
                ...s,
                text: currentStickerText.trim(),
                style: currentStickerStyle,
                fontSize: currentStickerSize,
                y: currentStickerY,
              }
            : s
        )
      );
    } else {
      const newSticker: StoryTextSticker = {
        id: `text_${Date.now()}`,
        type: "text",
        text: currentStickerText.trim(),
        style: currentStickerStyle,
        fontSize: currentStickerSize,
        x: 50,
        y: currentStickerY,
      };
      setTextStickers((prev) => [...prev, newSticker]);
    }

    setIsTextEditorOpen(false);
    setEditingStickerId(null);
  };

  // Süre değiştiğinde bitiş saniyesini güncelle
  const handleDurationChange = (dur: number) => {
    setDurationSeconds(dur);
    setMusicEnd(musicStart + dur);
    setIsPreviewPlaying(false);
  };

  // Başlangıç saniyesi değiştiğinde
  const handleStartChange = (startVal: number) => {
    setMusicStart(startVal);
    setMusicEnd(startVal + durationSeconds);
    setIsPreviewPlaying(false);
  };

  // Canlı önizleme zamanlayıcısı: süre dolunca otomatik durdur
  useEffect(() => {
    if (!isPreviewPlaying) return;
    const dur = musicEnd > musicStart ? musicEnd - musicStart : durationSeconds;
    const timer = setTimeout(() => {
      setIsPreviewPlaying(false);
    }, dur * 1000);
    return () => clearTimeout(timer);
  }, [isPreviewPlaying, musicStart, musicEnd, durationSeconds]);

  if (!isCreatorOpen) return null;

  // Dosya seçildiğinde
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith("video/");
    setMediaType(isVid ? "video" : "image");

    if (isVid) {
      if (file.size > 80 * 1024 * 1024) {
        alert("Video boyutu maksimum 80 MB olabilir.");
        return;
      }
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    } else {
      // Görseli sıkıştır
      const compressed = await compressImage(file, 1600, 0.85);
      setMediaFile(compressed);
      setMediaPreview(URL.createObjectURL(compressed));
    }
    setMode("media");
  };

  // Hikayeyi Gönder
  const handlePublish = async () => {
    setIsSubmitting(true);
    setIsPreviewPlaying(false);
    try {
      let finalMediaUrl = "";
      let finalMediaType: "image" | "video" | "text" = "text";

      if (mode === "media" && mediaFile) {
        finalMediaType = mediaType;
        // Dosyayı MinIO sunucusuna yükle
        const formData = new FormData();
        formData.append("file", mediaFile);
        formData.append("category", mediaType);

        const uploadRes = await api.post("/media/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        finalMediaUrl = uploadRes.data.media_url;
      }

      // Çıkartmalar ve metin katmanları listesi
      const stickers: any[] = [];
      if (hasAvatarSticker && user?.avatar_url) {
        stickers.push({
          type: "avatar",
          avatar_url: user.avatar_url,
          x: 50,
          y: 40,
        });
      }
      textStickers.forEach((ts) => {
        stickers.push({
          type: "text",
          text: ts.text,
          style: ts.style,
          fontSize: ts.fontSize,
          x: ts.x,
          y: ts.y,
        });
      });

      await createStory({
        media_type: finalMediaType,
        media_url: finalMediaUrl,
        caption: caption.trim(),
        background_color: selectedGradient,
        music_title:
          (musicTitle.trim().startsWith("http") ? "" : musicTitle.trim()) ||
          (extractedVideoId ? "YouTube Music" : ""),
        music_artist:
          (musicArtist.trim().startsWith("http") ? "" : musicArtist.trim()) ||
          (extractedVideoId ? "YouTube" : ""),
        music_url: musicUrl.trim(),
        duration_seconds: durationSeconds,
        music_start: musicStart,
        music_end: musicEnd,
        stickers,
      });

      closeCreator();
      alert("Hikayeniz 24 saatliğine yayınlandı!");
    } catch (err) {
      console.error("Hikaye paylaşılamadı:", err);
      alert("Hikaye paylaşılırken bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-md h-[100dvh] sm:h-[90vh] sm:max-h-[850px] bg-slate-950 sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl border border-slate-800">
        
        {/* 1. ÜST BAR: Başlık ve Kapat */}
        <div className="p-3.5 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-20">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Sparkles className="w-4 h-4 text-pink-500" />
            <span>Yeni Hikaye Oluştur</span>
          </div>

          {/* Sağ kontroller: Süre rozeti ve Kapat */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-700/80 rounded-full px-2.5 py-1 text-[11px] text-pink-400 font-semibold">
              <Clock className="w-3 h-3 text-pink-500" />
              <span>{durationSeconds}s</span>
            </div>

            <button
              onClick={() => {
                setIsPreviewPlaying(false);
                closeCreator();
              }}
              disabled={isSubmitting}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. MERKEZ ÖNİZLEME ALANI */}
        <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
          {mode === "media" && mediaPreview ? (
            <>
              {mediaType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaPreview}
                  alt="Önizleme"
                  className="w-full h-full object-contain pointer-events-none"
                />
              ) : (
                <video
                  src={mediaPreview}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain pointer-events-none"
                />
              )}
            </>
          ) : (
            /* Metin Modu veya Medya Seçilmemişse */
            <div
              className={`w-full h-full bg-gradient-to-br ${selectedGradient} flex flex-col items-center justify-center p-6 text-center`}
            >
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Bir şeyler yaz..."
                maxLength={240}
                rows={4}
                className="w-full bg-transparent text-xl sm:text-2xl font-bold text-white placeholder-white/50 text-center border-none focus:outline-none resize-none drop-shadow-md"
              />
            </div>
          )}

          {/* AVATAR ÇIKARTMASI ÖNİZLEMESİ */}
          {hasAvatarSticker && user?.avatar_url && (
            <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-18 h-18 rounded-full border-3 border-pink-400 shadow-2xl overflow-hidden animate-bounce pointer-events-none z-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveMediaUrl(user.avatar_url)}
                alt="Avatar Çıkartması"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* YOUTUBE MUSIC ROZETİ ÖNİZLEMESİ */}
          {(musicTitle || extractedVideoId) && (
            <div className="absolute top-16 left-4 z-20 flex items-center gap-2 bg-black/75 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5 shadow-xl text-white">
              <div className="w-5 h-5 rounded-full bg-rose-600 flex items-center justify-center text-white flex-shrink-0">
                <Music className="w-3 h-3" />
              </div>
              <div className="text-left pr-1 max-w-[170px] truncate text-[11px] font-bold">
                <div>{musicTitle || "YouTube Music"}</div>
                <div className="text-[9px] text-slate-300 font-normal">
                  {formatTimeSeconds(musicStart)} - {formatTimeSeconds(musicEnd)}
                </div>
              </div>
              <button
                onClick={() => {
                  setMusicTitle("");
                  setMusicUrl("");
                  setIsPreviewPlaying(false);
                }}
                className="p-0.5 text-white/60 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* HIZLI YAZI EKLEME BUTONU (Aa) */}
          <button
            type="button"
            onClick={() => handleOpenTextEditor()}
            title="Yazı Ekle"
            className="absolute top-16 right-4 z-20 w-9 h-9 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="font-serif font-black text-sm tracking-tighter">Aa</span>
          </button>

          {/* EKLENEN METİN YAZILARI ÖNİZLEMESİ */}
          {textStickers.map((ts) => (
            <div
              key={ts.id}
              style={{
                left: `${ts.x}%`,
                top: `${ts.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              onClick={() => handleOpenTextEditor(ts)}
              className={`absolute z-30 max-w-[85%] text-center px-4 py-2 rounded-2xl break-words whitespace-pre-wrap cursor-pointer group hover:ring-2 hover:ring-pink-400 transition-all ${getTextStyleClasses(
                ts.style
              )} ${getTextSizeClasses(ts.fontSize)}`}
            >
              <span>{ts.text}</span>
              {/* Silme Rozeti */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTextStickers((prev) => prev.filter((s) => s.id !== ts.id));
                }}
                title="Yazıyı Sil"
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-md opacity-80 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 stroke-[3]" />
              </button>
            </div>
          ))}

          {/* GİZLİ YOUTUBE ÖNİZLEME OYNATICI (CANLI DİNLEME) */}
          {isPreviewPlaying && extractedVideoId && (
            <iframe
              key={`${extractedVideoId}-${musicStart}-${musicEnd}`}
              src={`https://www.youtube.com/embed/${extractedVideoId}?autoplay=1&start=${musicStart}&end=${musicEnd}&enablejsapi=1&controls=0&playsinline=1&mute=0`}
              allow="autoplay *; encrypted-media *; fullscreen *"
              style={{
                position: "fixed",
                left: "-9999px",
                top: "-9999px",
                width: "320px",
                height: "180px",
                opacity: 0.001,
                pointerEvents: "none",
                zIndex: -1,
              }}
              title="YouTube Preview"
            />
          )}

          {/* METİN EKLEME EDİTÖRÜ MODALI */}
          {isTextEditorOpen && (
            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in duration-200">
              {/* Üst Bar: Vazgeç, Konum ve Bitti */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsTextEditorOpen(false);
                    setEditingStickerId(null);
                  }}
                  className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/10"
                >
                  Vazgeç
                </button>

                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setCurrentStickerY(25)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      currentStickerY === 25 ? "bg-pink-600 text-white font-bold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Üst
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStickerY(50)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      currentStickerY === 50 ? "bg-pink-600 text-white font-bold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Orta
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStickerY(75)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      currentStickerY === 75 ? "bg-pink-600 text-white font-bold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Alt
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveTextSticker}
                  disabled={!currentStickerText.trim()}
                  className="text-xs font-bold text-white px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 transition-all cursor-pointer shadow-lg shadow-pink-600/30"
                >
                  Bitti
                </button>
              </div>

              {/* Merkez Metin Girişi */}
              <div className="flex-1 flex items-center justify-center p-4">
                <textarea
                  autoFocus
                  value={currentStickerText}
                  onChange={(e) => setCurrentStickerText(e.target.value)}
                  placeholder="Yazınızı yazın..."
                  rows={3}
                  maxLength={120}
                  className={`w-full max-w-[85%] text-center px-4 py-3 rounded-2xl resize-none border-none outline-none transition-all ${getTextStyleClasses(
                    currentStickerStyle
                  )} ${getTextSizeClasses(currentStickerSize)}`}
                />
              </div>

              {/* Alt Kontroller: Boyut ve Stil Presetleri */}
              <div className="flex flex-col gap-3 pb-2">
                {/* Boyut Seçimi */}
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-semibold mr-1">Boyut:</span>
                  {(["sm", "base", "lg", "xl"] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setCurrentStickerSize(sz)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        currentStickerSize === sz
                          ? "bg-white text-slate-900 shadow-md scale-105"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {sz === "sm" ? "Küçük" : sz === "base" ? "Normal" : sz === "lg" ? "Büyük" : "X-Büyük"}
                    </button>
                  ))}
                </div>

                {/* Stil Seçimi */}
                <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
                  {[
                    { id: "classic_black", label: "Siyah", bg: "bg-black border border-white/40 text-white" },
                    { id: "classic_white", label: "Beyaz", bg: "bg-white text-black" },
                    { id: "neon_pink", label: "Pembe", bg: "bg-gradient-to-r from-pink-600 to-rose-600 text-white" },
                    { id: "vibrant_yellow", label: "Sarı", bg: "bg-amber-400 text-black font-black" },
                    { id: "emerald", label: "Yeşil", bg: "bg-emerald-600 text-white" },
                    { id: "transparent", label: "Şeffaf", bg: "border border-white/60 text-white" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setCurrentStickerStyle(st.id as any)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${st.bg} ${
                        currentStickerStyle === st.id ? "ring-2 ring-pink-500 scale-110 shadow-lg" : "opacity-80 hover:opacity-100"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. ARAÇ ÇUBUĞU (Medya, Metin, Müzik, Çıkartma, Renk) */}
        <div className="p-3 bg-slate-900/95 border-t border-slate-800 flex flex-col gap-2.5 z-20">
          
          {/* Müzik Seçim Paneli (YouTube Music & Canlı Aralık Kırpıcı) */}
          {isMusicPickerOpen && (
            <div className="bg-slate-950 p-3 rounded-2xl border border-rose-500/40 shadow-xl flex flex-col gap-3 animate-in fade-in max-h-72 overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between text-xs text-white font-semibold border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <Music className="w-4 h-4 text-rose-500" />
                  YouTube Music Şarkı & Aralık Ayarı
                </span>
                <button
                  onClick={() => setIsMusicPickerOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* URL Girişi */}
              <div>
                <label className="text-[10px] text-slate-400 font-semibold mb-1 block">
                  YouTube Music veya YouTube Şarkı Linki:
                </label>
                <input
                  type="text"
                  value={musicUrl}
                  onChange={(e) => {
                    setMusicUrl(e.target.value);
                    const vid = extractYouTubeVideoId(e.target.value);
                    if (vid && !musicTitle) {
                      setMusicTitle("YouTube Parçası");
                    }
                  }}
                  placeholder="https://music.youtube.com/watch?v=..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              {/* Şarkı Başlığı ve Sanatçı (İsteğe Bağlı) */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={musicTitle}
                  onChange={(e) => setMusicTitle(e.target.value)}
                  placeholder="Şarkı Adı (örn: Blinding Lights)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
                <input
                  type="text"
                  value={musicArtist}
                  onChange={(e) => setMusicArtist(e.target.value)}
                  placeholder="Sanatçı (örn: The Weeknd)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Hikaye Oynatma Süresi Seçici */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1">
                  <span>Hikaye Oynatma Süresi:</span>
                  <span className="text-pink-400 font-bold">{durationSeconds} saniye</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[5, 10, 15, 30].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => handleDurationChange(sec)}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        durationSeconds === sec
                          ? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
                          : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Müzik Aralığı ve Slider (Start / End) */}
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-rose-400" />
                    Müzik Başlangıç Saniyesi:
                  </span>
                  <span className="text-rose-400 font-mono font-bold">
                    {formatTimeSeconds(musicStart)} - {formatTimeSeconds(musicEnd)}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={300}
                  step={1}
                  value={musicStart}
                  onChange={(e) => handleStartChange(parseInt(e.target.value) || 0)}
                  className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />

                <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
                  <span>00:00 (Başı)</span>
                  <span>02:30</span>
                  <span>05:00</span>
                </div>
              </div>

              {/* Canlı Dinle / Önizleme Butonu */}
              {extractedVideoId && (
                <button
                  type="button"
                  onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                  className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isPreviewPlaying
                      ? "bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/30"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                  }`}
                >
                  {isPreviewPlaying ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>Önizlemeyi Durdur ({formatTimeSeconds(musicStart)} - {formatTimeSeconds(musicEnd)})</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>▶ Canlı Dinle ({formatTimeSeconds(musicStart)} - {formatTimeSeconds(musicEnd)})</span>
                    </>
                  )}
                </button>
              )}

              {/* Hazır Popüler Parçalar */}
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                  Veya Hazır Popüler Şarkılardan Seç:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {MUSIC_PRESETS.map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setMusicTitle(m.title);
                        setMusicArtist(m.artist);
                        setMusicUrl(m.url);
                        setIsPreviewPlaying(false);
                      }}
                      className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-600/20 hover:border-rose-500/40 border border-slate-700 text-[10px] text-slate-300 hover:text-white transition-all text-left"
                    >
                      🎵 {m.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Araç İkonları */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              {/* Fotoğraf / Video Seç */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  mode === "media" && mediaFile
                    ? "bg-pink-500/20 text-pink-400 border-pink-500/40"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Fotoğraf/Video</span>
              </button>

              {/* Yazı Ekle Butonu */}
              <button
                type="button"
                onClick={() => handleOpenTextEditor()}
                title="Yazı Ekle"
                className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  textStickers.length > 0
                    ? "bg-pink-500/20 text-pink-400 border-pink-500/40"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                }`}
              >
                <Type className="w-4 h-4" />
                <span>Yazı Ekle</span>
              </button>

              {/* Renkli Zemin Modu */}
              <button
                type="button"
                onClick={() => {
                  setMode("text");
                  setMediaFile(null);
                  setMediaPreview("");
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  mode === "text"
                    ? "bg-pink-500/20 text-pink-400 border-pink-500/40"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Renkli Zemin</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Müzik Ekle (YouTube Music) */}
              <button
                type="button"
                onClick={() => setIsMusicPickerOpen(!isMusicPickerOpen)}
                title="YouTube Music Ekle"
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  musicTitle || musicUrl
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/40 ring-1 ring-rose-500/50"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                }`}
              >
                <Music className="w-4 h-4" />
              </button>

              {/* Avatar Çıkartması Ekle */}
              <button
                type="button"
                onClick={() => setHasAvatarSticker(!hasAvatarSticker)}
                title="Avatarını Çıkartma Olarak Ekle"
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  hasAvatarSticker
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                }`}
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metin Modu için Renk Paleti */}
          {mode === "text" && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {GRADIENT_PRESETS.map((grad, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedGradient(grad)}
                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 transition-transform ${
                    selectedGradient === grad ? "scale-110 ring-2 ring-white" : ""
                  }`}
                >
                  {selectedGradient === grad && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          )}

          {/* Medya Modu için Altyazı Girişi */}
          {mode === "media" && (
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Hikayene bir başlık ekle..."
              maxLength={120}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
            />
          )}

          {/* 4. PAYLAŞ BUTONU */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={isSubmitting || (mode === "media" && !mediaFile && !caption && textStickers.length === 0)}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:opacity-95 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Hikaye Yayınlanıyor...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Hikayede Paylaş ({durationSeconds} sn)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
