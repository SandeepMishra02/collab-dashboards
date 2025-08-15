"use client"
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useDatasets } from '@/stores/datasets'
const Plot = dynamic(()=>import('react-plotly.js'), { ssr:false })
export default function ChartBuilder({datasetId}:{datasetId:string}){
  const run = useDatasets(s=>s.query)
  const [x,setX] = useState(''); const [y,setY] = useState(''); const [agg,setAgg] = useState<'sum'|'avg'|'count'>('sum')
  const [data,setData] = useState<{x:any[],y:any[]}|null>(null)
  const build = async()=>{
    if(!x||!y) return alert('Type x & y column names')
    const sql = `SELECT ${x} AS x, ${agg}(${y}) AS y FROM {{table}} GROUP BY ${x} ORDER BY ${x} LIMIT 500;`
    const r = await run(datasetId, sql); setData({ x: r.rows.map((r:any)=>r.x), y: r.rows.map((r:any)=>r.y) })
  }
  return (
    <div style={{border:'1px solid #eee', padding:12, borderRadius:8}}>
      <div style={{display:'flex', gap:8}}>
        <input placeholder="x column" value={x} onChange={e=>setX(e.target.value)} />
        <input placeholder="y column" value={y} onChange={e=>setY(e.target.value)} />
        <select value={agg} onChange={e=>setAgg(e.target.value as any)}>
          <option value="sum">sum</option><option value="avg">avg</option><option value="count">count</option>
        </select>
        <button onClick={build}>Build Chart</button>
      </div>
      {data && <Plot data={[{ x:data.x, y:data.y, type:'bar' }]} layout={{ title:'Chart' }} style={{width:'100%', height:400}} />}
    </div>
  )
}
