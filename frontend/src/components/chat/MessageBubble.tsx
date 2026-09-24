"use client";

import { useState, useRef, useEffect } from "react";
import { Message, useChatStore } from "@/store/useChatStore";
import {
  Check,
  CheckCheck,
  Info,
  CornerUpLeft,
  Smile,
  Trash2,
  Pencil,
  FileText,
  Download,
  Star,
  MoreVertical,
  X,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import AudioWaveform from "./AudioWaveform";
import { ReactionPicker, ReactionBadges } from "./ReactionPicker";
import SocialMediaEmbed, { extractSocialMedia, extractGeneralUrl } from "./SocialMediaEmbed";
import LinkPreviewCard from "./LinkPreviewCard";
import { resolveMediaUrl } from "@/lib/api";
import { useSettingsStore } from "@/store/useSettingsStore";

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const {
    setSelectedMessageInfo,
    setReplyingTo,
    deleteMessage,
    editMessage,
    toggleStar,
  } = useChatStore();
  const chatSettings = useSettingsStore((state) => state.settings?.chat_settings);

  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuDirection, setMenuDirection] = useState<"up" | "down">("up");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const resolvedMediaUrl = resolveMediaUrl(message.media_url);

  // Menü dışına tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!showMenu) {
      const rect = e.currentTarget.getBoundingClientRect();
      // Ekranın veya scroll konteynerinin üst 240px'i içindeyse aşağı doğru aç
      if (rect.top < 240) {
        setMenuDirection("down");
      } else {
        setMenuDirection("up");
      }
    }
    setShowMenu(!showMenu);
  };

  const socialMediaData =
    !message.is_deleted_for_all && message.content ? extractSocialMedia(message.content) : null;
  const generalUrl =
    !message.is_deleted_for_all && message.content && !socialMediaData
      ? extractGeneralUrl(message.content)
      : null;

  const renderFormattedContent = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline hover:opacity-80 transition-opacity break-all ${
              message.is_mine ? "text-pink-100 font-medium" : "text-pink-400 font-medium"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const formattedTime = (() => {
    try {
      return format(new Date(message.sent_at || message.created_at), "HH:mm");
    } catch {
      return "";
    }
  })();

  const renderTicks = () => {
    if (!message.is_mine) return null;

    if (message.tick_status === "read") {
      return <CheckCheck className="w-4 h-4 text-sky-400 inline ml-1" />;
    } else if (message.tick_status === "delivered") {
      return <CheckCheck className="w-4 h-4 text-slate-400 inline ml-1" />;
    }
    return <Check className="w-4 h-4 text-slate-400 inline ml-1" />;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editText.trim() || editText === message.content) {
      setIsEditing(false);
      return;
    }
    try {
      await editMessage(message.id, editText.trim());
      setIsEditing(false);
    } catch (err: any) {
      alert(err.response?.data?.error || "Mesaj düzenlenemedi.");
    }
  };

  const handleDelete = async (forAll: boolean) => {
    setShowMenu(false);
    const confirmMsg = forAll
      ? "Bu mesajı herkesten silmek istediğinize emin misiniz?"
      : "Bu mesajı sadece sizden silmek istediğinize emin misiniz?";
    if (!confirm(confirmMsg)) return;

    try {
      await deleteMessage(message.id, forAll);
    } catch (err: any) {
      alert(err.response?.data?.error || "Mesaj silinemedi.");
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`group relative flex flex-col mb-3 select-none ${
        message.is_mine ? "items-end" : "items-start"
      }`}
    >
      {/* Hızlı Reaksiyon Çubuğu (Açıldığında) */}
      {showReactions && (
        <ReactionPicker
          messageId={message.id}
          onSelect={() => setShowReactions(false)}
          className={`absolute -top-10 ${message.is_mine ? "right-2" : "left-2"}`}
        />
      )}

      {/* Mesaj Balonu ve Yan Menüsü */}
      <div
        className={`flex items-end gap-1.5 max-w-[85%] sm:max-w-[70%] md:max-w-[60%] ${
          message.is_mine ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Balon İçeriği */}
        <div
          className={`relative px-4 py-2.5 rounded-2xl shadow-md text-sm transition-all ${
            message.is_mine
              ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-br-xs"
              : "bg-grupo-dark-card border border-grupo-dark-border text-slate-100 rounded-bl-xs"
          } ${message.is_deleted_for_all ? "opacity-60 italic" : ""}`}
        >
          {/* Alıntılanan Mesaj (Reply Preview) */}
          {message.reply_to && (
            <div
              className={`mb-2 p-2 rounded-xl text-xs border-l-3 ${
                message.is_mine
                  ? "bg-black/20 border-white text-white/90"
                  : "bg-slate-900/60 border-grupo-accent text-slate-300"
              }`}
            >
              <div className="font-semibold text-[11px] opacity-90">
                {message.reply_to.sender_id === message.sender_id ? "Kendisi" : "Yanıtlanan"}
              </div>
              <div className="truncate mt-0.5">
                {message.reply_to.message_type === "voice"
                  ? "🎤 Sesli Mesaj"
                  : message.reply_to.message_type === "image"
                  ? "📷 Fotoğraf"
                  : message.reply_to.content}
              </div>
            </div>
          )}

          {/* 1. Sesli Mesaj (Voice Note) */}
          {message.message_type === "voice" && resolvedMediaUrl && !message.is_deleted_for_all && (
            <AudioWaveform
              audioUrl={resolvedMediaUrl}
              isMine={message.is_mine}
              initialDuration={typeof message.media_metadata?.duration === "number" ? message.media_metadata.duration : undefined}
              peaks={Array.isArray(message.media_metadata?.waveform) ? (message.media_metadata.waveform as number[]) : undefined}
            />
          )}

          {/* 2. Video (iOS & Android Evrensel Uyumluluk - Geçmişte image olarak kaydedilmiş videoları da otomatik video oynatıcı ile gösterir) */}
          {(message.message_type === "video" || /\.(mp4|mov|webm|m4v|mkv|avi|3gp)($|\?)/i.test(resolvedMediaUrl)) && resolvedMediaUrl && !message.is_deleted_for_all && (
            <div className="my-1 overflow-hidden rounded-2xl max-h-72 bg-black">
              <video
                controls
                playsInline
                preload="metadata"
                className="max-h-72 w-full rounded-2xl object-contain bg-black"
                src={(() => {
                  const isIOS =
                    typeof navigator !== "undefined" &&
                    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
                      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
                  if (isIOS && resolvedMediaUrl.includes(".webm") && !resolvedMediaUrl.includes("format=")) {
                    return resolvedMediaUrl.includes("?")
                      ? `${resolvedMediaUrl}&format=mp4`
                      : `${resolvedMediaUrl}?format=mp4`;
                  }
                  return resolvedMediaUrl;
                })()}
              >
                Tarayıcınız bu videoyu oynatmayı desteklemiyor.
              </video>
            </div>
          )}

          {/* 3. Fotoğraf (Image) */}
          {message.message_type === "image" && !/\.(mp4|mov|webm|m4v|mkv|avi|3gp)($|\?)/i.test(resolvedMediaUrl) && resolvedMediaUrl && !message.is_deleted_for_all && (
            <div className="my-1 cursor-pointer overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedMediaUrl}
                alt="Fotoğraf"
                loading="lazy"
                decoding="async"
                className="max-h-72 w-full object-cover rounded-xl hover:scale-[1.02] transition-transform duration-200"
                onClick={() => setPreviewImage(resolvedMediaUrl || null)}
              />
            </div>
          )}

          {/* 3b. Konum (WhatsApp Tarzı Canlı Konum) */}
          {message.message_type === "location" && !message.is_deleted_for_all && (
            <div className="my-1 rounded-2xl overflow-hidden border border-white/10 bg-slate-900/80 min-w-[220px]">
              <div className="relative h-28 w-full bg-slate-800 flex items-center justify-center overflow-hidden">
                <div
                  className="absolute inset-0 opacity-40 bg-cover bg-center"
                  style={{
                    backgroundImage: `url('https://static-maps.yandex.ru/1.x/?ll=${message.media_metadata?.longitude || 28.9784},${message.media_metadata?.latitude || 41.0082}&z=14&l=map&size=300,120&pt=${message.media_metadata?.longitude || 28.9784},${message.media_metadata?.latitude || 41.0082},pm2rdm')`,
                  }}
                />
                <div className="relative z-10 flex flex-col items-center gap-1 bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                  <MapPin className="w-5 h-5 text-rose-500 animate-bounce" />
                  <span className="text-[11px] font-bold text-white">Canlı Konum</span>
                </div>
              </div>
              <div className="p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">Paylaşılan Konum</div>
                  <div className="text-[10px] text-slate-400">
                    {message.media_metadata?.latitude?.toFixed(4)}°, {message.media_metadata?.longitude?.toFixed(4)}°
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${message.media_metadata?.latitude},${message.media_metadata?.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors flex-shrink-0 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Aç</span>
                </a>
              </div>
            </div>
          )}

          {/* 4. Belge / Dosya */}
          {message.message_type === "file" && resolvedMediaUrl && !message.is_deleted_for_all && (
            <div
              className={`my-1 p-3 rounded-xl flex items-center gap-3 ${
                message.is_mine ? "bg-black/25" : "bg-slate-900/80"
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate text-white">
                  {message.media_metadata?.file_name || "Dosya"}
                </div>
                <div className="text-[10px] text-slate-300">
                  {formatFileSize(message.media_metadata?.file_size)}
                </div>
              </div>
              <a
                href={resolvedMediaUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* 4b. Sosyal Medya Gömülü Kart / Oynatıcı (YouTube, YT Music, Instagram, Facebook) */}
          {socialMediaData && (
            <SocialMediaEmbed data={socialMediaData} isMine={message.is_mine} />
          )}

          {/* 4c. Genel Web Bağlantısı Önizleme Kartı (OpenGraph) */}
          {generalUrl && (
            <LinkPreviewCard url={generalUrl} isMine={message.is_mine} />
          )}

          {/* 5. Metin İçeriği ve Düzenleme Modu */}
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="mt-1 flex items-center gap-1.5">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="flex-1 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-pink-500 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-2 py-1 bg-emerald-500 text-white text-xs rounded-lg font-bold"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 text-slate-300 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            message.content && (
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {renderFormattedContent(message.content)}
              </p>
            )
          )}

          {/* Zaman, Düzenlendi Etiketi, Yıldız ve WhatsApp Tikleri */}
          <div className="flex items-center justify-end gap-1 mt-1 text-[11px] opacity-80 float-right ml-3 select-none">
            {message.is_starred && <Star className="w-3 h-3 text-amber-300 fill-amber-300" />}
            {message.is_edited && !message.is_deleted_for_all && (
              <span className="text-[9px] opacity-75 mr-0.5">(düzenlendi)</span>
            )}
            <span>{formattedTime}</span>
            {renderTicks()}
          </div>
        </div>

        {/* Hover / Tıklama Eylem Butonları */}
        {!message.is_deleted_for_all && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Tepki Ver */}
            <button
              onClick={() => setShowReactions(!showReactions)}
              title="Tepki Ver"
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {/* Yanıtla */}
            <button
              onClick={() => setReplyingTo(message)}
              title="Yanıtla"
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
            </button>

            {/* Daha Fazla Seçenek Menüsü */}
            <div ref={menuRef} className="relative">
              <button
                onClick={handleToggleMenu}
                title="Daha Fazla"
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {showMenu && (
                <div
                  className={`absolute ${
                    menuDirection === "up" ? "bottom-6" : "top-6"
                  } ${
                    message.is_mine ? "right-0" : "left-0"
                  } w-44 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-1 z-40 text-xs text-slate-200 animate-in fade-in zoom-in-95`}
                >
                  {/* Mesaj Bilgisi (Sadece benim mesajlarımda) */}
                  {message.is_mine && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setSelectedMessageInfo(message);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left transition-colors cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-sky-400" />
                      <span>Mesaj Bilgisi</span>
                    </button>
                  )}

                  {/* Yıldızla */}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      toggleStar(message.id);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span>{message.is_starred ? "Yıldızı Kaldır" : "Yıldızla"}</span>
                  </button>

                  {/* Düzenle (Sadece benim ve metin mesajlarında) */}
                  {message.is_mine && message.message_type === "text" && chatSettings?.allow_message_edit !== false && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setIsEditing(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Düzenle</span>
                    </button>
                  )}

                  <div className="h-px bg-slate-800 my-1" />

                  {/* Benden Sil */}
                  <button
                    onClick={() => handleDelete(false)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 text-left transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Benden Sil</span>
                  </button>

                  {/* Herkesten Sil (Sadece benim mesajlarımda) */}
                  {message.is_mine && chatSettings?.allow_delete_for_all !== false && (
                    <button
                      onClick={() => handleDelete(true)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 text-left transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Herkesten Sil</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mesaj Altı Reaksiyon Rozetleri */}
      <ReactionBadges
        reactions={message.reactions}
        messageId={message.id}
        isMine={message.is_mine}
      />

      {/* Görsel Büyütme Modalı */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Büyük Görsel"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
