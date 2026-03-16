const API_BASE = "/api";
const TOKEN_KEY = "fire_control_token";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getAuthToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "请求失败" }));

    if (response.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new Event("auth-expired"));
    }

    throw new ApiError(payload.message ?? "请求失败", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
