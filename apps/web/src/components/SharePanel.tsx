'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function SharePanel({ dashboardId, isPublic, onPublic }: { dashboardId: string; isPublic: boolean; onPublic: (p: boolean)=>void }) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<'viewer'|'editor'|'owner'>('viewer');
  const [busy, setBusy] = useState(false);

  async function invite() {
    setBusy(true);
    try {
      const list = emails.split(',').map(e => e.trim()).filter(Boolean);
      await api.post('/share', { dashboardId, emails: list, role });
      alert('Invites sent');
      setEmails('');
    } catch (e:any) {
      alert(e.message);
    } finally { setBusy(false); }
  }

  async function togglePublic() {
    try {
      const res = await api.post(`/dashboards/${dashboardId}/toggle-public`, {});
      onPublic(!!res.is_public);
    } catch (e:any) { alert(e.message); }
  }

  return (
    <div style={{ border:'1px solid #eee', padding:12, borderRadius:8 }}>
      <h4 style={{ marginTop:0 }}>Share</h4>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <input placeholder="alice@, bob@" value={emails} onChange={e=>setEmails(e.target.value)} style={{ minWidth:260 }} />
        <select value={role} onChange={e=>setRole(e.target.value as any)}>
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="owner">Owner</option>
        </select>
        <button onClick={invite} disabled={busy || !emails.trim()}>Invite</button>
      </div>
      <div style={{ marginTop:10 }}>
        <button onClick={togglePublic}>{isPublic ? 'Make Private' : 'Make Public'}</button>
        <span style={{ marginLeft:8, opacity:.7 }}>Current: <strong>{isPublic ? 'Public' : 'Private'}</strong></span>
      </div>
    </div>
  );
}
