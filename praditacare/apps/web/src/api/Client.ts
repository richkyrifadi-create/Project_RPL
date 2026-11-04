import type { ErrorResponse } from "@praditacare/shared";

export const TokenKey = "praditacare.token";

export class ApiError extends Error {
  constructor(
    public Status: number,
    message: string,
    public Errors?: Record<string, string[]>
  ) {
    super(message);
  }
}

let unauthorizedHandler: (() => void) | null = null;
export const OnUnauthorized = (handler: () => void) => {
  unauthorizedHandler = handler;
};

/** Awalan URL API mengikuti base path build (mis. "/praditacare/api" saat deploy di sub-path). */
export const ApiBase = `${import.meta.env.BASE_URL.replace(/\/+$/, "")}/api`;

export function GetToken(): string | null {
  try {
    return localStorage.getItem(TokenKey);
  } catch {
    return null;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

export function BuildQuery(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

async function Request(path: string, init: RequestInit = {}): Promise<Response> {
  const token = GetToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${ApiBase}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Tidak dapat terhubung ke server. Pastikan backend berjalan.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorResponse | null;
    if (response.status === 401 && token) unauthorizedHandler?.();
    throw new ApiError(response.status, body?.Message ?? `Terjadi kesalahan (${response.status})`, body?.Errors);
  }
  return response;
}

export const Api = {
  async Get<T>(path: string, query?: Query): Promise<T> {
    return (await Request(path + BuildQuery(query))).json();
  },
  async Send<T>(method: "POST" | "PUT", path: string, body?: unknown): Promise<T> {
    const payload = body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body);
    return (await Request(path, { method, body: payload })).json();
  },
  async Download(path: string, fileName: string): Promise<void> {
    const blob = await (await Request(path)).blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};
