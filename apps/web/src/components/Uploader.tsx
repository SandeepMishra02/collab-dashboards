'use client'

import { useState } from 'react'

export default function Uploader({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function upload() {
    if (!name || !file) {
      alert('Please enter a dataset name and choose a file.')
      return
    }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('name', name)
      fd.append('file', file)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/datasets`, {
        method: 'POST',
        body: fd
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(`${res.status} ${res.statusText}: ${msg}`)
      }
      alert('Upload complete ✅')
      onDone()
      setName('')
      setFile(null)
    } catch (e: any) {
      alert(e.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <input
        placeholder="Dataset name"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ marginRight: 8 }}
      />
      <input
        type="file"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
        style={{ marginRight: 8 }}
      />
      <button disabled={busy} onClick={upload}>{busy ? 'Uploading…' : 'Upload'}</button>
    </div>
  )
}
