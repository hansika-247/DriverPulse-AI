import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiGetMe } from './api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'dp_token';

export const AuthProvider = ({ children }) => {
  const [driver,   setDriver]  = useState(null);
  const [loading,  setLoading] = useState(true); // true while hydrating from localStorage

  // ── Hydrate session on mount ──────────────────────────────
  useEffect(() => {
    const hydrate = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) { setLoading(false); return; }

      try {
        const { data } = await apiGetMe();
        setDriver(data.driver);
      } catch {
        // Token expired / invalid — clear storage
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, []);

  // ── Login — save token + driver state ────────────────────
  const login = useCallback((token, driverData) => {
    localStorage.setItem(TOKEN_KEY, token);
    setDriver(driverData);
  }, []);

  // ── Logout ───────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setDriver(null);
  }, []);

  const isAuthenticated = Boolean(driver);

  return (
    <AuthContext.Provider value={{ driver, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
