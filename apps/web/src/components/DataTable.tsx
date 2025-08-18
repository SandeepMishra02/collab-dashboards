'use client';
type Props = { columns: string[]; rows: Record<string, any>[] };
export default function DataTable({ columns, rows }: Props) {
  if (!columns?.length) return <div className="text-slate-400">No columns.</div>;
  return (
    <div className="overflow-auto max-h-[480px] rounded-xl border border-slate-700">
      <table className="min-w-[640px] w-full">
        <thead className="sticky top-0 bg-slate-900/80 backdrop-blur">
          <tr>{columns.map(c => <th key={c} className="text-left px-3 py-2 border-b border-slate-700">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i} className="odd:bg-slate-900/40">
              {columns.map(c => <td key={c} className="px-3 py-1 border-b border-slate-800">{String(r?.[c] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
