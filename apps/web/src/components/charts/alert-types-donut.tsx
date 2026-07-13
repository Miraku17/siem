'use client';

import { EChart, CHART_PALETTE, CHART_INK, CHART_SURFACE } from './base';

export function AlertTypesDonut({
  data,
}: {
  data: { type: string; count: number }[];
}) {
  const total = data.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No events yet.
      </div>
    );
  }

  const option = {
    color: CHART_PALETTE,
    tooltip: {
      trigger: 'item',
      backgroundColor: CHART_SURFACE,
      borderColor: 'rgba(139,147,167,0.2)',
      textStyle: { color: '#e5e7eb' },
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      bottom: 0,
      left: 'center',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: CHART_INK, fontSize: 11 },
    },
    title: {
      text: total.toLocaleString(),
      subtext: 'Total events',
      left: 'center',
      top: '30%',
      textStyle: { color: '#e5e7eb', fontSize: 24, fontWeight: 600 },
      subtextStyle: { color: CHART_INK, fontSize: 11 },
    },
    series: [
      {
        type: 'pie',
        radius: ['52%', '72%'],
        center: ['50%', '40%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: {
          borderColor: CHART_SURFACE,
          borderWidth: 2,
          borderRadius: 3,
        },
        data: data.map((d) => ({ name: d.type, value: d.count })),
      },
    ],
  };

  return <EChart option={option} style={{ height: 300 }} />;
}
