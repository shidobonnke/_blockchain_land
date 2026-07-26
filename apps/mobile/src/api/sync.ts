import { queued } from "../db/offline";
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
export async function syncOutbox(deviceId: string, userId: string) {
  const results = [];
  for (const item of queued()) {
    const response = await fetch(`${API_URL}/sync/operations`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: item.id, deviceId, userId, operation: item.operation, payload: JSON.parse(item.payload) })
    });
    results.push({ id: item.id, ok: response.ok });
  }
  return results;
}
