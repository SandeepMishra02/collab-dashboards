"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Preview = { columns: string[]; rows: any[] };

export default function DatasetsPage() {
  const [name, setName] = useState("sample");
  const [file, setFile] = useState<File | null>(null);
  const [lastId, setLastId] = useState<number | null>(null);
  const [loadId, setLoadId] = useState<string>("");
  const [preview, setPreview] = useState<Preview | null>(null);

  async function upload() {
    if (!file || !name.trim()) {
      alert("Please enter a name and pick a file.");
      return;
    }
    const form = new FormData();
    form.append("name", name.trim());              // <-- REQUIRED
    form.append("file", file);

    const res = await fetch(`${API_URL}/datasets/upload`, {
      method: "POST",
      body: form, // multipart/form-data is set automatically
    });

    const data = await res.json();
    if (!res.ok) {
      alert(typeof data === "string" ? data : JSON.stringify(data));
      return;
    }

    setLastId(data.id);
    await previewId(data.id);
  }

  async function previewId(id: number) {
    const res = await fetch(`${API_URL}/datasets/${id}/preview`);
    const data = await res.json();
    if (!res.ok) {
      alert(JSON.stringify(data));
      return;
    }
    setPreview(data);
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Datasets</h1>

      <div className="flex gap-2 items-center">
        <input
          className="border px-2 py-1"
          placeholder="dataset name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="file"
          accept=".csv,.json"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button onClick={upload} className="border px-3 py-1">Upload</button>

        {lastId != null && (
          <span className="text-sm text-slate-500">Last dataset id: {lastId}</span>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <input
          className="border px-2 py-1"
          placeholder="dataset id"
          value={loadId}
          onChange={(e) => setLoadId(e.target.value)}
        />
        <button
          onClick={() => {
            const id = Number(loadId);
            if (Number.isFinite(id)) previewId(id);
          }}
          className="border px-3 py-1"
        >
          Load by ID
        </button>
      </div>

      <section className="mt-4">
        {preview ? (
          <table className="border-collapse">
            <thead>
              <tr>
                {preview.columns.map((c) => (
                  <th key={c} className="border px-2 py-1 text-left">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, i) => (
                <tr key={i}>
                  {preview.columns.map((c) => (
                    <td key={c} className="border px-2 py-1">
                      {String(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-slate-500">Upload a file or load by ID to see a preview.</p>
        )}
      </section>
    </main>
  );
}







