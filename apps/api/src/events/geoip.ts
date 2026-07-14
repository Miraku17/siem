export interface GeoInfo {
  country?: string;
  countryCode?: string;
  city?: string;
  lat?: number;
  lng?: number;
}

// Per-instance cache — the same IP won't be re-resolved while the process is warm.
const cache = new Map<string, GeoInfo>();

// Private / loopback / link-local ranges have no meaningful geolocation.
function isPrivate(ip: string): boolean {
  return (
    ip === '::1' ||
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('169.254.') ||
    ip.startsWith('fc') ||
    ip.startsWith('fd') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

// Resolve an IP to country + coordinates via ipwho.is (free, HTTPS, no key).
// Fully defensive: any failure returns {} so ingestion is never affected.
export async function lookupGeo(ip?: string | null): Promise<GeoInfo> {
  if (!ip || isPrivate(ip)) return {};
  const cached = cache.get(ip);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,country_code,city,latitude,longitude`,
      { signal: AbortSignal.timeout(2500) },
    );
    const j = (await res.json()) as {
      success?: boolean;
      country?: string;
      country_code?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };
    if (!j || j.success === false) {
      cache.set(ip, {});
      return {};
    }
    const geo: GeoInfo = {
      country: j.country,
      countryCode: j.country_code,
      city: j.city,
      lat: j.latitude,
      lng: j.longitude,
    };
    cache.set(ip, geo);
    return geo;
  } catch {
    return {};
  }
}
