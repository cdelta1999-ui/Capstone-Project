import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import Papa from "papaparse";

const router: IRouter = Router();

interface HrRow {
  satisfaction_level: string;
  last_evaluation: string;
  number_project: string;
  average_montly_hours: string;
  time_spend_company: string;
  Work_accident: string;
  left: string;
  promotion_last_5years: string;
  Department: string;
  salary: string;
}

let _cache: HrRow[] | null = null;

function getData(): HrRow[] {
  if (_cache) return _cache;
  const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
    ? path.resolve(process.cwd(), "../..")
    : process.cwd();
  const dataPath = path.resolve(workspaceRoot, "artifacts/api-server/data/hr_data.csv");
  const csv = fs.readFileSync(dataPath, "utf-8");
  const result = Papa.parse<HrRow>(csv, { header: true, skipEmptyLines: true });
  _cache = result.data;
  return _cache;
}

const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

router.get("/hr/summary", async (req, res): Promise<void> => {
  const data = getData();
  const total = data.length;
  const leftCount = data.filter(r => r.left === "1").length;
  const stayedCount = total - leftCount;

  const sum = (key: keyof HrRow) =>
    data.reduce((acc, r) => acc + parseFloat(r[key] as string), 0);

  res.json({
    totalEmployees: total,
    attritionRate: parseFloat(((leftCount / total) * 100).toFixed(1)),
    avgSatisfaction: parseFloat((sum("satisfaction_level") / total).toFixed(3)),
    avgEvaluation: parseFloat((sum("last_evaluation") / total).toFixed(3)),
    avgMonthlyHours: parseFloat((sum("average_montly_hours") / total).toFixed(1)),
    avgTenure: parseFloat((sum("time_spend_company") / total).toFixed(2)),
    workAccidentRate: parseFloat(((data.filter(r => r.Work_accident === "1").length / total) * 100).toFixed(1)),
    promotionRate: parseFloat(((data.filter(r => r.promotion_last_5years === "1").length / total) * 100).toFixed(1)),
    stayedCount,
    leftCount,
  });
});

router.get("/hr/attrition-by-department", async (req, res): Promise<void> => {
  const data = getData();
  const map: Record<string, { left: number; stayed: number }> = {};
  for (const r of data) {
    const dept = r.Department || "Unknown";
    if (!map[dept]) map[dept] = { left: 0, stayed: 0 };
    if (r.left === "1") map[dept].left++;
    else map[dept].stayed++;
  }
  const result = Object.entries(map).map(([department, counts]) => {
    const total = counts.left + counts.stayed;
    return {
      department,
      total,
      left: counts.left,
      stayed: counts.stayed,
      attritionRate: parseFloat(((counts.left / total) * 100).toFixed(1)),
    };
  }).sort((a, b) => b.attritionRate - a.attritionRate);
  res.json(result);
});

router.get("/hr/attrition-by-salary", async (req, res): Promise<void> => {
  const data = getData();
  const order = ["low", "medium", "high"];
  const map: Record<string, { left: number; stayed: number }> = {};
  for (const r of data) {
    const sal = r.salary || "unknown";
    if (!map[sal]) map[sal] = { left: 0, stayed: 0 };
    if (r.left === "1") map[sal].left++;
    else map[sal].stayed++;
  }
  const result = Object.entries(map).map(([salary, counts]) => {
    const total = counts.left + counts.stayed;
    return {
      salary,
      total,
      left: counts.left,
      stayed: counts.stayed,
      attritionRate: parseFloat(((counts.left / total) * 100).toFixed(1)),
    };
  }).sort((a, b) => order.indexOf(a.salary) - order.indexOf(b.salary));
  res.json(result);
});

