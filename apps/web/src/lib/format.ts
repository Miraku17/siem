// Compact relative time, e.g. "12s", "5m", "3h", "2d". Falls back to a date.
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${Math.max(s, 0)}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Deterministic HSL color per key (application slug). Same app → same hue,
// so a growing list of sources stays visually distinguishable.
export function stringToHue(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

export function appColor(slug: string): { bg: string; fg: string; dot: string } {
  const h = stringToHue(slug);
  return {
    bg: `hsl(${h} 60% 50% / 0.14)`,
    fg: `hsl(${h} 70% 72%)`,
    dot: `hsl(${h} 65% 60%)`,
  };
}
