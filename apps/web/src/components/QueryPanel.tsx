"use client"
import { useState } from 'react'
import { useDatasets } from '@/stores/datasets'
export default function QueryPanel({datasetId}:{datasetId:string}){
  const run = useDatasets(s=>s.query)
  const [sql,setSql] = useState("SELECT * FROM {{table}} LIMIT 50;")
  const [rows,setRows] = useState<any[]|null>(null)
  const [cols,setCols] = useState<string[]|null>(null)
  return (
    <div>
      <textarea rows={6} style={{width:'100%'}} value={sql} onChange={e=>setSql(e.target.value)} />
      <button onClick={async()=>{ const r = await run(datasetId, sql); setCols(r.columns); setRows(r.rows) }}>Run</button>
      {rows && cols && (
        <div style={{overflow:'auto', maxHeight:300, marginTop:8}}>
          <table><thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead>
            <tbody>{rows.map((r,i)=><tr key={i}>{cols.map(c=><td key={c}>{String(r[c])}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
