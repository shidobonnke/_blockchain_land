import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearSession, getSession, saveSession, Session } from "../api/client";

type SessionContextValue = {
  session: Session | null;
  ready: boolean;
  signIn(session: Session): Promise<void>;
  signOut(): Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSession()
      .then(setSession)
      .finally(() => setReady(true));
  }, []);

  const value = useMemo(
    () => ({
      session,
      ready,
      async signIn(next: Session) {
        await saveSession(next);
        setSession(next);
      },
      async signOut() {
        await clearSession();
        setSession(null);
      }
    }),
    [ready, session]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be inside SessionProvider");
  return context;
}
