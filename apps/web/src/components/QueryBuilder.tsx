"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export type QBFilter = { col:string; op:string; val:string };
export type QBState = {
  datasetId: number;
  select: string[];
  filters: QBFilter[];
  groupBy: string[];
  aggregates: string[];
};

export default function QueryBuilder({
  datasetId,
  onSQL,
}:{
  datasetId:number;
  onSQL:(sql:string)=>void;
}){
  const [state,setState] = useState<QBState>({
    datasetId, select:["*"], filters:[], groupBy:[], aggregates:[]
  });
  function addFilter(){
    setState(s=>({...s, filters:[...s.filters, {col:"",op:"=",val:""}]}));
  }
  function updateFilter(i:number, patch:Partial<QBFilter>){
    setState(s=>({...s, filters: s.filters.map((f,idx)=>idx===i?{...f,...patch}:f)}));
  }
  async function build(){
    const sqlRes = await api("/queries/build", {
      method:"POST",
      body: JSON.stringify({
        dataset_id: state.datasetId,
        select: state.select,
        filters: state.filters,
        group_by: state.groupBy,
        aggregates: state.aggregates
      })
    });
    onSQL(sqlRes.sql);
  }

  return (
    <div className="space-y-3 border border-slate-800 p-3 rounded">
      <div className="text-sm text-slate-300">Visual Builder</div>
      <div className="flex flex-wrap gap-2">
        <input className="input" placeholder="select columns (comma)"
          onChange={e=>setState(s=>({...s, select: e.target.value? e.target.value.split(",").map(x=>x.trim()) : ["*"]}))}/>
        <input className="input" placeholder="group by (comma)" 
          onChange={e=>setState(s=>({...s, groupBy: e.target.value? e.target.value.split(",").map(x=>x.trim()):[]}))}/>
        <input className="input" placeholder="aggregates e.g. SUM(value) as total"
          onChange={e=>setState(s=>({...s, aggregates: e.target.value? e.target.value.split(",").map(x=>x.trim()):[]}))}/>
      </div>

      <div className="space-y-2">
        {state.filters.map((f,i)=>(
          <div key={i} className="flex gap-2 items-center">
            <input className="input" placeholder="column" value={f.col} onChange={e=>updateFilter(i,{col:e.target.value})}/>
            <select className="input" value={f.op} onChange={e=>updateFilter(i,{op:e.target.value})}>
              {["=","!=","<",">","<=",">=","contains","startswith","endswith"].map(o=><option key={o}>{o}</option>)}
            </select>
            <input className="input" placeholder="value" value={f.val} onChange={e=>updateFilter(i,{val:e.target.value})}/>
          </div>
        ))}
        <button className="btn" onClick={addFilter}>+ Filter</button>
      </div>

      <button className="btn btn-primary" onClick={build}>Build SQL</button>
    </div>
  );
}

