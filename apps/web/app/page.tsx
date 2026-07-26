"use client";

import { ArrowRight, CheckCircle2, Clock3, MapPinned, WifiOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../components/auth-provider";
import { apiRequest } from "../lib/api";

type Application = { id: string; status: string; parcel: { parcelCode: string } };
type Parcel = { id: string; status: string };
type Metric = [number, string, LucideIcon];

export default function Dashboard() {
  const { session, ready } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      apiRequest<Application[]>("/applications", {}, session.accessToken),
      apiRequest<Parcel[]>("/parcels", {}, session.accessToken)
    ])
      .then(([nextApplications, nextParcels]) => {
        setApplications(nextApplications);
        setParcels(nextParcels);
      })
      .catch(() => undefined);
  }, [session]);

  const pending = applications.filter(
    (item) => !["MINTED", "REJECTED", "CANCELLED"].includes(item.status)
  );
  const active = parcels.filter((item) => ["ACTIVE", "TRANSFERRED"].includes(item.status));
  const metrics: Metric[] = [
    [parcels.length, "Registered parcels", MapPinned],
    [pending.length, "Applications in review", Clock3],
    [active.length, "Active digital titles", CheckCircle2],
    [0, "Offline conflicts", WifiOff]
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Registry overview</div>
          <h1>
            {session
              ? `Welcome, ${session.user.fullName.split(" ")[0]}.`
              : "Land governance, accounted for."}
          </h1>
          <p className="lede">
            A unified view of parcel integrity, community validation, statutory review and immutable
            title issuance.
          </p>
        </div>
        {ready && !session && (
          <Link className="button" href="/login">
            Sign in to the registry <ArrowRight size={17} />
          </Link>
        )}
      </div>
      <section className="grid">
        {metrics.map(([number, label, Icon]) => (
          <article className="card" key={String(label)}>
            <div className="row-between">
              <span className="label">{String(label)}</span>
              <Icon size={20} color="#287a57" />
            </div>
            <div className="metric">{String(number)}</div>
            <div className="metric-trend">Live registry count</div>
          </article>
        ))}
      </section>
      <section className="panel-grid">
        <div className="card">
          <div className="row-between">
            <div>
              <div className="eyebrow">Registration pipeline</div>
              <h2>Recent applications</h2>
            </div>
            <Link href="/applications" className="button small secondary">
              View all
            </Link>
          </div>
          <div className="steps">
            {applications.slice(0, 5).map((application, index) => (
              <div className="step" key={application.id}>
                <div className="dot">{index + 1}</div>
                <div>
                  <strong>{application.parcel.parcelCode}</strong>
                  <div className="label">Application workflow</div>
                </div>
                <span className="pill warn">{application.status}</span>
              </div>
            ))}
            {!applications.length && (
              <div className="empty-state">
                <div>
                  <h3>No application activity</h3>
                  <p className="muted">Create a claim to begin the validation pipeline.</p>
                  <Link href="/applications/new" className="button small">
                    New application
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="eyebrow">Deterministic workflow</div>
          <h2>Required validation gates</h2>
          <div className="steps">
            {[
              ["GIS", "Valid, non-overlapping parcel"],
              ["Social oracle", "Community attestation"],
              ["Legal", "Statutory conditions"],
              ["Blockchain", "Restricted title issuance"]
            ].map(([name, copy], index) => (
              <div className="step" key={name}>
                <div className="dot">{index + 1}</div>
                <div>
                  <strong>{name}</strong>
                  <div className="label">{copy}</div>
                </div>
                <span className="pill ok">Enforced</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
