async function parcels() {
  try { const r = await fetch(`${process.env.API_URL ?? "http://localhost:4000/api/v1"}/parcels`, { cache: "no-store" }); return r.ok ? r.json() : []; }
  catch { return []; }
}
export default async function ParcelsPage() {
  const rows = await parcels();
  return <><div className="eyebrow">Cadastral registry</div><h1>Land parcels</h1><p className="lede">Authoritative geometries stored in PostGIS and bound to cryptographic fingerprints.</p>
    <div className="card"><table><thead><tr><th>Code</th><th>Location</th><th>Tenure</th><th>Area</th><th>Status</th></tr></thead>
      <tbody>{rows.length ? rows.map((r:any)=><tr key={r.id}><td>{r.parcelCode}</td><td>{r.lga}, {r.state}</td><td>{r.tenureType}</td><td>{Math.round(Number(r.areaSqM))} m²</td><td><span className="pill ok">{r.status}</span></td></tr>) : <tr><td colSpan={5}>No parcels registered.</td></tr>}</tbody></table></div></>;
}
