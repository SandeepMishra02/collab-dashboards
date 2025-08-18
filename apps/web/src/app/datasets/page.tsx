'use client';
import { useState } from 'react';
import { API_URL, api } from '@/lib/api';
import DataTable from '@/components/DataTable';

type Preview = { columns: string[]; rows: any[] };

export default function DatasetsPage() {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [lastId, setLastId] = useState<number | null>(null);

  async function upload() {
    if (!name || !file) return alert('Enter name + pick file');
    const form = new FormData();
    form.append('name', name);
    form.append('file', file);
    const res = await fetch(`${API_URL}/datasets/upload`, { method: 'POST', body: form });
    if (!res.ok) return alert(await res.text());
    const data = await res.json();
    setLastId(data.id);
    const prv = await api(`/datasets/${data.id}/preview`);
    setPreview(prv);
  }

  async function loadById(idStr: string) {
    const id = Number(idStr);
    if (!id) return;
    const prv = await api(`/datasets/${id}/preview`);
    setPreview(prv); setLastId(id);
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Datasets</h1>
      <div className="flex gap-2 items-center">
        <input placeholder="Sample" className="border rounded px-2 py-1" value={name} onChange={e=>setName(e.target.value)} />
        <input type="file" onChange={e=>setFile(e.target.files?.[0] || null)} />
        <button onClick={upload} className="px-3 py-1 border rounded">Upload</button>
        {lastId !== null && <div>Last dataset id: <b>{lastId}</b></div>}
      </div>

      <div className="flex gap-2 items-center">
        <input placeholder="dataset id" className="border rounded px-2 py-1 w-32" onKeyDown={e=>{if(e.key==='Enter') loadById((e.target as HTMLInputElement).value)}} />
        <button className="px-3 py-1 border rounded" onClick={()=>{
          const el = document.querySelector<HTMLInputElement>('input[placeholder="dataset id"]');
          if (el?.value) loadById(el.value);
        }}>Load by ID</button>
      </div>

      {preview && <DataTable columns={preview.columns} rows={preview.rows} />}
    </main>
  );
}





