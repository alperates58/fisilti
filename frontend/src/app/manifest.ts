import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const basePath = rawBasePath.startsWith("/")
    ? rawBasePath.replace(/\/+$/, "")
    : rawBasePath
    ? "/" + rawBasePath.replace(/\/+$/, "")
    : "";

  const startUrl = basePath ? `${basePath}/` : "/";
  const iconUrl = basePath ? `${basePath}/favicon.ico` : "/favicon.ico";

  return {
    name: "Fısıltı",
    short_name: "Fısıltı",
    description: "Fısıltı",
    start_url: startUrl,
    display: "standalone",
    background_color: "#0B0C0F",
    theme_color: "#0B0C0F",
    orientation: "portrait-primary",
    icons: [
      {
        src: iconUrl,
        sizes: "64x64 32x32 24x24 16x16",
        type: "image/x-icon",
      },
    ],
  };
}
