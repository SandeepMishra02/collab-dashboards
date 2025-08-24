"use client";
import Plot from "react-plotly.js";
import { useMemo } from "react";

export default function ChartBuilder({
  rows, xKey, yKey, type
}:{
  rows:any[];
  xKey:string;
  yKey:string;
  type:"bar"|"line"|"scatter"|"pie";
}){
  const data = useMemo(()=>{
    if(type === "pie"){
      return [{type:"pie", labels: rows.map(r=>r[xKey]), values: rows.map(r=>Number(r[yKey]||0))}];
    }
    const traceType = type==="line" ? "scatter" : type;
    const mode = type==="line" ? "lines" : (type==="scatter" ? "markers" : undefined);
    return [{
      type: traceType,
      mode,
      x: rows.map(r=>r[xKey]),
      y: rows.map(r=>Number(r[yKey]||0))
    }];
  },[rows,xKey,yKey,type]);

  return (
    <div className="bg-slate-900/40 rounded border border-slate-800 p-2">
      <Plot
        data={data as any}
        layout={{paper_bgcolor:"transparent", plot_bgcolor:"transparent", margin:{l:40,r:20,t:20,b:40}, font:{color:"#e2e8f0"}} as any}
        style={{width:"100%", height:400}}
        config={{displayModeBar:false}}
      />
    </div>
  )
}
