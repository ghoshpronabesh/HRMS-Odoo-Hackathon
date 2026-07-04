// Client-side cache store for API GET responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15000; // 15 seconds Cache TTL

export async function fetchWithCache(url: string, options?: RequestInit) {
  // Construct a unique cache key based on URL and headers
  const cacheKey = url + (options?.headers ? JSON.stringify(options.headers) : '');
  const cached = cache.get(cacheKey);
  const now = Date.now();

  // If cache is valid, return it immediately
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  // Otherwise perform live fetch
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`API fetch failed with status: ${res.status}`);
  }
  
  const data = await res.json();
  cache.set(cacheKey, { data, timestamp: now });
  return data;
}

// Invalidate cached records for a specific API prefix or completely
export function invalidateCache(urlPrefix?: string) {
  if (!urlPrefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(urlPrefix)) {
      cache.delete(key);
    }
  }
}
