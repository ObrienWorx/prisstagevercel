const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 5 * 60 * 1000; // 5 minutes

export async function cachedFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const key = url + (options?.method || 'GET');
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < TTL) return hit.data as T;
  const res = await fetch(url, options);
  const data = await res.json();
  if (res.ok) cache.set(key, { data, ts: now });
  return data;
}

export function invalidateCache(url: string) {
  cache.delete(url + 'GET');
}
