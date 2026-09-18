import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const resultsDirectory = resolve(root, "results");

function csv(rows) {
  if (!rows.length) return "";
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (value) => {
    if (value === undefined || value === null) return "";
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return `${columns.map(escape).join(",")}\n${rows
    .map((row) => columns.map((column) => escape(row[column])).join(","))
    .join("\n")}\n`;
}

async function latestResult() {
  const files = (await readdir(resultsDirectory))
    .filter((file) => /^guide-evaluation-30-.*\.json$/.test(file))
    .sort();
  if (!files.length) throw new Error("No guide evaluation JSON result was found");
  return resolve(resultsDirectory, files.at(-1));
}

const input = process.argv[2] ? resolve(root, process.argv[2]) : await latestResult();
const result = JSON.parse(await readFile(input, "utf8"));
const prefix = resolve(resultsDirectory, basename(input, ".json"));
const summaryRows = [];
const add = (section, metric, value, unit = "", trials = result.metadata.runs, note = "") =>
  summaryRows.push({
    measuredAt: result.metadata.measuredAt,
    section,
    metric,
    value,
    unit,
    trials,
    note
  });

for (const [dataset, spatial] of [
  ["controlled", result.controlledSpatial],
  ["messy", result.messySpatial]
]) {
  add(`spatial_${dataset}`, "valid_non_overlapping", spatial.frequencies.VALID, "cases");
  add(`spatial_${dataset}`, "invalid_geometry", spatial.frequencies.INVALID, "cases");
  add(`spatial_${dataset}`, "overlapping_parcel", spatial.frequencies.OVERLAP, "cases");
  add(`spatial_${dataset}`, "classification_accuracy", spatial.accuracyPercent, "percent");
  add(`spatial_${dataset}`, "overlap_tolerance", spatial.overlapToleranceMetres, "metres");
}
add("contracts", "successful_suites", result.contracts.successfulSuites, "suites");
add("contracts", "suite_pass_rate", result.contracts.successRatePercent, "percent");
if (result.databaseMetrics) {
  for (const [section, values] of Object.entries(result.databaseMetrics))
    for (const [metric, value] of Object.entries(values))
      add(section, metric, value, typeof value === "number" ? "observed" : "");
}
add("fraud_documents", "detected", result.forgedDocuments.detected, "attempts");
add("fraud_documents", "detection_rate", result.forgedDocuments.detectionRatePercent, "percent");
add("mqtt_normal", "messages_sent", result.mqttNormal.sent, "messages");
add("mqtt_normal", "messages_delivered", result.mqttNormal.delivered, "messages");
add("mqtt_normal", "delivery_rate", result.mqttNormal.deliveryRatePercent, "percent");
if (result.mqttNormal.latency) {
  add("mqtt_normal", "mean_latency", result.mqttNormal.latency.mean, "ms");
  add(
    "mqtt_normal",
    "latency_standard_deviation",
    result.mqttNormal.latency.standardDeviation,
    "ms"
  );
}
add("api", "success_rate", result.apiPerformance.successRatePercent, "percent");
if (result.apiPerformance.latency) {
  add("api", "mean_latency", result.apiPerformance.latency.mean, "ms");
  add("api", "latency_standard_deviation", result.apiPerformance.latency.standardDeviation, "ms");
  add("api", "minimum_latency", result.apiPerformance.latency.minimum, "ms");
  add("api", "maximum_latency", result.apiPerformance.latency.maximum, "ms");
}
for (const gap of result.gaps) add("capability_gap", "not_measured", "", "", 0, gap);

const trialRows = [
  ...result.controlledSpatial.observations.map((row) => ({ suite: "spatial_controlled", ...row })),
  ...result.messySpatial.observations.map((row) => ({ suite: "spatial_messy", ...row })),
  ...result.contracts.observations.map((row) => ({ suite: "contracts", ...row })),
  ...result.apiPerformance.observations.map((row) => ({ suite: "api", ...row })),
  ...result.forgedDocuments.observations.map((row) => ({ suite: "forged_documents", ...row })),
  ...result.contractTransactionMetrics.observations.map((row) => ({
    suite: "revocation_metrics",
    ...row
  })),
  ...result.ownershipSimulation.observations.map((row) => ({
    suite: "ownership_simulation",
    ...row
  })),
  ...result.offlineQueue.observations.map((row) => ({ suite: "offline_queue_simulation", ...row })),
  ...result.workflowSimulation.observations.map((row) => ({ suite: "workflow_simulation", ...row }))
];

const summaryPath = `${prefix}-summary.csv`;
const trialsPath = `${prefix}-trials.csv`;
await Promise.all([
  writeFile(summaryPath, csv(summaryRows)),
  writeFile(trialsPath, csv(trialRows))
]);
console.log(
  JSON.stringify(
    {
      input,
      summaryCsv: summaryPath,
      trialsCsv: trialsPath,
      summaryRows: summaryRows.length,
      trialRows: trialRows.length
    },
    null,
    2
  )
);
