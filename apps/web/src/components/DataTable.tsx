export default function DataTable({columns, rows}:{columns:string[]; rows:any[]}){
  return (
    <div className="overflow-auto border border-slate-800 rounded">
      <table className="min-w-[600px] text-sm">
        <thead className="bg-slate-900/60">
          <tr>{columns.map(c=><th key={c} className="px-3 py-2 text-left border-b border-slate-800">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i} className="odd:bg-slate-900/20">
              {columns.map(c=><td key={c} className="px-3 py-1 border-b border-slate-900">{String(r[c] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}




