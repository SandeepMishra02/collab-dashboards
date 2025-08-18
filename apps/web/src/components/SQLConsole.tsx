'use client';
export default function SQLConsole({sql,setSql, onRun}:{sql:string; setSql:(s:string)=>void; onRun:()=>void;}){
  return (
    <div className="space-y-2">
      <textarea value={sql} onChange={e=>setSql(e.target.value)} rows={6} className="w-full bg-slate-900 border border-slate-700 rounded p-2 font-mono"/>
      <button onClick={onRun} className="px-3 py-1 rounded bg-sky-500 text-black">Run</button>
    </div>
  );
}
