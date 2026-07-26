"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/auth-provider";
import { RequireAuth } from "../../../components/require-auth";
import { apiRequest } from "../../../lib/api";

const sampleCoordinates = JSON.stringify(
  [
    [3.35, 6.6],
    [3.351, 6.6],
    [3.351, 6.601],
    [3.35, 6.601],
    [3.35, 6.6]
  ],
  null,
  2
);

export default function NewParcelPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [form, setForm] = useState({
    parcelCode: "",
    state: "",
    lga: "",
    address: "",
    tenureType: "STATUTORY",
    coordinates: sampleCoordinates
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const coordinates = JSON.parse(form.coordinates);
      await apiRequest(
        "/parcels",
        {
          method: "POST",
          body: JSON.stringify({
            ...form,
            coordinates: undefined,
            geometry: { type: "Polygon", coordinates: [coordinates] }
          })
        },
        session.accessToken
      );
      router.push("/parcels");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Parcel registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
      <div className="page-head">
        <div>
          <div className="eyebrow">Surveyor workspace</div>
          <h1>Register a cadastral parcel</h1>
          <p className="lede">
            Submit a closed WGS 84 polygon for immediate validity and overlap checks.
          </p>
        </div>
      </div>
      <form className="card" onSubmit={submit}>
        <div className="form-grid">
          {[
            ["parcelCode", "Parcel code"],
            ["state", "State"],
            ["lga", "Local government area"],
            ["address", "Parcel address"]
          ].map(([key, label]) => (
            <div className="field" key={key}>
              <label htmlFor={key}>{label}</label>
              <input
                id={key}
                value={form[key as keyof typeof form]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                required
              />
            </div>
          ))}
          <div className="field">
            <label htmlFor="tenure">Tenure type</label>
            <select
              id="tenure"
              value={form.tenureType}
              onChange={(event) => setForm({ ...form, tenureType: event.target.value })}
            >
              <option>STATUTORY</option>
              <option>CUSTOMARY</option>
            </select>
          </div>
          <div className="field full">
            <label htmlFor="coordinates">Polygon coordinate ring</label>
            <textarea
              id="coordinates"
              value={form.coordinates}
              onChange={(event) => setForm({ ...form, coordinates: event.target.value })}
              required
            />
            <span className="help">
              Longitude comes first. The final coordinate must equal the first coordinate.
            </span>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="actions">
          <button className="button" disabled={loading}>
            {loading ? "Checking geometry…" : "Validate and register"}
          </button>
          <button className="button ghost" type="button" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </RequireAuth>
  );
}
