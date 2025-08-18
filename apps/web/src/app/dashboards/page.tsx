'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function DashboardsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => { load(); }, []);
  async function load(){ setRows(await api('/dashboards')); }
  async function create(){
    if (!title.trim()) return;
    const res = await api('/dashboards', { method:'POST', body: JSON.stringify({ title, widgets: [] }) });
    setTitle(''); load();
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Dashboards</h1>
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1" value={title} onChange={e=>setTitle(e.target.value)} placeholder="New dashboard title" />
        <button className="border rounded px-3 py-1" onClick={create}>Create</button>
      </div>
      <ul className="space-y-2">
        {rows.map((r:any)=>(
          <li key={r.id} className="border rounded p-2 flex justify-between">
            <Link href={`/dashboards/${r.id}`} className="underline">{r.title}</Link>
            {r.is_public ? <span className="text-xs">public</span> : null}
          </li>
        ))}
      </ul>
    </main>
  );
}

