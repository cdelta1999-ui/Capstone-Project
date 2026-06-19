import { Component, useCallback, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class WebGLBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
          3D view unavailable in this environment
        </div>
      );
    }
    return this.props.children;
  }
}

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

/**
 * Drop this inside a <Canvas> to learn when the first GL frame has painted.
 * Used by Live3D to fade the live layer in over the static fallback so the
 * chart is never blank during the (sometimes slow) WebGL warm-up.
 */
export function ReadySignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (!fired.current) {
      fired.current = true;
      onReady();
    }
  });
  return null;
}

/**
 * Wraps a real-3D chart with a print/screenshot-safe layered fallback:
 *  - no WebGL at all  → render only the 2D fallback.
 *  - WebGL available  → fallback layer stays painted underneath until the first
 *                       GL frame fires (ready-gate), then the live canvas fades
 *                       in on top. In @media print the canvas is hidden and the
 *                       fallback is shown, so exports always have real content.
 * `children` is a render-prop receiving an `onReady` callback to hand to a
 * <ReadySignal> placed inside the <Canvas>.
 */
export function Live3D({
  fallback,
  children,
}: {
  fallback: ReactNode;
  children: (onReady: () => void) => ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  if (!isWebGLAvailable()) {
    return <>{fallback}</>;
  }

  return (
    <WebGLBoundary fallback={fallback}>
      <div className="webgl-stack">
        <div
          className={`webgl-capture-fallback ${ready ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          aria-hidden={ready ? true : undefined}
        >
          {fallback}
        </div>
        <div className={`webgl-live-layer ${ready ? "opacity-100" : "opacity-0"}`}>
          {children(onReady)}
        </div>
      </div>
    </WebGLBoundary>
  );
}

const COLORS = ["#6366f1", "#0ea5e9", "#14b8a6", "#f59e0b", "#f43f5e", "#8b5cf6", "#10b981", "#64748b", "#06b6d4", "#ec4899"];

export function DeptBarsFallback({ data }: { data: Array<{ department: string; attritionRate: number; leftCount: number; totalCount: number }> }) {
  const chartData = data.map((d) => ({
    name: d.department.replace("technical", "tech").replace("management", "mgmt"),
    rate: +d.attritionRate.toFixed(1),
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 60 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 40]} />
        <Tooltip formatter={(v) => [`${v}%`, "Attrition"]} />
        <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
          {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RiskBarsFallback({ data }: { data: Array<{ factor: string; importance: number; description: string }> }) {
  const chartData = [...data].sort((a, b) => b.importance - a.importance).slice(0, 8).map((d) => ({
    name: d.factor,
    score: +(d.importance * 100).toFixed(0),
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
        <XAxis type="number" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={115} />
        <Tooltip formatter={(v) => [`${v}%`, "Risk Score"]} />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
