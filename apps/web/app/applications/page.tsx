async function applications() {
  try {
    const response = await fetch(`${process.env.API_URL ?? "http://localhost:4000/api/v1"}/applications`, { cache: "no-store" });
    return response.ok ? response.json() : [];
  } catch { return []; }
}
export default async function ApplicationsPage() {
  const rows = await applications();
  return <><div className="eyebrow">Workflow</div><h1>Applications</h1><p className="lede">Review each claim through its required spatial, community, legal and registrar gates.</p>
    <div className="card"><table><thead><tr><th>Parcel</th><th>Applicant</th><th>Status</th><th>Updated</th></tr></thead>
    <tbody>{rows.length ? rows.map((r: any)=><tr key={r.id}><td>{r.parcel.parcelCode}</td><td>{r.applicant.fullName}</td><td><span className="pill">{r.status}</span></td><td>{new Date(r.updatedAt).toLocaleDateString()}</td></tr>) :
      <tr><td colSpan={4}>No applications yet. Submit the first record through the API or mobile app.</td></tr>}</tbody></table></div></>;
}
