import React, { createContext, useContext, useState } from "react";

// ❌ removed duplicate imports
// ❌ removed wrong external AuthContext import

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Safe initialization (no JSON.parse crash)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch (err) {
      console.error("User parse error:", err);
      localStorage.removeItem("user");
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("token") || null;
  });

  // ✅ LOGIN
  const login = (tokenVal, userData) => {
    try {
      if (tokenVal) localStorage.setItem("token", tokenVal);
      if (userData) localStorage.setItem("user", JSON.stringify(userData));

      setToken(tokenVal || null);
      setUser(userData || null);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  // ✅ LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const isLoggedIn = !!token;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
}

// ✅ SAFE HOOK
export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
};