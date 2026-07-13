'use client';

import {
  EChart,
  CHART_PALETTE,
  CHART_INK,
  CHART_SURFACE,
  CHART_GRID,
} from './base';

export function LogSourcesArea({
  hours,
  series,
}: {
  hours: string[];
  series: { name: string; data: number[] }[];
}) {
  if (series.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No event volume in the last 24h.
      </div>
    );
  }

  const labels = hours.map((h) =>
    new Date(h).toLocaleTimeString([], { hour: 'numeric', hour12: true }),
  );

  const option = {
    color: CHART_PALETTE,
    tooltip: {
      trigger: 'axis',
      backgroundColor: CHART_SURFACE,
      borderColor: 'rgba(139,147,167,0.2)',
      textStyle: { color: '#e5e7eb' },
    },
    legend: {
      top: 0,
      right: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: CHART_INK, fontSize: 11 },
    },
    grid: { left: 36, right: 12, top: 36, bottom: 28 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: CHART_GRID } },
      axisLabel: { color: CHART_INK, fontSize: 10, interval: 5 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: CHART_GRID } },
      axisLabel: { color: CHART_INK, fontSize: 10 },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      stack: 'total',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.22 },
      emphasis: { focus: 'series' },
      data: s.data,
    })),
  };

  return <EChart option={option} style={{ height: 300 }} />;
}
