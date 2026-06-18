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
  DeptChurnComposed,
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
  useGetDepartmentDeep,
  useGetProjectsAttrition,
  useGetChurnProfiles,
  useGetFatigueCurve,
  useGetDeptBrainDrain,
} from "@workspace/api-client-react";

// ── Shared layout pieces ────────────────────────────────────────────────────

function SectionHeader({ label, title, subtitle }: { label: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500">{label}</span>
      <h2 className="text-xl font-bold text-slate-900 mt-0.5">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Card({ title, subtitle, children, className = "", delay = 0 }: {
  title?: string; subtitle?: string; children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col ${className}`}
    >
      {title && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="flex-1 min-h-0">{children}</div>
    </motion.div>
  );
}

function Skeleton({ h = "h-56" }: { h?: string }) {
  return <div className={`${h} bg-slate-100 rounded-xl animate-pulse`} />;
}

// ── Profile card ────────────────────────────────────────────────────────────
function ProfileCard({ profile, delay }: { profile: any; delay: number }) {
  const color = profile.color as string;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-bold text-slate-800">{profile.name}</p>
          <p className="text-xs text-slate-400">{profile.count.toLocaleString()} employees · {profile.pctOfLeavers}% of leavers</p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
          {profile.pctOfLeavers}%
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Satisfaction", value: profile.avgSatisfaction },
          { label: "Evaluation", value: profile.avgEvaluation },
          { label: "Avg Hours", value: profile.avgHours, suffix: "h" },
        ].map(m => (
          <div key={m.label} className="bg-slate-50 rounded-xl p-2 text-center">
            <p className="text-[10px] text-slate-400 mb-0.5">{m.label}</p>
            <p className="text-base font-bold" style={{ color }}>{m.value}{m.suffix ?? ""}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mb-2 leading-relaxed">{profile.description}</p>
      <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 leading-relaxed">
        <span className="font-semibold">Action: </span>{profile.actionPlan}
      </div>
    </motion.div>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 animate-pulse">
      <div className="h-6 w-48 bg-slate-200 rounded" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100" />)}
      </div>
      <div className="h-72 bg-white rounded-2xl border border-slate-100" />
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
  const { data: deptDeep } = useGetDepartmentDeep();
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
    <div className="max-w-7xl mx-auto px-4 py-5 pb-16 space-y-10">

      {/* ── Hero header ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">HR Command Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            People analytics for <span className="font-semibold text-slate-700">14,999 employees</span> — making the cost of attrition actionable
          </p>
        </div>
        <span className="text-xs text-slate-400 hidden sm:block">Data: HR_comma_sep · {new Date().toLocaleDateString()}</span>
      </motion.div>

      {/* ── 1. KPI Strip (8 metrics) ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <KpiCard title="Employees" value={summary.totalEmployees} gradient="from-indigo-50 to-indigo-100" delay={0.05} compact />
        <KpiCard title="Churn Rate" value={summary.attritionRate} suffix="%" decimals={1} gradient="from-rose-50 to-rose-100" delay={0.1} compact />
        <KpiCard title="Avg Satisfaction" value={summary.avgSatisfaction} decimals={2} gradient="from-teal-50 to-teal-100" delay={0.15} compact />
        <KpiCard title="Avg Evaluation" value={summary.avgEvaluation} decimals={2} gradient="from-sky-50 to-sky-100" delay={0.2} compact />
        <KpiCard title="Avg Monthly Hrs" value={summary.avgMonthlyHours} decimals={0} suffix="h" gradient="from-amber-50 to-amber-100" delay={0.25} compact />
        <KpiCard title="Work Accidents" value={summary.workAccidentRate} suffix="%" decimals={1} gradient="from-orange-50 to-orange-100" delay={0.3} compact />
        <KpiCard title="Promotion Rate" value={summary.promotionRate} suffix="%" decimals={1} gradient="from-violet-50 to-violet-100" delay={0.35} compact />
        <KpiCard title="Avg Tenure" value={summary.avgTenure} suffix="yr" decimals={1} gradient="from-emerald-50 to-emerald-100" delay={0.4} compact />
      </div>

      {/* ── 2. Attrition Flow & Three Profiles ──────────────────── */}
      <section>
        <SectionHeader
          label="Attrition Flow"
          title="Where Did 3,571 Employees Go?"
          subtitle="Sankey flow — workforce splits into stayed vs leaver profiles"
        />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-2 h-72" delay={0.1}>
            {churnProfiles && summary ? (
              <SankeyFlow
                total={summary.totalEmployees}
                stayed={summary.stayedCount}
                left={summary.leftCount}
                profiles={churnProfiles}
              />
            ) : <Skeleton />}
          </Card>
          {churnProfiles ? (
            churnProfiles.map((p, i) => (
              <ProfileCard key={p.name} profile={p} delay={0.15 + i * 0.08} />
            ))
          ) : (
            [...Array(3)].map((_, i) => <div key={i} className="h-72 bg-white rounded-2xl border border-slate-100 animate-pulse" />)
          )}
        </div>
      </section>

      {/* ── 3. Root Cause Analysis ──────────────────────────────── */}
      <section>
        <SectionHeader
          label="Root Cause Analysis"
          title="The Mechanics Behind Why Employees Leave"
          subtitle="U-curve, clusters, and overwork patterns"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="The U-Curve: Churn by Project Count" subtitle="Sweet spot: 3–5 projects — under or overloaded = high churn" className="h-64" delay={0.1}>
            {projAttr ? <UCurveChart data={projAttr} /> : <Skeleton />}
          </Card>
          <Card title="The Three Churn Profiles" subtitle="Evaluation vs Satisfaction — distinct leaver clusters" className="h-64" delay={0.15}>
            {scatter ? <ClusterScatter data={scatter} /> : <Skeleton />}
          </Card>
          <Card title="The Fatigue Curve: Hours by Tenure" subtitle="Leavers work dramatically more hours at the 4–5 year mark" className="h-64" delay={0.2}>
            {fatigueCurve ? <FatigueCurveChart data={fatigueCurve} /> : <Skeleton />}
          </Card>
          <Card title="Hours vs Satisfaction Landscape" subtitle="Overworked and underutilized employees both churn" className="h-64" delay={0.25}>
            {scatter ? <HoursSatisfactionScatter data={scatter} /> : <Skeleton />}
          </Card>
        </div>
      </section>

      {/* ── 4. Organizational Breakdown ─────────────────────────── */}
      <section>
        <SectionHeader
          label="Organizational Breakdown"
          title="Which Departments, Salary Bands & Tenures Are Most Exposed"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Churn Rate by Department" subtitle="% of employees who left, with avg satisfaction overlay" className="h-72" delay={0.1}>
            {deptDeep ? <DeptChurnComposed data={deptDeep} /> : <Skeleton />}
          </Card>
          <Card title="Satisfaction Level Distribution" subtitle="Bimodal leaver pattern — very low AND very high satisfaction churn" className="h-72" delay={0.15}>
            {satDist ? <SatisfactionDistBar data={satDist} /> : <Skeleton />}
          </Card>
          <Card title="Departmental Brain Drain" subtitle="Key finding: leavers score higher on evaluations — losing best performers" className="h-72" delay={0.2}>
            {brainDrain ? <DeptBrainDrainChart data={brainDrain} /> : <Skeleton />}
          </Card>
          <Card title="Churn Rate by Salary Band" subtitle="Low earners churn at dramatically higher rates" className="h-72" delay={0.25}>
            {salaryAttr ? <SalaryChurnBar data={salaryAttr} /> : <Skeleton />}
          </Card>
        </div>
      </section>

      {/* ── 5. Dept Attrition 3D + Tenure ───────────────────────── */}
      <section>
        <SectionHeader
          label="Department & Tenure View"
          title="Attrition Across Departments and Career Stages"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Attrition by Department (3D)" className="h-80" delay={0.1}>
            {deptForBars.length > 0 ? (
              <WebGLBoundary fallback={<DeptAttritionBar data={deptForBars} />}>
                <Suspense fallback={<DeptAttritionBar data={deptForBars} />}>
                  <DeptBars data={deptAttr!} />
                </Suspense>
              </WebGLBoundary>
            ) : <Skeleton />}
          </Card>
          <Card title="Tenure vs Churn Rate" subtitle="Years at company vs attrition — spike at years 3–5" className="h-80" delay={0.15}>
            {tenureAttr ? <TenureAttritionLine data={tenureAttr} /> : <Skeleton />}
          </Card>
        </div>
      </section>

      {/* ── 6. ML Feature Importance ────────────────────────────── */}
      <section>
        <SectionHeader
          label="ML Model"
          title="Top Predictors of Churn"
          subtitle="Feature importance from Random Forest model trained on HR dataset"
        />
        <Card className="h-64" delay={0.1}>
          {riskFactors ? <FeatureImportanceBar data={riskFactors} /> : <Skeleton />}
        </Card>
      </section>

    </div>
  );
}
