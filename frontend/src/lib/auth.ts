import type { AuthResponse } from "@/lib/api";

const AUTH_KEY = "kindy_mate_auth";

export function saveAuthSession(auth: AuthResponse) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function readAuthSession(): AuthResponse | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    window.localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
}

export function updateAuthUser(user: AuthResponse["user"]) {
  const session = readAuthSession();
  if (!session) return;
  saveAuthSession({ ...session, user });
}
