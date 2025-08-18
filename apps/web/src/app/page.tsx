export default function Home(){
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-3xl font-bold">Collaborative Dashboards</h1>
      <p className="text-slate-400">Upload datasets, build queries, create charts, and collaborate in real-time.</p>
      <ul className="list-disc pl-5">
        <li><a className="text-sky-400 underline" href="/datasets">Datasets</a></li>
        <li><a className="text-sky-400 underline" href="/queries">Queries</a></li>
      </ul>
    </main>
  );
}
