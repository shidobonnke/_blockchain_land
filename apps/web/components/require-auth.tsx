"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  if (!ready) return <div className="card">Loading secure session…</div>;
  if (!session) {
    return (
      <div className="empty-state card">
        <div>
          <h2>Sign in required</h2>
          <p className="lede">This registry operation requires an authenticated account.</p>
          <Link className="button" href="/login">
            Sign in
          </Link>
        </div>
      </div>
    );
  }
  return children;
}
