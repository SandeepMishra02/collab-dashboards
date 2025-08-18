'use client';
import { useEffect, useState } from "react";
import { api } from "@/src/lib/api";

export default function CommentThread({dashboardId}:{dashboardId:number}){
  const [list,setList]=useState<any[]>([]);
  const [body,setBody]=useState("");
  async function load(){ setList(await api(`/comments/${dashboardId}`)); }
  async function add(){ await api(`/comments/${dashboardId}`, {method:"POST", body: JSON.stringify({target:"dashboard", body})}); setBody(""); load(); }
  useEffect(()=>{ load(); },[dashboardId]);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-full" value={body} onChange={e=>setBody(e.target.value)} placeholder="add a comment"/>
        <button className="px-3 py-1 rounded bg-sky-500 text-black" onClick={add}>Post</button>
      </div>
      <ul className="space-y-1">
        {list.map(c=><li key={c.id} className="text-sm text-slate-300"><span className="text-slate-500">{c.created_at}:</span> {c.body}</li>)}
      </ul>
    </div>
  );
}
