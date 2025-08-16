'use client';

import { useState } from 'react';

export default function QueryPanel({ datasetId }: { datasetId: string }) {
  const [sql, setSql] = useState('SELECT * FROM {{table}} LIMIT 50;');
  const [rows, setRows] = useState<any[] | null>(null);
  const [cols, setCols] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId, sql }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCols(data.columns);
      setRows(data.rows);
    } catch (e: any) {
      console.error(e);
      alert(`Query failed: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <textarea
        rows={6}
        style={{ width: '100%' }}
        value={sql}
        onChange={(e) => setSql(e.target.value)}
      />
      <button onClick={run} disabled={busy}>
        {busy ? 'Running…' : 'Run'}
      </button>

      {rows && cols && (
        <div style={{ overflow: 'auto', maxHeight: 300, marginTop: 8 }}>
          <table>
            <thead>
              <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c}>{String(r[c])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
