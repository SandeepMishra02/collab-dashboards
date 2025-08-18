'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function CommentThread({ dashboardId }: { dashboardId: number }) {
  const [items, setItems] = useState<any[]>([]);
  const [text, setText] = useState('');

  async function load() {
    const rows = await api(`/comments/${dashboardId}`);
    setItems(rows);
  }
  async function add() {
    if (!text.trim()) return;
    await api(`/comments`, { method: 'POST', body: JSON.stringify({ dashboard_id: dashboardId, body: text }) });
    setText(''); load();
  }

  useEffect(() => { load(); }, [dashboardId]);

  return (
    <section className="space-y-2">
      <h3 className="font-semibold">Comments</h3>
      <div className="space-y-2">
        {items.map((c) => (
          <div key={c.id} className="border rounded p-2">
            <div className="text-xs text-slate-500">{new Date(c.created_at).toLocaleString()} • user {c.author_id}</div>
            <div>{c.body}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1 flex-1" value={text} onChange={(e)=>setText(e.target.value)} placeholder="Add a comment..." />
        <button className="px-3 py-1 border rounded" onClick={add}>Post</button>
      </div>
    </section>
  );
}

