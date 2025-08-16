'use client'

import { useEffect, useState } from 'react'
import Uploader from '../../components/Uploader'

type Dataset = { id: string; name: string }
type Preview = { columns: string[]; rows: any[] }

function QueryPanel({ datasetId }: { datasetId: string | null }) {
  const [sql, setSql] = useState<string>("SELECT * FROM {{table}} LIMIT 50;")
  const [result, setResult] = useState<Preview | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function run() {
    setErr(null)
    setResult(null)
    if (!datasetId) {
      setErr('Choose a dataset first')
      return
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId, sql })
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || res.statusText)
      }
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setErr(`Error: ${e.message}`)
    }
  }

  return (
    <div>
      <h3>Query</h3>
      <textarea
        value={sql}
        onChange={e => setSql(e.target.value)}
        rows={4}
        style={{ width: '100%' }}
      />
      <div><button onClick={run}>Run</button></div>
      {err && <div style={{ color: 'crimson' }}>{err}</div>}
      {result && (
        <div>
          <div style={{ fontWeight: 600 }}>{result.columns.join(' | ')}</div>
          <div>
            {result.rows.slice(0, 50).map((r, i) => (
              <div key={i}>
                {result.columns.map((c, j) => (
                  <span key={j} style={{ marginRight: 12 }}>{String(r[c])}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)

  async function fetchDatasets() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/datasets`)
    if (!res.ok) throw new Error('Failed to fetch datasets')
    const data = await res.json()
    setDatasets(data)
    if (data.length && !current) setCurrent(data[0].id)
  }

  useEffect(() => {
    fetchDatasets().catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    async function loadPreview() {
      if (!current) { setPreview(null); return }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/datasets/${current}/preview`)
      if (!res.ok) { setPreview(null); return }
      const data = await res.json()
      setPreview(data)
    }
    loadPreview().catch(console.error)
  }, [current])

  return (
    <div>
      <h2>Datasets</h2>

      <Uploader onDone={fetchDatasets} />

      <div style={{ marginTop: 12 }}>
        <h3>Uploaded</h3>
        <ul>
          {datasets.map(d => (
            <li key={d.id}>
              <button onClick={() => setCurrent(d.id)}>{d.name}</button>
            </li>
          ))}
        </ul>
      </div>

      {current && preview && (
        <div style={{ marginTop: 12 }}>
          <h3>Preview</h3>
          <div style={{ fontWeight: 600 }}>{preview.columns.join(' | ')}</div>
          <div>
            {preview.rows.slice(0, 20).map((r, i) => (
              <div key={i}>
                {preview.columns.map((c, j) => (
                  <span key={j} style={{ marginRight: 12 }}>{String(r[c])}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <QueryPanel datasetId={current} />
    </div>
  )
}
