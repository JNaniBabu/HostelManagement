export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function buildApiUrl(path) {
  if (!path) {
    return API_BASE_URL;
  }
  return String(path).startsWith("http") ? path : `${API_BASE_URL}${path}`;
}
