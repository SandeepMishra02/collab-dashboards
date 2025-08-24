"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import DataTable from "@/components/DataTable";
import QueryBuilder from "@/components/QueryBuilder";
import dynamic from "next/dynamic";

const ChartBuilder = dynamic(()=>import("@/components/ChartBuilder"), { ssr:false });

export default function QueriesPage(){
  const [datasetId,setDatasetId] = useState<number>(1);
  const [sql,setSQL] = useState("SELECT * FROM {{table}} LIMIT 50;");
  const [rows,setRows] = useState<any[]>([]);
  const [columns,setColumns] = useState<string[]>([]);
  const [chartType,setChartType] = useState<"bar"|"line"|"scatter"|"pie">("bar");
  const [xKey,setXKey] = useState<string>("");
  const [yKey,setYKey] = useState<string>("");

  async function quick(){
    const p = await api(`/datasets/${datasetId}/preview`);
    setColumns(p.columns); setRows(p.rows);
    if(p.columns?.length>=2){ setXKey(p.columns[0]); setYKey(p.columns[1]); }
  }
  async function runSQL(){
    const result = await api("/queries/run", { method:"POST", body: JSON.stringify({ dataset_id: datasetId, sql }) });
    setRows(result.rows || []); setColumns(result.columns || Object.keys(result.rows?.[0]||{}));
    if(!xKey && columns.length){ setXKey(columns[0]); }
    if(!yKey && columns.length>1){ setYKey(columns[1]); }
  }
  useEffect(()=>{ quick().catch(()=>{}); },[]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Queries</h1>

      <div className="flex gap-2 items-center">
        <label className="text-sm text-slate-300">Dataset id:</label>
        <input className="input w-28" value={datasetId} onChange={e=>setDatasetId(Number(e.target.value||1))}/>
        <button className="btn" onClick={quick}>Quick Preview</button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="text-lg font-semibold">SQL Console</div>
          <textarea className="textarea h-28" value={sql} onChange={e=>setSQL(e.target.value)}/>
          <button className="btn btn-primary" onClick={runSQL}>Run</button>
          <QueryBuilder datasetId={datasetId} onSQL={(s)=>setSQL(s)} />
        </div>

        <div className="space-y-3">
          <div className="text-lg font-semibold">Preview</div>
          <DataTable columns={columns} rows={rows}/>
          {!!columns.length && (
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <select className="input w-32" value={chartType} onChange={e=>setChartType(e.target.value as any)}>
                  <option value="bar">bar</option>
                  <option value="line">line</option>
                  <option value="scatter">scatter</option>
                  <option value="pie">pie</option>
                </select>
                <select className="input" value={xKey} onChange={e=>setXKey(e.target.value)}>
                  {columns.map(c=> <option key={c}>{c}</option>)}
                </select>
                <select className="input" value={yKey} onChange={e=>setYKey(e.target.value)}>
                  {columns.map(c=> <option key={c}>{c}</option>)}
                </select>
              </div>
              <ChartBuilder rows={rows} xKey={xKey} yKey={yKey} type={chartType}/>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}











