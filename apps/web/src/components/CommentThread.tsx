"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type C = { ts:number; widgetId:string; text:string; author:string };

export default function CommentThread({dashId, widgetId}:{dashId:number; widgetId:string}){
  const [list,setList] = useState<C[]>([]);
  const [txt,setTxt] = useState("");

  async function load(){
    const arr = await api(`/dashboards/${dashId}/comments`);
    setList(arr.filter((c:C)=>c.widgetId===widgetId));
  }
  async function post(){
    if(!txt.trim()) return;
    await api(`/dashboards/${dashId}/comments`, {
      method:"POST",
      body: JSON.stringify({widgetId, text: txt, author:"you"})
    });
    setTxt(""); await load();
  }
  useEffect(()=>{ load().catch(()=>{}); },[dashId, widgetId]);

  return (
    <div className="border-t border-slate-800 mt-2 pt-2">
      <div className="text-xs text-slate-400 mb-1">Comments</div>
      <div className="space-y-1 mb-2">
        {list.map((c,i)=>(
          <div key={i} className="text-sm">
            <span className="text-sky-300">{c.author}</span>: {c.text}
          </div>
        ))}
        {!list.length && <div className="text-xs text-slate-500">No comments</div>}
      </div>
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Write a comment" value={txt} onChange={e=>setTxt(e.target.value)}/>
        <button className="btn" onClick={post}>Send</button>
      </div>
    </div>
  )
}

