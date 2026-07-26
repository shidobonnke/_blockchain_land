"use client";

import { MapPinned, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../components/auth-provider";
import { RequireAuth } from "../../components/require-auth";
import { apiRequest } from "../../lib/api";

type Parcel = {
  id: string;
  parcelCode: string;
  state: string;
  lga: string;
  address: string;
  tenureType: string;
  status: string;
  areaSqM: string;
  geometryHash: string;
};

export default function ParcelsPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Parcel[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    apiRequest<Parcel[]>("/parcels", {}, session.accessToken)
      .then(setRows)
      .catch((reason) => setError(reason.message));
  }, [session]);

  return (
    <RequireAuth>
      <div className="page-head">
        <div>
          <div className="eyebrow">PostGIS cadastral registry</div>
          <h1>Land parcels</h1>
          <p className="lede">
            Inspect authoritative boundaries, tenure types and integrity hashes.
          </p>
        </div>
        <Link className="button" href="/parcels/new">
          <Plus size={17} /> Register parcel
        </Link>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="panel-grid">
        <div className="card flush">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Parcel</th>
                  <th>Location</th>
                  <th>Tenure</th>
                  <th>Area</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.parcelCode}</strong>
                      </td>
                      <td>
                        {row.lga}, {row.state}
                      </td>
                      <td>{row.tenureType}</td>
                      <td>{Math.round(Number(row.areaSqM)).toLocaleString()} m²</td>
                      <td>
                        <span className="pill ok">{row.status}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>No parcels have been registered.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="inline">
            <MapPinned size={22} color="#185c3f" />
            <h2>Spatial overview</h2>
          </div>
          <div className="map-placeholder">
            <span className="map-label">{rows.length} cadastral records</span>
          </div>
          <p className="help" style={{ marginTop: 14 }}>
            Every boundary is validated for geometry correctness and intersection before admission.
          </p>
        </div>
      </div>
    </RequireAuth>
  );
}
