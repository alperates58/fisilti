"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Image, FileText, Mic, Loader2, MapPin, Smile, Sparkles, Headphones } from "lucide-react";
import { api } from "@/lib/api";
import { useChatStore } from "@/store/useChatStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { compressImage, validateVideo } from "@/lib/compression";

interface Props {
  conversationId: string;
  onStartVoice: () => void;
  onOpenEmoji?: () => void;
  onStageFile?: (file: File) => void;
  onOpenDoodle?: () => void;
  onOpenListenTogether?: () => void;
}

export default function MediaUploadMenu({
  conversationId,
  onStartVoice,
  onOpenEmoji,
  onStageFile,
  onOpenDoodle,
  onOpenListenTogether,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const sendMediaMessage = useChatStore((state) => state.sendMediaMessage);

  const menuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaLimits = useSettingsStore((state) => state.settings?.media_limits);

  // Dışarı tıklayınca menüyü kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (mediaLimits?.max_file_size_mb && file.size > mediaLimits.max_file_size_mb * 1024 * 1024) {
      alert(`Dosya boyutu sistem sınırını aşıyor (En fazla ${mediaLimits.max_file_size_mb} MB yüklenebilir).`);
      e.target.value = "";
      return;
    }

    setIsOpen(false);

    if (onStageFile) {
      e.target.value = "";
      onStageFile(file);
      return;
    }

    setIsUploading(true);

    try {
      const fileName = file.name.toLowerCase();
      const isVideo =
        file.type.startsWith("video/") ||
        /\.(mp4|mov|webm|m4v|mkv|avi|3gp)$/i.test(fileName);
      const isAudio =
        file.type.startsWith("audio/") ||
        /\.(mp3|m4a|wav|ogg|aac|weba)$/i.test(fileName);
      const isImage =
        !isVideo &&
        !isAudio &&
        (file.type.startsWith("image/") ||
          /\.(jpg|jpeg|png|webp|gif|heic|heif)$/i.test(fileName));

      const effectiveCategory = isVideo
        ? "video"
        : isAudio
        ? "voice"
        : isImage
        ? "image"
        : category || "file";

      let fileToUpload = file;
      if (isImage) {
        // İstemci tarafı kayıpsıza yakın sıkıştırma uygula
        fileToUpload = await compressImage(file);
      } else if (isVideo) {
        const val = validateVideo(file);
        if (!val.valid) {
          alert(val.error);
          setIsUploading(false);
          return;
        }
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("category", effectiveCategory);

      const res = await api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { media_url, metadata } = res.data;
      const mediaType = isVideo ? "video" : isAudio ? "voice" : isImage ? "image" : "file";

      sendMediaMessage(conversationId, media_url, mediaType, metadata, "");
    } catch (err: any) {
      console.error("Medya yüklenemedi:", err);
      alert(err.response?.data?.error || "Dosya yüklenirken bir hata oluştu.");
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert("Tarayıcınız konum servisini desteklemiyor.");
      return;
    }
    setIsOpen(false);
    setIsUploading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsUploading(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        sendMediaMessage(
          conversationId,
          "",
          "location",
          { latitude: lat, longitude: lng },
          "📍 Canlı Konum Paylaşıldı"
        );
      },
      (err) => {
        setIsUploading(false);
        alert("Konum alınamadı: Lütfen tarayıcınızda konum erişimine izin verildiğinden emin olun.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Gizli Dosya Girişleri */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, "image")}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={mediaLimits?.allowed_extensions?.join(",") || "*/*"}
        className="hidden"
        onChange={(e) => handleFileUpload(e, "file")}
      />

      {/* Popover Menü */}
      {isOpen && (
        <div className="absolute bottom-14 left-0 w-44 bg-slate-900/95 border border-grupo-dark-border rounded-2xl shadow-2xl p-1.5 z-40 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
          {onOpenEmoji && (
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenEmoji();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                <Smile className="w-4 h-4" />
              </div>
              <span className="font-semibold text-xs">Emoji & İfadeler</span>
            </button>
          )}

          <button
            onClick={() => {
              setIsOpen(false);
              imageInputRef.current?.click();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Image className="w-4 h-4" />
            </div>
            <span className="font-semibold text-xs">Fotoğraf & Video</span>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              fileInputRef.current?.click();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <span className="font-semibold text-xs">Belge / Dosya</span>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onStartVoice();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center flex-shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <span className="font-semibold text-xs">Sesli Mesaj</span>
          </button>

          <button
            onClick={handleShareLocation}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="font-semibold text-xs">Konum Paylaş</span>
          </button>

          {onOpenDoodle && (
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenDoodle();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-semibold text-xs">Canlı Çizim</span>
            </button>
          )}

          {onOpenListenTogether && (
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenListenTogether();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-4 h-4" />
              </div>
              <span className="font-semibold text-xs">Birlikte Dinle</span>
            </button>
          )}
        </div>
      )}

      {/* Grupo İmzası Dönen '+' Butonu */}
      <button
        type="button"
        disabled={isUploading}
        onClick={() => setIsOpen(!isOpen)}
        title="Medya veya Dosya Ekle"
        style={
          isOpen
            ? {
                color: "var(--accent, #E91E63)",
                boxShadow: "0 4px 12px var(--accent-shadow, rgba(233, 30, 99, 0.25))",
              }
            : undefined
        }
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-md flex-shrink-0 ${
          isOpen
            ? "bg-slate-800 rotate-[405deg]"
            : "bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-grupo-dark-border"
        }`}
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--accent, #E91E63)" }} />
        ) : (
          <Plus className="w-5 h-5 transition-transform duration-300" />
        )}
      </button>
    </div>
  );
}
