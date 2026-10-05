import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase-public";

export class SbError extends Error {
  readonly status: number;
  readonly body: string;
  readonly url: string;
  readonly code: string | null;
  readonly errorName: string;

  constructor(opts: { url: string; status: number; body: string; errorName?: string }) {
    let message = opts.body;
    let code: string | null = null;
    try {
      const parsed = JSON.parse(opts.body) as { message?: string; hint?: string; code?: string };
      message = parsed.message || parsed.hint || opts.body || "เชื่อมต่อไม่สำเร็จ";
      code = parsed.code ?? null;
    } catch {
      message = opts.body || "เชื่อมต่อไม่สำเร็จ";
    }
    super(redact(message));
    this.name = "SbError";
    this.status = opts.status;
    this.body = redact(opts.body);
    this.url = opts.url;
    this.code = code;
    this.errorName = opts.errorName ?? (opts.status === 0 ? "TypeError" : "SbError");
  }
}

function redact(value: string): string {
  return value.replace(/sb_(publishable|secret)_[A-Za-z0-9_-]+/g, "sb_$1_…");
}

function publicUrl(path: string): string {
  const clean = path.split("?")[0] ?? path;
  return `${SUPABASE_URL}/rest/v1${clean}`;
}

export async function sb<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const shown = publicUrl(path);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...Object.fromEntries(new Headers(init.headers).entries()),
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    throw new SbError({
      url: shown,
      status: 0,
      body: JSON.stringify({ message: err.message }),
      errorName: err.name || "TypeError",
    });
  }
  const body = await response.text();
  if (!response.ok) {
    throw new SbError({ url: shown, status: response.status, body });
  }
  if (!body) return null as T;
  return JSON.parse(body) as T;
}

export type FetchDiag = {
  url: string;
  status: number | null;
  body: string | null;
  errorName: string | null;
  errorMessage: string | null;
  online: boolean | null;
};

export async function diagnoseBuildings(): Promise<FetchDiag> {
  const url = `${SUPABASE_URL}/rest/v1/buildings?select=id&limit=1`;
  const online = typeof navigator === "undefined" ? null : navigator.onLine;
  try {
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",
      },
    });
    const body = redact(await response.text());
    return {
      url: publicUrl("/buildings"),
      status: response.status,
      body: body.slice(0, 500),
      errorName: response.ok ? null : "HTTPError",
      errorMessage: response.ok ? null : body.slice(0, 300),
      online,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      url: publicUrl("/buildings"),
      status: null,
      body: null,
      errorName: err.name || "TypeError",
      errorMessage: redact(err.message),
      online,
    };
  }
}
