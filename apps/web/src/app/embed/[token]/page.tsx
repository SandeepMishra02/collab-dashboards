import { API_URL } from "@/lib/api";

async function getEmbed(token:string){
  const r = await fetch(`${API_URL}/dashboards/embed/${token}`, { cache:"no-store" });
  return r.json();
}

export default async function EmbedView({ params }:{ params:{ token:string }}){
  const data = await getEmbed(params.token);
  const widgets = data?.layout?.widgets || [];
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">{data?.title || "Dashboard"}</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {widgets.map((w:any)=>(
          <div key={w.id} className="card">
            <div className="font-semibold">{w.title || "Widget"}</div>
            {w.note && <div className="mt-2 text-sm text-slate-300 whitespace-pre-wrap">{w.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
