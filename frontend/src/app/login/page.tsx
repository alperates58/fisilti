"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { LogIn, Lock, User as UserIcon, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.login || !form.password) {
      setError("Lütfen kullanıcı adı ve şifrenizi girin.");
      return;
    }

    try {
      setLoading(true);
      await login(form.login, form.password);
      router.push("/");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Giriş yapılırken bir hata oluştu.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] w-screen items-center justify-center bg-grupo-dark-bg p-4 sm:p-6 py-8 select-none overflow-y-auto">
      <div className="w-full max-w-md bg-grupo-dark-card border border-grupo-dark-border rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-grupo-accent to-grupo-accent-secondary flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-pink-500/25">
            A
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Aura&apos;ya Giriş Yap</h1>
          <p className="text-sm text-slate-400 mt-1">Giriş yaparak devam edin</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-sm animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Kullanıcı Adı veya E-posta
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                placeholder="kullanici_adi veya e-posta"
                className="w-full bg-slate-900/80 border border-grupo-dark-border rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-grupo-accent transition-colors"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Şifre
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-slate-900/80 border border-grupo-dark-border rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-grupo-accent transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-xl bg-grupo-accent hover:bg-grupo-accent-hover text-white font-semibold text-sm shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Giriş yapılıyor...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Giriş Yap</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          Hesabınız yok mu?{" "}
          <Link href="/register" className="text-grupo-accent hover:underline font-semibold ml-1">
            Kayıt Olun
          </Link>
        </div>
      </div>
    </div>
  );
}
