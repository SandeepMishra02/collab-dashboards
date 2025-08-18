'use client';
import { useState } from "react";
type Builder = {
  filters: {column:string; op:string; value:any}[];
  group_by: string[];
  aggregates: {func:string; column:string; as?:string}[];
};
export default function QueryBuilder({columns, onRun}:{columns:string[]; onRun:(b:Builder)=>void;}){
  const [b,setB] = useState<Builder>({filters:[], group_by:[], aggregates:[]});
  const addFilter=()=>setB({...b, filters:[...b.filters,{column:columns[0],op:"=",value:""}]});
  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <button className="px-3 py-1 rounded bg-sky-500 text-black" onClick={addFilter}>+ Filter</button>
        <button className="px-3 py-1 rounded bg-emerald-500 text-black" onClick={()=>onRun(b)}>Run</button>
      </div>
      {b.filters.map((f,i)=>(
        <div key={i} className="flex gap-2">
          <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1" value={f.column} onChange={e=>{const v=[...b.filters]; v[i]={...f,column:e.target.value}; setB({...b, filters:v});}}>
            {columns.map(c=><option key={c}>{c}</option>)}
          </select>
          <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1" value={f.op} onChange={e=>{const v=[...b.filters]; v[i]={...f,op:e.target.value}; setB({...b, filters:v});}}>
            <option>=</option><option>!=</option><option>{'>'}</option><option>{'<'}</option>
          </select>
          <input className="bg-slate-900 border border-slate-700 rounded px-2 py-1" value={f.value} onChange={e=>{const v=[...b.filters]; v[i]={...f,value:e.target.value}; setB({...b, filters:v});}}/>
        </div>
      ))}
    </div>
  );
}
