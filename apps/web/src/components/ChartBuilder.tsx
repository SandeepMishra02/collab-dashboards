'use client';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type Props = {
  columns: string[];
  rows: any[];
  value?: any;
  onChange?: (cfg: any) => void;
};

export default function ChartBuilder({ columns, rows, value, onChange }: Props) {
  const [type, setType] = useState<string>(value?.type || 'table');
  const [x, setX] = useState<string>(value?.x || (columns[0] || ''));
  const [y, setY] = useState<string>(value?.y || (columns[1] || ''));

  const figure = useMemo(() => {
    if (type === 'table') return null;
    const xs = rows.map(r => r?.[x]);
    const ys = rows.map(r => Number(r?.[y]));
    const trace = { type, x: xs, y: ys, mode: type === 'scatter' ? 'markers+lines' : undefined };
    return { data: [trace], layout: { margin: { t: 30, r: 10, l: 40, b: 40 }, height: 360 } };
  }, [type, x, y, rows]);

  function emit(next: any) {
    onChange?.(next);
  }

  return (
    <div style={{ display:'grid', gap: 8 }}>
      <div style={{ display:'flex', gap: 8, flexWrap:'wrap' }}>
        <label>Type
          <select value={type} onChange={e => { const t=e.target.value; setType(t); emit({ type: t, x, y }); }} style={{ marginLeft: 8 }}>
            <option value="table">Table</option>
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="scatter">Scatter</option>
          </select>
        </label>
        <label>X
          <select value={x} onChange={e => { const v=e.target.value; setX(v); emit({ type, x: v, y }); }} style={{ marginLeft: 8 }}>
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>Y
          <select value={y} onChange={e => { const v=e.target.value; setY(v); emit({ type, x, y: v }); }} style={{ marginLeft: 8 }}>
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      {type === 'table' ? (
        <div style={{ opacity:.7 }}>Chart preview not needed for tables.</div>
      ) : (
        <Plot data={figure?.data || []} layout={figure?.layout} config={{ displayModeBar: false }} />
      )}
    </div>
  );
}
