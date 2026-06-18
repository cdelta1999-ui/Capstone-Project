import { Suspense } from "react";
import { motion } from "framer-motion";
import KpiCard from "@/components/KpiCard";
import DeptBars from "@/components/3d/DeptBars";
import RiskBubbles from "@/components/3d/RiskBubbles";
import { 
  SalaryDonut, 
  SatisfactionArea, 
  EvaluationScatter, 
  ProjectsHoursBar, 
  TenureLineArea, 
  DeptRadar, 
  ProjectsAttritionLine 
} from "@/components/DashboardCharts";

import {
  useGetHrSummary,
  useGetAttritionByDepartment,
  useGetAttritionBySalary,
  useGetSatisfactionDistribution,
  useGetHoursProjects,
  useGetTenureAttrition,
  useGetRiskFactors,
  useGetScatterSample,
  useGetDepartmentDeep,
  useGetProjectsAttrition
} from "@workspace/api-client-react";

function ChartCard({ title, children, delay = 0, className = "" }: { title: string, children: React.ReactNode, delay?: number, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`bg-white rounded-2xl shadow-sm border border-indigo-500/10 p-5 flex flex-col ${className}`}
    >
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      <div className="flex-1 relative min-h-[250px]">
        {children}
      </div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 bg-white rounded-2xl shadow-sm border border-indigo-500/10 p-6 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96 bg-white rounded-2xl shadow-sm border border-indigo-500/10 p-6 animate-pulse" />
        <div className="h-96 bg-white rounded-2xl shadow-sm border border-indigo-500/10 p-6 animate-pulse" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetHrSummary();
  const { data: deptAttr } = useGetAttritionByDepartment();
  const { data: salaryAttr } = useGetAttritionBySalary();
  const { data: satDist } = useGetSatisfactionDistribution();
  const { data: scatter } = useGetScatterSample();
  const { data: hoursProj } = useGetHoursProjects();
  const { data: tenureAttr } = useGetTenureAttrition();
  const { data: riskFactors } = useGetRiskFactors();
  const { data: deptDeep } = useGetDepartmentDeep();
  const { data: projAttr } = useGetProjectsAttrition();

  if (loadingSummary || !summary) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="container mx-auto py-8 px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-900">Salifort Analytics</h1>
          <p className="text-slate-500 mt-1">Real-time command center for employee retention.</p>
        </motion.div>

        {/* 1. KPI Hero Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <KpiCard title="Total Employees" value={summary.totalEmployees} gradient="from-indigo-50 to-indigo-100" delay={0.1} />
          <KpiCard title="Attrition Rate" value={summary.attritionRate} suffix="%" decimals={1} gradient="from-sky-50 to-sky-100" delay={0.2} />
          <KpiCard title="Avg Satisfaction" value={summary.avgSatisfaction * 100} suffix="/100" decimals={0} gradient="from-teal-50 to-teal-100" delay={0.3} />
          <KpiCard title="Avg Monthly Hours" value={summary.avgMonthlyHours} decimals={0} gradient="from-amber-50 to-amber-100" delay={0.4} />
          <KpiCard title="Promotion Rate" value={summary.promotionRate} suffix="%" decimals={1} gradient="from-rose-50 to-rose-100" delay={0.5} />
        </div>

        {/* Top 3D Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ChartCard title="Attrition by Department (3D)" delay={0.6} className="h-[400px]">
            {deptAttr ? (
              <Suspense fallback={<div className="w-full h-full flex items-center justify-center animate-pulse bg-slate-50 rounded-xl" />}>
                <DeptBars data={deptAttr} />
              </Suspense>
            ) : <div className="animate-pulse bg-slate-50 w-full h-full rounded-xl" />}
          </ChartCard>

          <ChartCard title="Top Attrition Risk Factors" delay={0.7} className="h-[400px]">
            {riskFactors ? (
              <Suspense fallback={<div className="w-full h-full flex items-center justify-center animate-pulse bg-slate-50 rounded-xl" />}>
                <RiskBubbles data={riskFactors} />
              </Suspense>
            ) : <div className="animate-pulse bg-slate-50 w-full h-full rounded-xl" />}
          </ChartCard>
        </div>

        {/* Standard Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <ChartCard title="Salary Band Attrition" delay={0.8}>
            {salaryAttr && <SalaryDonut data={salaryAttr} />}
          </ChartCard>
          
          <ChartCard title="Satisfaction Distribution" delay={0.9} className="lg:col-span-2">
            {satDist && <SatisfactionArea data={satDist} />}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ChartCard title="Satisfaction × Evaluation Matrix" delay={1.0} className="h-[350px]">
            {scatter && <EvaluationScatter data={scatter} />}
          </ChartCard>

          <ChartCard title="Projects vs Avg Monthly Hours" delay={1.1} className="h-[350px]">
            {hoursProj && <ProjectsHoursBar data={hoursProj} />}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <ChartCard title="Department Deep Dive" delay={1.2}>
            {deptDeep && <DeptRadar data={deptDeep} />}
          </ChartCard>
          
          <ChartCard title="Tenure vs Attrition Rate" delay={1.3} className="lg:col-span-2">
            {tenureAttr && <TenureLineArea data={tenureAttr} />}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 mb-6">
          <ChartCard title="Projects Load vs Attrition" delay={1.4} className="h-[300px]">
            {projAttr && <ProjectsAttritionLine data={projAttr} />}
          </ChartCard>
        </div>
    </div>
  );
}
