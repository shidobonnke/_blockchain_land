"use client";

import { CheckCircle2, FileUp, ShieldAlert } from "lucide-react";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { RequireAuth } from "../../../components/require-auth";
import { apiRequest } from "../../../lib/api";

type Application = {
  id: string;
  status: string;
  claimDescription: string;
  submittedAt?: string;
  updatedAt: string;
  parcel: { parcelCode: string; status: string };
  applicant: { fullName: string; email: string };
};

const nextByStatus: Record<string, string[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["SPATIAL_REVIEW", "REJECTED"],
  SPATIAL_REVIEW: ["COMMUNITY_REVIEW", "LEGAL_REVIEW", "REJECTED"],
  COMMUNITY_REVIEW: ["LEGAL_REVIEW", "REJECTED"],
  LEGAL_REVIEW: ["REGISTRAR_REVIEW", "REJECTED"],
  REGISTRAR_REVIEW: ["BLOCKCHAIN_PENDING", "REJECTED"],
  BLOCKCHAIN_PENDING: ["MINTED"]
};

async function sha256(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("CLAIM_EVIDENCE");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!session) return;
    const rows = await apiRequest<Application[]>("/applications", {}, session.accessToken);
    setApplication(rows.find((row) => row.id === id) ?? null);
  };

  useEffect(() => {
    refresh().catch((reason) => setError(reason.message));
  }, [id, session]);

  const options = useMemo(
    () => (application ? nextByStatus[application.status] ?? [] : []),
    [application]
  );

  useEffect(() => setTarget(options[0] ?? ""), [options]);

  async function transition(event: FormEvent) {
    event.preventDefault();
    if (!session || !target) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await apiRequest(
        `/applications/${id}/transition`,
        {
          method: "POST",
          body: JSON.stringify({ to: target, reason, actorId: session.user.id })
        },
        session.accessToken
      );
      setMessage(`Application moved to ${target}.`);
      setReason("");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Transition failed");
    } finally {
      setLoading(false);
    }
  }

  async function uploadEvidence(event: FormEvent) {
    event.preventDefault();
    if (!session || !file) return;
    setLoading(true);
    setError("");
    try {
      const signed = await apiRequest<{ storageKey: string; uploadUrl: string }>(
        `/documents/applications/${id}/upload-url`,
        { method: "POST", body: JSON.stringify({ filename: file.name, mimeType: file.type }) },
        session.accessToken
      );
      const upload = await fetch(signed.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "content-type": file.type }
      });
      if (!upload.ok) throw new Error("Evidence storage upload failed");
      await apiRequest(
        `/documents/applications/${id}/confirm`,
        {
          method: "POST",
          body: JSON.stringify({
            storageKey: signed.storageKey,
            category,
            contentHash: await sha256(file),
            mimeType: file.type
          })
        },
        session.accessToken
      );
      setFile(null);
      setMessage("Evidence uploaded and its integrity hash recorded.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Evidence upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
      <div className="page-head">
        <div>
          <div className="eyebrow">Application review</div>
          <h1>{application?.parcel.parcelCode ?? "Loading application…"}</h1>
          <p className="lede">
            {application
              ? `${application.applicant.fullName} · ${application.applicant.email}`
              : "Retrieving the authoritative workflow record."}
          </p>
        </div>
        {application && <span className="pill warn">{application.status}</span>}
      </div>
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}
      {application && (
        <div className="panel-grid">
          <div className="card">
            <div className="eyebrow">Claim summary</div>
            <h2>Ownership basis</h2>
            <p className="lede">{application.claimDescription}</p>
            <div className="grid two">
              <div>
                <span className="label">Parcel state</span>
                <div>
                  <span className="pill">{application.parcel.status}</span>
                </div>
              </div>
              <div>
                <span className="label">Last updated</span>
                <strong>{new Date(application.updatedAt).toLocaleString()}</strong>
              </div>
            </div>
            <div className="map-placeholder">
              <span className="map-label">{application.parcel.parcelCode} spatial record</span>
            </div>
          </div>
          <div>
            <form className="card" onSubmit={uploadEvidence}>
              <div className="inline">
                <FileUp size={22} color="#185c3f" />
                <h2>Evidence</h2>
              </div>
              <div className="field">
                <label htmlFor="category">Evidence category</label>
                <select
                  id="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {["IDENTITY", "SURVEY_PLAN", "CLAIM_EVIDENCE", "WITNESS", "LEGAL"].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    )
                  )}
                </select>
              </div>
              <div className="field">
                <label htmlFor="evidence">Select file</label>
                <input
                  id="evidence"
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </div>
              <button className="button secondary" disabled={!file || loading}>
                Upload and hash evidence
              </button>
            </form>
            <form className="card" onSubmit={transition} style={{ marginTop: 18 }}>
              <div className="inline">
                {options.length ? (
                  <CheckCircle2 size={22} color="#185c3f" />
                ) : (
                  <ShieldAlert size={22} color="#65736b" />
                )}
                <h2>Workflow decision</h2>
              </div>
              {options.length ? (
                <>
                  <div className="field">
                    <label htmlFor="target">Next state</label>
                    <select
                      id="target"
                      value={target}
                      onChange={(event) => setTarget(event.target.value)}
                    >
                      {options.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="reason">Decision reason</label>
                    <textarea
                      id="reason"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      minLength={3}
                      required
                    />
                  </div>
                  <button className="button" disabled={loading}>
                    Confirm decision
                  </button>
                </>
              ) : (
                <p className="muted">This application has reached a terminal workflow state.</p>
              )}
            </form>
          </div>
        </div>
      )}
    </RequireAuth>
  );
}
