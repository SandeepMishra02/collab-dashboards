'use client';

import { useEffect, useRef, useState } from 'react';
import { API_URL, api } from '@/lib/api';

type Widget = {
  id: string;
  title: string;
  note?: string;
};

type Layout = {
  widgets: Widget[];
};

type DashboardDoc = {
  id: number | string;
  title?: string;
  layout?: Layout;
};

function emptyLayout(): Layout {
  return { widgets: [] };
}

export default function DashboardEditor({ dashId }: { dashId: number }) {
  const [doc, setDoc] = useState<DashboardDoc>({
    id: dashId,
    title: `Dashboard #${dashId}`,
    layout: emptyLayout(),
  });

  const [presence, setPresence] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  // ---- Load current dashboard ----
  useEffect(() => {
    (async () => {
      const res = await api(`/dashboards/${dashId}`);
      // normalize everything we need
      const normalized: DashboardDoc = {
        id: res?.id ?? dashId,
        title: res?.title ?? `Dashboard #${dashId}`,
        layout: {
          widgets: Array.isArray(res?.layout?.widgets)
            ? res.layout.widgets
            : [],
        },
      };
      setDoc(normalized);
    })();
  }, [dashId]);

  // ---- (Optional) presence / realtime preview ----
  useEffect(() => {
    const url = API_URL.replace(/^http/, 'ws') + `/collab/${dashId}`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data || '{}');
        if (msg?.type === 'join' || msg?.type === 'leave') {
          setPresence(msg?.count ?? 0);
        }
        if (msg?.type === 'patch' && Array.isArray(msg?.payload?.widgets)) {
          setDoc((d) => ({
            ...d,
            layout: { widgets: msg.payload.widgets },
          }));
        }
      };
    } catch {
      // dev env without ws endpoint — ignore
    }

    return () => ws?.close();
  }, [dashId]);

  // ---- helpers ----
  const layout = doc.layout ?? emptyLayout();
  const widgets = Array.isArray(layout.widgets) ? layout.widgets : [];

  function broadcast(next: Layout) {
    try {
      wsRef.current?.send(JSON.stringify({ type: 'patch', payload: next }));
    } catch {
      /* noop */
    }
  }

  function addWidget() {
    const next: Layout = {
      widgets: [
        ...widgets,
        { id: crypto.randomUUID(), title: 'New widget' },
      ],
    };
    setDoc((d) => ({ ...d, layout: next }));
    broadcast(next);
  }

  function updateWidgetTitle(id: string, title: string) {
    const next: Layout = {
      widgets: widgets.map((w) => (w.id === id ? { ...w, title } : w)),
    };
    setDoc((d) => ({ ...d, layout: next }));
    broadcast(next);
  }

  function updateWidgetNote(id: string, note: string) {
    const next: Layout = {
      widgets: widgets.map((w) => (w.id === id ? { ...w, note } : w)),
    };
    setDoc((d) => ({ ...d, layout: next }));
    broadcast(next);
  }

  async function save() {
    // ALWAYS send an array for widgets
    const payload = {
      title: doc.title ?? `Dashboard #${dashId}`,
      layout: { widgets },
    };

    await api(`/dashboards/${dashId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    alert('Dashboard saved');
  }

  async function publish() {
    await api(`/dashboards/${dashId}/publish`, { method: 'POST' }).catch(
      () => {}
    );
    alert('Published (read-only link refreshed)');
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <button
          onClick={addWidget}
          className="px-3 py-1 rounded bg-emerald-500 text-black"
        >
          + Widget
        </button>
        <button
          onClick={save}
          className="px-3 py-1 rounded bg-sky-500 text-black"
        >
          Save
        </button>
        <button
          onClick={publish}
          className="px-3 py-1 rounded bg-indigo-500 text-black"
        >
          Publish
        </button>
        <span className="text-slate-400">Present: {presence}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {(widgets ?? []).map((w) => (
          <div key={w.id} className="rounded-xl border border-slate-700 p-2">
            <input
              className="bg-transparent font-semibold w-full"
              defaultValue={w.title}
              onChange={(e) => updateWidgetTitle(w.id, e.target.value)}
            />
            <textarea
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 mt-2"
              placeholder="notes/annotations"
              defaultValue={w.note ?? ''}
              onChange={(e) => updateWidgetNote(w.id, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}



