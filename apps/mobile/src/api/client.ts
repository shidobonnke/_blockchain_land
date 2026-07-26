import * as SecureStore from "expo-secure-store";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
export const SESSION_KEY = "anagu.session";

export type Session = {
  accessToken: string;
  user: { id: string; email: string; fullName: string; role: string };
};

export async function getSession() {
  const value = await SecureStore.getItemAsync(SESSION_KEY);
  return value ? (JSON.parse(value) as Session) : null;
}

export async function saveSession(session: Session) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? `Request failed (${response.status})`);
  }
  return payload as T;
}
