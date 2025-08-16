'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Ds = { id: string; name: string };

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Ds[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [previewCols, setPreviewCols] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [sql, setSql] = useState('SELECT * FROM {{table}} LIMIT 50;');
  const [resultCols, setResultCols] = useState<string[]>([]);
  const [resultRows, setResultRows] = useState<any[]>([]);

  async function loadDatasets() {
    const res = await fetch(`${API}/datasets`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch datasets');
    const data = await res.json();
    setDatasets(data);
    if (!current && data.length) {
      setCurrent(data[0].id ?? data[0].name);
    }
  }

  useEffect(() => { loadDatasets().catch(console.error); }, []);

  async function doUpload() {
    if (!file) { alert('Select a file'); return; }
    if (!name) { alert('Enter a dataset name'); return; }

    const fd = new FormData();
    fd.append('name', name);
    fd.append('file', file);

    const res = await fetch(`${API}/datasets`, { method: 'POST', body: fd });
    if (!res.ok) {
      const msg = await res.text().catch(()=>'');
      alert(msg || 'Upload failed');
      return;
    }
    await loadDatasets();
    setName('');
    setFile(null);
    alert('Upload complete ✅');
  }

  async function doPreview() {
    if (!current) return;
    const res = await fetch(`${API}/datasets/${current}/preview`, { cache: 'no-store' });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    const data = await res.json();
    setPreviewCols(data.columns || []);
    setPreviewRows(data.rows || []);
  }

  async function doQuery() {
    if (!current) return;
    const res = await fetch(`${API}/query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ datasetId: current, sql }),
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    const data = await res.json();
    setResultCols(data.columns || []);
    setResultRows(data.rows || []);
  }

  useEffect(() => { if (current) doPreview().catch(console.error); }, [current]);

  return (
    <div style={{ padding: 16 }}>
      <h1>Datasets</h1>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          placeholder="Dataset name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: 220 }}
        />
        <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
        <button onClick={doUpload}>Upload</button>
      </div>

      <h3 style={{ marginTop: 24 }}>Uploaded</h3>
      <ul>
        {datasets.map(d => (
          <li key={d.id || d.name}>
            <button onClick={() => setCurrent(d.id ?? d.name)}>
              {d.name}
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <>
          <h3>Preview</h3>
          <div style={{ overflowX: 'auto', border: '1px solid #ddd' }}>
            <table>
              <thead>
                <tr>{previewCols.map(c => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i}>
                    {previewCols.map(c => <td key={c}>{String(r[c])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ marginTop: 24 }}>Query</h3>
          <textarea
            rows={5}
            style={{ width: '100%' }}
            value={sql}
            onChange={e => setSql(e.target.value)}
          />
          <div style={{ marginTop: 8 }}>
            <button onClick={doQuery}>Run</button>
          </div>
          <div style={{ marginTop: 8, overflowX: 'auto', border: '1px solid #ddd' }}>
            <table>
              <thead>
                <tr>{resultCols.map(c => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {resultRows.map((r, i) => (
                  <tr key={i}>
                    {resultCols.map(c => <td key={c}>{String(r[c])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
