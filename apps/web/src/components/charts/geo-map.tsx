'use client';

import { useEffect, useState } from 'react';
import { EChart, echarts, CHART_SURFACE } from './base';

// Minimal country → [lng, lat] centroids for locations the SIEM is likely to
// see. Extend as GeoIP enrichment lands. Unknown countries are skipped.
const COUNTRY_COORDS: Record<string, [number, number]> = {
  Philippines: [121.77, 12.88],
  'United States': [-98.5, 39.8],
  USA: [-98.5, 39.8],
  Singapore: [103.82, 1.35],
  Japan: [138.25, 36.2],
  India: [78.96, 20.59],
  Germany: [10.45, 51.17],
  'United Kingdom': [-3.44, 55.38],
  Russia: [105.32, 61.52],
  China: [104.2, 35.86],
  Brazil: [-51.93, -14.24],
  Australia: [133.78, -25.27],
  Canada: [-106.35, 56.13],
  France: [2.21, 46.23],
  Netherlands: [5.29, 52.13],
};

export function GeoMap({
  data,
}: {
  data: { country: string; count: number; lat?: number; lng?: number }[];
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/world.json')
      .then((r) => r.json())
      .then((geo) => {
        if (cancelled) return;
        echarts.registerMap('world', geo);
        setReady(true);
      })
      .catch(() => setReady(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const points = data
    .map((d) => {
      // Prefer real coordinates from GeoIP enrichment; fall back to the
      // country-centroid table for events that predate enrichment.
      const coord: [number, number] | undefined =
        typeof d.lng === 'number' && typeof d.lat === 'number'
          ? [d.lng, d.lat]
          : COUNTRY_COORDS[d.country];
      return coord ? { name: d.country, value: [coord[0], coord[1], d.count] } : null;
    })
    .filter(Boolean);

  if (!ready) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Loading map…
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.count));

  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: CHART_SURFACE,
      borderColor: 'rgba(139,147,167,0.2)',
      textStyle: { color: '#e5e7eb' },
      formatter: (p: any) =>
        p.value ? `${p.name}: ${p.value[2]} events` : p.name,
    },
    geo: {
      map: 'world',
      roam: false,
      silent: true,
      itemStyle: {
        areaColor: '#151b26',
        borderColor: '#273143',
        borderWidth: 0.5,
      },
      emphasis: { disabled: true },
    },
    series: [
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        rippleEffect: { scale: 3, brushType: 'stroke' },
        symbolSize: (val: number[]) => 6 + (val[2] / max) * 20,
        itemStyle: { color: '#ef4444', shadowBlur: 8, shadowColor: '#ef4444' },
        data: points,
      },
    ],
  };

  return (
    <div>
      <EChart option={option} style={{ height: 300 }} />
      {points.length === 0 && (
        <p className="mt-1 text-center text-xs text-muted-foreground">
          No geo-located events yet — add GeoIP enrichment to populate the map.
        </p>
      )}
    </div>
  );
}
