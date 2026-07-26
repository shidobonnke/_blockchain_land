"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "../../components/auth-provider";
import { apiRequest, Session } from "../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { saveSession } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await apiRequest<Session>("/auth/register", {
        method: "POST",
        body: JSON.stringify(form)
      });
      saveSession(session);
      router.replace("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Registration failed");
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
        <div className="eyebrow">Citizen onboarding</div>
      </div>
      <div className="inline">
        <UserPlus size={28} color="#185c3f" />
        <div>
          <h2>Create your account</h2>
          <p className="muted">Start and track land claims securely.</p>
        </div>
      </div>
      <form onSubmit={submit}>
        {[
          ["fullName", "Full legal name", "text"],
          ["email", "Email address", "email"],
          ["phone", "Phone number", "tel"],
          ["password", "Password", "password"]
        ].map(([key, label, type]) => (
          <div className="field" key={key}>
            <label htmlFor={key}>{label}</label>
            <input
              id={key}
              type={type}
              value={form[key as keyof typeof form]}
              minLength={key === "password" ? 8 : undefined}
              onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              required={key !== "phone"}
            />
          </div>
        ))}
        {error && <div className="error">{error}</div>}
        <button className="button" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="auth-footer">
        Already registered? <Link href="/login">Sign in</Link>
      </p>
    </section>
  );
}
