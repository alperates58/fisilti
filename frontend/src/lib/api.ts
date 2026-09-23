import axios from "axios";

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8080";
    }
    const proto = window.location.protocol;
    const base = host.replace(/^chat\./, "");
    return `${proto}//api.${base}`;
  }
  return "http://localhost:8080";
};

const API_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
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
