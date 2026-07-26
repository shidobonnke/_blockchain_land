"use client";

import { FilePlus2, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "../../components/require-auth";
import { useAuth } from "../../components/auth-provider";
import { apiRequest } from "../../lib/api";

type Application = {
  id: string;
  status: string;
  updatedAt: string;
  claimDescription: string;
  parcel: { parcelCode: string; status: string };
  applicant: { fullName: string; email: string };
};

export default function ApplicationsPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Application[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    apiRequest<Application[]>("/applications", {}, session.accessToken)
      .then(setRows)
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [session]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (status === "ALL" || row.status === status) &&
          `${row.parcel.parcelCode} ${row.applicant.fullName}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [query, rows, status]
  );

  return (
    <RequireAuth>
      <div className="page-head">
        <div>
          <div className="eyebrow">Registration workflow</div>
          <h1>Land applications</h1>
          <p className="lede">
            Track every claim through spatial, community, legal and title gates.
          </p>
        </div>
        <Link className="button" href="/applications/new">
          <FilePlus2 size={17} /> New application
        </Link>
      </div>
      <div className="card">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="search">Search</label>
            <div className="inline">
              <Search size={18} />
              <input
                id="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Parcel code or applicant"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="status">Workflow status</label>
            <select id="status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">All statuses</option>
              {[
                "DRAFT",
                "SUBMITTED",
                "SPATIAL_REVIEW",
                "COMMUNITY_REVIEW",
                "LEGAL_REVIEW",
                "REGISTRAR_REVIEW",
                "BLOCKCHAIN_PENDING",
                "MINTED",
                "REJECTED"
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="card flush" style={{ marginTop: 18 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Parcel</th>
                <th>Applicant</th>
                <th>Parcel state</th>
                <th>Workflow</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>Loading applications…</td>
                </tr>
              ) : filtered.length ? (
                filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.parcel.parcelCode}</strong>
                    </td>
                    <td>{row.applicant.fullName}</td>
                    <td>
                      <span className="pill">{row.parcel.status}</span>
                    </td>
                    <td>
                      <span className={`pill ${row.status === "MINTED" ? "ok" : "warn"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>{new Date(row.updatedAt).toLocaleDateString()}</td>
                    <td>
                      <Link className="button small secondary" href={`/applications/${row.id}`}>
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>No applications match the selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RequireAuth>
  );
}
