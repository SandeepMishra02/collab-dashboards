'use client';

import { useState } from 'react';

type Props = {
  onUploaded?: () => void;
};

export default function Uploader({ onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!file || !name) return alert('Pick file + name');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', name);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/datasets`, {
        method: 'POST',
        headers: {
          // Important: do NOT set Content-Type; the browser will set it for FormData.
          'X-User-Email': 'dev@local.test',
        },
        body: fd,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${msg}`);
      }

      setFile(null);
      setName('');
      onUploaded?.();
      alert('Upload complete ✅');
    } catch (e: any) {
      console.error(e);
      alert(`Upload failed: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
      <input
        placeholder="Dataset name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ marginRight: 8 }}
      />
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ marginRight: 8 }}
      />
      <button onClick={upload} disabled={busy}>
        {busy ? 'Uploading…' : 'Upload'}
      </button>
    </div>
  );
}
