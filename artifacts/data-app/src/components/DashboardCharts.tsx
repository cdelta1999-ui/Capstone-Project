import React, { useMemo } from "react";
import {
  Cell, ResponsiveContainer, Tooltip, Legend,
  Area, XAxis, YAxis, CartesianGrid,
  ScatterChart, Scatter, ZAxis,
  BarChart, Bar,
  ComposedChart, Line,
  ReferenceLine, ReferenceArea, LabelList,
} from "recharts";
import type {
  SalaryAttrition, SatisfactionBucket, ScatterPoint,
  TenureAttrition, ProjectsAttrition,
  RiskFactor, ChurnProfile, FatigueCurvePoint, DeptBrainDrain,
} from "@workspace/api-client-react";

const C = {
  indigo: "#6366f1",
  sky: "#0ea5e9",
  teal: "#14b8a6",
  amber: "#f59e0b",
  rose: "#f43f5e",
  violet: "#8b5cf6",
  emerald: "#10b981",
  slate: "#64748b",
  cyan: "#06b6d4",
  pink: "#ec4899",
  stayed: "#6366f1",
  left: "#f43f5e",
};

// ── Shared chart tokens ──────────────────────────────────────────────────────
const GRID = "#eef2f7";
const AXIS = "#94a3b8";
const AXIS_CAT = "#475569";
const tickNum = { fontSize: 11, fill: AXIS } as const;
const tickCat = { fontSize: 11, fill: AXIS_CAT } as const;
const CURSOR = { fill: "rgba(99, 102, 241, 0.06)" } as const;
const legendStyle = { fontSize: 11, paddingBottom: 2 } as const;

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md px-3 py-2 border border-slate-200/70 shadow-lg rounded-xl text-[11px] min-w-[120px]">
      {label != null && label !== "" && (
        <p className="font-semibold text-slate-500 mb-1.5 uppercase tracking-wide text-[9px]">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((e: any, i: number) => {
          const v = typeof e.value === "number"
            ? e.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
            : e.value;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: e.color || e.fill }} />
              <span className="text-slate-500">{e.name}</span>
              <span className="font-semibold text-slate-800 ml-auto tabular-nums">{v}{e.unit ?? ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Sankey Attrition Flow ────────────────────────────────────────────────────
// Right-hand profile nodes are spread into equal vertical slots so their labels
// never collide, even though the "Left" branch is proportionally small.
export function SankeyFlow({ total, stayed, left, profiles }: {
  total: number; stayed: number; left: number; profiles: ChurnProfile[];
}) {
  const W = 640; const H = 300;
  const col1x = 58; const col2x = 248; const col3x = 432;
  const nodeW = 15;
  const padTop = 16;
  const usableH = H - padTop * 2;
  const branchGap = 26;
  const availH = usableH - branchGap;

  const stayedH = (stayed / total) * availH;
  const leftH = (left / total) * availH;
  const stayedY = padTop;
  const leftY = padTop + stayedH + branchGap;

  // Profiles may not be an exhaustive split of leavers — add an "Other" node so
  // the flow accounts for every leaver and isn't misleading.
  type Seg = { name: string; count: number; color: string };
  const profileSum = profiles.reduce((s, p) => s + p.count, 0);
  const otherCount = left - profileSum;
  const baseSegs: Seg[] = profiles.map(p => ({ name: p.name, count: p.count, color: p.color }));
  const segments: Seg[] = otherCount > 1
    ? [...baseSegs, { name: "Other leavers", count: otherCount, color: C.slate }]
    : baseSegs;

  const slotH = usableH / Math.max(segments.length, 1);
  let srcCursor = leftY;
  const profileNodes = segments.map((p, i) => {
    const srcH = Math.max((p.count / left) * leftH, 1.5);
    const srcY = srcCursor;
    srcCursor += (p.count / left) * leftH;
    const nodeH = Math.max((p.count / left) * usableH, 16);
    const slotCenter = padTop + i * slotH + slotH / 2;
    const y = slotCenter - nodeH / 2;
    return { ...p, srcY, srcH, nodeH, y };
  });

  function ribbon(x1: number, y1: number, h1: number, x2: number, y2: number, h2: number, color: string, opacity: number) {
    const mx = (x1 + x2) / 2;
    return (
      <path
        d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}
           L${x2},${y2 + h2} C${mx},${y2 + h2} ${mx},${y1 + h1} ${x1},${y1 + h1} Z`}
        fill={color} opacity={opacity}
      />
    );
  }

  // Animated center-line that suggests the direction of flow.
  function flowLine(x1: number, y1: number, h1: number, x2: number, y2: number, h2: number, color: string) {
    const mx = (x1 + x2) / 2;
    const cy1 = y1 + h1 / 2;
    const cy2 = y2 + h2 / 2;
    return (
      <path
        d={`M${x1},${cy1} C${mx},${cy1} ${mx},${cy2} ${x2},${cy2}`}
        fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.5} strokeLinecap="round"
        className="sankey-flow"
      />
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* Ribbons (drawn under nodes) */}
      {ribbon(col1x + nodeW, padTop, stayedH, col2x, stayedY, stayedH, C.teal, 0.2)}
      {ribbon(col1x + nodeW, padTop + stayedH, leftH, col2x, leftY, leftH, C.rose, 0.2)}
      {profileNodes.map((p) => (
        <g key={`r-${p.name}`}>{ribbon(col2x + nodeW, p.srcY, p.srcH, col3x, p.y, p.nodeH, p.color, 0.26)}</g>
      ))}

      {/* Animated flow spines */}
      {flowLine(col1x + nodeW, padTop, stayedH, col2x, stayedY, stayedH, C.teal)}
      {flowLine(col1x + nodeW, padTop + stayedH, leftH, col2x, leftY, leftH, C.rose)}
      {profileNodes.map((p) => (
        <g key={`f-${p.name}`}>{flowLine(col2x + nodeW, p.srcY, p.srcH, col3x, p.y, p.nodeH, p.color)}</g>
      ))}

      {/* All Employees */}
      <rect x={col1x} y={padTop} width={nodeW} height={availH} rx={4} fill={C.indigo} />
      <text x={col1x - 7} y={padTop + availH / 2 - 4} fontSize={11} fill="#334155" fontWeight={600} textAnchor="end">All</text>
      <text x={col1x - 7} y={padTop + availH / 2 + 10} fontSize={9.5} fill="#64748b" textAnchor="end">{total.toLocaleString()}</text>

      {/* Stayed */}
      <rect x={col2x} y={stayedY} width={nodeW} height={stayedH} rx={4} fill={C.teal} />
      <text x={col2x + nodeW + 8} y={stayedY + stayedH / 2 - 3} fontSize={11} fill="#334155" fontWeight={600}>Stayed</text>
      <text x={col2x + nodeW + 8} y={stayedY + stayedH / 2 + 11} fontSize={9.5} fill="#64748b">{stayed.toLocaleString()}</text>

      {/* Left */}
      <rect x={col2x} y={leftY} width={nodeW} height={leftH} rx={4} fill={C.rose} />
      <text x={col2x + nodeW + 8} y={leftY + leftH / 2 - 3} fontSize={11} fill="#334155" fontWeight={600}>Left</text>
      <text x={col2x + nodeW + 8} y={leftY + leftH / 2 + 11} fontSize={9.5} fill="#64748b">{left.toLocaleString()}</text>

      {/* Profiles (spread into slots) */}
      {profileNodes.map((p) => (
        <g key={p.name}>
          <rect x={col3x} y={p.y} width={nodeW} height={p.nodeH} rx={4} fill={p.color} />
          <text x={col3x + nodeW + 8} y={p.y + p.nodeH / 2 - 3} fontSize={10.5} fill="#334155" fontWeight={600}>{p.name}</text>
          <text x={col3x + nodeW + 8} y={p.y + p.nodeH / 2 + 11} fontSize={9.5} fill="#64748b">{p.count.toLocaleString()}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Feature Importance Bar ───────────────────────────────────────────────────
export function FeatureImportanceBar({ data }: { data: RiskFactor[] }) {
  const chartData = [...data].sort((a, b) => b.importance - a.importance).map(d => ({
    name: d.factor,
    value: +(d.importance * 100).toFixed(1),
  }));
  const max = chartData[0]?.value ?? 10;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 52, left: 140, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={tickNum} unit="%" domain={[0, Math.ceil(max / 10) * 10]} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={tickCat} width={135} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} cursor={CURSOR} />
        <Bar dataKey="value" name="Importance" unit="%" radius={[0, 5, 5, 0]} barSize={16} animationDuration={900}>
          {chartData.map((_, i) => <Cell key={i} fill={i === 0 ? C.rose : C.indigo} fillOpacity={i === 0 ? 1 : Math.max(0.4, 0.82 - i * 0.08)} />)}
          <LabelList dataKey="value" position="right" formatter={(v: any) => `${v}%`} fontSize={11} fill="#475569" fontWeight={600} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── U-Curve: Churn by Project Count ─────────────────────────────────────────
export function UCurveChart({ data }: { data: ProjectsAttrition[] }) {
  const chartData = data.map(d => ({ projects: d.projects, attrition: d.attritionRate, avg: d.avgHours }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: -12, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis dataKey="projects" tick={tickNum} axisLine={false} tickLine={false} label={{ value: "Number of projects", position: "insideBottom", offset: -6, fontSize: 10, fill: AXIS }} />
        <YAxis yAxisId="l" tick={tickNum} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 110]} />
        <YAxis yAxisId="r" orientation="right" tick={tickNum} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} cursor={CURSOR} />
        <Legend verticalAlign="top" align="right" height={22} iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
        <ReferenceArea yAxisId="l" x1={3} x2={5} fill={C.teal} fillOpacity={0.07} />
        <Bar yAxisId="l" dataKey="attrition" name="Churn" unit="%" fill={C.rose} radius={[4, 4, 0, 0]} maxBarSize={40} opacity={0.85} animationDuration={900} />
        <Line yAxisId="r" type="monotone" dataKey="avg" name="Avg Hours" stroke={C.sky} strokeWidth={2.5} dot={{ r: 3, fill: C.sky, strokeWidth: 0 }} activeDot={{ r: 5 }} animationDuration={1000} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Cluster Scatter ──────────────────────────────────────────────────────────
const CLUSTER_COLORS: Record<string, string> = {
  Stayed: C.indigo,
  "Burned Out Stars": C.rose,
  "Apathetic Middle": C.violet,
  "Unhappy Underperformers": C.amber,
};
export function ClusterScatter({ data }: { data: ScatterPoint[] }) {
  const groups = useMemo(() => {
    const map: Record<string, ScatterPoint[]> = {};
    for (const d of data) {
      if (!map[d.cluster]) map[d.cluster] = [];
      map[d.cluster].push(d);
    }
    return map;
  }, [data]);
  const order = ["Stayed", "Apathetic Middle", "Burned Out Stars", "Unhappy Underperformers"];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 4, right: 12, left: -18, bottom: 18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis type="number" dataKey="satisfaction" name="Satisfaction" domain={[0, 1]} tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false}
          label={{ value: "Satisfaction", position: "insideBottom", offset: -8, fontSize: 10, fill: AXIS }} />
        <YAxis type="number" dataKey="evaluation" name="Evaluation" domain={[0.3, 1]} tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false}
          label={{ value: "Evaluation", angle: -90, position: "insideLeft", offset: 14, fontSize: 10, fill: AXIS }} />
        <ZAxis range={[11, 11]} />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<Tip />} />
        <Legend verticalAlign="top" align="right" height={20} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 9.5 }} />
        {order.filter(k => groups[k]?.length).map(k => (
          <Scatter key={k} name={k} data={groups[k]} fill={CLUSTER_COLORS[k]} opacity={k === "Stayed" ? 0.22 : 0.7} animationDuration={800} />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ── Fatigue Curve ────────────────────────────────────────────────────────────
export function FatigueCurveChart({ data }: { data: FatigueCurvePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 4, right: 12, left: -12, bottom: 16 }}>
        <defs>
          <linearGradient id="fadeLeft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.rose} stopOpacity={0.25} />
            <stop offset="95%" stopColor={C.rose} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis dataKey="tenure" tick={tickNum} axisLine={false} tickLine={false}
          label={{ value: "Years at company", position: "insideBottom", offset: -6, fontSize: 10, fill: AXIS }} />
        <YAxis tick={tickNum} axisLine={false} tickLine={false} domain={[100, 310]} />
        <Tooltip content={<Tip />} cursor={{ stroke: AXIS, strokeDasharray: "3 3" }} />
        <Legend verticalAlign="top" align="right" height={22} iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
        <ReferenceArea x1={4} x2={5} fill={C.rose} fillOpacity={0.06} />
        {/* isAnimationActive=false: recharts 2.15 Area reveal clipPath can collapse the whole
            series group on fast/headless paints, blanking both the Area and its sibling Line. */}
        <Area type="monotone" dataKey="avgHoursLeft" name="Avg Hours (Left)" stroke={C.rose} strokeWidth={2.5}
          fill="url(#fadeLeft)" dot={{ r: 3, fill: C.rose, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls isAnimationActive={false} />
        <Line type="monotone" dataKey="avgHoursStayed" name="Avg Hours (Stayed)" stroke={C.indigo} strokeWidth={2}
          strokeDasharray="5 3" dot={{ r: 3, fill: C.indigo, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Satisfaction Distribution Bimodal ───────────────────────────────────────
export function SatisfactionDistBar({ data }: { data: SatisfactionBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 0, right: 10, left: -18, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: AXIS }} angle={-35} textAnchor="end" interval={0} height={42} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} cursor={CURSOR} />
        <Legend verticalAlign="top" align="right" height={20} iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
        <Bar dataKey="stayed" name="Stayed" stackId="a" fill={C.indigo} opacity={0.85} maxBarSize={46} animationDuration={900} />
        <Bar dataKey="left" name="Left" stackId="a" fill={C.rose} opacity={0.9} radius={[3, 3, 0, 0]} maxBarSize={46} animationDuration={900} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Dept Brain Drain (dumbbell) ──────────────────────────────────────────────
// Each department is a row: the connector spans the evaluation gap between
// stayers (indigo) and leavers (rose). Sorted by gap so the worst brain drain —
// where the people leaving out-perform those who stay — sits on top.
export function DeptBrainDrainChart({ data }: { data: DeptBrainDrain[] }) {
  const rows = [...data]
    .map(d => ({
      dept: d.department
        .replace("technical", "tech")
        .replace("management", "mgmt")
        .replace("product_mng", "prod")
        .replace(/_/g, " "),
      left: +d.avgEvalLeft.toFixed(2),
      stayed: +d.avgEvalStayed.toFixed(2),
    }))
    .sort((a, b) => (b.left - b.stayed) - (a.left - a.stayed));

  const W = 360;
  const labelW = 54;
  const padR = 26;
  const padTop = 6;
  const axisH = 16;
  const rowH = 20;
  const plotH = rows.length * rowH;
  const H = padTop + plotH + axisH;
  const x0 = labelW;
  const x1 = W - padR;
  // Derive the domain from the data (padded + snapped to 0.1, clamped to [0,1])
  // so values outside the legacy 0.5–1.0 band aren't silently flattened to the edge.
  const vals = rows.flatMap(r => [r.left, r.stayed]);
  const dMin = vals.length ? Math.max(0, Math.floor((Math.min(...vals) - 0.05) * 10) / 10) : 0.5;
  const dMax = vals.length ? Math.min(1, Math.ceil((Math.max(...vals) + 0.05) * 10) / 10) : 1.0;
  const sx = (v: number) => x0 + ((Math.max(dMin, Math.min(dMax, v)) - dMin) / (dMax - dMin)) * (x1 - x0);
  const ticks: number[] = [];
  for (let t = dMin; t <= dMax + 1e-9; t += 0.1) ticks.push(+t.toFixed(1));

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-end gap-3 text-[9px] text-slate-500 mb-0.5 pr-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.indigo }} />Stayers</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: C.rose }} />Leavers</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1 min-h-0" preserveAspectRatio="xMidYMid meet"
        role="img" aria-label="Departmental brain drain: average evaluation score of leavers versus stayers per department, sorted by the gap between them">
        <desc>Each row is a department; the indigo dot marks stayers&apos; average evaluation and the rose dot marks leavers&apos; average evaluation.</desc>
        {ticks.map(t => (
          <line key={`g-${t}`} x1={sx(t)} x2={sx(t)} y1={padTop} y2={padTop + plotH} stroke={GRID} strokeWidth={1} />
        ))}
        {ticks.map(t => (
          <text key={`t-${t}`} x={sx(t)} y={H - 3} fontSize={9} fill={AXIS} textAnchor="middle">{t.toFixed(1)}</text>
        ))}
        {rows.map((r, i) => {
          const cy = padTop + i * rowH + rowH / 2;
          const xs = sx(r.stayed);
          const xl = sx(r.left);
          return (
            <g key={r.dept}>
              <text x={labelW - 8} y={cy + 3} fontSize={9.5} fill={AXIS_CAT} textAnchor="end">{r.dept}</text>
              <line x1={Math.min(xs, xl)} x2={Math.max(xs, xl)} y1={cy} y2={cy} stroke="#cbd5e1" strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={xs} cy={cy} r={4} fill={C.indigo}><title>{`${r.dept} · stayers ${r.stayed}`}</title></circle>
              <circle cx={xl} cy={cy} r={4} fill={C.rose}><title>{`${r.dept} · leavers ${r.left}`}</title></circle>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Salary Churn Bar ─────────────────────────────────────────────────────────
export function SalaryChurnBar({ data }: { data: SalaryAttrition[] }) {
  const order = ["low", "medium", "high"];
  const chartData = [...data]
    .sort((a, b) => order.indexOf(a.salary) - order.indexOf(b.salary))
    .map(d => ({
      salary: d.salary.charAt(0).toUpperCase() + d.salary.slice(1),
      churn: d.attritionRate,
    }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 18, right: 14, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis dataKey="salary" tick={{ fontSize: 12, fill: AXIS_CAT }} axisLine={false} tickLine={false} />
        <YAxis tick={tickNum} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 35]} />
        <Tooltip content={<Tip />} cursor={CURSOR} />
        <Bar dataKey="churn" name="Churn" unit="%" radius={[6, 6, 0, 0]} maxBarSize={56} animationDuration={900}>
          <Cell fill={C.rose} />
          <Cell fill={C.amber} />
          <Cell fill={C.teal} />
          <LabelList dataKey="churn" position="top" formatter={(v: any) => `${v}%`} fontSize={11} fill="#475569" fontWeight={600} />
        </Bar>
        <ReferenceLine y={23.8} stroke={C.slate} strokeDasharray="4 3" label={{ value: "Company avg 23.8%", fontSize: 9.5, fill: C.slate, position: "insideTopRight" }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Tenure Attrition Line ────────────────────────────────────────────────────
export function TenureAttritionLine({ data }: { data: TenureAttrition[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 4, right: 28, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="tenureGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.sky} stopOpacity={0.25} />
            <stop offset="95%" stopColor={C.sky} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis dataKey="tenure" tick={tickNum} axisLine={false} tickLine={false} />
        <YAxis yAxisId="l" tick={tickNum} axisLine={false} tickLine={false} />
        <YAxis yAxisId="r" orientation="right" tick={tickNum} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip content={<Tip />} cursor={{ stroke: AXIS, strokeDasharray: "3 3" }} />
        <Legend verticalAlign="top" align="right" height={22} iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
        {/* isAnimationActive=false: see FatigueCurveChart — recharts 2.15 Area animation blanks the series group. */}
        <Area yAxisId="l" type="monotone" dataKey="total" name="Total" fill="url(#tenureGrad)" stroke="none" isAnimationActive={false} />
        <Line yAxisId="r" type="monotone" dataKey="attritionRate" name="Churn" unit="%" stroke={C.rose} strokeWidth={2.5} dot={{ r: 3, fill: C.rose, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Dept Attrition Fallback 2D ───────────────────────────────────────────────
const DEPT_PALETTE = [C.rose, C.indigo, C.sky, C.amber, C.teal, C.violet, C.emerald, C.slate, C.cyan, C.pink];
export function DeptAttritionBar({ data }: { data: Array<{ department: string; attritionRate: number }> }) {
  const sorted = [...data].sort((a, b) => b.attritionRate - a.attritionRate);
  const chartData = sorted.map(d => ({
    name: d.department.replace("technical", "tech").replace("management", "mgmt").replace("product_mng", "prod"),
    rate: +d.attritionRate.toFixed(1),
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 10, left: -10, bottom: 55 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: AXIS_CAT }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
        <YAxis tick={tickNum} unit="%" domain={[0, 35]} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} cursor={CURSOR} />
        <Bar dataKey="rate" name="Churn" unit="%" radius={[5, 5, 0, 0]} animationDuration={900}>
          {chartData.map((_, i) => <Cell key={i} fill={DEPT_PALETTE[i % DEPT_PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
