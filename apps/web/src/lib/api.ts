// apps/web/src/lib/api.ts
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ApiInit = RequestInit & { json?: unknown };

async function handle(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** JSON helper (auto-sets headers when you pass { json }) */
export async function api(path: string, init: ApiInit = {}) {
  const url = `${API_URL}${path}`;
  const { json, headers, ...rest } = init;

  const body =
    json !== undefined
      ? JSON.stringify(json)
      : (init.body as BodyInit | undefined);

  const res = await fetch(url, {
    headers:
      json !== undefined
        ? { "Content-Type": "application/json", ...(headers || {}) }
        : headers,
    credentials: "include",
    ...rest,
    body,
  });
  return handle(res);
}

/** FormData helper — do NOT set Content-Type manually */
export async function apiForm(
  path: string,
  form: FormData,
  init: RequestInit = {}
) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    method: init.method || "POST",
    body: form,
    credentials: "include",
    ...init,
  });
  return handle(res);
}







