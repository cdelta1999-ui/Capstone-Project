import { 
  useGetHrSummary,
  useGetAttritionByDepartment,
  useGetAttritionBySalary,
  useGetTenureAttrition
} from "@workspace/api-client-react";
import { AlertCircle, Clock, Briefcase, Users, TrendingDown } from "lucide-react";
import { SalaryDonut, TenureLineArea } from "@/components/DashboardCharts";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

function MiniDeptBar({ data }: { data: any[] }) {
  const chartData = [...data].sort((a, b) => b.attritionRate - a.attritionRate).slice(0, 6);
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
        <XAxis type="number" tickFormatter={(val) => `${val.toFixed(0)}%`} tick={{fontSize: 10}} axisLine={false} tickLine={false} domain={[0, 40]} />
        <YAxis dataKey="department" type="category" tick={{fontSize: 10}} axisLine={false} tickLine={false} width={80} />
        <Tooltip cursor={{fill: '#f8fafc'}} formatter={(val: number) => `${val.toFixed(1)}%`} />
        <Bar dataKey="attritionRate" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function InsightReport() {
  const { data: summary, isLoading: loadingSummary } = useGetHrSummary();
  const { data: deptAttr } = useGetAttritionByDepartment();
  const { data: salaryAttr } = useGetAttritionBySalary();
  const { data: tenureAttr } = useGetTenureAttrition();

  if (loadingSummary || !summary) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-8 bg-white shadow-xl min-h-[1056px] rounded-sm my-8 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-slate-200 rounded mb-4"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-8 bg-white shadow-xl min-h-[1056px] rounded-sm my-8 print:my-0 print:shadow-none print:px-0 relative">
      <header className="border-b-2 border-indigo-600 pb-6 mb-8 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 font-bold text-2xl text-indigo-600 mb-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-lg">
              S
            </div>
            Salifort Motors
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">HR Analytics Report</h1>
        </div>
        <div className="text-right">
          <p className="text-slate-500 font-medium">June 2026</p>
          <p className="text-sm text-slate-400">Executive Summary</p>
        </div>
      </header>

      <div className="space-y-8 text-slate-800">
        
        {/* Key Findings Section */}
        <section>
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle className="text-rose-500 h-5 w-5" />
            Top 5 Critical Findings
          </h3>
          <div className="grid gap-3">
            <div className="p-4 bg-indigo-50/50 rounded border border-indigo-100/50 flex gap-4 items-start">
              <Users className="text-indigo-500 h-6 w-6 shrink-0 mt-1" />
              <div>
                <p className="font-bold text-indigo-950 text-lg">{summary.attritionRate.toFixed(1)}% overall attrition rate</p>
                <p className="text-indigo-800/80">{summary.leftCount.toLocaleString()} of {summary.totalEmployees.toLocaleString()} employees left the company.</p>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 rounded border border-slate-100 flex gap-4 items-start">
              <TrendingDown className="text-slate-500 h-6 w-6 shrink-0 mt-1" />
              <div>
                <p className="font-bold text-slate-900 text-lg">Low satisfaction &lt;0.4 is the leading indicator</p>
                <p className="text-slate-600">Employees with low satisfaction leave at nearly 3× the rate of their peers.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded border border-slate-100 flex gap-4 items-start">
              <Clock className="text-slate-500 h-6 w-6 shrink-0 mt-1" />
              <div>
                <p className="font-bold text-slate-900 text-lg">Overworked employees (&gt;250 hrs/mo) show extreme risk</p>
                <p className="text-slate-600">The data shows a sharp spike in turnover for employees working excessive hours combined with low evaluations.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded border border-slate-100 flex gap-4 items-start">
              <Briefcase className="text-slate-500 h-6 w-6 shrink-0 mt-1" />
              <div>
                <p className="font-bold text-slate-900 text-lg">HR department has the highest attrition rate</p>
                <p className="text-slate-600">Ironically, HR leads attrition at ~29%, closely followed by technical roles.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded border border-slate-100 flex gap-4 items-start">
              <TrendingDown className="text-slate-500 h-6 w-6 shrink-0 mt-1" />
              <div>
                <p className="font-bold text-slate-900 text-lg">Only {summary.promotionRate.toFixed(1)}% were promoted in 5 years</p>
                <p className="text-slate-600">Career stagnation is a critical driver for top performers leaving.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <section>
          <h3 className="text-xl font-bold text-slate-900 mb-4">Data Overview</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="border border-slate-200 rounded p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2 text-center">Highest Attrition by Dept</h4>
              {deptAttr && <MiniDeptBar data={deptAttr} />}
            </div>
            <div className="border border-slate-200 rounded p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2 text-center">Attrition by Salary Band</h4>
              <div className="h-[200px]">
                {salaryAttr && <SalaryDonut data={salaryAttr} />}
              </div>
            </div>
            <div className="border border-slate-200 rounded p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2 text-center">Tenure vs Attrition Rate</h4>
              <div className="h-[200px]">
                {tenureAttr && <TenureLineArea data={tenureAttr} />}
              </div>
            </div>
          </div>
        </section>

        {/* Recommendations */}
        <section>
          <h3 className="text-xl font-bold text-slate-900 mb-4">Strategic Recommendations</h3>
          <ul className="space-y-3 list-disc pl-5 text-slate-700">
            <li><strong className="text-slate-900">Cap Monthly Hours:</strong> Implement strict alerts when employees exceed 220 hours/month to prevent burnout-driven turnover.</li>
            <li><strong className="text-slate-900">Career Progression Paths:</strong> The 2.1% promotion rate is unsustainable. Create clear, accelerated promotion tracks especially for technical and HR roles.</li>
            <li><strong className="text-slate-900">Project Load Balancing:</strong> Rebalance workloads for employees handling 6+ projects concurrently, as this segment shows extreme attrition risk.</li>
            <li><strong className="text-slate-900">Early Intervention:</strong> Use the predictive model to flag employees with satisfaction scores dropping below 0.5 for immediate 1-on-1 manager check-ins.</li>
          </ul>
        </section>

      </div>
    </div>
  );
}
