'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import DataTable from '@/components/DataTable';

type Preview = { columns: string[]; rows: any[] };

export default function QueriesPage() {
  const [datasetId, setDatasetId] = useState<number | ''>('');
  const [sql, setSql] = useState('SELECT name, value FROM {{table}} WHERE value > 20 ORDER BY value DESC;');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const idStr = p.get('id');
    if (idStr && /^\d+$/.test(idStr)) setDatasetId(parseInt(idStr, 10));
  }, []);

  async function quickPreview() {
    setErr('');
    if (!datasetId) return setErr('Enter dataset id.');
    try {
      const data: Preview = await api(`/datasets/${datasetId}/preview`);
      setPreview(data);
    } catch (e: any) { setErr(e?.message || 'Failed preview'); }
  }

  async function runSQL() {
    setErr('');
    if (!datasetId) return setErr('Enter dataset id.');
    try {
      const data: Preview = await api('/queries/run', { method: 'POST', body: JSON.stringify({ dataset_id: Number(datasetId), sql }) });
      setPreview(data);
    } catch (e: any) { setErr(e?.message || 'Query failed'); }
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Queries</h1>
      <div className="flex items-center gap-2">
        <label className="font-medium">Dataset id:</label>
        <input value={datasetId} onChange={e=>setDatasetId(e.target.value === '' ? '' : Number(e.target.value))}
          className="border rounded px-2 py-1 w-24" />
        <button onClick={quickPreview} className="px-3 py-1 border rounded">Quick Preview</button>
      </div>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">SQL Console</h2>
        <textarea className="w-full border rounded p-2 font-mono" rows={6} value={sql} onChange={e=>setSql(e.target.value)} />
        <button onClick={runSQL} className="px-3 py-1 border rounded bg-emerald-500">Run</button>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Preview</h2>
        {err && <div className="text-red-500 whitespace-pre-wrap">{err}</div>}
        {preview ? <DataTable columns={preview.columns} rows={preview.rows} /> : <div className="text-slate-500">No results to display.</div>}
      </section>
    </main>
  );
}










