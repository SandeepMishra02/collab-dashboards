export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function fetcher<T = any>(endpoint: string): Promise<T> {
  // normalize endpoint ("", "/", "health" -> trailing URL becomes correct)
  const path = endpoint ? `/${endpoint.replace(/^\/+/, '')}` : '/';
  const res = await fetch(`${API_URL}${path}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch ${path} — ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
