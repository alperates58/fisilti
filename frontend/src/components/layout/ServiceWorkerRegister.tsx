"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const basePath = rawBasePath.startsWith("/")
        ? rawBasePath.replace(/\/+$/, "")
        : rawBasePath
        ? "/" + rawBasePath.replace(/\/+$/, "")
        : "";

      const swUrl = basePath ? `${basePath}/sw.js` : "/sw.js";
      const swScope = basePath ? `${basePath}/` : "/";

      navigator.serviceWorker
        .register(swUrl, { scope: swScope })
        .then((reg) => {
          console.log("[PWA] Service Worker kaydedildi:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker kaydedilemedi:", err);
        });
    }
  }, []);

  return null;
}
