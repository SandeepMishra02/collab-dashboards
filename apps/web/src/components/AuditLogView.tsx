"use client";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

export default function AuditLogView(){
  const [rows,setRows] = useState<any[]>([]);
  useEffect(()=>{
    fetch(`${API_URL}/_debug/audit`, { headers:{ "X-Role":"owner" } })
      .then(r=>r.ok?r.json():[])
      .then(setRows).catch(()=>{});
  },[]);
  return (
    <div className="text-xs text-slate-400 space-y-1">
      {rows.slice().reverse().slice(0,50).map((r,i)=>(
        <div key={i}>{new Date((r.ts||0)*1000).toLocaleString()} — {r.action} {JSON.stringify(r)}</div>
      ))}
    </div>
  );
}
