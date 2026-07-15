import { resolve4 } from 'dns/promises';

export interface ThreatInfo {
  score?: number; // 0-100 abuse confidence
  reports?: number;
  listed?: boolean; // present on a blocklist
  source?: string; // 'abuseipdb' | 'dnsbl:<zone>'
}

// Per-instance cache — the same IP isn't re-checked while the process is warm.
const cache = new Map<string, ThreatInfo>();

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

// Primary source: AbuseIPDB (free tier, needs ABUSEIPDB_API_KEY). Returns a
// 0-100 confidence score. No key → null, so the DNSBL fallback runs instead.
async function abuseipdb(ip: string): Promise<ThreatInfo | null> {
  const key = process.env.ABUSEIPDB_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`,
      {
        headers: { Key: key, Accept: 'application/json' },
        signal: AbortSignal.timeout(2500),
      },
    );
    const j = (await res.json()) as {
      data?: { abuseConfidenceScore?: number; totalReports?: number };
    };
    const d = j?.data;
    if (!d || typeof d.abuseConfidenceScore !== 'number') return null;
    return {
      score: d.abuseConfidenceScore,
      reports: d.totalReports,
      listed: d.abuseConfidenceScore >= 25,
      source: 'abuseipdb',
    };
  } catch {
    return null;
  }
}

// Keyless fallback: a DNS blocklist lookup (DroneBL). A resolving A record in
// the 127.0.0.x range means the IP is listed. Best-effort; IPv4 only.
async function dnsbl(ip: string): Promise<ThreatInfo | null> {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return null;
  const zone = 'dnsbl.dronebl.org';
  const query = `${ip.split('.').reverse().join('.')}.${zone}`;
  try {
    const addrs = await resolve4(query);
    // 127.0.0.x = listed; 127.255.255.x = query error/refused → treat as unknown.
    const listed = addrs.some((a) => a.startsWith('127.0.0.'));
    return { listed, score: listed ? 75 : 0, source: `dnsbl:${zone}` };
  } catch {
    // NXDOMAIN = not listed.
    return { listed: false, score: 0, source: `dnsbl:${zone}` };
  }
}

// Resolve an IP's reputation. Fully defensive: any failure returns {} so
// ingestion is never affected.
export async function lookupThreat(ip?: string | null): Promise<ThreatInfo> {
  if (!ip || isPrivate(ip)) return {};
  const cached = cache.get(ip);
  if (cached) return cached;

  const info = (await abuseipdb(ip)) ?? (await dnsbl(ip)) ?? {};
  cache.set(ip, info);
  return info;
}
