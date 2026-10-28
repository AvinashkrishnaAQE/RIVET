/**
 * Client for the backend auth API.
 *
 * Auth is cookie-based: the API sets httpOnly access/refresh cookies, so this code
 * never sees or stores a token. Two things are handled here so pages do not have to:
 *   - CSRF: mutating requests echo the readable `csrf_token` cookie in `X-CSRF-Token`.
 *   - Expiry: a 401 on a normal request triggers one silent refresh, then a retry.
 */

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "");
const API_PREFIX = `${API_URL}/api/v1`;

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** A message safe to show a person: the first field problem for validation errors, else the API's message. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "VALIDATION_ERROR" && error.details) {
      const first = Object.values(error.details)[0]?.[0];
      if (first) return first;
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

// These endpoints are how a session is obtained or renewed, so a 401 from them is
// an answer, not an expired session to refresh.
const NO_REFRESH = new Set(["/auth/login", "/auth/register", "/auth/refresh", "/auth/forgot-password", "/auth/reset-password"]);

let refreshInFlight: Promise<boolean> | null = null;

/** Single-flight: concurrent 401s share one refresh, since a refresh token works only once. */
function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(`${API_PREFIX}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": readCookie("csrf_token") ?? "" },
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

async function request<T>(
  path: string,
  { method = "GET", body, canRetry = true }: { method?: string; body?: unknown; canRetry?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRF-Token"] = readCookie("csrf_token") ?? "";

  let res: Response;
  try {
    res = await fetch(`${API_PREFIX}${path}`, {
      method,
      credentials: "include",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Cannot reach the server. Check your connection and try again.");
  }

  if (res.status === 401 && canRetry && !NO_REFRESH.has(path) && (await refreshSession())) {
    return request<T>(path, { method, body, canRetry: false });
  }

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = json?.error;
    throw new ApiError(res.status, err?.code ?? "UNKNOWN", err?.message ?? "Something went wrong", err?.details);
  }

  return json?.data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User }>("/auth/login", { method: "POST", body: { email, password } }),

  register: (name: string, email: string, password: string) =>
    request<{ user: User }>("/auth/register", { method: "POST", body: { name, email, password } }),

  logout: () => request<void>("/auth/logout", { method: "POST" }),
  logoutAll: () => request<void>("/auth/logout-all", { method: "POST" }),

  me: () => request<{ user: User }>("/auth/me").then((data) => data.user),

  forgotPassword: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", { method: "POST", body: { email } }),

  resetPassword: (token: string, newPassword: string) =>
    request<void>("/auth/reset-password", { method: "POST", body: { token, newPassword } }),
};
