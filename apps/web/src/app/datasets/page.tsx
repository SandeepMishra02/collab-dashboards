"use client"
import { useState } from 'react'
import Uploader from '@/components/Uploader'
import QueryPanel from '@/components/QueryPanel'
import ChartBuilder from '@/components/ChartBuilder'
import { useDatasets } from '@/stores/datasets'
export default function DatasetsPage(){
  const [current,setCurrent] = useState<string | null>(null)
  const datasets = useDatasets(s=>s.datasets)
  return (
    <main style={{padding:24, display:'grid', gap:16}}>
      <h2>Datasets</h2>
      <Uploader />
      {!!datasets.length && <div><h3>Uploaded</h3><ul>{datasets.map(d=>(<li key={d.id}>
        <button onClick={()=>setCurrent(d.id)}>{d.name}</button></li>))}</ul></div>}
      {current && (<>
        <h3>Query</h3><QueryPanel datasetId={current} />
        <h3>Chart Builder</h3><ChartBuilder datasetId={current} />
      </>)}
    </main>
  )
}
