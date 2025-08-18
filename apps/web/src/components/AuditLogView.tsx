'use client';
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
export default function AuditLogView(){
  const [logs,setLogs]=useState<any[]>([]);
  useEffect(()=>{(async()=>setLogs(await api("/audit")))();},[]);
  return <div className="rounded-xl border border-slate-700 p-3 max-h-[300px] overflow-auto space-y-1">
    {logs.map(l=><div key={l.id} className="text-sm text-slate-300">{l.created_at} — {l.action}</div>)}
  </div>;
}
