"use client"

import { useEffect, useState } from "react"
import Uploader from "@/components/Uploader"
import QueryPanel from "@/components/QueryPanel"

type Preview = { columns: string[]; rows: any[][] }

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<string[]>([])
  const [current, setCurrent] = useState<string>("")
  const [preview, setPreview] = useState<Preview | null>(null)

  async function load() {
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/datasets`)
    const d = await r.json()
    setDatasets(d.datasets ?? [])
    if (!current && d.datasets?.length) setCurrent(d.datasets[0])
  }

  async function loadPreview(name: string) {
    if (!name) return
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/datasets/${name}/preview`)
    if (r.ok) setPreview(await r.json())
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (current) loadPreview(current) }, [current])

  return (
    <div className="container">
      <h1>Datasets</h1>

      <Uploader onDone={load} />

      <div className="row">
        <div className="card" style={{ minWidth: 240 }}>
          <h3>Uploaded</h3>
          <ul className="list">
            {datasets.map(d => (
              <li key={d}>
                <button
                  className={`link ${current === d ? "active" : ""}`}
                  onClick={() => setCurrent(d)}
                >
                  {d}
                </button>
              </li>
            ))}
            {!datasets.length && <li className="muted">none yet</li>}
          </ul>
        </div>

        <div style={{ flex: 1 }}>
          {current && (
            <>
              <h3>Preview: {current}</h3>
              {preview && (
                <div style={{ overflowX: "auto" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        {preview.columns.map((c, i) => <th key={i}>{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => <td key={j}>{String(cell ?? "")}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <QueryPanel dataset={current} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
