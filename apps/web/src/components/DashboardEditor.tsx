'use client';
import { useEffect, useRef, useState } from "react";
import { API_URL, api } from "@/lib/api";

type Widget = { id:string; title:string; note?:string; };

export default function DashboardEditor({dashId}:{dashId:number}){
  const [layout,setLayout]=useState<{widgets:Widget[]}>({widgets:[]});
  const [presence,setPresence]=useState<number>(0);
  const wsRef = useRef<WebSocket|null>(null);

  useEffect(()=>{
    (async()=>{
      const data = await api(`/dashboards/${dashId}`);
      setLayout(data.layout||{widgets:[]});
    })();
  },[dashId]);

  useEffect(()=>{
    const ws = new WebSocket(`${API_URL.replace('http','ws')}/collab/${dashId}`);
    wsRef.current = ws;
    ws.onmessage = (ev)=>{
      const msg = JSON.parse(ev.data);
      if(msg.type==="join"||msg.type==="leave") setPresence(msg.count||0);
      if(msg.type==="patch" && msg.payload?.widgets) setLayout(msg.payload);
    };
    return ()=>ws.close();
  },[dashId]);

  function addWidget(){
    const next = {...layout, widgets:[...layout.widgets, {id:crypto.randomUUID(), title:"New widget"}]};
    setLayout(next);
    wsRef.current?.send(JSON.stringify(next));
  }

  async function save(){
    await api(`/dashboards/${dashId}/publish`, {method:"POST"});
    alert("Published (read-only token refreshed)");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <button onClick={addWidget} className="px-3 py-1 rounded bg-emerald-500 text-black">+ Widget</button>
        <button onClick={save} className="px-3 py-1 rounded bg-sky-500 text-black">Publish</button>
        <span className="text-slate-400">Present: {presence}</span>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {layout.widgets.map(w=>(
          <div key={w.id} className="rounded-xl border border-slate-700 p-2">
            <input className="bg-transparent font-semibold" defaultValue={w.title}
              onChange={e=>{
                const next = {...layout, widgets: layout.widgets.map(x=>x.id===w.id?{...x,title:e.target.value}:x)};
                setLayout(next); wsRef.current?.send(JSON.stringify(next));
              }}/>
            <textarea className="w-full bg-slate-900 border border-slate-700 rounded p-2 mt-2" placeholder="notes/annotations"
              onChange={e=>{
                const next = {...layout, widgets: layout.widgets.map(x=>x.id===w.id?{...x,note:e.target.value}:x)};
                setLayout(next); wsRef.current?.send(JSON.stringify(next));
              }}/>
          </div>
        ))}
      </div>
    </div>
  );
}
