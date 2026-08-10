import { markFailed, markSynced, queued } from "../db/offline";
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
export async function syncOutbox(deviceId: string, userId: string, accessToken: string) {
  const results = [];
  for (const item of queued()) {
    const response = await fetch(`${API_URL}/sync/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        id: item.id,
        deviceId,
        userId,
        operation: item.operation,
        payload: JSON.parse(item.payload)
      })
    });
    const responseBody = await response.json().catch(() => null);
    const accepted = response.ok && responseBody?.result?.accepted !== false;
    if (response.ok) {
      markSynced(item.id);
    } else {
      markFailed(item.id);
    }
    results.push({ id: item.id, ok: response.ok, accepted, reason: responseBody?.result?.reason });
  }
  return results;
}
