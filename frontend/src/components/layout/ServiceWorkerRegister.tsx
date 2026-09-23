"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
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
