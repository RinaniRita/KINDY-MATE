export interface AuthResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    username: string;
    email: string;
    avatar_id?: string | null;
    pin_configured: boolean;
  };
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("kindy_mate_auth_session");
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as { access?: unknown };
    return typeof session.access === "string" ? session.access : null;
  } catch {
    return null;
  }
}

function readErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const payload = data as { detail?: unknown; message?: unknown };
  if (typeof payload.detail === "string") return payload.detail;
  if (typeof payload.message === "string") return payload.message;
  return JSON.stringify(data) || fallback;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);

  const isPublicAuthRoute = url.includes("/login/") || url.includes("/register/");
  if (token && !isPublicAuthRoute) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const absoluteUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;

  const response = await fetch(absoluteUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem("kindy_mate_auth_session");
    }
    let errorMessage = `Yêu cầu thất bại với mã lỗi ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = readErrorMessage(errorData, errorMessage);
    } catch {
      // Ignore parse failure and fall back
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export async function apiGetRequired<T>(url: string, options?: RequestInit): Promise<T> {
  return request<T>(url, { ...options, method: "GET" });
}

export async function apiGet<T>(url: string, defaultValue?: T, options?: RequestInit): Promise<T> {
  try {
    return await request<T>(url, { ...options, method: "GET" });
  } catch (error) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw error;
  }
}

export async function apiPost<T>(url: string, body: unknown, options?: RequestInit): Promise<T> {
  return request<T>(url, {
    ...options,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T>(url: string, body: unknown, options?: RequestInit): Promise<T> {
  return request<T>(url, {
    ...options,
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(url: string, options?: RequestInit): Promise<T> {
  return request<T>(url, { ...options, method: "DELETE" });
}

export async function apiPostWithStatus<T>(url: string, body: unknown | FormData, options?: RequestInit): Promise<{ ok: boolean, status: number, data: T }> {
  try {
    const token = getAccessToken();
    const headers = new Headers(options?.headers);

    const isPublicAuthRoute = url.includes("/login/") || url.includes("/register/");
    if (token && !isPublicAuthRoute) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (!(body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const absoluteUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;

    const response = await fetch(absoluteUrl, {
      ...options,
      headers,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });

    if (response.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem("kindy_mate_auth_session");
    }

    if (response.status === 204) {
      return { ok: response.ok, status: response.status, data: {} as T };
    }

    let data;
    try {
      data = await response.json();
    } catch {
      data = {} as T;
    }

    return { ok: response.ok, status: response.status, data: data as T };
  } catch {
    return { ok: false, status: 0, data: {} as T };
  }
}


/**
 * Stream an SSE response from /milo/chat/stream/.
 * Calls onChunk(text) for each arriving token, onAudio(base64) for audio chunks, onDone() when finished.
 */
export async function apiStream(
  path: string,
  body: Record<string, unknown>,
  onChunk: (text: string) => void,
  onDone: () => void,
  onAudio?: (base64: string) => void
): Promise<void> {
  const token = getAccessToken();
  const url = `${BASE_URL}${path}`;
  console.log('[Milo] apiStream calling:', url);

  const controller = new AbortController();

  let lastActivity = Date.now();
  const watchdog = setInterval(() => {
    if (Date.now() - lastActivity > 15000) {
      console.error('[Milo] Stream watchdog timeout. Aborting...');
      controller.abort();
      clearInterval(watchdog);
    }
  }, 2000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearInterval(watchdog);
    const error = fetchErr as Error;
    if (error.name === 'AbortError') throw new Error('Connection timed out');
    throw fetchErr;
  }

  if (!response.ok || !response.body) {
    clearInterval(watchdog);
    console.error('[Milo] Stream failed with status:', response.status);
    throw new Error(`Stream failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let receivedDone = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      lastActivity = Date.now();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // ── FIX: split on \r\n or \n, strip \r from each line ──────────────────
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trimEnd(); // strip trailing \r if any
        if (line.startsWith(':')) { lastActivity = Date.now(); continue; }
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim(); // 'data: ' = 6 chars
        if (!jsonStr) continue;

        try {
          const parsed = JSON.parse(jsonStr) as { chunk?: string; audio?: string; done: boolean };
          if (parsed.chunk) onChunk(parsed.chunk);
          if (parsed.audio && onAudio) onAudio(parsed.audio);
          if (parsed.done) {
            receivedDone = true;
            onDone();
            return;
          }
        } catch (e) {
          console.error('[Milo] Failed to parse SSE line:', JSON.stringify(line), e);
        }
      }
    }
  } finally {
    clearInterval(watchdog);
    reader.releaseLock();
  }

  if (!receivedDone) {
    console.error('[Milo] Stream terminated without done signal');
    onDone(); // gọi onDone thay vì throw để UI không bị treo
  }
}
