'use client';

import { useEffect, useState } from 'react';
import Uploader from '@/components/Uploader';
import QueryPanel from '@/components/QueryPanel';

type Dataset = { id?: string; dataset_id?: string; name?: string };

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [current, setCurrent] = useState<string | null>(null);

  const fetchDatasets = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/datasets`);
      if (!res.ok) throw new Error('Failed to fetch datasets');
      const data = await res.json();
      setDatasets(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  return (
    <main style={{ padding: 24, display: 'grid', gap: 16 }}>
      <h2>Datasets</h2>

      <Uploader onUploaded={fetchDatasets} />

      {datasets.length > 0 && (
        <div>
          <h3>Uploaded</h3>
          <ul>
            {datasets.map((d, i) => {
              const id = d.id ?? d.dataset_id ?? `dataset-${i}`;
              const name = d.name ?? id;
              return (
                <li key={id}>
                  <button onClick={() => setCurrent(id)}>{name}</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {current && (
        <>
          <h3>Query</h3>
          <QueryPanel datasetId={current} />
        </>
      )}
    </main>
  );
}

