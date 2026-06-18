import React from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ScatterChart, Scatter, ZAxis,
  BarChart, Bar,
  ComposedChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import type { 
  SalaryAttrition, SatisfactionBucket, ScatterPoint, 
  HoursProjects, TenureAttrition, DepartmentDeep, ProjectsAttrition 
} from "@workspace/api-client-react";

// Colors matching the requested light theme palette
const COLORS = {
  primary: "#6366f1",
  sky: "#0ea5e9",
  teal: "#14b8a6",
  amber: "#f59e0b",
  rose: "#f43f5e",
  slate: "#64748b",
  stayed: "#6366f1", // Indigo for staying
  left: "#f43f5e"    // Rose for leaving
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-100 shadow-xl rounded-lg">
        <p className="font-semibold text-slate-800 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm flex items-center gap-2" style={{ color: entry.color || entry.fill }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></span>
            {entry.name}: <span className="font-medium">{typeof entry.value === 'number' ? entry.value.toFixed(2).replace(/\.00$/, '') : entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// 3. Animated Radial/Donut Chart — Salary vs Attrition
export function SalaryDonut({ data }: { data: SalaryAttrition[] }) {
  const chartData = data.map(d => ({
    name: d.salary.charAt(0).toUpperCase() + d.salary.slice(1),
    value: d.attritionRate * 100
  }));

  const pieColors = [COLORS.sky, COLORS.amber, COLORS.rose];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          animationDuration={1500}
          animationBegin={200}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="bottom" height={36} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}

// 4. Animated Area Chart — Satisfaction Distribution
export function SatisfactionArea({ data }: { data: SatisfactionBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorLeft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.left} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.left} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorStayed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.stayed} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.stayed} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="bucket" tick={{fontSize: 12, fill: COLORS.slate}} axisLine={false} tickLine={false} />
        <YAxis tick={{fontSize: 12, fill: COLORS.slate}} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="left" name="Left" stroke={COLORS.left} fillOpacity={1} fill="url(#colorLeft)" animationDuration={1200} />
        <Area type="monotone" dataKey="stayed" name="Stayed" stroke={COLORS.stayed} fillOpacity={1} fill="url(#colorStayed)" animationDuration={1200} />
        <Legend iconType="circle" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// 5. Flowing Animated Scatter Plot — Satisfaction × Evaluation
export function EvaluationScatter({ data }: { data: ScatterPoint[] }) {
  const leftData = data.filter(d => d.left === 1);
  const stayedData = data.filter(d => d.left === 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" dataKey="satisfaction" name="Satisfaction" domain={[0, 1]} tick={{fontSize: 12}} label={{ value: 'Satisfaction Score', position: 'bottom', offset: 0, fontSize: 12 }} />
        <YAxis type="number" dataKey="evaluation" name="Evaluation" domain={[0.3, 1]} tick={{fontSize: 12}} label={{ value: 'Evaluation Score', angle: -90, position: 'insideLeft', fontSize: 12 }} />
        <ZAxis type="number" range={[20, 20]} />
        <Tooltip cursor={{strokeDasharray: '3 3'}} content={<CustomTooltip />} />
        <Legend iconType="circle" />
        <Scatter name="Left" data={leftData} fill={COLORS.left} opacity={0.6} animationDuration={1500} />
        <Scatter name="Stayed" data={stayedData} fill={COLORS.stayed} opacity={0.4} animationDuration={1500} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// 6. Grouped Bar Chart — Projects vs Avg Monthly Hours
export function ProjectsHoursBar({ data }: { data: HoursProjects[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="projects" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
        <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" />
        <Bar dataKey="avgHoursLeft" name="Avg Hours (Left)" fill={COLORS.left} radius={[4, 4, 0, 0]} animationDuration={1000} />
        <Bar dataKey="avgHoursStayed" name="Avg Hours (Stayed)" fill={COLORS.stayed} radius={[4, 4, 0, 0]} animationDuration={1000} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// 7. Line + Area Chart — Tenure vs Attrition Rate
export function TenureLineArea({ data }: { data: TenureAttrition[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.sky} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={COLORS.sky} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="tenure" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" />
        <Area yAxisId="left" type="monotone" dataKey="total" name="Total Employees" fill="url(#colorTotal)" stroke="none" animationDuration={1200} />
        <Line yAxisId="right" type="monotone" dataKey="attritionRate" name="Attrition Rate" stroke={COLORS.rose} strokeWidth={3} dot={{r: 4}} animationDuration={1500} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// 9. Radar Chart — Department Deep Dive
export function DeptRadar({ data }: { data: DepartmentDeep[] }) {
  // Take top 5 departments by size or attrition
  const topDepts = [...data].sort((a, b) => b.total - a.total).slice(0, 5);
  
  // Transform data for radar: domains need to be normalized if possible, but radar can auto-scale
  const metrics = [
    { key: 'avgSatisfaction', name: 'Satisfaction' },
    { key: 'avgEvaluation', name: 'Evaluation' },
    { key: 'attritionRate', name: 'Attrition' },
  ];

  const radarData = metrics.map(m => {
    const row: any = { metric: m.name };
    topDepts.forEach(d => {
      row[d.department] = (d as any)[m.key];
    });
    return row;
  });

  const colors = [COLORS.primary, COLORS.rose, COLORS.sky, COLORS.teal, COLORS.amber];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="metric" tick={{fontSize: 12, fill: COLORS.slate}} />
        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {topDepts.map((d, i) => (
          <Radar key={d.department} name={d.department} dataKey={d.department} stroke={colors[i]} fill={colors[i]} fillOpacity={0.3} animationDuration={1500} />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}

// 10. Line Chart — Projects vs Attrition Rate
export function ProjectsAttritionLine({ data }: { data: ProjectsAttrition[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="projects" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={{fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
        <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" />
        <Line yAxisId="left" type="monotone" dataKey="attritionRate" name="Attrition Rate" stroke={COLORS.rose} strokeWidth={3} dot={{r: 5}} animationDuration={1200} />
        <Line yAxisId="right" type="monotone" dataKey="avgHours" name="Avg Hours" stroke={COLORS.teal} strokeWidth={3} dot={{r: 5}} animationDuration={1200} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
