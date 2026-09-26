"use client";

import React from "react";
import { MapPin, Navigation, ExternalLink, StopCircle, Radio } from "lucide-react";

interface LocationMessageCardProps {
  latitude: number;
  longitude: number;
  isLive?: boolean;
  liveUntil?: string;
  durationMinutes?: number;
  isMine: boolean;
  onStopLive?: () => void;
}

export default function LocationMessageCard({
  latitude,
  longitude,
  isLive = false,
  liveUntil,
  durationMinutes,
  isMine,
  onStopLive,
}: LocationMessageCardProps) {
  const isCurrentlyLive =
    isLive && (!liveUntil || new Date(liveUntil).getTime() > Date.now());

  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <div className="my-1.5 w-64 sm:w-72 rounded-2xl overflow-hidden bg-slate-900/90 border border-slate-700/80 shadow-xl text-left select-none">
      {/* Harita / Konum Görsel Başlığı */}
      <div className="relative h-28 bg-gradient-to-br from-slate-800 via-indigo-950/60 to-slate-900 p-3 flex flex-col justify-between overflow-hidden">
        {/* Dekoratif Izgara Deseni */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:12px_12px]" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-[10px] text-white font-medium border border-white/10">
            {isCurrentlyLive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-400 font-semibold">Canlı Konum</span>
              </>
            ) : (
              <>
                <MapPin className="w-3 h-3 text-pink-400" />
                <span>Paylaşılan Konum</span>
              </>
            )}
          </div>

          {isCurrentlyLive && durationMinutes && (
            <span className="text-[10px] text-slate-300 font-mono bg-black/40 px-1.5 py-0.5 rounded">
              {durationMinutes} dk.
            </span>
          )}
        </div>

        {/* Merkez Pin İkonu */}
        <div className="self-center flex flex-col items-center justify-center relative z-10">
          <div className="w-10 h-10 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Navigation className="w-5 h-5 text-pink-400" />
          </div>
        </div>

        {/* Koordinat Metni */}
        <div className="text-[10px] text-slate-400 font-mono truncate relative z-10">
          {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
        </div>
      </div>

      {/* Alt Aksiyon Butonları */}
      <div className="p-2.5 flex items-center gap-2 bg-[#12151D] border-t border-slate-800">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Haritada Aç</span>
        </a>

        {isCurrentlyLive && isMine && onStopLive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStopLive();
            }}
            className="py-1.5 px-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
            title="Canlı Paylaşımı Durdur"
          >
            <StopCircle className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Durdur</span>
          </button>
        )}
      </div>
    </div>
  );
}
