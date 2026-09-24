"use client";

import { useEffect, useState, useRef } from "react";
import { useCallStore } from "@/store/useCallStore";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Phone,
  Clock,
  Sparkles,
} from "lucide-react";

export default function ActiveCallModal() {
  const { callState, callType, roomName, token, livekitUrl, caller, endCall } =
    useCallStore();

  const [callDuration, setCallDuration] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(callType === "audio");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => {
          const next = prev + 1;
          useCallStore.setState({ duration: next });
          return next;
        });
      }, 1000);
    } else {
      setCallDuration(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  if (callState !== "outgoing" && callState !== "connected") {
    return null;
  }

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Aranıyor Ekranı (Outgoing Call)
  if (callState === "outgoing") {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none">
        <div className="w-full max-w-sm bg-grupo-dark-card border border-grupo-dark-border rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl relative">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-pink-500/60 flex items-center justify-center font-bold text-3xl text-pink-400 overflow-hidden shadow-2xl relative z-10">
              <Phone className="w-10 h-10 animate-pulse text-pink-400" />
            </div>
            <span className="absolute inset-0 rounded-full bg-pink-500/30 animate-ping" />
          </div>

          <h3 className="text-xl font-bold text-white mb-1">Arama Yapılıyor...</h3>
          <p className="text-xs text-slate-400 mb-8">
            {callType === "video" ? "Görüntülü Görüşme" : "Sesli Görüşme"}
          </p>

          <button
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform hover:scale-110 cursor-pointer"
            title="Aramayı İptal Et"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  // Bağlandı Ekranı (Connected Call)
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-in fade-in">
      {/* Üst Bar: Süre ve Durum */}
      <div className="w-full max-w-2xl flex items-center justify-between px-4 py-2 rounded-2xl bg-grupo-dark-card/60 border border-grupo-dark-border backdrop-blur-md z-20">
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Canlı Görüşme</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono font-medium">
          <Clock className="w-3.5 h-3.5 text-pink-400" />
          <span>{formatDuration(callDuration)}</span>
        </div>
      </div>

      {/* Merkez Video / Ses Alanı */}
      <div className="flex-1 w-full max-w-3xl flex items-center justify-center my-4 relative">
        {token && livekitUrl ? (
          <LiveKitRoom
            serverUrl={livekitUrl}
            token={token}
            connect={true}
            video={callType === "video" && !isVideoMuted}
            audio={!isMicMuted}
            className="w-full h-full flex items-center justify-center"
          >
            <RoomAudioRenderer />
            <CallParticipantView callType={callType} caller={caller} />
          </LiveKitRoom>
        ) : (
          <div className="flex flex-col items-center text-center text-slate-400 gap-3">
            <Sparkles className="w-8 h-8 text-pink-500 animate-spin" />
            <p className="text-sm">Görüşme odasına bağlanılıyor...</p>
          </div>
        )}
      </div>

      {/* Alt Kontrol Barı */}
      <div className="w-full max-w-md flex items-center justify-center gap-4 p-4 rounded-3xl bg-grupo-dark-card/80 border border-grupo-dark-border backdrop-blur-md z-20">
        {/* Mikrofon Kapat / Aç */}
        <button
          onClick={() => setIsMicMuted(!isMicMuted)}
          title={isMicMuted ? "Mikrofonu Aç" : "Mikrofonu Kapat"}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
            isMicMuted
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
              : "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700"
          }`}
        >
          {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Kamera Kapat / Aç (Sadece Video Görüşmelerinde) */}
        {callType === "video" && (
          <button
            onClick={() => setIsVideoMuted(!isVideoMuted)}
            title={isVideoMuted ? "Kamerayı Aç" : "Kamerayı Kapat"}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isVideoMuted
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                : "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700"
            }`}
          >
            {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </button>
        )}

        {/* Aramayı Bitir Butonu */}
        <button
          onClick={endCall}
          title="Görüşmeyi Sonlandır"
          className="w-14 h-12 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all hover:scale-105 cursor-pointer ml-2"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function CallParticipantView({
  callType,
  caller,
}: {
  callType: string;
  caller: any;
}) {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  if (callType === "video" && tracks.length > 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full max-h-[70vh]">
        {tracks.map((track) => (
          <div
            key={track.participant.identity}
            className="relative rounded-2xl overflow-hidden bg-slate-900 border border-grupo-dark-border flex items-center justify-center"
          >
            {track.publication?.track ? (
              <VideoTrack trackRef={track} className="w-full h-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center font-bold text-2xl text-pink-400">
                {track.participant.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs text-white font-medium">
              {track.participant.name || track.participant.identity}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Sesli Arama Arayüzü
  return (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div className="w-32 h-32 rounded-full bg-slate-800 border-4 border-pink-500/50 flex items-center justify-center font-bold text-4xl text-pink-400 overflow-hidden mb-4 shadow-2xl">
        {caller?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={caller.avatar_url}
            alt={caller.display_name}
            className="w-full h-full object-cover"
          />
        ) : (
          caller?.display_name?.charAt(0).toUpperCase() || "U"
        )}
      </div>
      <h3 className="text-xl font-bold text-white mb-1">
        {caller?.display_name || "Görüşme Odası"}
      </h3>
      <p className="text-xs text-emerald-400 font-medium animate-pulse">
        Ses aktarımı aktif
      </p>
    </div>
  );
}
