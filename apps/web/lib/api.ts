export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

export type Session = {
  accessToken: string;
  user: SessionUser;
};

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
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
    const message =
      payload?.message instanceof Array
        ? payload.message.join(", ")
        : payload?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}
