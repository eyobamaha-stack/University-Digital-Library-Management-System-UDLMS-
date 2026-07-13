"use client";

import { clearSession, getToken } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message || "Request failed");
  }

  return response.json() as Promise<T>;
}
