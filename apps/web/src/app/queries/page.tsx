'use client';
import { useState } from "react";
import { api } from "@/src/lib/api";
import DataTable from "@/src/components/DataTable";
import SQLConsole from "@/src/components/SQLConsole";
import ChartBuilder from "@/src/components/ChartBuilder";
import QueryBuilder from "@/src/components/QueryBuilder";

export default function QueriesPage(){
  const [datasetId,setDatasetId]=useState<number>(1);
  const [sql,setSql]=useState<string>("SELECT * FROM {{table}} LIMIT 50;");
  const [result,setResult]=useState<{columns:string[];rows:any[]} | null>(null);
  const [chart,setChart]=useState<{type:"bar"|"line"|"scatter"|"pie"; x?:string; y?:string}>({type:"scatter"});

  async function runSQL(){
    const res = await api("/queries/run", {method:"POST", body: JSON.stringify({dataset_id: datasetId, sql})});
    setResult(res);
  }
  async function runBuilder(b:any){
    const res = await api("/queries/run", {method:"POST", body: JSON.stringify({dataset_id: datasetId, builder: b})});
    setResult(res);
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Queries</h1>
      <div className="flex items-center gap-2">
        <span>Dataset id:</span>
        <input type="number" value={datasetId} onChange={e=>setDatasetId(parseInt(e.target.value||"1"))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-24"/>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="font-semibold">SQL Console</h2>
          <SQLConsole sql={sql} setSql={setSql} onRun={runSQL}/>
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold">Visual Builder</h2>
          {result?.columns && <QueryBuilder columns={result.columns} onRun={runBuilder}/>}
          {!result?.columns && <div className="text-slate-400">Run once to infer columns or preview dataset.</div>}
        </div>
      </div>
      {result && (<>
        <h3 className="font-semibold">Preview</h3>
        <DataTable columns={result.columns} rows={result.rows}/>
        <div className="flex gap-2 items-center">
          <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1" value={chart.type} onChange={e=>setChart({...chart,type:e.target.value as any})}>
            <option>scatter</option><option>line</option><option>bar</option><option>pie</option>
          </select>
          <input placeholder="x" className="bg-slate-900 border border-slate-700 rounded px-2 py-1" value={chart.x||""} onChange={e=>setChart({...chart,x:e.target.value})}/>
          <input placeholder="y" className="bg-slate-900 border border-slate-700 rounded px-2 py-1" value={chart.y||""} onChange={e=>setChart({...chart,y:e.target.value})}/>
        </div>
        <ChartBuilder data={result} type={chart.type} x={chart.x} y={chart.y}/>
      </>)}
    </main>
  );
}
