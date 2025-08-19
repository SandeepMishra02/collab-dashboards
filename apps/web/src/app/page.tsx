import Link from "next/link";

export default function Home() {
  return (
    <main className="p-6 space-y-3">
      <h1 className="text-3xl font-bold">Collaborative Dashboards</h1>
      <p>Upload datasets, build queries, create charts, and collaborate in real-time.</p>
      <ul className="list-disc pl-6">
        <li><Link className="underline" href="/datasets">Datasets</Link></li>
        <li><Link className="underline" href="/queries">Queries</Link></li>
        <li><Link className="underline" href="/dashboards">Dashboards</Link></li>
      </ul>
    </main>
  );
}


