"use client";

import { useEffect, useState } from "react";
import { MessageSquare, ShieldCheck, Database, HardDrive, PhoneCall, Radio } from "lucide-react";

interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    postgres: string;
    redis: string;
    minio: string;
    livekit: string;
  };
}

export default function Home() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        const res = await fetch(`${apiUrl}/api/v1/health`);
        const data = await res.json();
        setHealth(data);
      } catch (err) {
        console.error("Health check hatasi:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-screen bg-grupo-dark-bg text-slate-100 select-none overflow-hidden">
      {/* 1. Sol Dikey Navigasyon (64px) */}
      <aside className="w-[64px] bg-grupo-dark-card border-r border-grupo-dark-border flex flex-col items-center py-4 space-y-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-grupo-accent to-grupo-accent-secondary flex items-center justify-center font-bold text-white shadow-lg shadow-pink-500/20">
          F
        </div>
        <nav className="flex-1 flex flex-col space-y-4">
          <button className="w-10 h-10 rounded-xl bg-grupo-accent text-white flex items-center justify-center transition-all">
            <MessageSquare className="w-5 h-5" />
          </button>
        </nav>
      </aside>

      {/* 2. Sol Sohbet Listesi (340px) */}
      <aside className="w-[340px] bg-grupo-dark-card border-r border-grupo-dark-border flex flex-col">
        <div className="p-4 border-b border-grupo-dark-border flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">Fısıltı Sohbet</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            Faz 1 Hazır
          </span>
        </div>
        <div className="p-4 flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
          <MessageSquare className="w-10 h-10 opacity-30" />
          <p className="text-sm">Konuşmalar burada listelenecek.</p>
        </div>
      </aside>

      {/* 3. Merkez İçerik Alanı (Flex-1) */}
      <main className="flex-1 flex flex-col bg-grupo-dark-bg">
        <header className="h-16 border-b border-grupo-dark-border px-6 flex items-center justify-between bg-grupo-dark-card/50 backdrop-blur-sm">
          <div>
            <h2 className="text-base font-semibold text-white">Sistem & Altyapı Doğrulama Paneli</h2>
            <p className="text-xs text-slate-400">Docker mikro servis bağlantı durumları</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-slate-300 font-medium">Yerel Test Ortamı</span>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full bg-grupo-dark-card border border-grupo-dark-border rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShieldCheck className="text-grupo-accent" />
              Fısıltı Servis Durumları
            </h3>

            {loading ? (
              <p className="text-slate-400">Servis durumları kontrol ediliyor...</p>
            ) : health ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-indigo-400" />
                    <div>
                      <div className="text-sm font-semibold">PostgreSQL 16</div>
                      <div className="text-xs text-slate-400">users, messages, convs</div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium ${
                      health.services?.postgres === "connected"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {health.services?.postgres || "kontrol ediliyor"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Radio className="w-5 h-5 text-red-400" />
                    <div>
                      <div className="text-sm font-semibold">Redis 7</div>
                      <div className="text-xs text-slate-400">Presence & Typing TTL</div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium ${
                      health.services?.redis === "connected"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {health.services?.redis || "kontrol ediliyor"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="text-sm font-semibold">MinIO S3</div>
                      <div className="text-xs text-slate-400">Avatarlar & Sesli Notlar</div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium ${
                      health.services?.minio === "connected"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {health.services?.minio || "kontrol ediliyor"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PhoneCall className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="text-sm font-semibold">LiveKit SFU</div>
                      <div className="text-xs text-slate-400">WebRTC Sesli & Görüntülü</div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium ${
                      health.services?.livekit === "connected"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {health.services?.livekit || "kontrol ediliyor"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
                Backend API&apos;sine ulaşılamadı. Lütfen Docker servislerini başlatın.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
