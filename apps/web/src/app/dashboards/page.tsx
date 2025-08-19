import Link from "next/link";

export default function DashboardsIndex() {
  const demo = [1, 2, 3];

  return (
    <main className="p-6 space-y-3">
      <h1 className="text-2xl font-bold">Dashboards</h1>
      <p className="text-slate-400">Pick a dashboard to open (stubbed list for now):</p>
      <ul className="list-disc pl-6">
        {demo.map((id) => (
          <li key={id}>
            <Link className="underline" href={`/dashboards/${id}`}>
              Open Dashboard #{id}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}




