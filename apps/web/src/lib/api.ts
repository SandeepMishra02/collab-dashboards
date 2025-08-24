export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}), "X-Role": "owner" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function apiForm(path: string, form: FormData) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    body: form,
    headers: { "X-Role": "owner" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}




