'use client';
import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import QueryPanel from '@/components/QueryPanel';

type Ds = { id: string; name: string };

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Ds[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const canUpload = !!name && !!file && !busy;

  async function loadDatasets() {
    const res = await fetch(`${API}/datasets`, { cache: 'no-store' });
    const data = await res.json();
    setDatasets(data);
    if (!current && data.length) setCurrent(data[0].id ?? data[0].name);
  }

  useEffect(() => { loadDatasets().catch(console.error); }, []);

  async function doUpload() {
    if (!file) { alert('Select a file'); return; }
    if (!name) { alert('Enter a dataset name'); return; }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('file', file);
      const res = await fetch(`${API}/datasets`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      await loadDatasets();
      setName('');
      setCurrent(data.id ?? data.name);
      alert('Upload complete ✅');
    } catch (e:any) { alert(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Datasets</h1>
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <input placeholder="Dataset name" value={name} onChange={e=>setName(e.target.value)} style={{ width:240 }} />
        <input type="file" onChange={e=>setFile(e.target.files?.[0] || null)} />
        <button onClick={doUpload} disabled={!canUpload}>{busy ? 'Uploading…' : 'Upload'}</button>
        {file && <span style={{ opacity:.7 }}>Selected: {file.name}</span>}
      </div>

      <h3 style={{ marginTop: 18 }}>Uploaded</h3>
      <ul>
        {datasets.map(d => (
          <li key={d.id || d.name}>
            <button onClick={() => setCurrent(d.id ?? d.name)}>{d.name}</button>
          </li>
        ))}
      </ul>

      <h3>Preview</h3>
      <div style={{ opacity:.6 }}>{current ? '' : 'Pick a dataset to query.'}</div>

      {current && (
        <div style={{ marginTop: 8 }}>
          <QueryPanel datasetId={current} />
        </div>
      )}
    </div>
  );
}
