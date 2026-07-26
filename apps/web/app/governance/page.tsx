"use client";

import { Gavel, KeyRound, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAuth } from "../../components/auth-provider";
import { RequireAuth } from "../../components/require-auth";
import { apiRequest } from "../../lib/api";

const governanceModes: [string, LucideIcon, string][] = [
  ["TRANSFER", KeyRound, "Legal and registrar approval"],
  ["DISPUTE", ShieldAlert, "Immediate on-chain title lock"],
  ["REVOCATION", Gavel, ">75% vote plus judiciary"]
];

export default function GovernancePage() {
  const { session } = useAuth();
  const [mode, setMode] = useState<"TRANSFER" | "DISPUTE" | "REVOCATION">("TRANSFER");
  const [form, setForm] = useState({
    parcelId: "",
    newOwnerId: "",
    newOwnerWallet: "",
    summary: "",
    publicInterestReason: "",
    validatorCount: "4"
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const operations = {
        TRANSFER: {
          path: "/governance/transfers",
          body: {
            parcelId: form.parcelId,
            newOwnerId: form.newOwnerId,
            newOwnerWallet: form.newOwnerWallet
          }
        },
        DISPUTE: {
          path: "/governance/disputes",
          body: { parcelId: form.parcelId, summary: form.summary }
        },
        REVOCATION: {
          path: "/governance/revocations",
          body: {
            parcelId: form.parcelId,
            publicInterestReason: form.publicInterestReason,
            validatorCount: Number(form.validatorCount)
          }
        }
      };
      const operation = operations[mode];
      await apiRequest(
        operation.path,
        { method: "POST", body: JSON.stringify(operation.body) },
        session.accessToken
      );
      setMessage(`${mode.toLowerCase()} request recorded successfully.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Governance request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
      <div className="page-head">
        <div>
          <div className="eyebrow">Checks and balances</div>
          <h1>Governance operations</h1>
          <p className="lede">
            Initiate controlled transfers, lock disputed titles, or begin a legally supervised
            revocation.
          </p>
        </div>
      </div>
      <div className="grid three">
        {governanceModes.map(([value, Icon, copy]) => (
          <button
            className={`card ${mode === value ? "selected-card" : ""}`}
            key={String(value)}
            onClick={() => setMode(value as typeof mode)}
            style={{ textAlign: "left", cursor: "pointer" }}
          >
            <Icon size={25} color="#185c3f" />
            <h3 style={{ marginTop: 14 }}>{String(value)}</h3>
            <span className="label">{String(copy)}</span>
          </button>
        ))}
      </div>
      <div className="panel-grid">
        <form className="card" onSubmit={submit}>
          <div className="eyebrow">{mode} request</div>
          <h2>Required information</h2>
          <div className="field">
            <label htmlFor="parcelId">Parcel UUID</label>
            <input
              id="parcelId"
              value={form.parcelId}
              onChange={(event) => setForm({ ...form, parcelId: event.target.value })}
              required
            />
          </div>
          {mode === "TRANSFER" && (
            <>
              <div className="field">
                <label htmlFor="newOwnerId">New owner user UUID</label>
                <input
                  id="newOwnerId"
                  value={form.newOwnerId}
                  onChange={(event) => setForm({ ...form, newOwnerId: event.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="wallet">New owner wallet</label>
                <input
                  id="wallet"
                  value={form.newOwnerWallet}
                  onChange={(event) => setForm({ ...form, newOwnerWallet: event.target.value })}
                  placeholder="0x…"
                  required
                />
              </div>
            </>
          )}
          {mode === "DISPUTE" && (
            <div className="field">
              <label htmlFor="summary">Grounds for dispute</label>
              <textarea
                id="summary"
                value={form.summary}
                onChange={(event) => setForm({ ...form, summary: event.target.value })}
                minLength={10}
                required
              />
            </div>
          )}
          {mode === "REVOCATION" && (
            <>
              <div className="field">
                <label htmlFor="reason">Section 28 public-interest reason</label>
                <textarea
                  id="reason"
                  value={form.publicInterestReason}
                  onChange={(event) =>
                    setForm({ ...form, publicInterestReason: event.target.value })
                  }
                  minLength={20}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="validators">Accredited validator count</label>
                <input
                  id="validators"
                  type="number"
                  min={4}
                  value={form.validatorCount}
                  onChange={(event) => setForm({ ...form, validatorCount: event.target.value })}
                  required
                />
              </div>
            </>
          )}
          {message && <div className="success">{message}</div>}
          {error && <div className="error">{error}</div>}
          <button className="button" disabled={loading}>
            {loading ? "Submitting…" : `Submit ${mode.toLowerCase()} request`}
          </button>
        </form>
        <div className="card">
          <div className="eyebrow">Revocation safeguards</div>
          <div className="steps">
            {[
              "Public-interest reason hashed",
              "Unique validator signatures",
              "Strict threshold above 75%",
              "Separate judiciary approval",
              "Registrar execution"
            ].map((item, index) => (
              <div className="step" key={item}>
                <div className="dot">{index + 1}</div>
                <strong>{item}</strong>
                <span className="pill">Required</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
