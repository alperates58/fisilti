"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Image, FileText, Mic, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useChatStore } from "@/store/useChatStore";

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

    setIsOpen(false);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const res = await api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { media_url, metadata } = res.data;
      const mediaType = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
        ? "video"
        : "file";

      sendMediaMessage(conversationId, media_url, mediaType, metadata, "");
    } catch (err) {
      console.error("Medya yüklenemedi:", err);
      alert("Dosya yüklenirken bir hata oluştu.");
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = "";
    }
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
        accept="*/*"
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
