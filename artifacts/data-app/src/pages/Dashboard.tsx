import { Suspense } from "react";
import { motion } from "framer-motion";
import KpiCard from "@/components/KpiCard";
import DeptBars from "@/components/3d/DeptBars";
import {
  FeatureImportanceBar,
  UCurveChart,
  ClusterScatter,
  FatigueCurveChart,
  HoursSatisfactionScatter,
  SatisfactionDistBar,
  DeptBrainDrainChart,
  SalaryChurnBar,
  TenureAttritionLine,
  SankeyFlow,
  DeptAttritionBar,
} from "@/components/DashboardCharts";
import { WebGLBoundary } from "@/components/3d/WebGLBoundary";

import {
  useGetHrSummary,
  useGetAttritionByDepartment,
  useGetAttritionBySalary,
  useGetSatisfactionDistribution,
  useGetTenureAttrition,
  useGetRiskFactors,
  useGetScatterSample,
  useGetProjectsAttrition,
  useGetChurnProfiles,
  useGetFatigueCurve,
  useGetDeptBrainDrain,
} from "@workspace/api-client-react";

// ── Card shell ──────────────────────────────────────────────────────────────
function Card({ title, subtitle, children, className = "", delay = 0 }: {
  title?: string; subtitle?: string; children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-col ${className}`}
    >
      {title && (
        <div className="mb-1.5 px-1">
          <p className="text-[13px] font-semibold text-slate-800 leading-tight">{title}</p>
          {subtitle && <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="flex-1 min-h-0">{children}</div>
    </motion.div>
  );
}

function Skeleton() {
  return <div className="w-full h-full bg-slate-100 rounded-xl animate-pulse min-h-[120px]" />;
}

// ── Compact profile card ─────────────────────────────────────────────────────
function ProfileCard({ profile, delay }: { profile: any; delay: number }) {
  const color = profile.color as string;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-slate-800 leading-tight truncate">{profile.name}</p>
          <p className="text-[10px] text-slate-400">{profile.count.toLocaleString()} · {profile.pctOfLeavers}% of leavers</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: color }}>
          {profile.pctOfLeavers}%
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {[
          { label: "Sat", value: profile.avgSatisfaction },
          { label: "Eval", value: profile.avgEvaluation },
          { label: "Hrs", value: profile.avgHours, suffix: "h" },
        ].map(m => (
          <div key={m.label} className="bg-slate-50 rounded-lg py-1 text-center">
            <p className="text-[9px] text-slate-400">{m.label}</p>
            <p className="text-sm font-bold" style={{ color }}>{m.value}{m.suffix ?? ""}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 leading-snug mb-1.5 line-clamp-2">{profile.description}</p>
      <div className="text-[10px] text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5 leading-snug">
        <span className="font-semibold">Action: </span>{profile.actionPlan}
      </div>
    </motion.div>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-4 animate-pulse">
      <div className="h-6 w-48 bg-slate-200 rounded" />
      <div className="grid grid-cols-8 gap-2">
        {[...Array(8)].map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100" />)}
      </div>
      <div className="h-80 bg-white rounded-2xl border border-slate-100" />
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: summary, isLoading } = useGetHrSummary();
  const { data: deptAttr } = useGetAttritionByDepartment();
  const { data: salaryAttr } = useGetAttritionBySalary();
  const { data: satDist } = useGetSatisfactionDistribution();
  const { data: scatter } = useGetScatterSample();
  const { data: tenureAttr } = useGetTenureAttrition();
  const { data: riskFactors } = useGetRiskFactors();
  const { data: projAttr } = useGetProjectsAttrition();
  const { data: churnProfiles } = useGetChurnProfiles();
  const { data: fatigueCurve } = useGetFatigueCurve();
  const { data: brainDrain } = useGetDeptBrainDrain();

  if (isLoading || !summary) return <PageSkeleton />;

  const deptForBars = deptAttr?.map(d => ({
    department: d.department,
    attritionRate: d.attritionRate,
    leftCount: d.left,
    totalCount: d.total,
  })) ?? [];

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-4 pb-10 space-y-3">

      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">HR Command Center</h1>
          <p className="text-xs text-slate-500">People analytics for <span className="font-semibold text-slate-700">14,999 employees</span> — making the cost of attrition actionable</p>
        </div>
        <span className="text-[10px] text-slate-400 hidden md:block">Data: HR_comma_sep · {new Date().toLocaleDateString()}</span>
      </motion.div>

      {/* ── KPI strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <KpiCard title="Employees" value={summary.totalEmployees} gradient="from-indigo-50 to-indigo-100" delay={0.03} compact />
        <KpiCard title="Churn Rate" value={summary.attritionRate} suffix="%" decimals={1} gradient="from-rose-50 to-rose-100" delay={0.06} compact />
        <KpiCard title="Avg Satisfaction" value={summary.avgSatisfaction} decimals={2} gradient="from-teal-50 to-teal-100" delay={0.09} compact />
        <KpiCard title="Avg Evaluation" value={summary.avgEvaluation} decimals={2} gradient="from-sky-50 to-sky-100" delay={0.12} compact />
        <KpiCard title="Avg Monthly Hrs" value={summary.avgMonthlyHours} decimals={0} suffix="h" gradient="from-amber-50 to-amber-100" delay={0.15} compact />
        <KpiCard title="Work Accidents" value={summary.workAccidentRate} suffix="%" decimals={1} gradient="from-orange-50 to-orange-100" delay={0.18} compact />
        <KpiCard title="Promotion Rate" value={summary.promotionRate} suffix="%" decimals={1} gradient="from-violet-50 to-violet-100" delay={0.21} compact />
        <KpiCard title="Avg Tenure" value={summary.avgTenure} suffix="yr" decimals={1} gradient="from-emerald-50 to-emerald-100" delay={0.24} compact />
      </div>

      {/* ── Hero row: 3D Dept Bars + Sankey ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <Card title="Attrition by Department (3D)" subtitle="Drag to rotate · auto-orbiting" className="lg:col-span-7 h-[320px]" delay={0.1}>
          {deptForBars.length > 0 ? (
            <WebGLBoundary fallback={<DeptAttritionBar data={deptForBars} />}>
              <Suspense fallback={<DeptAttritionBar data={deptForBars} />}>
                <DeptBars data={deptAttr!} />
              </Suspense>
            </WebGLBoundary>
          ) : <Skeleton />}
        </Card>
        <Card title="Attrition Flow" subtitle="Where 3,571 leavers came from — Sankey diagram" className="lg:col-span-5 h-[320px]" delay={0.15}>
          {churnProfiles ? (
            <SankeyFlow total={summary.totalEmployees} stayed={summary.stayedCount} left={summary.leftCount} profiles={churnProfiles} />
          ) : <Skeleton />}
        </Card>
      </div>

      {/* ── Three Churn Profiles ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {churnProfiles ? (
          churnProfiles.map((p, i) => <ProfileCard key={p.name} profile={p} delay={0.1 + i * 0.06} />)
        ) : (
          [...Array(3)].map((_, i) => <div key={i} className="h-44 bg-white rounded-2xl border border-slate-100 animate-pulse" />)
        )}
      </div>

      {/* ── Root Cause Analysis (4 charts) ──────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card title="U-Curve: Churn by Projects" subtitle="Sweet spot 3–5 · overload spikes churn" className="h-[210px]" delay={0.05}>
          {projAttr ? <UCurveChart data={projAttr} /> : <Skeleton />}
        </Card>
        <Card title="Three Churn Profiles" subtitle="Evaluation vs satisfaction clusters" className="h-[210px]" delay={0.1}>
          {scatter ? <ClusterScatter data={scatter} /> : <Skeleton />}
        </Card>
        <Card title="Fatigue Curve: Hours by Tenure" subtitle="Leavers spike at the 4–5 year mark" className="h-[210px]" delay={0.15}>
          {fatigueCurve ? <FatigueCurveChart data={fatigueCurve} /> : <Skeleton />}
        </Card>
        <Card title="Hours vs Satisfaction" subtitle="Over- & under-worked both churn" className="h-[210px]" delay={0.2}>
          {scatter ? <HoursSatisfactionScatter data={scatter} /> : <Skeleton />}
        </Card>
      </div>

      {/* ── Organizational Breakdown (4 charts) ─────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card title="Satisfaction Distribution" subtitle="Bimodal leaver pattern" className="h-[230px]" delay={0.05}>
          {satDist ? <SatisfactionDistBar data={satDist} /> : <Skeleton />}
        </Card>
        <Card title="Departmental Brain Drain" subtitle="Leavers score higher on evals" className="h-[230px]" delay={0.1}>
          {brainDrain ? <DeptBrainDrainChart data={brainDrain} /> : <Skeleton />}
        </Card>
        <Card title="Churn by Salary Band" subtitle="Low earners churn far more" className="h-[230px]" delay={0.15}>
          {salaryAttr ? <SalaryChurnBar data={salaryAttr} /> : <Skeleton />}
        </Card>
        <Card title="Tenure vs Churn Rate" subtitle="Spike at years 3–5" className="h-[230px]" delay={0.2}>
          {tenureAttr ? <TenureAttritionLine data={tenureAttr} /> : <Skeleton />}
        </Card>
      </div>

      {/* ── ML Feature Importance ───────────────────────────── */}
      <Card title="ML Model — Top Predictors of Churn" subtitle="Feature importance (Random Forest)" className="h-[200px]" delay={0.05}>
        {riskFactors ? <FeatureImportanceBar data={riskFactors} /> : <Skeleton />}
      </Card>

    </div>
  );
}
