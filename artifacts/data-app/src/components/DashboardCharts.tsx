import React, { useMemo } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ScatterChart, Scatter, ZAxis,
  BarChart, Bar,
  ComposedChart, Line,
  ReferenceLine,
} from "recharts";
import type {
  SalaryAttrition, SatisfactionBucket, ScatterPoint,
  HoursProjects, TenureAttrition, DepartmentDeep, ProjectsAttrition,
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

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm p-2.5 border border-slate-100 shadow-xl rounded-lg text-xs">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((e: any, i: number) => (
        <p key={i} className="flex items-center gap-1.5" style={{ color: e.color || e.fill }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: e.color || e.fill }} />
          {e.name}: <span className="font-semibold ml-0.5">{typeof e.value === "number" ? +e.value.toFixed(2) : e.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Sankey Attrition Flow ────────────────────────────────────────────────────
export function SankeyFlow({ total, stayed, left, profiles }: {
  total: number; stayed: number; left: number; profiles: ChurnProfile[];
}) {
  const W = 560; const H = 280;
  const col1x = 60; const col2x = 220; const col3x = 420;
  const nodeW = 18;

  const stayedH = (stayed / total) * (H - 20);
  const leftH = (left / total) * (H - 20);
  const stayedY = 10;
  const leftY = stayedH + 30;

  const profileNodes = profiles.map((p, i) => {
    const h = (p.count / left) * (leftH - (profiles.length - 1) * 6);
    const y = leftY + profiles.slice(0, i).reduce((acc, pp) => acc + (pp.count / left) * (leftH - (profiles.length - 1) * 6) + 6, 0);
    return { ...p, h, y, color: p.color };
  });

  function bezier(x1: number, y1: number, h1: number, x2: number, y2: number, h2: number, color: string, opacity: number) {
    const mx = (x1 + x2) / 2;
    return (
      <path
        d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}
           L${x2},${y2 + h2} C${mx},${y2 + h2} ${mx},${y1 + h1} ${x1},${y1 + h1} Z`}
        fill={color} opacity={opacity}
      />
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 280 }}>
      {/* All Employees node */}
      <rect x={col1x} y={10} width={nodeW} height={H - 20} rx={4} fill={C.indigo} />
      <text x={col1x + nodeW + 6} y={H / 2 - 6} fontSize={11} fill="#334155" fontWeight="600">All Employees</text>
      <text x={col1x + nodeW + 6} y={H / 2 + 8} fontSize={10} fill="#64748b">{total.toLocaleString()}</text>

      {/* Stayed node */}
      <rect x={col2x} y={stayedY} width={nodeW} height={stayedH} rx={4} fill={C.teal} />
      <text x={col2x + nodeW + 6} y={stayedY + stayedH / 2 - 6} fontSize={11} fill="#334155" fontWeight="600">Stayed</text>
      <text x={col2x + nodeW + 6} y={stayedY + stayedH / 2 + 8} fontSize={10} fill="#64748b">{stayed.toLocaleString()}</text>

      {/* Left node */}
      <rect x={col2x} y={leftY} width={nodeW} height={leftH} rx={4} fill={C.rose} />
      <text x={col2x + nodeW + 6} y={leftY + leftH / 2 - 6} fontSize={11} fill="#334155" fontWeight="600">Left</text>
      <text x={col2x + nodeW + 6} y={leftY + leftH / 2 + 8} fontSize={10} fill="#64748b">{left.toLocaleString()}</text>

      {/* Flow: All → Stayed */}
      {bezier(col1x + nodeW, 10, stayedH, col2x, stayedY, stayedH, C.teal, 0.25)}
      {/* Flow: All → Left */}
      {bezier(col1x + nodeW, 10 + stayedH, leftH, col2x, leftY, leftH, C.rose, 0.25)}

      {/* Profile nodes */}
      {profileNodes.map((p) => (
        <g key={p.name}>
          <rect x={col3x} y={p.y} width={nodeW} height={p.h} rx={4} fill={p.color} />
          <text x={col3x + nodeW + 6} y={p.y + p.h / 2 - 5} fontSize={10} fill="#334155" fontWeight="600">{p.name.replace("Underperformers", "Under...")}</text>
          <text x={col3x + nodeW + 6} y={p.y + p.h / 2 + 7} fontSize={9} fill="#64748b">{p.count.toLocaleString()}</text>
          {bezier(col2x + nodeW, leftY + (p.y - leftY), p.h, col3x, p.y, p.h, p.color, 0.22)}
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
  const palette = [C.rose, C.indigo, C.teal, C.amber, C.sky, C.violet];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 40, left: 140, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" tick={{ fontSize: 11, fill: C.slate }} unit="%" domain={[0, 40]} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#334155" }} width={135} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} formatter={(v: any) => [`${v}%`, "Importance"]} />
        <Bar dataKey="value" radius={[0, 5, 5, 0]} animationDuration={900}>
          {chartData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
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
      <ComposedChart data={chartData} margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="projects" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: "# Projects", position: "insideBottom", offset: -2, fontSize: 11 }} />
        <YAxis yAxisId="l" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 110]} />
        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="l" dataKey="attrition" name="Churn %" fill={C.rose} radius={[4, 4, 0, 0]} opacity={0.85} animationDuration={900} />
        <Line yAxisId="r" type="monotone" dataKey="avg" name="Avg Hours" stroke={C.sky} strokeWidth={2.5} dot={{ r: 4 }} animationDuration={1000} />
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
      <ScatterChart margin={{ top: 8, right: 10, left: -20, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" dataKey="satisfaction" name="Satisfaction" domain={[0, 1]} tick={{ fontSize: 10 }}
          label={{ value: "Satisfaction", position: "insideBottom", offset: -4, fontSize: 11 }} />
        <YAxis type="number" dataKey="evaluation" name="Evaluation" domain={[0.3, 1]} tick={{ fontSize: 10 }}
          label={{ value: "Evaluation", angle: -90, position: "insideLeft", offset: 10, fontSize: 11 }} />
        <ZAxis range={[12, 12]} />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<Tip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
        {order.filter(k => groups[k]?.length).map(k => (
          <Scatter key={k} name={k} data={groups[k]} fill={CLUSTER_COLORS[k]} opacity={k === "Stayed" ? 0.25 : 0.7} animationDuration={800} />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ── Fatigue Curve ────────────────────────────────────────────────────────────
export function FatigueCurveChart({ data }: { data: FatigueCurvePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="fadeLeft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.rose} stopOpacity={0.25} />
            <stop offset="95%" stopColor={C.rose} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fadeStayed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.indigo} stopOpacity={0.18} />
            <stop offset="95%" stopColor={C.indigo} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="tenure" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
          label={{ value: "Years at Company", position: "insideBottom", offset: -2, fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[100, 310]} />
        <Tooltip content={<Tip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="avgHoursLeft" name="Avg Hours (Left)" stroke={C.rose} strokeWidth={2.5}
          fill="url(#fadeLeft)" connectNulls animationDuration={1000} />
        <Line type="monotone" dataKey="avgHoursStayed" name="Avg Hours (Stayed)" stroke={C.indigo} strokeWidth={2}
          strokeDasharray="5 3" dot={{ r: 3 }} animationDuration={1000} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Hours vs Satisfaction Scatter ────────────────────────────────────────────
export function HoursSatisfactionScatter({ data }: { data: ScatterPoint[] }) {
  const leftData = data.filter(d => d.left === 1);
  const stayedData = data.filter(d => d.left === 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 10, left: -20, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" dataKey="hours" name="Hours" domain={[80, 330]} tick={{ fontSize: 10 }}
          label={{ value: "Avg Monthly Hours", position: "insideBottom", offset: -4, fontSize: 11 }} />
        <YAxis type="number" dataKey="satisfaction" name="Satisfaction" domain={[0, 1]} tick={{ fontSize: 10 }}
          label={{ value: "Satisfaction", angle: -90, position: "insideLeft", offset: 10, fontSize: 11 }} />
        <ZAxis range={[10, 10]} />
        <Tooltip content={<Tip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
        <Scatter name="Stayed" data={stayedData} fill={C.indigo} opacity={0.2} animationDuration={800} />
        <Scatter name="Left" data={leftData} fill={C.rose} opacity={0.55} animationDuration={800} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ── Dept Churn + Satisfaction overlay ───────────────────────────────────────
export function DeptChurnComposed({ data }: { data: DepartmentDeep[] }) {
  const sorted = [...data].sort((a, b) => b.attritionRate - a.attritionRate);
  const chartData = sorted.map(d => ({
    dept: d.department.replace("technical", "tech").replace("management", "mgmt").replace("product_mng", "prod"),
    churn: d.attritionRate,
    satisfaction: +(d.avgSatisfaction * 100).toFixed(1),
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} layout="vertical" margin={{ top: 4, right: 50, left: 48, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 38]} />
        <YAxis type="category" dataKey="dept" tick={{ fontSize: 10, fill: "#334155" }} width={44} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
        <Bar dataKey="churn" name="Churn %" fill={C.rose} radius={[0, 4, 4, 0]} opacity={0.85} animationDuration={900} />
        <Line dataKey="satisfaction" name="Avg Sat ×100" stroke={C.teal} strokeWidth={2} dot={{ r: 3 }} animationDuration={1000} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Satisfaction Distribution Bimodal ───────────────────────────────────────
export function SatisfactionDistBar({ data }: { data: SatisfactionBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 10, left: -20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: C.slate }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
        <Bar dataKey="stayed" name="Stayed" stackId="a" fill={C.indigo} opacity={0.85} animationDuration={900} />
        <Bar dataKey="left" name="Left" stackId="a" fill={C.rose} opacity={0.9} radius={[3, 3, 0, 0]} animationDuration={900} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Dept Brain Drain ─────────────────────────────────────────────────────────
export function DeptBrainDrainChart({ data }: { data: DeptBrainDrain[] }) {
  const sorted = [...data].sort((a, b) => b.avgEvalLeft - a.avgEvalLeft);
  const chartData = sorted.map(d => ({
    dept: d.department.replace("technical", "tech").replace("management", "mgmt").replace("product_mng", "prod"),
    left: +d.avgEvalLeft.toFixed(2),
    stayed: +d.avgEvalStayed.toFixed(2),
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 30, left: 44, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" domain={[0.5, 1]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="dept" tick={{ fontSize: 10, fill: "#334155" }} width={40} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
        <Bar dataKey="left" name="Leavers Eval" fill={C.rose} radius={[0, 4, 4, 0]} opacity={0.9} animationDuration={900} />
        <Bar dataKey="stayed" name="Stayers Eval" fill={C.indigo} radius={[0, 4, 4, 0]} opacity={0.7} animationDuration={900} />
      </BarChart>
    </ResponsiveContainer>
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
      <BarChart data={chartData} margin={{ top: 8, right: 20, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="salary" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 35]} />
        <Tooltip content={<Tip />} formatter={(v: any) => [`${v}%`, "Churn Rate"]} />
        <Bar dataKey="churn" name="Churn %" radius={[6, 6, 0, 0]} animationDuration={900}>
          <Cell fill={C.rose} />
          <Cell fill={C.amber} />
          <Cell fill={C.teal} />
        </Bar>
        <ReferenceLine y={23.8} stroke={C.slate} strokeDasharray="4 3" label={{ value: "Avg", fontSize: 10, fill: C.slate }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Tenure Attrition Line ────────────────────────────────────────────────────
export function TenureAttritionLine({ data }: { data: TenureAttrition[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 30, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="tenureGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.sky} stopOpacity={0.25} />
            <stop offset="95%" stopColor={C.sky} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="tenure" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="l" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip content={<Tip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Area yAxisId="l" type="monotone" dataKey="total" name="Total" fill="url(#tenureGrad)" stroke="none" animationDuration={1000} />
        <Line yAxisId="r" type="monotone" dataKey="attritionRate" name="Churn %" stroke={C.rose} strokeWidth={2.5} dot={{ r: 4 }} animationDuration={1200} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Hours vs Projects Grouped Bar ────────────────────────────────────────────
export function ProjectsHoursBar({ data }: { data: HoursProjects[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="projects" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="avgHoursLeft" name="Avg Hours (Left)" fill={C.rose} radius={[4, 4, 0, 0]} animationDuration={900} />
        <Bar dataKey="avgHoursStayed" name="Avg Hours (Stayed)" fill={C.stayed} radius={[4, 4, 0, 0]} animationDuration={900} />
      </BarChart>
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
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 35]} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: any) => [`${v}%`, "Churn Rate"]} />
        <Bar dataKey="rate" radius={[5, 5, 0, 0]} animationDuration={900}>
          {chartData.map((_, i) => <Cell key={i} fill={DEPT_PALETTE[i % DEPT_PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
