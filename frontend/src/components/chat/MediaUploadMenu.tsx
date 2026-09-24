"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Image, FileText, Mic, Loader2, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { useChatStore } from "@/store/useChatStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { compressImage, validateVideo } from "@/lib/compression";

interface Props {
  conversationId: string;
  onStartVoice: () => void;
}

export default function MediaUploadMenu({ conversationId, onStartVoice }: Props) {
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
        <div className="absolute bottom-14 left-0 w-52 bg-slate-900 border border-grupo-dark-border rounded-2xl shadow-2xl p-2 z-40 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 space-y-1">
          <button
            onClick={() => {
              setIsOpen(false);
              imageInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Image className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold">Fotoğraf & Video</div>
              <div className="text-[10px] text-slate-400">JPG, PNG, MP4...</div>
            </div>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              fileInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold">Belge / Dosya</div>
              <div className="text-[10px] text-slate-400">PDF, DOC, ZIP...</div>
            </div>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onStartVoice();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold">Sesli Mesaj</div>
              <div className="text-[10px] text-slate-400">Mikrofonla kaydet</div>
            </div>
          </button>

          <button
            onClick={handleShareLocation}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold">Konum Paylaş</div>
              <div className="text-[10px] text-slate-400">Anlık harita konumu</div>
            </div>
          </button>
        </div>
      )}

      {/* Grupo İmzası Dönen '+' Butonu */}
      <button
        type="button"
        disabled={isUploading}
        onClick={() => setIsOpen(!isOpen)}
        title="Medya veya Dosya Ekle"
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-md ${
          isOpen
            ? "bg-slate-800 text-pink-400 rotate-[405deg] shadow-pink-500/20"
            : "bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-grupo-dark-border"
        }`}
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-grupo-accent" />
        ) : (
          <Plus className="w-5 h-5 transition-transform duration-300" />
        )}
      </button>
    </div>
  );
}
