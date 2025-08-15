def build_sql_from_steps(table_expr: str, steps: list[dict]) -> str:
    selects = "*"; wheres = []; group = None; renames = {}
    for s in steps:
        op = s.get("op"); args = s.get("args", {})
        if op == "select":
            selects = ", ".join(args.get("columns", ["*"]))
        elif op == "filter":
            col = args["column"]; op2 = args.get("operator","="); val = args["value"]
            if isinstance(val,str): val = f"'{val}'"; wheres.append(f"{col} {op2} {val}")
        elif op == "groupby":
            group = args.get("by", [])
            aggs = args.get("aggs", [])
            agg_sql = ", ".join([f"{a['fn']}({a['col']}) AS {a.get('as', a['fn']+'_'+a['col'])}" for a in aggs])
            selects = ", ".join(group + ([agg_sql] if agg_sql else []))
        elif op == "rename":
            renames.update(args.get("map", {}))
    sql = f"SELECT {selects} FROM {table_expr}"
    if wheres: sql += " WHERE " + " AND ".join(wheres)
    if group: sql += " GROUP BY " + ", ".join(group)
    if renames:
        proj = ", ".join([f"{k} AS {v}" for k,v in renames.items()])
        sql = f"SELECT {proj} FROM ({sql}) t"
    return sql + " LIMIT 10000"
