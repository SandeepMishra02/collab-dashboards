'use client'

import { useEffect, useMemo, useState } from 'react'
import Plot from 'react-plotly.js'

type Row = Record<string, any>

const API = process.env.NEXT_PUBLIC_API_URL

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<string[]>([])
  const [current, setCurrent] = useState<string | null>(null)

  const [sql, setSql] = useState('SELECT * FROM {{table}} LIMIT 50;')
  const [rows, setRows] = useState<Row[]>([])
  const [columns, setColumns] = useState<string[]>([])

  // chart controls
  const [chart, setChart] = useState<'Scatter' | 'Bar' | 'Line'>('Scatter')
  const [xKey, setXKey] = useState<string>('')
  const [yKey, setYKey] = useState<string>('')

  // Load dataset names on mount
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${API}/datasets`)
        if (!res.ok) throw new Error('Failed to fetch datasets')
        const data: { name: string }[] = await res.json()
        const names = data.map(d => d.name)
        setDatasets(names)
        if (names.length && !current) {
          setCurrent(names[0])
          // preview will load columns
          preview(names[0])
        }
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  // Preview -> get columns + a small sample
  async function preview(name: string) {
    try {
      const res = await fetch(`${API}/datasets/${encodeURIComponent(name)}/preview`)
      if (!res.ok) throw new Error(await res.text())
      const data: { columns: string[]; rows: Row[] } = await res.json()
      setColumns(data.columns ?? [])
      if (data.columns?.length) {
        // initialize dropdowns if needed
        setXKey(prev => prev || data.columns[0])
        setYKey(prev => prev || data.columns[Math.min(1, data.columns.length - 1)])
      }
      setRows(data.rows ?? [])
    } catch (e) {
      console.error(e)
      alert('Failed to preview dataset')
    }
  }

  async function runQuery() {
    if (!current) return alert('Choose a dataset (click a name under "Uploaded")')
    try {
      const res = await fetch(`${API}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: current, sql })
      })
      if (!res.ok) throw new Error(await res.text())
      const data: { columns: string[]; rows: Row[] } = await res.json()
      setRows(data.rows ?? [])
      if (data.columns?.length) {
        setColumns(data.columns)
        // keep existing selections when possible
        if (!data.columns.includes(xKey)) setXKey(data.columns[0])
        if (!data.columns.includes(yKey)) setYKey(data.columns[Math.min(1, data.columns.length - 1)])
      }
    } catch (e) {
      console.error(e)
      alert('Failed to fetch')
    }
  }

  // Chart data mapping
  const plotData = useMemo(() => {
    if (!rows.length || !xKey || !yKey) return []
    const x = rows.map(r => r?.[xKey])
    const y = rows.map(r => r?.[yKey])
    const base = { x, y, mode: 'markers' as const, type: 'scatter' as const }
    if (chart === 'Bar') return [{ x, y, type: 'bar' as const }]
    if (chart === 'Line') return [{ x, y, mode: 'lines' as const, type: 'scatter' as const }]
    return [base]
  }, [rows, xKey, yKey, chart])

  return (
    <div className="page">
      <h1>Datasets</h1>

      <div className="toolbar">
        <input placeholder="Dataset name" disabled />
        <input type="file" disabled />
        <button disabled>Upload</button>
      </div>

      <div className="body">
        <aside className="sidebar">
          <h3>Uploaded</h3>
          <ul>
            {datasets.map((d) => (
              <li key={d}>
                <button
                  className={`dataset ${current === d ? 'active' : ''}`}
                  onClick={() => { setCurrent(d); preview(d) }}
                  title={d}
                >
                  {d}
                </button>
              </li>
            ))}
          </ul>

          <div className="previewBox">
            <h4>Preview</h4>
            <div className="muted">
              {columns.length ? columns.join(', ') : 'No columns yet'}
            </div>
          </div>
        </aside>

        <main className="main">
          <label className="label">Query</label>
          <textarea value={sql} onChange={e => setSql(e.target.value)} spellCheck={false} />

          <div className="runBar">
            <div className="chartControls">
              <span>Type</span>
              <select value={chart} onChange={e => setChart(e.target.value as any)}>
                <option>Scatter</option>
                <option>Line</option>
                <option>Bar</option>
              </select>

              <span>X</span>
              <select value={xKey} onChange={e => setXKey(e.target.value)}>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <span>Y</span>
              <select value={yKey} onChange={e => setYKey(e.target.value)}>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button className="runBtn" onClick={runQuery}>Run</button>
          </div>

          <div className="plotWrap">
            <Plot
              data={plotData as any}
              layout={{ autosize: true, margin: { l: 40, r: 10, t: 10, b: 40 } }}
              useResizeHandler
              style={{ width: '100%', height: '420px' }}
              config={{ displayModeBar: true, responsive: true }}
            />
          </div>
        </main>
      </div>

      <style jsx>{`
        .page { padding: 20px; max-width: 1200px; margin: 0 auto; font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif; }
        h1 { font-size: 28px; font-weight: 700; margin-bottom: 14px; }
        .toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
        .toolbar input[type="file"] { padding: 6px; }
        .toolbar input[disabled], .toolbar button[disabled] { opacity: 0.5; cursor: not-allowed; }
        .body { display: grid; grid-template-columns: 240px 1fr; gap: 16px; }
        .sidebar { border: 1px solid #eee; border-radius: 10px; padding: 12px; background: #fafafa; }
        .sidebar h3 { margin: 0 0 8px; font-size: 16px; }
        .sidebar ul { list-style: none; padding-left: 0; margin: 0 0 12px; display: grid; gap: 6px; }
        .dataset { width: 100%; text-align: left; padding: 8px 10px; border: 1px solid #e5e5e5; background: white; border-radius: 8px; cursor: pointer; }
        .dataset:hover { border-color: #cbd5e1; background: #f8fafc; }
        .dataset.active { border-color: #2563eb; background: #eef2ff; }
        .previewBox { border-top: 1px dashed #e5e7eb; padding-top: 10px; }
        .muted { color: #6b7280; font-size: 12px; }
        .main { display: grid; gap: 10px; }
        .label { color: #374151; font-weight: 600; }
        textarea { width: 100%; min-height: 110px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 13px; padding: 10px; border-radius: 10px; border: 1px solid #e5e7eb; outline: none; }
        textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
        .runBar { display: flex; align-items: center; justify-content: space-between; gap: 8px; border: 1px solid #e5e7eb; padding: 8px; border-radius: 10px; background: #fff; }
        .chartControls { display: flex; align-items: center; gap: 8px; }
        select { border: 1px solid #e5e7eb; padding: 6px 8px; border-radius: 8px; background: white; }
        .runBtn { background: #2563eb; color: white; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .runBtn:hover { background: #1d4ed8; }
        .plotWrap { border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; }
        @media (max-width: 900px) {
          .body { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
