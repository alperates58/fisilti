"use client";

import { useState } from "react";
import { Play, ExternalLink, Music, Instagram, Facebook, Youtube, Volume2 } from "lucide-react";

export type SocialMediaType = "youtube" | "youtube_music" | "instagram" | "facebook";

export interface SocialMediaData {
  type: SocialMediaType;
  url: string;
  id?: string;
}

/**
 * Metin içerisindeki YouTube, YouTube Music, Instagram ve Facebook linklerini tespit eder.
 */
export function extractSocialMedia(text: string): SocialMediaData | null {
  if (!text) return null;

  // 1. YouTube Music
  const ytMusicRegex = /https?:\/\/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i;
  const ytMusicMatch = text.match(ytMusicRegex);
  if (ytMusicMatch) {
    return {
      type: "youtube_music",
      url: ytMusicMatch[0],
      id: ytMusicMatch[1],
    };
  }

  // 2. YouTube (Normal & Shorts & youtu.be)
  const ytRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const ytMatch = text.match(ytRegex);
  if (ytMatch) {
    return {
      type: "youtube",
      url: ytMatch[0],
      id: ytMatch[1],
    };
  }

  // 3. Instagram (Post, Reel, TV)
  const igRegex = /https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i;
  const igMatch = text.match(igRegex);
  if (igMatch) {
    return {
      type: "instagram",
      url: igMatch[0],
      id: igMatch[1],
    };
  }

  // 4. Facebook (Watch, Video, Post)
  const fbRegex = /https?:\/\/(?:www\.)?(?:facebook\.com\/(?:[^\/]+\/videos\/|watch\/\?v=|video\.php\?v=)|fb\.watch\/)([a-zA-Z0-9_-]+)/i;
  const fbMatch = text.match(fbRegex);
  if (fbMatch) {
    return {
      type: "facebook",
      url: fbMatch[0],
      id: fbMatch[1],
    };
  }

  // Genel Facebook linki
  const fbGeneralRegex = /https?:\/\/(?:www\.)?(?:facebook\.com|fb\.com)\/[a-zA-Z0-9._-]+/i;
  const fbGenMatch = text.match(fbGeneralRegex);
  if (fbGenMatch) {
    return {
      type: "facebook",
      url: fbGenMatch[0],
    };
  }

  return null;
}

/**
 * Metin içerisindeki ilk genel http/https linkini döner.
 */
export function extractGeneralUrl(text: string): string | null {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/i;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

interface Props {
  data: SocialMediaData;
  isMine?: boolean;
}

export default function SocialMediaEmbed({ data, isMine }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);

  // A. YouTube & YouTube Music
  if (data.type === "youtube" || data.type === "youtube_music") {
    const isMusic = data.type === "youtube_music";
    const videoId = data.id;

    if (!videoId) return null;

    return (
      <div className="my-2 rounded-2xl overflow-hidden border border-white/10 bg-slate-900/90 shadow-lg w-full max-w-sm sm:max-w-md">
        {/* Üst Başlık Barı (Grupo Tarzı) */}
        <div className="px-3 py-1.5 bg-slate-800/80 flex items-center justify-between text-xs border-b border-white/5">
          <div className="flex items-center gap-1.5 font-bold">
            {isMusic ? (
              <>
                <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white">
                  <Music className="w-3 h-3" />
                </div>
                <span className="text-red-400">YouTube Music</span>
              </>
            ) : (
              <>
                <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white">
                  <Youtube className="w-3 h-3" />
                </div>
                <span className="text-red-400">YouTube Video</span>
              </>
            )}
          </div>
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
          >
            <span>Aç</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Video / Medya Alanı */}
        {isPlaying ? (
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
              title="YouTube media player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        ) : (
          <div
            onClick={() => setIsPlaying(true)}
            className="relative aspect-video w-full bg-black/60 group cursor-pointer overflow-hidden flex items-center justify-center"
          >
            {/* Küçük Resim (Thumbnail) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              alt="Video Küçük Resmi"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-95"
            />
            {/* Oynat Butonu */}
            <div className="absolute w-12 h-12 rounded-full bg-red-600/90 group-hover:bg-red-600 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </div>
            {isMusic && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] text-white flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-red-400" />
                <span>Müzik Çal</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // B. Instagram (Reel veya Post)
  if (data.type === "instagram") {
    const postCode = data.id;

    return (
      <div className="my-2 rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 shadow-lg w-full max-w-sm">
        {/* Instagram Başlığı */}
        <div className="p-3 bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-amber-900/40 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Instagram className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-white tracking-wide">Instagram</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-pink-300 font-medium">
            Gönderi / Reel
          </span>
        </div>

        {/* İçerik Kartı */}
        <div className="p-4 flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-pink-500/20 to-purple-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Instagram className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Instagram Medya Önizlemesi</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {postCode ? `Kod: ${postCode}` : "Paylaşılan Gönderi"}
            </div>
          </div>
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:opacity-90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-opacity cursor-pointer"
          >
            <span>Instagram&apos;da Aç</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  // C. Facebook
  if (data.type === "facebook") {
    return (
      <div className="my-2 rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-lg w-full max-w-sm">
        {/* Facebook Başlığı */}
        <div className="p-3 bg-blue-950/40 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-xs">
              <Facebook className="w-3.5 h-3.5 fill-white" />
            </div>
            <span className="text-xs font-bold text-white tracking-wide">Facebook</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-blue-300 font-medium">
            Paylaşım / Video
          </span>
        </div>

        {/* Facebook Kartı */}
        <div className="p-4 flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Facebook className="w-6 h-6 fill-blue-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Facebook Medya Bağlantısı</div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[240px]">
              {data.url}
            </div>
          </div>
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <span>Facebook&apos;ta Görüntüle</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return null;
}
