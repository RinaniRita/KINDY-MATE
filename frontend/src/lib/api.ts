import { clearAuthSession, readAuthSession } from "./auth";

const API_BASE = typeof window !== "undefined"
  ? "/api/v1"
  : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export type AuthResponse = {
  access: string;
  refresh: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    consent_status: boolean;
    avatar_id?: string;
    pin_configured?: boolean;
  };
};

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const session = readAuthSession();
  if (session?.access) {
    headers.Authorization = `Bearer ${session.access}`;
  }
  return headers;
}

function messageFromPayload(payload: Record<string, unknown>) {
  if (typeof payload.detail === "string") return payload.detail;
  if (typeof payload.error === "string") return payload.error;
  const firstField = Object.values(payload)[0];
  if (Array.isArray(firstField) && typeof firstField[0] === "string") {
    return firstField[0];
  }
  return "Yêu cầu chưa thành công.";
}

async function handleError(response: Response) {
  if (response.status === 401) {
    clearAuthSession();
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return messageFromPayload(payload);
}

export async function apiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      headers: getHeaders(),
    });
    if (response.status === 401) {
      clearAuthSession();
    }
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function apiGetRequired<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error(await handleError(response));
  }
  return (await response.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    body: JSON.stringify(body),
    headers: getHeaders(),
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await handleError(response));
  }
  return (await response.json()) as T;
}

export async function apiPostRequired<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    body: JSON.stringify(body),
    headers: getHeaders(),
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await handleError(response));
  }
  return (await response.json()) as T;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    body: JSON.stringify(body),
    headers: getHeaders(),
    method: "PATCH",
  });
  if (!response.ok) {
    throw new Error(await handleError(response));
  }
  return (await response.json()) as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: getHeaders(),
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await handleError(response));
  }
  return (await response.json()) as T;
}

export async function apiPostWithStatus<T>(
  path: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; data: T | Record<string, unknown> }> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      body: JSON.stringify(body),
      headers: getHeaders(),
      method: "POST",
    });
    const data = (await response.json().catch(() => ({}))) as T | Record<string, unknown>;
    if (response.status === 401) {
      clearAuthSession();
    }
    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { error: error instanceof Error ? error.message : "Failed to fetch" },
    };
  }
}
export async function apiStream(
  path: string,
  body: Record<string, unknown>,
  onChunk: (text: string) => void,
  onDone: () => void,
  onAudio?: (base64: string) => void,
): Promise<void> {
  const session = readAuthSession();
  const token = session?.access || null;
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) throw new Error(`Stream failed: ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const parsed = JSON.parse(line.slice(6)) as { chunk?: string; audio?: string; done: boolean };
          if (parsed.chunk) onChunk(parsed.chunk);
          if (parsed.audio && onAudio) onAudio(parsed.audio);
          if (parsed.done) {
            onDone();
            return;
          }
        } catch {
          /* ignore malformed */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  onDone();
}
