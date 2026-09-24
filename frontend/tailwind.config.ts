import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Grupo Chat Obsidian Dark Teması (CSS değişkenleri üzerinden dinamik tema desteği)
        grupo: {
          "dark-bg": "var(--background, #0B0C0F)",
          "dark-card": "var(--card, #16191E)",
          "dark-border": "var(--border, #1E293B)",
          "dark-hover": "#222731",
          
          // Grupo Chat Cream Paper Açık Mod Teması
          "light-bg": "#F6F3F0",
          "light-card": "#FFFFFF",
          "light-border": "#DBD2C9",
          
          // Ortak Vurgu (Accent) Renkleri
          accent: "var(--accent, #E91E63)",
          "accent-hover": "var(--accent-hover, #D81B60)",
          "accent-secondary": "#E86A6A",
          
          // Durum ve WhatsApp Tik Renkleri
          online: "#10B981",
          offline: "#64748B",
          "tick-grey": "#94A3B8",
          "tick-blue": "#38BDF8",
        },
      },
      width: {
        "64px": "64px",
        "340px": "340px",
      },
    },
  },
  plugins: [],
};

export default config;
