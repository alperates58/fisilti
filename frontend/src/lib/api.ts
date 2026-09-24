import axios from "axios";

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    const raw = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, "");
    if (raw.endsWith("/api/v1")) return raw;
    if (raw.endsWith("/api")) return `${raw}/v1`;
    return `${raw}/api/v1`;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
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
  return "http://localhost:8080/api/v1";
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
