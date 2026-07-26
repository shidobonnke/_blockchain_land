"use client";

import { ExternalLink, QrCode, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../components/auth-provider";
import { RequireAuth } from "../../components/require-auth";
import { apiRequest } from "../../lib/api";

type Parcel = {
  id: string;
  parcelCode: string;
  address: string;
  status: string;
  geometryHash?: string;
};

export default function TitlesPage() {
  const { session } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);

  useEffect(() => {
    if (!session) return;
    apiRequest<Parcel[]>("/parcels", {}, session.accessToken)
      .then((items) =>
        setParcels(items.filter((item) => ["ACTIVE", "TRANSFERRED"].includes(item.status)))
      )
      .catch(() => setParcels([]));
  }, [session]);

  return (
    <RequireAuth>
      <div className="page-head">
        <div>
          <div className="eyebrow">Blockchain titles</div>
          <h1>Digital title vault</h1>
          <p className="lede">View active land titles and their immutable parcel fingerprints.</p>
        </div>
      </div>
      {parcels.length ? (
        <div className="grid three">
          {parcels.map((parcel) => (
            <article className="card" key={parcel.id}>
              <div className="row-between">
                <WalletCards size={28} color="#185c3f" />
                <span className="pill ok">{parcel.status}</span>
              </div>
              <h2 style={{ marginTop: 22 }}>{parcel.parcelCode}</h2>
              <p className="muted">{parcel.address}</p>
              <div className="field">
                <span className="label">Geometry fingerprint</span>
                <code>{parcel.geometryHash?.slice(0, 24) ?? "Pending"}…</code>
              </div>
              <div className="actions" style={{ marginTop: 18 }}>
                <button className="button small secondary">
                  <QrCode size={15} /> QR proof
                </button>
                <button className="button small ghost">
                  <ExternalLink size={15} /> Transaction
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state card">
          <div>
            <WalletCards size={38} color="#287a57" />
            <h2>No active digital titles</h2>
            <p className="lede">
              Titles appear here after registrar approval and blockchain minting.
            </p>
          </div>
        </div>
      )}
    </RequireAuth>
  );
}
