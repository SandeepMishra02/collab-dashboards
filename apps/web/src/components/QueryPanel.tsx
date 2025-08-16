'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import DataTable from './DataTable';
import ChartBuilder from './ChartBuilder';

export default function QueryPanel({ datasetId }: { datasetId: string }) {
  const [sql, setSql] = useState('SELECT * FROM {{table}} LIMIT 50;');
  const [cols, setCols] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [cfg, setCfg] = useState<any>({ type: 'table' });
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const data = await api.post('/query', { datasetId, sql });
      setCols(data.columns || []);
      setRows(data.rows || []);
    } catch (e:any) {
      alert(e.message);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display:'grid', gap:10 }}>
      <textarea rows={6} value={sql} onChange={e=>setSql(e.target.value)} style={{ width:'100%' }} />
      <button onClick={run} disabled={busy}>Run</button>
      <div style={{ display:'grid', gap:10 }}>
        <ChartBuilder columns={cols} rows={rows} value={cfg} onChange={setCfg} />
        {cfg?.type === 'table' && <DataTable columns={cols} rows={rows} />}
      </div>
    </div>
  );
}
