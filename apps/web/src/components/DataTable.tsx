'use client';
export default function DataTable({ columns, rows }: { columns: string[]; rows: any[] }) {
  if (!columns?.length) return <div style={{ opacity: .6 }}>No data</div>;
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: 6 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>{columns.map(c => <th key={c} style={{ textAlign:'left', padding:'8px', borderBottom:'1px solid #eee' }}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r,i) => (
            <tr key={i}>
              {columns.map(c => <td key={c} style={{ padding:'6px 8px', borderBottom:'1px solid #f3f3f3' }}>{String(r?.[c] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
