import { useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { ScatterPoint } from "@workspace/api-client-react";
import { WebGLBoundary, isWebGLAvailable } from "./WebGLBoundary";
import { ClusterScatter } from "../DashboardCharts";

const CLUSTER_COLORS: Record<string, string> = {
  Stayed: "#6366f1",
  "Burned Out Stars": "#f43f5e",
  "Apathetic Middle": "#8b5cf6",
  "Unhappy Underperformers": "#f59e0b",
};

// Half-extent of the plotting cube.
const S = 9;
const H_MIN = 90;
const H_MAX = 320;

function makeDotTexture() {
  const size = 64;
  const cvs = document.createElement("canvas");
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(cvs);
  tex.needsUpdate = true;
  return tex;
}

function Cloud({ pts, size, opacity, tex }: { pts: ScatterPoint[]; size: number; opacity: number; tex: THREE.Texture }) {
  const geom = useMemo(() => {
    const n = pts.length;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const d = pts[i];
      const x = (d.satisfaction - 0.5) * 2 * S;
      const y = ((d.evaluation - 0.3) / 0.7 - 0.5) * 2 * S;
      const z = ((d.hours - H_MIN) / (H_MAX - H_MIN) - 0.5) * 2 * S;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      col.set(CLUSTER_COLORS[d.cluster] ?? "#94a3b8");
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [pts]);

  useEffect(() => () => geom.dispose(), [geom]);

  return (
    <points geometry={geom}>
      <pointsMaterial
        size={size}
        map={tex}
        vertexColors
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function Scene({ data }: { data: ScatterPoint[] }) {
  const tex = useMemo(makeDotTexture, []);
  const stayed = useMemo(() => data.filter((d) => d.cluster === "Stayed"), [data]);
  const leavers = useMemo(() => data.filter((d) => d.cluster !== "Stayed"), [data]);
  const boxGeom = useMemo(() => new THREE.BoxGeometry(S * 2, S * 2, S * 2), []);

  useEffect(
    () => () => {
      tex.dispose();
      boxGeom.dispose();
    },
    [tex, boxGeom],
  );

  return (
    <>
      <ambientLight intensity={0.9} />
      <Cloud pts={stayed} size={0.62} opacity={0.26} tex={tex} />
      <Cloud pts={leavers} size={1.05} opacity={0.95} tex={tex} />
      <lineSegments>
        <edgesGeometry args={[boxGeom]} />
        <lineBasicMaterial color="#cbd5e1" transparent opacity={0.45} />
      </lineSegments>
      <gridHelper args={[S * 2, 8, "#cbd5e1", "#e8edf4"]} position={[0, -S, 0]} />
      <OrbitControls
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.55}
        minDistance={22}
        maxDistance={48}
        maxPolarAngle={Math.PI / 1.8}
        minPolarAngle={Math.PI / 6}
      />
    </>
  );
}

function ClusterScatter3DCanvas({ data }: { data: ScatterPoint[] }) {
  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden cursor-move">
      <Canvas camera={{ position: [17, 11, 23], fov: 45 }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
        <Scene data={data} />
      </Canvas>
      {/* Cluster legend */}
      <div className="absolute top-1.5 left-2 flex flex-wrap gap-x-2.5 gap-y-0.5 pointer-events-none">
        {Object.entries(CLUSTER_COLORS).map(([name, color]) => (
          <span key={name} className="flex items-center gap-1 text-[9px] text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            {name}
          </span>
        ))}
      </div>
      {/* Axis hint */}
      <div className="absolute bottom-1.5 left-2 text-[9px] font-medium text-slate-400 pointer-events-none">
        X Satisfaction · Y Evaluation · Z Hours
      </div>
    </div>
  );
}

export default function ClusterScatter3D({ data }: { data: ScatterPoint[] }) {
  if (!isWebGLAvailable()) {
    return <ClusterScatter data={data} />;
  }
  return (
    <WebGLBoundary fallback={<ClusterScatter data={data} />}>
      <ClusterScatter3DCanvas data={data} />
    </WebGLBoundary>
  );
}
