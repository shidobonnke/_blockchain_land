async function metrics() {
  try {
    const response = await fetch(
      `${process.env.API_URL ?? "http://localhost:4000/api/v1"}/evaluation/dashboard`,
      {
        cache: "no-store",
        headers: process.env.API_AUDITOR_TOKEN
          ? { authorization: `Bearer ${process.env.API_AUDITOR_TOKEN}` }
          : {}
      }
    );
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}
export default async function ReportsPage() {
  const data = await metrics();
  const cards = data
    ? [
        [
          `${(data.dataSecurity.integrityVerificationRate * 100).toFixed(1)}%`,
          "Integrity verification"
        ],
        [data.fraudReduction.multipleAllocationPreventions, "Allocations prevented"],
        [
          `${(data.transparency.blockchainConfirmationRate * 100).toFixed(1)}%`,
          "Chain confirmations"
        ],
        [`${data.performance.averageValidationLatencyMs.toFixed(1)} ms`, "Validation latency"]
      ]
    : [
        ["—", "Integrity verification"],
        ["—", "Allocations prevented"],
        ["—", "Chain confirmations"],
        ["—", "Validation latency"]
      ];
  return (
    <>
      <div className="eyebrow">Chapter 3 evaluation</div>
      <h1>Evidence, not assumptions.</h1>
      <p className="lede">
        Metrics become reportable only after authenticated evaluation runs populate the registry.
      </p>
      <section className="grid">
        {cards.map(([n, l]) => (
          <div className="card" key={l}>
            <div className="label">{l}</div>
            <div className="metric">{n}</div>
          </div>
        ))}
      </section>
      {!data && (
        <div className="card">
          Start the API and configure an auditor token to display controlled evaluation data.
        </div>
      )}
    </>
  );
}
