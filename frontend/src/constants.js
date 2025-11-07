export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const API_ROUTES = {
  AUTH: `${API_BASE_URL}/api/auth`,
  CHAT: `${API_BASE_URL}/api/chat`,
  UPLOAD: `${API_BASE_URL}/api/upload`,
};

export const getImageUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};
