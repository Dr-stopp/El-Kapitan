import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
const LS_KEY = "elk_auth_v2";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const login = ({ role, username }) => {
    const next = { role, username: username?.trim() || role.toUpperCase() };
    setUser(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(LS_KEY);
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
