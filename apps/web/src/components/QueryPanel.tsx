"use client"

import { useEffect, useState } from "react"

type Result = { columns: string[]; rows: any[][]; sql: string }

export default function QueryPanel({ dataset }: { dataset: string }) {
  const [sql, setSql] = useState("SELECT * FROM {{table}} LIMIT 50;")
  const [res, setRes] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRes(null)
    setError(null)
  }, [dataset])

  async function run() {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("query", sql)
      form.append("dataset", dataset)
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/query`, {
        method: "POST",
        body: form,
      })
      if (!r.ok) throw new Error(await r.text())
      setRes(await r.json())
    } catch (e: any) {
      setError(e.message ?? String(e))
      setRes(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h3>Query</h3>
      <textarea value={sql} onChange={(e) => setSql(e.target.value)} className="textarea" />
      <div className="row">
        <button onClick={run} disabled={busy || !dataset} className="btn">
          {busy ? "Running..." : "Run"}
        </button>
        <span style={{ opacity: 0.7 }}>{dataset ? `table = ${dataset}` : "Pick a dataset"}</span>
      </div>

      {error && <div className="error">Error: {error}</div>}

      {res && (
        <>
          <div className="muted" style={{ marginTop: 8 }}>SQL: {res.sql}</div>
          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table className="table">
              <thead>
                <tr>
                  {res.columns.map((c, i) => (
                    <th key={i}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {res.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{String(cell ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