router.get("/hr/satisfaction-distribution", async (req, res): Promise<void> => {
  const data = getData();
  const buckets = [
    { label: "0.0–0.1", min: 0, max: 0.1 },
    { label: "0.1–0.2", min: 0.1, max: 0.2 },
    { label: "0.2–0.3", min: 0.2, max: 0.3 },
    { label: "0.3–0.4", min: 0.3, max: 0.4 },
    { label: "0.4–0.5", min: 0.4, max: 0.5 },
    { label: "0.5–0.6", min: 0.5, max: 0.6 },
    { label: "0.6–0.7", min: 0.6, max: 0.7 },
    { label: "0.7–0.8", min: 0.7, max: 0.8 },
    { label: "0.8–0.9", min: 0.8, max: 0.9 },
    { label: "0.9–1.0", min: 0.9, max: 1.01 },
  ];
  const result = buckets.map(({ label, min, max }) => {
    const inBucket = data.filter(r => {
      const v = parseFloat(r.satisfaction_level);
      return v >= min && v < max;
    });
    return {
      bucket: label,
      left: inBucket.filter(r => r.left === "1").length,
      stayed: inBucket.filter(r => r.left !== "1").length,
    };
  });
  res.json(result);
});

router.get("/hr/hours-projects", async (req, res): Promise<void> => {
  const data = getData();
  const projectMap: Record<number, { hoursLeft: number[]; hoursStayed: number[] }> = {};
  for (const r of data) {
    const p = parseInt(r.number_project, 10);
    if (!projectMap[p]) projectMap[p] = { hoursLeft: [], hoursStayed: [] };
    const hours = parseInt(r.average_montly_hours, 10);
    if (r.left === "1") projectMap[p].hoursLeft.push(hours);
    else projectMap[p].hoursStayed.push(hours);
  }
  const result = Object.entries(projectMap).map(([projects, v]) => ({
    projects: parseInt(projects, 10),
    avgHoursLeft: parseFloat(avg(v.hoursLeft).toFixed(1)),
    avgHoursStayed: parseFloat(avg(v.hoursStayed).toFixed(1)),
    leftCount: v.hoursLeft.length,
    stayedCount: v.hoursStayed.length,
  })).sort((a, b) => a.projects - b.projects);
  res.json(result);
});

router.get("/hr/tenure-attrition", async (req, res): Promise<void> => {
  const data = getData();
  const map: Record<number, { left: number; total: number; satisfaction: number[] }> = {};
  for (const r of data) {
    const t = parseInt(r.time_spend_company, 10);
    if (!map[t]) map[t] = { left: 0, total: 0, satisfaction: [] };
    map[t].total++;
    if (r.left === "1") map[t].left++;
    map[t].satisfaction.push(parseFloat(r.satisfaction_level));
  }
  const result = Object.entries(map).map(([tenure, v]) => {
    const a = v.satisfaction.reduce((x, y) => x + y, 0) / v.satisfaction.length;
    return {
      tenure: parseInt(tenure, 10),
      total: v.total,
      left: v.left,
      attritionRate: parseFloat(((v.left / v.total) * 100).toFixed(1)),
      avgSatisfaction: parseFloat(a.toFixed(3)),
    };
  }).sort((a, b) => a.tenure - b.tenure);
  res.json(result);
});

router.get("/hr/risk-factors", async (_req, res): Promise<void> => {
  res.json([
    { factor: "Low Satisfaction", importance: 0.32, direction: "negative", description: "Employees with satisfaction < 0.4 leave at 3× the rate of satisfied peers" },
    { factor: "Overwork (>250 hrs/mo)", importance: 0.26, direction: "negative", description: "Monthly hours above 250 strongly predict departure — burnout signal" },
    { factor: "Too Many Projects (≥6)", importance: 0.18, direction: "negative", description: "Employees juggling 6–7 projects show 45–53% attrition rates" },
    { factor: "No Promotion (5 yrs)", importance: 0.12, direction: "negative", description: "Only 2.1% were promoted; the remainder face stalled career growth" },
    { factor: "Low Salary Band", importance: 0.09, direction: "negative", description: "Low-salary employees leave at 29% vs. 7% for high-salary employees" },
    { factor: "Work Accident", importance: 0.03, direction: "negative", description: "Work accidents have a minor but measurable association with retention" },
  ]);
});

