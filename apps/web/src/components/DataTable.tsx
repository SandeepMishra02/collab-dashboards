'use client';
export default function DataTable({ columns, rows }: { columns: string[]; rows: any[] }) {
  return (
    <div className="overflow-auto border rounded">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100">
          <tr>{columns.map((c) => <th key={c} className="px-2 py-1 text-left">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-slate-50">
              {columns.map((c) => <td key={c} className="px-2 py-1">{String(r[c] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


