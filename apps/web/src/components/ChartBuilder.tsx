'use client';
import dynamic from "next/dynamic";
import { useMemo } from "react";
const Plot = dynamic(()=>import("react-plotly.js"),{ssr:false});
type Props = {
  data: { columns: string[]; rows: Record<string, any>[] };
  type: "bar"|"line"|"scatter"|"pie";
  x?: string; y?: string;
};
export default function ChartBuilder({data, type, x, y}: Props){
  const trace = useMemo(()=>{
    const xs = x ? data.rows.map(r=>r?.[x]) : [];
    const ys = y ? data.rows.map(r=>r?.[y]) : [];
    const base = { x: xs, y: ys };
    if(type==="pie") return [{ labels: xs, values: ys, type:"pie" as const }];
    if(type==="line") return [{ ...base, type:"scatter" as const, mode:"lines" }];
    return [{ ...base, type: type as any, mode: "markers+lines"}];
  },[data, type, x, y]);
  return (
    <div className="rounded-xl border border-slate-700 p-2">
      <Plot data={trace as any} layout={{autosize:true, paper_bgcolor:"rgba(0,0,0,0)", plot_bgcolor:"rgba(0,0,0,0)"}} style={{width:"100%", height:420}} useResizeHandler />
    </div>
  );
}
