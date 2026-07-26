const steps = [
  ["Spatial validation", "PostGIS geometry and overlap gate", "Ready"],
  ["Community attestation", "Customary claim multi-party review", "2 pending"],
  ["Legal review", "Statutory conditions and evidence", "4 open"],
  ["Title issuance", "Restricted ERC-721 on Besu", "Ready"]
];
export default function Dashboard() {
  return <>
    <div className="eyebrow">Administrative overview</div>
    <h1>Land governance with every decision accounted for.</h1>
    <p className="lede">One operational view for spatial validation, community consensus, statutory review and immutable title issuance.</p>
    <section className="grid">
      {[["1,284","Registered parcels"],["38","Applications in review"],["99.98%","Integrity checks passed"],["12","Offline records queued"]].map(([n,l]) =>
        <div className="card" key={l}><div className="label">{l}</div><div className="metric">{n}</div></div>)}
    </section>
    <section className="panel-grid">
      <div className="card"><div className="eyebrow">Registration pipeline</div><div className="steps">
        {steps.map(([name,desc,status],i)=><div className="step" key={name}><div className="dot">{i+1}</div><div><strong>{name}</strong><div className="label">{desc}</div></div><span className={`pill ${status==="Ready"?"ok":""}`}>{status}</span></div>)}
      </div></div>
      <div className="card"><div className="eyebrow">System integrity</div><h2>All services healthy</h2>
        <p className="lede">PostGIS, synchronization worker and Besu validators are reporting normally.</p>
        <div className="steps">{["Shared API","Spatial oracle","QBFT network","Document store"].map(x=><div className="step" key={x}><span className="dot">✓</span><strong>{x}</strong><span className="pill ok">Online</span></div>)}</div>
      </div>
    </section>
  </>;
}
