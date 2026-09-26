import type { Metadata, Viewport } from "next";
import "../styles/globals.css";
import ServiceWorkerRegister from "@/components/layout/ServiceWorkerRegister";
import SystemSettingsInitializer from "@/components/layout/SystemSettingsInitializer";

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const basePath = rawBasePath.startsWith("/")
  ? rawBasePath.replace(/\/+$/, "")
  : rawBasePath
  ? "/" + rawBasePath.replace(/\/+$/, "")
  : "";

const manifestPath = basePath ? `${basePath}/manifest.webmanifest` : "/manifest.webmanifest";

export const metadata: Metadata = {
  title: "Aura",
  description: "Aura",
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
  viewportFit: "cover",
  themeColor: "#0B0C0F",
  interactiveWidget: "resizes-content",
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
        <link
          rel="manifest"
          href={manifestPath}
          crossOrigin="use-credentials"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var cached = localStorage.getItem("aura_security_settings");
                  var inactive = localStorage.getItem("aura_inactive_since");
                  if (cached && inactive) {
                    var s = JSON.parse(cached);
                    var since = parseInt(inactive, 10);
                    var timeout = (Number(s.inactivity_timeout_minutes) || 15) * 60 * 1000;
                    if (s.inactivity_logout_enabled && since > 0 && (Date.now() - since) >= timeout) {
                      localStorage.removeItem("aura_inactive_since");
                      var url = (s.inactivity_redirect_url || "https://www.google.com").trim();
                      if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
                      try { navigator.sendBeacon("/api/v1/auth/logout"); } catch(e){}
                      window.location.replace(url);
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-grupo-dark-bg text-slate-100 antialiased h-full w-full overflow-hidden flex flex-col">
        <ServiceWorkerRegister />
        <SystemSettingsInitializer />
        {children}
      </body>
    </html>
  );
}
