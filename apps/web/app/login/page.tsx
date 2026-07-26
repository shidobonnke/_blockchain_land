"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "../../components/auth-provider";
import { apiRequest, Session } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { saveSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await apiRequest<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      saveSession(session);
      router.replace("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-card">
      <div className="auth-brand">
        <div className="brand">
          ANA<span>GU</span>
        </div>
        <div className="eyebrow">Integrated land registry</div>
      </div>
      <div className="inline">
        <LockKeyhole size={28} color="#185c3f" />
        <div>
          <h2>Welcome back</h2>
          <p className="muted">Use your verified registry account.</p>
        </div>
      </div>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button className="button" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Signing in…" : "Sign in"} <ArrowRight size={17} />
        </button>
      </form>
      <p className="auth-footer">
        First time here? <Link href="/register">Create a citizen account</Link>
      </p>
    </section>
  );
}
