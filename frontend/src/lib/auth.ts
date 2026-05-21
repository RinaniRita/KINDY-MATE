import { AuthResponse } from "./api";

const AUTH_KEY = "kindy_mate_auth_session";

export function saveAuthSession(session: AuthResponse): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function readAuthSession(): AuthResponse | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem("active_child_id");
}

export function updateAuthUser(user: Partial<AuthResponse["user"]>): void {
  if (typeof window === "undefined") return;
  const current = readAuthSession();
  if (current) {
    current.user = { ...current.user, ...user };
    saveAuthSession(current);
  }
}
