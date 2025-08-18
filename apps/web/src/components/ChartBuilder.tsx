'use client';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type Props = {
  data: { columns: string[]; rows: Record<string, any>[] };
  type: 'bar' | 'line' | 'scatter' | 'pie';
  x: string;
  y?: string;
};

export default function ChartBuilder({ data, type, x, y }: Props) {
  const trace = useMemo(() => {
    const xs = data.rows.map((r) => r?.[x]);
    const ys = y ? data.rows.map((r) => r?.[y]) : [];
    if (type === 'pie') return [{ labels: xs, values: ys, type: 'pie' as const }];
    if (type === 'line') return [{ x: xs, y: ys, type: 'scatter' as const, mode: 'lines' as const }];
    return [{ x: xs, y: ys, type: type as any, mode: 'markers+lines' }];
  }, [data, type, x, y]);

  return <Plot data={trace as any} layout={{ autosize: true }} style={{ width: '100%', height: 360 }} />;
}
