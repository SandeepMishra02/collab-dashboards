// Dashboards list (cards for #1, #2, #3)
import Link from "next/link";

const DASH_IDS = [1, 2, 3];

export default async function DashboardsList() {
  // If in the future you fetch real list, do it here.
  // For now we surface three ready-to-use dashboards.
  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboards</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {DASH_IDS.map((id) => (
          <Link
            key={id}
            href={`/dashboards/${id}`}
            className="group rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:border-sky-400 transition"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Dashboard #{id}</h3>
              <span className="btn btn-primary">Open</span>
            </div>
            <p className="mt-2 text-slate-300">
              Collaborative space for charts and notes. Click to edit in real-time.
            </p>
          </Link>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        Built with Next.js · FastAPI · DuckDB · WebSockets
      </p>
    </main>
  );
}










