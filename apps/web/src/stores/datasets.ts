import { create } from 'zustand'
const API = process.env.NEXT_PUBLIC_API_URL!
type Row = Record<string, any>
type State = {
  datasets: any[]
  upload: (file: File, name: string, email?: string) => Promise<any>
  preview: (id: string) => Promise<{columns:string[], rows:Row[]}>
  query: (id: string, sql: string) => Promise<{columns:string[], rows:Row[]}>
}
export const useDatasets = create<State>((set)=>({
  datasets: [],
  upload: async(file,name,email='dev@local.test')=>{
    const body = new FormData(); body.append('file', file); body.append('name', name)
    const r = await fetch(`${API}/datasets`, { method:'POST', headers:{'X-User-Email': email}, body })
    const ds = await r.json(); set(s=>({datasets:[...s.datasets, ds]})); return ds
  },
  preview: async(id)=> (await (await fetch(`${API}/datasets/${id}/preview`)).json()),
  query: async(id,sql)=> (await (await fetch(`${API}/query`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({datasetId:id, sql})})).json()),
}))
