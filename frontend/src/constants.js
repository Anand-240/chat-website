function getDefaultBackendOrigin() {
  if (typeof window === "undefined") return "http://localhost:5001";

  const { protocol, hostname } = window.location;
  if (!hostname) return "http://localhost:5001";

  const nextProtocol = protocol === "https:" ? "https:" : "http:";
  return `${nextProtocol}//${hostname}:5001`;
}

const DEFAULT_BACKEND_ORIGIN = getDefaultBackendOrigin();

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || `${DEFAULT_BACKEND_ORIGIN}/api`;

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || DEFAULT_BACKEND_ORIGIN;