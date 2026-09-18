import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");

function parseEnv(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, "")];
      })
  );
}

async function loadApiEnvironment() {
  try {
    return parseEnv(await readFile(resolve(repositoryRoot, "apps/api/.env"), "utf8"));
  } catch {
    return {};
  }
}

function percentile(sortedValues, percentileValue) {
  if (!sortedValues.length) return 0;
  const index = Math.ceil((percentileValue / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

function summarize(values) {
  if (!values.length)
    return { minimum: 0, maximum: 0, mean: 0, standardDeviation: 0, p50: 0, p95: 0 };
  const sorted = [...values].sort((left, right) => left - right);
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance =
    values.length > 1
      ? values.reduce((total, value) => total + (value - mean) ** 2, 0) / (values.length - 1)
      : 0;
  return {
    minimum: sorted[0],
    maximum: sorted.at(-1),
    mean,
    standardDeviation: Math.sqrt(variance),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95)
  };
}

function fixed(value, digits = 2) {
  return Number(value.toFixed(digits));
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.text();
  let parsed;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    parsed = body;
  }
  if (!response.ok)
    throw new Error(`${options.method ?? "GET"} ${url} returned ${response.status}: ${body}`);
  return parsed;
}

async function resolveToken(api, apiEnvironment) {
  if (process.env.EVALUATION_TOKEN) return process.env.EVALUATION_TOKEN;
  const email = process.env.EVALUATION_EMAIL ?? apiEnvironment.SYSTEM_ADMIN_EMAIL;
  const password = process.env.EVALUATION_PASSWORD ?? apiEnvironment.SYSTEM_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Set EVALUATION_TOKEN, or configure EVALUATION_EMAIL/EVALUATION_PASSWORD (the API admin credentials are also accepted)."
    );
  }
  const login = await requestJson(`${api}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return login.accessToken;
}

function markdownReport(result) {
  const latency = result.summary.latencyMs;
  return (
    `# Anagu 30-run evaluation\n\n` +
    `Measured at: ${result.metadata.measuredAt}\n\n` +
    `API: ${result.metadata.api}\n\n` +
    `Runs requested: ${result.summary.runs}\n\n` +
    `## Request performance\n\n` +
    `| Metric | Result |\n|---|---:|\n` +
    `| Successful requests | ${result.summary.successfulRequests}/${result.summary.runs} |\n` +
    `| Availability | ${result.summary.availabilityPercent}% |\n` +
    `| Throughput | ${result.summary.throughputRequestsPerSecond} requests/second |\n` +
    `| Mean latency | ${latency.mean} ms |\n` +
    `| Standard deviation | ${latency.standardDeviation} ms |\n` +
    `| Median (p50) | ${latency.p50} ms |\n` +
    `| 95th percentile | ${latency.p95} ms |\n` +
    `| Minimum | ${latency.minimum} ms |\n` +
    `| Maximum | ${latency.maximum} ms |\n\n` +
    `## PDF-style latency entry\n\n` +
    `| Stage | Proposed Framework (ms) | Baseline (ms) |\n|---|---:|---:|\n` +
    `| Authenticated parcel retrieval | ${latency.mean} ± ${latency.standardDeviation} | Not measured |\n\n` +
    `## Dashboard snapshot\n\n\`\`\`json\n${JSON.stringify(
      result.dashboard,
      null,
      2
    )}\n\`\`\`\n\n` +
    `> This run measures the authenticated API request path only. It must not be labelled as blockchain throughput, end-to-end registration latency, degraded-network MQTT performance, or a conventional-registry baseline.\n`
  );
}

const apiEnvironment = await loadApiEnvironment();
const api = process.env.EVALUATION_API_URL ?? "http://localhost:4000/api/v1";
const samples = Number(process.env.EVALUATION_SAMPLES ?? 30);
if (!Number.isInteger(samples) || samples < 1)
  throw new Error("EVALUATION_SAMPLES must be a positive integer");

await requestJson(`${api}/health`);
const token = await resolveToken(api, apiEnvironment);
const authorization = { authorization: `Bearer ${token}` };
const observations = [];
const benchmarkStarted = performance.now();

for (let run = 1; run <= samples; run++) {
  const started = performance.now();
  let status = 0;
  let ok = false;
  let responseBytes = 0;
  let error;
  try {
    const response = await fetch(`${api}/parcels`, { headers: authorization });
    const body = await response.arrayBuffer();
    status = response.status;
    ok = response.ok;
    responseBytes = body.byteLength;
    if (!ok) error = new TextDecoder().decode(body).slice(0, 500);
  } catch (requestError) {
    error = requestError instanceof Error ? requestError.message : String(requestError);
  }
  observations.push({
    run,
    latencyMs: fixed(performance.now() - started, 3),
    status,
    ok,
    responseBytes,
    ...(error ? { error } : {})
  });
}

const elapsedSeconds = (performance.now() - benchmarkStarted) / 1000;
const successfulRequests = observations.filter((observation) => observation.ok).length;
const latencySummary = summarize(observations.map((observation) => observation.latencyMs));
const dashboard = await requestJson(`${api}/evaluation/dashboard`, { headers: authorization });
const measuredAt = new Date().toISOString();
const result = {
  metadata: {
    measuredAt,
    api,
    endpoint: "/parcels",
    method: "GET",
    execution: "sequential",
    nodeVersion: process.version
  },
  summary: {
    runs: samples,
    successfulRequests,
    failedRequests: samples - successfulRequests,
    availabilityPercent: fixed((successfulRequests / samples) * 100),
    throughputRequestsPerSecond: fixed(successfulRequests / elapsedSeconds),
    latencyMs: Object.fromEntries(
      Object.entries(latencySummary).map(([key, value]) => [key, fixed(value)])
    )
  },
  dashboard,
  observations
};

const stamp = measuredAt.replace(/[:.]/g, "-");
const outputDirectory = resolve(repositoryRoot, process.env.EVALUATION_OUTPUT_DIR ?? "results");
await mkdir(outputDirectory, { recursive: true });
const jsonPath = resolve(outputDirectory, `evaluation-30-${stamp}.json`);
const markdownPath = resolve(outputDirectory, `evaluation-30-${stamp}.md`);
await Promise.all([
  writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`),
  writeFile(markdownPath, markdownReport(result))
]);

process.stdout.write(
  `${JSON.stringify({ ...result.summary, files: { jsonPath, markdownPath } }, null, 2)}\n`
);
