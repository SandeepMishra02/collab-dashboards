export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function handle(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  get: async (path: string) => handle(await fetch(`${API}${path}`, { cache: 'no-store' })),
  post: async (path: string, body: any, json = true) =>
    handle(await fetch(`${API}${path}`, {
      method: 'POST',
      headers: json ? { 'content-type': 'application/json' } : undefined,
      body: json ? JSON.stringify(body) : body
    })),
  patch: async (path: string, body: any) =>
    handle(await fetch(`${API}${path}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })),
};
