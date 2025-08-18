'use client';
import { useEffect, useState } from "react";
import { API_URL, api } from "@/src/lib/api";
import DataTable from "@/src/components/DataTable";

export default function DatasetsPage(){
  const [name,setName]=useState(""); 
  const [file,setFile]=useState<File|null>(null);
  const [items,setItems]=useState<any[]>([]);
  const [preview,setPreview]=useState<{columns:string[];rows:any[]}|null>(null);

  async function upload(){
    if(!file || !name) return alert("Pick a name & file");
    const form = new FormData();
    form.append("name", name);
    form.append("file", file);
    const res = await fetch(`${API_URL}/datasets/upload`, {method:"POST", body: form});
    if(!res.ok){ alert(await res.text()); return; }
    await load();
  }

  async function load(){
    // very simple: no list endpoint yet; rely on preview by id guess
  }

  async function previewId(id:number){
    const data = await api(`/datasets/${id}/preview`);
    setPreview(data);
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Datasets</h1>
      <div className="flex gap-2">
        <input placeholder="dataset name" className="bg-slate-900 border border-slate-700 rounded px-2 py-1" value={name} onChange={e=>setName(e.target.value)} />
        <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/>
        <button onClick={upload} className="px-3 py-1 rounded bg-emerald-500 text-black">Upload</button>
      </div>
      <p className="text-slate-400">After uploading, query by dataset id and preview below.</p>
      {preview && <DataTable columns={preview.columns} rows={preview.rows} />}
    </main>
  );
}
