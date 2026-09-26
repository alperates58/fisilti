"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Play,
  Pause,
  Headphones,
  Music,
  Volume2,
  VolumeX,
  Radio,
  ExternalLink,
} from "lucide-react";
import { useSocketStore } from "@/store/useSocketStore";

interface ListenTogetherModalProps {
  isOpen: boolean;
  conversationId: string | null;
  onClose: () => void;
}

export default function ListenTogetherModal({
  isOpen,
  conversationId,
  onClose,
}: ListenTogetherModalProps) {
  const [audioUrl, setAudioUrl] = useState("");
  const [activeMediaUrl, setActiveMediaUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSyncingFromRemote = useRef(false);

  const { socket, sendAction } = useSocketStore();

  // Karşı taraftan gelen senkronizasyon event'lerini dinle
  useEffect(() => {
    if (!socket || !isOpen || !conversationId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.action === "listen_together_sync" &&
          data.payload?.conversation_id === conversationId
        ) {
          const { url, is_playing, current_time } = data.payload;
          isSyncingFromRemote.current = true;

          if (url && url !== activeMediaUrl) {
            setActiveMediaUrl(url);
          }

          const audio = audioRef.current;
          if (audio) {
            // Drift düzeltme (1.5 saniyeden fazla kayma varsa seek et)
            if (Math.abs(audio.currentTime - current_time) > 1.5) {
              audio.currentTime = current_time;
            }

            if (is_playing && audio.paused) {
              audio.play().catch(() => {});
              setIsPlaying(true);
            } else if (!is_playing && !audio.paused) {
              audio.pause();
              setIsPlaying(false);
            }
          }

          setTimeout(() => {
            isSyncingFromRemote.current = false;
          }, 300);
        }
      } catch {}
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, isOpen, conversationId, activeMediaUrl]);

  if (!isOpen) return null;

  const broadcastSync = (playing: boolean, time: number, url?: string) => {
    if (!conversationId || isSyncingFromRemote.current) return;
    sendAction("listen_together_sync", {
      conversation_id: conversationId,
      url: url || activeMediaUrl,
      is_playing: playing,
      current_time: time,
    });
  };

  const handleStartStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioUrl.trim()) return;
    setActiveMediaUrl(audioUrl.trim());
    setIsPlaying(true);
    broadcastSync(true, 0, audioUrl.trim());
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(() => {});
      setIsPlaying(true);
      broadcastSync(true, audio.currentTime);
    } else {
      audio.pause();
      setIsPlaying(false);
      broadcastSync(false, audio.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = parseFloat(e.target.value);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = nextTime;
      setCurrentTime(nextTime);
      broadcastSync(isPlaying, nextTime);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-5 flex flex-col gap-4 text-white">
        {/* Üst Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-pink-400" />
            <div>
              <h3 className="text-sm font-bold">Birlikte Dinle (1-e-1)</h3>
              <p className="text-[11px] text-slate-400">Canlı eşzamanlı müzik & ses akışı</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Medya URL Girişi */}
        {!activeMediaUrl ? (
          <form onSubmit={handleStartStream} className="flex flex-col gap-3">
            <p className="text-xs text-slate-300">
              Birlikte dinlemek için doğrudan bir ses (MP3/WAV/AAC) veya radyo akışı linki girin:
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://example.com/song.mp3"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!audioUrl.trim()}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Başlat
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Oynatıcı Kartı */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center shrink-0">
                  <Music className="w-6 h-6 text-pink-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate">Canlı Ses Akışı</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono truncate block mt-0.5">
                    {activeMediaUrl}
                  </span>
                </div>
              </div>

              {/* Gizli Audio Elemanı */}
              <audio
                ref={audioRef}
                src={activeMediaUrl}
                autoPlay
                onTimeUpdate={() => {
                  if (audioRef.current) {
                    setCurrentTime(audioRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (audioRef.current) {
                    setDuration(audioRef.current.duration || 0);
                  }
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  broadcastSync(false, 0);
                }}
              />

              {/* İlerleme Çubuğu */}
              <div className="flex flex-col gap-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.5}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full accent-pink-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{duration ? formatTime(duration) : "--:--"}</span>
                </div>
              </div>

              {/* Kontrol Butonları */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => {
                    const audio = audioRef.current;
                    if (audio) {
                      audio.muted = !isMuted;
                      setIsMuted(!isMuted);
                    }
                  }}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <button
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center transition shadow-lg shadow-pink-600/30 hover:scale-105 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.pause();
                    }
                    setActiveMediaUrl(null);
                    setAudioUrl("");
                    setIsPlaying(false);
                    broadcastSync(false, 0, "");
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer"
                >
                  Değiştir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
