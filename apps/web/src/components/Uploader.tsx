"use client"

import { useState } from "react"

type Props = { onDone?: () => void }

export default function Uploader({ onDone }: Props) {
  const [name, setName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!file || !name) return alert("Pick a file and enter dataset name")
    setBusy(true)
    try {
      const form = new FormData()
      form.append("name", name.trim())
      form.append("file", file)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload`, {
        method: "POST",
        body: form,
      })
      if (!res.ok) throw new Error(await res.text())
      onDone?.()
      setName("")
      setFile(null)
      alert("Upload complete ✅")
    } catch (e: any) {
      alert(`Upload failed: ${e.message ?? e}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <div className="row">
        <input
          placeholder="Dataset name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="input"
        />
        <button onClick={submit} disabled={busy} className="btn">
          {busy ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
  )
}
