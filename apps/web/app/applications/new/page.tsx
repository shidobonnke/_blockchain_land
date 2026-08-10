"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "../../../components/require-auth";
import { useAuth } from "../../../components/auth-provider";
import { apiRequest } from "../../../lib/api";

type Parcel = { id: string; parcelCode: string; address: string; lga: string; state: string };

export default function NewApplicationPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [parcelId, setParcelId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    apiRequest<Parcel[]>("/parcels", {}, session.accessToken)
      .then((items) => {
        setParcels(items);
        setParcelId(items[0]?.id ?? "");
      })
      .catch((reason) => setError(reason.message));
  }, [session]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      await apiRequest(
        "/applications",
        {
          method: "POST",
          body: JSON.stringify({
            parcelId,
            claimDescription: description
          })
        },
        session.accessToken
      );
      router.push("/applications");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create application");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
      <div className="page-head">
        <div>
          <div className="eyebrow">Citizen claim</div>
          <h1>Start a land application</h1>
          <p className="lede">
            Select a surveyed parcel and describe the basis of your ownership claim.
          </p>
        </div>
      </div>
      <form className="card" onSubmit={submit}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="parcel">Surveyed parcel</label>
            <select
              id="parcel"
              value={parcelId}
              onChange={(event) => setParcelId(event.target.value)}
              required
            >
              {parcels.length ? (
                parcels.map((parcel) => (
                  <option value={parcel.id} key={parcel.id}>
                    {parcel.parcelCode} — {parcel.address}, {parcel.lga}
                  </option>
                ))
              ) : (
                <option value="">No available parcels</option>
              )}
            </select>
            <span className="help">
              A surveyor or land administrator must create and spatially check parcels.
            </span>
          </div>
          <div className="field full">
            <label htmlFor="claim">Claim description</label>
            <textarea
              id="claim"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              minLength={10}
              placeholder="Describe purchase, inheritance, occupancy, customary witnesses and relevant dates."
              required
            />
          </div>
        </div>
        <div className="notice">
          After submission, attach identity, survey, witness and customary evidence from the
          application review page.
        </div>
        {error && <div className="error">{error}</div>}
        <div className="actions">
          <button className="button" disabled={loading || !parcelId}>
            {loading ? "Creating…" : "Create draft application"}
          </button>
          <button className="button ghost" type="button" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </RequireAuth>
  );
}
