import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const kUser = "auth_user";
const kToken = "auth_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(kUser);
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(kToken) || "");

  function setUserAndToken(u, t) {
    setUser(u || null);
    setToken(t || "");
    if (u) localStorage.setItem(kUser, JSON.stringify(u)); else localStorage.removeItem(kUser);
    if (t) localStorage.setItem(kToken, t); else localStorage.removeItem(kToken);
  }

  function logout() {
    setUserAndToken(null, "");
    window.location.href = "/";
  }

  const value = useMemo(() => ({
    user, token, setUserAndToken, logout
  }), [user, token]);

  useEffect(() => {}, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}