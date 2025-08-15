"use client"
import { useState } from 'react'
import { useDatasets } from '@/stores/datasets'
export default function Uploader(){
  const [file,setFile] = useState<File|null>(null)
  const [name,setName] = useState('')
  const upload = useDatasets(s=>s.upload)
  return (
    <div style={{border:'1px solid #ddd', padding:12, borderRadius:8}}>
      <input placeholder="Dataset name" value={name} onChange={e=>setName(e.target.value)} />
      <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} />
      <button onClick={async()=>{
        if(!file||!name) return alert('Pick file + name')
        const ds = await upload(file,name)
        alert(`Uploaded: ${ds.name}`)
      }}>Upload</button>
    </div>
  )
}
