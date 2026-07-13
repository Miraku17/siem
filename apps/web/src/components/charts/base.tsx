'use client';

import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts';

// Shared categorical palette (fixed order — never cycled). Distinct on the
// dark chart surface.
export const CHART_PALETTE = [
  '#60a5fa',
  '#f59e0b',
  '#2dd4bf',
  '#a3e635',
  '#c084fc',
  '#f87171',
  '#94a3b8',
];

// Token-ish colors read off the dark theme so charts match the console.
export const CHART_INK = '#8b93a7';
export const CHART_SURFACE = '#12161f';
export const CHART_GRID = 'rgba(139,147,167,0.12)';

export function EChart({
  option,
  style,
}: {
  option: Record<string, unknown>;
  style?: React.CSSProperties;
}) {
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge
      lazyUpdate
      style={{ height: 260, width: '100%', ...style }}
    />
  );
}

export { echarts };
