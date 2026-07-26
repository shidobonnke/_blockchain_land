"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Session } from "../lib/api";

type AuthContextValue = {
  session: Session | null;
  ready: boolean;
  saveSession(session: Session): void;
  logout(): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "anagu.session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ready,
      saveSession(next) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSession(next);
      },
      logout() {
        window.localStorage.removeItem(STORAGE_KEY);
        setSession(null);
      }
    }),
    [ready, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
