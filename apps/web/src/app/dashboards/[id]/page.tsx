'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { connectRoom } from '@/lib/collab';
import QueryPanel from '@/components/QueryPanel';
import DataTable from '@/components/DataTable';
import dynamic from 'next/dynamic';
import SharePanel from '@/components/SharePanel';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type Widget = { id: string; type: string; position: any; config: any };
type Dashboard = { id: string; title: string; is_public: boolean; ydoc_room: string; widgets: Widget[] };

export default function DashboardEditor() {
  const { id } = useParams<{ id: string }>();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [room, setRoom] = useState<ReturnType<typeof connectRoom> | null>(null);

  async function load() {
    const d: Dashboard = await api.get(`/dashboards/${id}`);
    setDash(d);
    setWidgets(d.widgets || []);
    if (!room && d.ydoc_room) setRoom(connectRoom(d.ydoc_room));
  }

  useEffect(() => { load().catch(e => alert(String(e))); }, [id]);

  // Live Yjs state (optional simple sync of widget list)
  useEffect(() => {
    if (!room) return;
    const yArr = room.doc.getArray<Widget>('widgets');
    if (yArr.length === 0 && widgets.length) {
      room.doc.transact(() => widgets.forEach(w => yArr.push([w])));
    }
    const sub = () => setWidgets(yArr.toArray());
    yArr.observe(sub);
    return () => yArr.unobserve(sub);
  }, [room]);

  async function addWidget() {
    // minimal widget with manual editing later
    const datasetId = prompt('Dataset id to power this widget (paste from /datasets list):');
    if (!datasetId) return;
    const type = prompt('Widget type: table | bar | line | scatter', 'table') || 'table';
    const w = await api.post('/widgets', {
      dashboardId: id,
      type,
      position: { x: 0, y: 0, w: 12, h: 6 },
      config: { datasetId, sql: 'SELECT * FROM {{table}} LIMIT 50;', chart: { type } }
    });
    // fetch server copy with id and append to Y doc (and local)
    const nw: Widget = { id: w.id, type, position: { x:0,y:0,w:12,h:6 }, config: { datasetId, sql: 'SELECT * FROM {{table}} LIMIT 50;', chart: { type } } };
    setWidgets(prev => [...prev, nw]);
    if (room) room.doc.getArray<Widget>('widgets').push([nw]);
  }

  async function saveWidget(w: Widget) {
    await api.patch(`/widgets/${w.id}`, { position: w.position, config: w.config });
    alert('Widget saved');
  }

  const presence = useMemo(() => room?.provider.awareness.getStates().size ?? 1, [room?.provider.awareness]);

  return (
    <div style={{ padding: 16, display:'grid', gap: 12 }}>
      {!dash ? <div>Loading…</div> : (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <h2 style={{ margin: 0 }}>{dash.title}</h2>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ opacity:.7 }}>Presence: {presence}</span>
              <button onClick={addWidget}>Add widget</button>
            </div>
          </div>

          <SharePanel dashboardId={dash.id} isPublic={dash.is_public} onPublic={(p)=>setDash(d=>d?{...d, is_public:p}:d)} />

          <div style={{ display:'grid', gap: 16 }}>
            {widgets.map((w, idx) => (
              <WidgetView key={w.id || idx} widget={w} onChange={(nw)=> {
                // local state update + Yjs broadcast
                setWidgets(prev => prev.map(x => (x.id===w.id? nw : x)));
                if (room) {
                  const arr = room.doc.getArray<any>('widgets');
                  const pos = arr.toArray().findIndex((x:any)=>x.id===w.id);
                  if (pos>=0) arr.delete(pos,1), arr.insert(pos,[nw]);
                }
              }} onSave={saveWidget} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function WidgetView({ widget, onChange, onSave }:{ widget: Widget; onChange:(w:Widget)=>void; onSave:(w:Widget)=>void }) {
  const [cols, setCols] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const { config } = widget;

  async function run() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/query`, {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({ datasetId: config.datasetId, sql: config.sql })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCols(data.columns||[]); setRows(data.rows||[]);
    } catch (e:any) { alert(e.message); }
  }

  useEffect(() => { run(); }, []);

  return (
    <div style={{ border:'1px solid #eee', borderRadius:8, padding:12 }}>
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <strong>Widget</strong>
        <label>Type
          <select value={widget.type} onChange={e => onChange({ ...widget, type: e.target.value })} style={{ marginLeft:8 }}>
            <option value="table">table</option>
            <option value="bar">bar</option>
            <option value="line">line</option>
            <option value="scatter">scatter</option>
          </select>
        </label>
        <label>Dataset
          <input value={config.datasetId} onChange={e=>onChange({ ...widget, config:{ ...config, datasetId: e.target.value }})} style={{ marginLeft:8, width:260 }} />
        </label>
        <button onClick={() => onSave(widget)}>Save</button>
      </div>

      <div style={{ marginTop:8 }}>
        <textarea rows={4} style={{ width:'100%' }} value={config.sql}
          onChange={e=>onChange({ ...widget, config: { ...config, sql: e.target.value }})} />
        <div style={{ marginTop:8 }}>
          <button onClick={run}>Run</button>
        </div>
      </div>

      <div style={{ marginTop:10 }}>
        {widget.type === 'table'
          ? <DataTable columns={cols} rows={rows} />
          : <Plot data={[{ type: widget.type, x: rows.map(r=>r[cols[0]]), y: rows.map(r=>Number(r[cols[1]])) }]}
                  layout={{ height: 320, margin:{ t:30, r:10, l:40, b:40 } }} config={{ displayModeBar:false }} />}
      </div>
    </div>
  );
}
