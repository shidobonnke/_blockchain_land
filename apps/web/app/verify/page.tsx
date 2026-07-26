"use client";

import { CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { apiRequest } from "../../lib/api";

type Verification = {
  verified: true;
  tokenId: string;
  ownerWallet: string;
  transactionHash: string;
  contractAddress: string;
  metadataHash: string;
  issuedAt: string;
  parcel: {
    parcelCode: string;
    state: string;
    lga: string;
    tenureType: string;
    status: string;
    geometryHash: string;
  };
};

export default function VerifyPage() {
  const [reference, setReference] = useState("");
  const [result, setResult] = useState<Verification | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function verify(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await apiRequest<Verification>(`/titles/verify/${encodeURIComponent(reference)}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Public blockchain verification</div>
          <h1>Verify a digital title</h1>
          <p className="lede">
            Confirm a parcel code, token ID or transaction hash without exposing private evidence.
          </p>
        </div>
      </div>
      <form className="card" onSubmit={verify}>
        <div className="field">
          <label htmlFor="reference">Title reference</label>
          <div className="inline">
            <Search size={19} />
            <input
              id="reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="AN-LA-001, token ID or 0x transaction hash"
              required
            />
            <button className="button" disabled={loading}>
              {loading ? "Verifying…" : "Verify"}
            </button>
          </div>
        </div>
      </form>
      {error && <div className="error">{error}</div>}
      {result && (
        <section className="card" style={{ marginTop: 18 }}>
          <div className="row-between">
            <div className="inline">
              <CheckCircle2 size={30} color="#287a57" />
              <div>
                <div className="eyebrow">Authentic registry record</div>
                <h2>{result.parcel.parcelCode}</h2>
              </div>
            </div>
            <span className="pill ok">Verified</span>
          </div>
          <div className="grid two">
            <div>
              <span className="label">Location</span>
              <p>
                <strong>
                  {result.parcel.lga}, {result.parcel.state}
                </strong>
              </p>
            </div>
            <div>
              <span className="label">Tenure and status</span>
              <p>
                <strong>
                  {result.parcel.tenureType} · {result.parcel.status}
                </strong>
              </p>
            </div>
            <div>
              <span className="label">Owner wallet</span>
              <p>
                <code>{result.ownerWallet}</code>
              </p>
            </div>
            <div>
              <span className="label">Issued</span>
              <p>
                <strong>{new Date(result.issuedAt).toLocaleString()}</strong>
              </p>
            </div>
          </div>
          <div className="notice">
            <ShieldCheck size={16} /> Transaction: <code>{result.transactionHash}</code>
          </div>
        </section>
      )}
    </>
  );
}