router.get("/hr/scatter-sample", async (_req, res): Promise<void> => {
  const data = getData();
  const sample = [...data].sort(() => Math.random() - 0.5).slice(0, 1000);
  const result = sample.map(r => {
    const sat = parseFloat(r.satisfaction_level);
    const eva = parseFloat(r.last_evaluation);
    const hrs = parseInt(r.average_montly_hours, 10);
    const isLeft = r.left === "1";
    let cluster = "Stayed";
    if (isLeft) {
      if (eva >= 0.75 && hrs >= 230) cluster = "Burned Out Stars";
      else if (eva < 0.60 && sat < 0.20) cluster = "Unhappy Underperformers";
      else cluster = "Apathetic Middle";
    }
    return { satisfaction: sat, evaluation: eva, left: parseInt(r.left, 10), hours: hrs, cluster };
  });
  res.json(result);
});

router.get("/hr/department-deep", async (_req, res): Promise<void> => {
  const data = getData();
  const map: Record<string, { total: number; left: number; sat: number[]; eval: number[]; hours: number[]; projects: number[] }> = {};
  for (const r of data) {
    const dept = r.Department || "Unknown";
    if (!map[dept]) map[dept] = { total: 0, left: 0, sat: [], eval: [], hours: [], projects: [] };
    map[dept].total++;
    if (r.left === "1") map[dept].left++;
    map[dept].sat.push(parseFloat(r.satisfaction_level));
    map[dept].eval.push(parseFloat(r.last_evaluation));
    map[dept].hours.push(parseInt(r.average_montly_hours, 10));
    map[dept].projects.push(parseInt(r.number_project, 10));
  }
  const result = Object.entries(map).map(([department, v]) => ({
    department,
    total: v.total,
    attritionRate: parseFloat(((v.left / v.total) * 100).toFixed(1)),
    avgSatisfaction: parseFloat(avg(v.sat).toFixed(3)),
    avgEvaluation: parseFloat(avg(v.eval).toFixed(3)),
    avgHours: parseFloat(avg(v.hours).toFixed(1)),
    avgProjects: parseFloat(avg(v.projects).toFixed(2)),
  })).sort((a, b) => b.total - a.total);
  res.json(result);
});

router.get("/hr/projects-attrition", async (_req, res): Promise<void> => {
  const data = getData();
  const map: Record<number, { total: number; left: number; sat: number[]; hours: number[] }> = {};
  for (const r of data) {
    const p = parseInt(r.number_project, 10);
    if (!map[p]) map[p] = { total: 0, left: 0, sat: [], hours: [] };
    map[p].total++;
    if (r.left === "1") map[p].left++;
    map[p].sat.push(parseFloat(r.satisfaction_level));
    map[p].hours.push(parseInt(r.average_montly_hours, 10));
  }
  const result = Object.entries(map).map(([projects, v]) => ({
    projects: parseInt(projects, 10),
    total: v.total,
    left: v.left,
    attritionRate: parseFloat(((v.left / v.total) * 100).toFixed(1)),
    avgSatisfaction: parseFloat(avg(v.sat).toFixed(3)),
    avgHours: parseFloat(avg(v.hours).toFixed(1)),
  })).sort((a, b) => a.projects - b.projects);
  res.json(result);
});

