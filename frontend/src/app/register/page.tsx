"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { UserPlus, Lock, Mail, User as UserIcon, AlertCircle, Smile } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);

  const [form, setForm] = useState({
    username: "",
    display_name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.username || !form.email || !form.password) {
      setError("Lütfen zorunlu alanları doldurun.");
      return;
    }

    if (form.password.length < 6) {
      setError("Şifreniz en az 6 karakter olmalıdır.");
      return;
    }

    try {
      setLoading(true);
      await register(
        form.username,
        form.display_name || form.username,
        form.email,
        form.password
      );
      router.push("/");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Kayıt olunurken bir hata oluştu.";
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
            F
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Hesap Oluştur</h1>
          <p className="text-sm text-slate-400 mt-1">Hızlıca Fısıltı ailesine katılın</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Kullanıcı Adı <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                placeholder="ornek_kullanici"
                className="w-full bg-slate-900/80 border border-grupo-dark-border rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-grupo-accent transition-colors"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Küçük harf, rakam ve alt çizgi.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Görünen Ad (Ad Soyad)
            </label>
            <div className="relative">
              <Smile className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="Alperen Yılmaz"
                className="w-full bg-slate-900/80 border border-grupo-dark-border rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-grupo-accent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              E-posta Adresi <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ornek@alanadi.com"
                className="w-full bg-slate-900/80 border border-grupo-dark-border rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-grupo-accent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Şifre <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="En az 6 karakter"
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
              <span>Hesap oluşturuluyor...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Kayıt Ol</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          Zaten hesabınız var mı?{" "}
          <Link href="/login" className="text-grupo-accent hover:underline font-semibold ml-1">
            Giriş Yapın
          </Link>
        </div>
      </div>
    </div>
  );
}
