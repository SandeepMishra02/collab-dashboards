'use client';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useState } from 'react';

export default function DashboardsHome() {
  const [title, setTitle] = useState('New Dashboard');
  const [openId, setOpenId] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function create() {
    setBusy(true);
    try {
      const d = await api.post('/dashboards', { title });
      router.push(`/dashboards/${d.id}`);
    } catch (e:any) { alert(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Dashboards</h1>
      <div style={{ display:'grid', gap:12, maxWidth:560 }}>
        <div style={{ display:'flex', gap:8 }}>
          <input value={title} onChange={e=>setTitle(e.target.value)} style={{ flex:1 }} />
          <button onClick={create} disabled={busy}>Create</button>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input placeholder="Open by id…" value={openId} onChange={e=>setOpenId(e.target.value)} style={{ flex:1 }} />
          <button onClick={()=>openId && router.push(`/dashboards/${openId}`)} disabled={!openId}>Open</button>
        </div>
      </div>
    </div>
  );
}
