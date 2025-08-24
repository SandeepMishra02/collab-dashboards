// Home (pretty hero + cards instead of bullets)
import Link from "next/link";

export default function Home() {
  return (
    <main className="space-y-8">
      {/* Hero */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h1 className="text-3xl font-bold">Collaborative Dashboards</h1>
        <p className="mt-2 text-slate-300">
          Upload datasets, build queries, create charts, and collaborate in real-time.
        </p>
      </section>

      {/* Nav cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <Link
          href="/datasets"
          className="card block rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:border-sky-400 transition"
        >
          <h3 className="text-xl font-semibold">Datasets</h3>
          <p className="mt-2 text-slate-300">
            Upload CSV/JSON and preview with automatic schema detection.
          </p>
          <span className="mt-4 inline-block btn btn-primary">Open Datasets</span>
        </Link>

        <Link
          href="/queries"
          className="card block rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:border-sky-400 transition"
        >
          <h3 className="text-xl font-semibold">Queries</h3>
          <p className="mt-2 text-slate-300">
            Visual builder + SQL console. See live previews and charts.
          </p>
          <span className="mt-4 inline-block btn btn-primary">Open Queries</span>
        </Link>

        <Link
          href="/dashboards"
          className="card block rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:border-sky-400 transition"
        >
          <h3 className="text-xl font-semibold">Dashboards</h3>
          <p className="mt-2 text-slate-300">
            Compose charts & notes, collaborate, and publish read-only links.
          </p>
          <span className="mt-4 inline-block btn btn-primary">Open Dashboards</span>
        </Link>
      </section>

      <p className="text-xs text-slate-400">
        Built with Next.js · FastAPI · DuckDB · WebSockets
      </p>
    </main>
  );
}





