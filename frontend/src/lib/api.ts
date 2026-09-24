import axios from "axios";

export const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocalhost = host === "localhost" || host === "127.0.0.1";

    if (process.env.NEXT_PUBLIC_API_URL) {
      let raw = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, "");
      if (!isLocalhost && (raw.includes("localhost") || raw.includes("127.0.0.1"))) {
        raw = raw.replace(/localhost|127\.0\.0\.1/, host);
      }
      if (raw.endsWith("/api/v1")) return raw;
      if (raw.endsWith("/api")) return `${raw}/v1`;
      return `${raw}/api/v1`;
    }

    if (isLocalhost) {
      return "http://localhost:8080/api/v1";
    }
    const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const basePath = rawBasePath.startsWith("/")
      ? rawBasePath.replace(/\/+$/, "")
      : rawBasePath
      ? "/" + rawBasePath.replace(/\/+$/, "")
      : "";
    if (basePath) {
      return `${window.location.origin}${basePath}/api/v1`;
    }
    const proto = window.location.protocol;
    const base = host.replace(/^chat\./, "");
    return `${proto}//api.${base}/api/v1`;
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    const raw = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, "");
    if (raw.endsWith("/api/v1")) return raw;
    if (raw.endsWith("/api")) return `${raw}/v1`;
    return `${raw}/api/v1`;
  }
  return "http://localhost:8080/api/v1";
};

export const resolveMediaUrl = (url?: string): string => {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  const apiBase = getApiBaseUrl();

  if (url.startsWith("/api/v1/")) {
    try {
      const parsedApi = new URL(
        apiBase,
        typeof window !== "undefined" ? window.location.origin : "http://localhost:8080"
      );
      return `${parsedApi.origin}${url}`;
    } catch {
      return url;
    }
  }

  const minioMatch = url.match(/^https?:\/\/(?:localhost|127\.0\.0\.1|minio):9000\/(.+)$/);
  if (minioMatch) {
    const objectPath = minioMatch[1];
    try {
      const parsedApi = new URL(
        apiBase,
        typeof window !== "undefined" ? window.location.origin : "http://localhost:8080"
      );
      return `${parsedApi.origin}/api/v1/media/file/${objectPath}`;
    } catch {
      return `/api/v1/media/file/${objectPath}`;
    }
  }

  return url;
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // HttpOnly cookie'leri otomatik taşır
  headers: {
    "Content-Type": "application/json",
  },
});

// Otomatik 401 kontrolü ve token yenileme
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      try {
        await api.post("/auth/refresh");
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
