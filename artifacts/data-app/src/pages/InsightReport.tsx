import {
  useGetHrSummary,
  useGetAttritionByDepartment,
  useGetAttritionBySalary,
  useGetTenureAttrition,
  useGetRiskFactors,
} from "@workspace/api-client-react";
import { AlertCircle, Clock, Briefcase, Users, TrendingDown, Printer } from "lucide-react";
import { SalaryChurnBar, TenureAttritionLine } from "@/components/DashboardCharts";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

const RISK_COLORS = ["#6366f1", "#0ea5e9", "#14b8a6", "#f59e0b", "#f43f5e", "#8b5cf6", "#10b981", "#64748b"];

function MiniDeptBar({ data }: { data: any[] }) {
  const chartData = [...data]
    .sort((a, b) => b.attritionRate - a.attritionRate)
    .slice(0, 6);
  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={chartData} margin={{ top: 6, right: 8, left: -20, bottom: 0 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
        <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 35]} />
        <YAxis dataKey="department" type="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
        <Tooltip cursor={{ fill: "#f8fafc" }} formatter={(v: number) => [`${v.toFixed(1)}%`, "Attrition"]} />
        <Bar dataKey="attritionRate" radius={[0, 4, 4, 0]} barSize={14}>
          {chartData.map((_, i) => <Cell key={i} fill={RISK_COLORS[i % RISK_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RiskFactorsBar({ data }: { data: any[] }) {
  const chartData = [...data]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 6)
    .map((d) => ({ name: d.factor, score: +(d.importance * 100).toFixed(0) }));
  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 6, right: 20, left: 110, bottom: 0 }}>
        <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 40]} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={108} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: number) => [`${v}%`, "Risk Score"]} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={14}>
          {chartData.map((_, i) => <Cell key={i} fill={RISK_COLORS[i % RISK_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function InsightReport() {
  const { data: summary, isLoading: loadingSummary } = useGetHrSummary();
  const { data: deptAttr } = useGetAttritionByDepartment();
  const { data: salaryAttr } = useGetAttritionBySalary();
  const { data: tenureAttr } = useGetTenureAttrition();
  const { data: riskFactors } = useGetRiskFactors();

  if (loadingSummary || !summary) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-8 bg-white shadow-xl min-h-[1056px] rounded-sm my-8 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-slate-200 rounded mb-4" />
          <div className="h-4 w-32 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-8 bg-white shadow-xl rounded-sm my-6 print:my-0 print:shadow-none print:py-6 relative">

      {/* Print button — hidden when printing */}
      <button
        onClick={() => window.print()}
        className="print:hidden absolute top-6 right-6 flex items-center gap-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors"
      >
        <Printer className="h-4 w-4" />
        Print Report
      </button>

      {/* Header */}
      <header className="border-b-2 border-indigo-600 pb-4 mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 font-bold text-xl text-indigo-600 mb-1">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-base font-bold">S</div>
            Salifort Motors
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">HR Analytics Report</h1>
        </div>
        <div className="text-right">
          <p className="text-slate-500 font-medium text-sm">June 2026</p>
          <p className="text-xs text-slate-400">Executive Summary</p>
        </div>
      </header>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: "Employees", value: summary.totalEmployees.toLocaleString(), color: "bg-indigo-50 text-indigo-700" },
          { label: "Attrition Rate", value: `${summary.attritionRate.toFixed(1)}%`, color: "bg-rose-50 text-rose-700" },
          { label: "Avg Satisfaction", value: `${(summary.avgSatisfaction * 100).toFixed(0)}/100`, color: "bg-sky-50 text-sky-700" },
          { label: "Avg Monthly Hrs", value: summary.avgMonthlyHours.toFixed(0), color: "bg-amber-50 text-amber-700" },
          { label: "Promotion Rate", value: `${summary.promotionRate.toFixed(1)}%`, color: "bg-teal-50 text-teal-700" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-lg p-3 ${kpi.color}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{kpi.label}</p>
            <p className="text-lg font-bold mt-0.5">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-5 text-slate-800">

        {/* Findings + Charts in 2 columns */}
        <div className="grid grid-cols-2 gap-5">

          {/* Critical Findings */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
              <AlertCircle className="text-rose-500 h-4 w-4" />
              Top 5 Critical Findings
            </h3>
            <div className="space-y-2">
              {[
                {
                  icon: <Users className="text-indigo-500 h-4 w-4 shrink-0 mt-0.5" />,
                  bold: `${summary.attritionRate.toFixed(1)}% overall attrition`,
                  sub: `${summary.leftCount.toLocaleString()} of ${summary.totalEmployees.toLocaleString()} employees left.`,
                  bg: "bg-indigo-50/60 border-indigo-100",
                },
                {
                  icon: <TrendingDown className="text-rose-500 h-4 w-4 shrink-0 mt-0.5" />,
                  bold: "Low satisfaction (<0.4) is leading indicator",
                  sub: "Low-satisfaction employees leave at 3× the rate.",
                  bg: "bg-rose-50/40 border-rose-100",
                },
                {
                  icon: <Clock className="text-amber-500 h-4 w-4 shrink-0 mt-0.5" />,
                  bold: "Overworked employees (>250 hrs/mo) at extreme risk",
                  sub: "Burnout signal: excessive hours + low evaluation = departure.",
                  bg: "bg-amber-50/40 border-amber-100",
                },
                {
                  icon: <Briefcase className="text-teal-500 h-4 w-4 shrink-0 mt-0.5" />,
                  bold: "HR dept leads attrition at ~29%",
                  sub: "Closely followed by Technical and Support.",
                  bg: "bg-slate-50 border-slate-100",
                },
                {
                  icon: <TrendingDown className="text-violet-500 h-4 w-4 shrink-0 mt-0.5" />,
                  bold: `Only ${summary.promotionRate.toFixed(1)}% promoted in 5 years`,
                  sub: "Career stagnation drives top-performer exits.",
                  bg: "bg-slate-50 border-slate-100",
                },
              ].map((item, i) => (
                <div key={i} className={`p-2.5 rounded border ${item.bg} flex gap-2.5 items-start`}>
                  {item.icon}
                  <div>
                    <p className="font-semibold text-slate-900 text-xs leading-tight">{item.bold}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Charts column */}
          <div className="space-y-4">
            <section>
              <h3 className="text-sm font-bold text-slate-900 mb-1 uppercase tracking-wide">Attrition by Department</h3>
              <div className="border border-slate-200 rounded p-2">
                {deptAttr && <MiniDeptBar data={deptAttr} />}
              </div>
            </section>
            <section>
              <h3 className="text-sm font-bold text-slate-900 mb-1 uppercase tracking-wide">Top Risk Factors</h3>
              <div className="border border-slate-200 rounded p-2">
                {riskFactors && <RiskFactorsBar data={riskFactors} />}
              </div>
            </section>
          </div>
        </div>

        {/* Data Charts Row */}
        <section>
          <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">Supporting Data</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded p-3">
              <p className="text-xs font-semibold text-slate-600 mb-1 text-center">Attrition by Salary Band</p>
              <div className="h-[170px]">{salaryAttr && <SalaryChurnBar data={salaryAttr} />}</div>
            </div>
            <div className="border border-slate-200 rounded p-3">
              <p className="text-xs font-semibold text-slate-600 mb-1 text-center">Tenure vs Attrition Rate</p>
              <div className="h-[170px]">{tenureAttr && <TenureAttritionLine data={tenureAttr} />}</div>
            </div>
          </div>
        </section>

        {/* Recommendations */}
        <section>
          <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">Strategic Recommendations</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { title: "Cap Monthly Hours", body: "Alert managers when any employee exceeds 220 hrs/month to prevent burnout-driven exits." },
              { title: "Career Progression Tracks", body: "The 2.1% promotion rate is unsustainable. Create accelerated tracks for HR and Technical roles." },
              { title: "Project Load Balancing", body: "Rebalance workloads for employees on 6+ concurrent projects — this segment shows extreme attrition." },
              { title: "Early Intervention System", body: "Flag employees with satisfaction <0.5 for immediate manager check-ins using predictive signals." },
            ].map((rec) => (
              <div key={rec.title} className="bg-slate-50 border border-slate-100 rounded p-2.5">
                <p className="font-semibold text-slate-900 text-xs">{rec.title}</p>
                <p className="text-slate-600 text-[11px] mt-0.5">{rec.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 pt-3 flex justify-between text-[10px] text-slate-400">
          <span>Salifort Motors · HR Analytics · Confidential</span>
          <span>Data source: HR_comma_sep.csv · {summary.totalEmployees.toLocaleString()} records · June 2026</span>
        </footer>
      </div>
    </div>
  );
}
