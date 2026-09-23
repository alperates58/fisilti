import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Fısıltı - Özel Sohbet Platformu",
  description: "Gerçek zamanlı, WhatsApp tipi durum takipli, self-hosted WebRTC özel sohbet platformu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-grupo-dark-bg text-slate-100 antialiased h-screen w-screen overflow-hidden flex flex-col">
        {children}
      </body>
    </html>
  );
}
