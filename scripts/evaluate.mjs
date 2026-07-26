const api = process.env.EVALUATION_API_URL ?? "http://localhost:4000/api/v1";
const token = process.env.EVALUATION_TOKEN;
const samples = Number(process.env.EVALUATION_SAMPLES ?? 50);
if (!token) throw new Error("EVALUATION_TOKEN is required");

const latencies = [];
let success = 0;
const started = performance.now();
for (let index = 0; index < samples; index++) {
  const requestStarted = performance.now();
  const response = await fetch(`${api}/parcels`, { headers: { authorization: `Bearer ${token}` } });
  latencies.push(performance.now() - requestStarted);
  if (response.ok) success++;
}
const elapsedSeconds = (performance.now() - started) / 1000;
latencies.sort((a, b) => a - b);
const result = {
  samples,
  success,
  availabilityPercent: (success / samples) * 100,
  throughputRequestsPerSecond: success / elapsedSeconds,
  averageLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
  p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)],
  measuredAt: new Date().toISOString()
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