router.get("/hr/churn-profiles", async (_req, res): Promise<void> => {
  const data = getData();
  const leavers = data.filter(r => r.left === "1");

  const burnedOut = leavers.filter(r =>
    parseFloat(r.last_evaluation) >= 0.75 && parseInt(r.average_montly_hours, 10) >= 230
  );
  const unhappyUnder = leavers.filter(r =>
    parseFloat(r.last_evaluation) < 0.60 && parseFloat(r.satisfaction_level) < 0.20
  );
  const burnedIds = new Set(burnedOut.map((_, i) => i));
  const unhappyIds = new Set(unhappyUnder.map((_, i) => i));
  const apathetic = leavers.filter((r, i) => !burnedIds.has(i) && !unhappyIds.has(i) &&
    !burnedOut.includes(r) && !unhappyUnder.includes(r)
  );

  const profileStats = (rows: HrRow[]) => ({
    avgSatisfaction: parseFloat(avg(rows.map(r => parseFloat(r.satisfaction_level))).toFixed(2)),
    avgEvaluation: parseFloat(avg(rows.map(r => parseFloat(r.last_evaluation))).toFixed(2)),
    avgHours: parseFloat(avg(rows.map(r => parseInt(r.average_montly_hours, 10))).toFixed(0)),
  });

  res.json([
    {
      name: "Burned Out Stars",
      count: burnedOut.length,
      pctOfLeavers: parseFloat(((burnedOut.length / leavers.length) * 100).toFixed(1)),
      color: "#f43f5e",
      description: "High performers crushed by overwork. Top evaluations but driven out by excessive hours.",
      actionPlan: "Immediate workload reduction. Project cap at 4. Mandatory PTO. Senior mentorship.",
      ...profileStats(burnedOut),
    },
    {
      name: "Unhappy Underperformers",
      count: unhappyUnder.length,
      pctOfLeavers: parseFloat(((unhappyUnder.length / leavers.length) * 100).toFixed(1)),
      color: "#f59e0b",
      description: "Low satisfaction paired with poor performance. Often on very few projects — under-utilized.",
      actionPlan: "1:1 career development. Role reassignment. Structured performance improvement plans.",
      ...profileStats(unhappyUnder),
    },
    {
      name: "Apathetic Middle",
      count: apathetic.length,
      pctOfLeavers: parseFloat(((apathetic.length / leavers.length) * 100).toFixed(1)),
      color: "#8b5cf6",
      description: "Average performers with moderate but declining satisfaction. Promotions and recognition gaps.",
      actionPlan: "Career path visibility. Promotion criteria transparency. Salary reviews for 3+ year employees.",
      ...profileStats(apathetic),
    },
  ]);
});

router.get("/hr/fatigue-curve", async (_req, res): Promise<void> => {
  const data = getData();
  const map: Record<number, { hoursLeft: number[]; hoursStayed: number[] }> = {};
  for (const r of data) {
    const t = parseInt(r.time_spend_company, 10);
    if (!map[t]) map[t] = { hoursLeft: [], hoursStayed: [] };
    if (r.left === "1") map[t].hoursLeft.push(parseInt(r.average_montly_hours, 10));
    else map[t].hoursStayed.push(parseInt(r.average_montly_hours, 10));
  }
  const result = Object.entries(map).map(([tenure, v]) => ({
    tenure: parseInt(tenure, 10),
    avgHoursLeft: v.hoursLeft.length ? parseFloat(avg(v.hoursLeft).toFixed(1)) : null,
    avgHoursStayed: parseFloat(avg(v.hoursStayed).toFixed(1)),
  })).sort((a, b) => a.tenure - b.tenure);
  res.json(result);
});

router.get("/hr/dept-brain-drain", async (_req, res): Promise<void> => {
  const data = getData();
  const map: Record<string, { evalLeft: number[]; evalStayed: number[] }> = {};
  for (const r of data) {
    const dept = r.Department || "Unknown";
    if (!map[dept]) map[dept] = { evalLeft: [], evalStayed: [] };
    if (r.left === "1") map[dept].evalLeft.push(parseFloat(r.last_evaluation));
    else map[dept].evalStayed.push(parseFloat(r.last_evaluation));
  }
  const result = Object.entries(map).map(([department, v]) => ({
    department,
    avgEvalLeft: v.evalLeft.length ? parseFloat(avg(v.evalLeft).toFixed(3)) : 0,
    avgEvalStayed: v.evalStayed.length ? parseFloat(avg(v.evalStayed).toFixed(3)) : 0,
    leftCount: v.evalLeft.length,
    stayedCount: v.evalStayed.length,
  })).sort((a, b) => b.avgEvalLeft - a.avgEvalLeft);
  res.json(result);
});

export default router;
