'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { API_URL, api } from '@/lib/api';
import DataTable from '@/components/DataTable';
import ChartBuilder from '@/components/ChartBuilder';
import CommentThread from '@/components/CommentThread';

type Preview = { columns: string[]; rows: any[] };
type Widget = {
  query: { dataset_id: number; sql: string };
  viz: { type: 'bar'|'line'|'scatter'|'pie'; x: string; y?: string };
  rect: { x: number; y: number; w: number; h: number };
};

export default function DashboardEditor({ params }: { params: { id: string } }) {
  const dashId = Number(params.id);
  const [title, setTitle] = useState('');
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [dataCache, setDataCache] = useState<Record<number, Preview>>({});
  const wsRef = useRef<WebSocket|null>(null);
  const [presence, setPresence] = useState(1);

  async function load() {
    const d = await api(`/dashboards/${dashId}`);
    setTitle(d.title); setWidgets(d.widgets || []);
  }
  useEffect(() => { load(); }, [dashId]);

  useEffect(() => {
    const ws = new WebSocket(`${API_URL.replace('http','ws')}/ws/dashboards/${dashId}`);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'presence') setPresence(msg.count);
      if (msg.type === 'patch' && msg.widgets) setWidgets(msg.widgets);
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [dashId]);

  function broadcastPatch(next: Widget[]) {
    wsRef.current?.send(JSON.stringify({ type: 'patch', widgets: next }));
  }

  async function save() {
    await api(`/dashboards/${dashId}`, { method: 'PUT', body: JSON.stringify({ title, widgets }) });
    alert('Saved');
  }

  function addWidget() {
    const w: Widget = {
      query: { dataset_id: 1, sql: 'SELECT * FROM {{table}} LIMIT 50;' },
      viz: { type: 'bar', x: 'id', y: 'value' },
      rect: { x: 0, y: widgets.length*10, w: 12, h: 10 },
    };
    const next = [...widgets, w]; setWidgets(next); broadcastPatch(next);
  }
  function removeWidget(i: number) {
    const next = widgets.filter((_, idx)=>idx!==i); setWidgets(next); broadcastPatch(next);
  }

  async function runWidget(i: number) {
    const w = widgets[i];
    const data: Preview = await api('/queries/run', { method:'POST', body: JSON.stringify({ dataset_id: w.query.dataset_id, sql: w.query.sql }) });
    setDataCache((prev)=>({ ...prev, [i]: data }));
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard #{dashId}</h1>
        <div className="text-sm text-slate-500">In room: {presence}</div>
      </div>

      <div className="flex gap-2">
        <input className="border rounded px-2 py-1 flex-1" value={title} onChange={e=>setTitle(e.target.value)} />
        <button className="border rounded px-3 py-1" onClick={save}>Save</button>
        <button className="border rounded px-3 py-1" onClick={addWidget}>Add widget</button>
      </div>

      <div className="space-y-6">
        {widgets.map((w, i)=>(
          <div key={i} className="border rounded p-3 space-y-3">
            <div className="flex gap-2 items-center">
              <span className="font-semibold">Widget #{i+1}</span>
              <button className="border rounded px-2 py-1" onClick={()=>removeWidget(i)}>Remove</button>
            </div>

            {/* Query config */}
            <div className="grid grid-cols-3 gap-2">
              <input className="border rounded px-2 py-1" type="number" min={1}
                value={w.query.dataset_id}
                onChange={(e)=>{ const next=[...widgets]; next[i].query.dataset_id = Number(e.target.value); setWidgets(next); broadcastPatch(next); }}
                placeholder="dataset id" />
              <select className="border rounded px-2 py-1"
                value={w.viz.type}
                onChange={(e)=>{ const next=[...widgets]; next[i].viz.type = e.target.value as any; setWidgets(next); broadcastPatch(next); }}>
                <option>bar</option><option>line</option><option>scatter</option><option>pie</option>
              </select>
              <button className="border rounded px-2 py-1" onClick={()=>runWidget(i)}>Run</button>
            </div>
            <textarea className="w-full border rounded p-2 font-mono" rows={4}
              value={w.query.sql}
              onChange={(e)=>{ const next=[...widgets]; next[i].query.sql = e.target.value; setWidgets(next); broadcastPatch(next); }} />

            {/* Viz config */}
            <div className="flex gap-2">
              <input className="border rounded px-2 py-1" placeholder="x" value={w.viz.x}
                onChange={(e)=>{ const next=[...widgets]; next[i].viz.x = e.target.value; setWidgets(next); broadcastPatch(next); }} />
              {w.viz.type !== 'pie' && (
                <input className="border rounded px-2 py-1" placeholder="y" value={w.viz.y || ''}
                  onChange={(e)=>{ const next=[...widgets]; next[i].viz.y = e.target.value; setWidgets(next); broadcastPatch(next); }} />
              )}
            </div>

            {/* Output */}
            {dataCache[i]
              ? (w.viz.type ? <ChartBuilder data={dataCache[i]} type={w.viz.type} x={w.viz.x} y={w.viz.y}/> : <DataTable columns={dataCache[i].columns} rows={dataCache[i].rows} />)
              : <div className="text-slate-500">Click “Run” to load data</div>}
          </div>
        ))}
      </div>

      <CommentThread dashboardId={dashId} />
    </main>
  );
}
