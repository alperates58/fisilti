import type { Metadata, Viewport } from "next";
import "../styles/globals.css";
import ServiceWorkerRegister from "@/components/layout/ServiceWorkerRegister";

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const basePath = rawBasePath.startsWith("/")
  ? rawBasePath.replace(/\/+$/, "")
  : rawBasePath
  ? "/" + rawBasePath.replace(/\/+$/, "")
  : "";

export const metadata: Metadata = {
  title: "Aura",
  description: "Aura",
  manifest: basePath ? `${basePath}/manifest.webmanifest` : "/manifest.webmanifest",
  icons: {
    icon: basePath ? `${basePath}/favicon.ico` : "/favicon.ico",
    apple: basePath ? `${basePath}/favicon.ico` : "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0B0C0F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-grupo-dark-bg text-slate-100 antialiased h-full h-[100dvh] w-full overflow-hidden flex flex-col">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
