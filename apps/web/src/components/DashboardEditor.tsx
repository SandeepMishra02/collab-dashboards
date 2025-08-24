"use client";
import { useEffect, useRef, useState } from "react";
import { API_URL, api } from "@/lib/api";

type Widget = { id: string; title: string; note?: string };
type Layout = { widgets: Widget[] };

export default function DashboardEditor({ dashId }: { dashId: number }) {
  const [layout, setLayout] = useState<Layout>({ widgets: [] });
  const [presence, setPresence] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const doc = await api(`/dashboards/${dashId}`);
        if (Array.isArray(doc)) setLayout({ widgets: doc as Widget[] });
        else if (doc?.layout?.widgets) setLayout(doc.layout as Layout);
        else if (doc?.widgets) setLayout({ widgets: doc.widgets as Widget[] });
        else setLayout({ widgets: [] });
      } catch (e) {
        console.error("load dashboard failed", e);
        setLayout({ widgets: [] });
      }
    })();
  }, [dashId]);

  // Collab (matches main.py -> /collab/{dash_id})
  useEffect(() => {
    const ws = new WebSocket(API_URL.replace(/^http/, "ws") + `/collab/${dashId}`);
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "join" || msg.type === "leave") setPresence(msg.count || 0);
        if (msg.type === "patch" && msg.payload?.widgets) setLayout(msg.payload as Layout);
      } catch {}
    };
    return () => ws.close();
  }, [dashId]);

  function addWidget() {
    const next: Layout = { widgets: [...layout.widgets, { id: crypto.randomUUID(), title: "New widget" }] };
    setLayout(next);
    wsRef.current?.send(JSON.stringify({ type: "patch", payload: next }));
  }

  function patchWidget(id: string, patch: Partial<Widget>) {
    const next: Layout = { widgets: layout.widgets.map(w => (w.id === id ? { ...w, ...patch } : w)) };
    setLayout(next);
    wsRef.current?.send(JSON.stringify({ type: "patch", payload: next }));
  }

  async function save() {
    await api(`/dashboards/${dashId}`, {
      method: "POST",
      body: JSON.stringify({ widgets: layout.widgets }),
    });
    alert("Dashboard saved");
  }

  async function publish() {
    await api(`/dashboards/${dashId}/publish`, { method: "POST" });
    alert("Published (read-only link refreshed)");
  }

  return (
    <div className="grid gap-4">
      <div className="flex gap-2 items-center flex-wrap">
        <button className="btn" onClick={addWidget}>+ Widget</button>
        <button className="btn btn-primary" onClick={save}>Save</button>
        <button className="btn" onClick={publish}>Publish</button>
        <span className="muted">Present: {presence}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {layout.widgets.map((w) => (
          <div key={w.id} className="card grid gap-2">
            <input
              className="input"
              defaultValue={w.title}
              onChange={(e) => patchWidget(w.id, { title: e.target.value })}
              placeholder="Widget title"
            />
            <textarea
              className="textarea"
              defaultValue={w.note}
              onChange={(e) => patchWidget(w.id, { note: e.target.value })}
              placeholder="Notes / annotations"
              rows={3}
            />
          </div>
        ))}
      </div>
    </div>
  );
}










