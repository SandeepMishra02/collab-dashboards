export const API = process.env.NEXT_PUBLIC_API_URL!
export async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
export async function post<T>(path: string, body: any, headers: Record<string,string> = {}): Promise<T> {
  return j<T>(path, { method:'POST', headers:{'Content-Type':'application/json', ...headers}, body: JSON.stringify(body) })
}
