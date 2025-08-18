'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/")  // FastAPI backend
      .then((res) => res.json())
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main>
      <h1>FastAPI + Next.js App</h1>
      {error && <p>Error: {error}</p>}
      {data && <p>{data.message}</p>}
    </main>
  );
}

