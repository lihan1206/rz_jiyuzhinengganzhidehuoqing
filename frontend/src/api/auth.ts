import { request } from "./client";

export interface LoginResponse {
  token: string;
  user: {
    username: string;
    role: string;
  };
}

export function login(payload: { username: string; password: string }) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
