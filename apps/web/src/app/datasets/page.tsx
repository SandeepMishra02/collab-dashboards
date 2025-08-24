"use client";
import { useEffect, useState } from "react";
import DataTable from "@/components/DataTable";
import { api, apiForm } from "@/lib/api";

type Preview = { columns: string[]; rows: any[]; schema?: Record<string,string> };

export default function DatasetsPage(){
  const [name,setName] = useState("sample");
  const [file,setFile] = useState<File|null>(null);
  const [lastId,setLastId] = useState<number|null>(null);
  const [preview,setPreview] = useState<Preview|null>(null);
  const [loadId,setLoadId] = useState("");

  useEffect(()=>{
    api("/datasets/last_id").then(x=>setLastId(x.last_id)).catch(()=>{});
  },[]);

  async function upload(){
    if(!name || !file) return alert("Pick a dataset name and a file first.");
    const form = new FormData();
    form.append("name", name);
    form.append("file", file);
    const res = await apiForm("/datasets/upload", form);
    const id = res?.id ?? null;
    setLastId(id);
    if(id!=null){
      const p = await api(`/datasets/${id}/preview`);
      setPreview(p);
      alert("Upload successful!");
    }
  }
  async function loadById(){
    if(!loadId) return;
    const p = await api(`/datasets/${Number(loadId)}/preview`);
    setPreview(p);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Datasets</h1>
      <div className="flex gap-2 items-center flex-wrap">
        <input className="input" placeholder="Sample" value={name} onChange={e=>setName(e.target.value)} />
        <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} />
        <button className="btn btn-primary" onClick={upload}>Upload</button>
        {lastId!=null && <span className="text-slate-400">Last dataset id: {lastId}</span>}
      </div>

      <div className="flex gap-2 items-center">
        <input className="input w-40" placeholder="dataset id" value={loadId} onChange={e=>setLoadId(e.target.value)} />
        <button className="btn" onClick={loadById}>Load by ID</button>
      </div>

      {preview && (
        <>
          <h3 className="font-semibold">Preview</h3>
          <DataTable columns={preview.columns} rows={preview.rows} />
          {!!preview.schema && (
            <div className="text-xs text-slate-400 mt-2">
              Schema: {Object.entries(preview.schema).map(([k,v])=>`${k}:${v}`).join(", ")}
            </div>
          )}
        </>
      )}
    </div>
  )
}









