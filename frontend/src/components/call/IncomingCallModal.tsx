"use client";

import { useCallStore } from "@/store/useCallStore";
import { Phone, PhoneOff, Video } from "lucide-react";

export default function IncomingCallModal() {
  const { callState, callType, caller, acceptCall, rejectCall } = useCallStore();

  if (callState !== "incoming" || !caller) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none">
      <div className="w-full max-w-sm bg-grupo-dark-card border border-grupo-dark-border rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
        {/* Dekoratif Arka Plan Parıltısı */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Arayan Avatarı ve Animasyonlu Halkalar */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-emerald-500/60 flex items-center justify-center font-bold text-3xl text-pink-400 overflow-hidden shadow-2xl relative z-10">
            {caller.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={caller.avatar_url}
                alt={caller.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              caller.display_name?.charAt(0).toUpperCase() || "U"
            )}
          </div>
          {/* Nabız halkaları */}
          <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
          <span className="absolute -inset-2 rounded-full border border-emerald-500/40 animate-pulse" />
        </div>

        {/* Arayan Bilgisi */}
        <h3 className="text-xl font-bold text-white mb-1">{caller.display_name}</h3>
        <p className="text-xs text-slate-400 mb-8 flex items-center gap-1.5 justify-center">
          {callType === "video" ? (
            <>
              <Video className="w-4 h-4 text-pink-400 animate-pulse" />
              <span>Gelen Görüntülü Arama...</span>
            </>
          ) : (
            <>
              <Phone className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Gelen Sesli Arama...</span>
            </>
          )}
        </p>

        {/* Aksiyon Butonları (Kabul Et & Reddet) */}
        <div className="flex items-center gap-8">
          {/* Reddet Butonu */}
          <button
            onClick={() => rejectCall("rejected")}
            title="Reddet"
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform group-hover:scale-110">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span className="text-xs text-slate-400 font-semibold group-hover:text-rose-400">
              Reddet
            </span>
          </button>

          {/* Kabul Et Butonu */}
          <button
            onClick={acceptCall}
            title="Kabul Et"
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 transition-transform group-hover:scale-110">
              <Phone className="w-6 h-6 animate-bounce" />
            </div>
            <span className="text-xs text-slate-400 font-semibold group-hover:text-emerald-400">
              Kabul Et
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
