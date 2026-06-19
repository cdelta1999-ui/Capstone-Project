import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { RiskFactor } from "@workspace/api-client-react";
import { Live3D, ReadySignal, RiskBarsFallback } from "./WebGLBoundary";

interface RiskDonut3DProps {
  data: RiskFactor[];
}

const PALETTE = ["#6366f1", "#0ea5e9", "#14b8a6", "#f59e0b", "#f43f5e", "#8b5cf6", "#10b981", "#ec4899"];

const INNER_R = 2.2;
const OUTER_R = 4.3;
const DEPTH = 1.35;
const GAP = 0.035;

interface Seg {
  factor: string;
  pct: number;
  a0: number;
  a1: number;
  color: string;
}

function buildSegments(data: RiskFactor[]): Seg[] {
  const sorted = [...data].sort((a, b) => b.importance - a.importance);
  const total = sorted.reduce((s, d) => s + d.importance, 0) || 1;
  let cursor = Math.PI / 2;
  return sorted.map((d, i) => {
    const frac = d.importance / total;
    const sweep = frac * Math.PI * 2;
    const a0 = cursor;
    const a1 = cursor + sweep;
    cursor = a1;
    // Clamp the inter-segment gap so a very small slice can never invert.
    const gap = Math.min(GAP, sweep * 0.6);
    return {
      factor: d.factor,
      pct: Math.round(frac * 100),
      a0: a0 + gap / 2,
      a1: a1 - gap / 2,
      color: PALETTE[i % PALETTE.length],
    };
  });
}

function makeSegmentGeometry(a0: number, a1: number) {
  const shape = new THREE.Shape();
  shape.moveTo(Math.cos(a0) * OUTER_R, Math.sin(a0) * OUTER_R);
  shape.absarc(0, 0, OUTER_R, a0, a1, false);
  shape.lineTo(Math.cos(a1) * INNER_R, Math.sin(a1) * INNER_R);
  shape.absarc(0, 0, INNER_R, a1, a0, true);
  shape.closePath();
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.07,
    bevelSegments: 2,
    curveSegments: 48,
  });
  geom.translate(0, 0, -DEPTH / 2);
  return geom;
}

function Segment({ seg }: { seg: Seg }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const geom = useMemo(() => makeSegmentGeometry(seg.a0, seg.a1), [seg.a0, seg.a1]);
  useEffect(() => () => geom.dispose(), [geom]);

  const mid = (seg.a0 + seg.a1) / 2;
  const dir = useMemo(() => new THREE.Vector3(Math.cos(mid), Math.sin(mid), 0), [mid]);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (meshRef.current) {
      target.copy(dir).multiplyScalar(hovered ? 0.55 : 0);
      meshRef.current.position.lerp(target, 0.18);
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geom}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      <meshStandardMaterial color={seg.color} roughness={0.32} metalness={0.18} />
      {hovered && (
        <Html position={[Math.cos(mid) * (OUTER_R + 0.4), Math.sin(mid) * (OUTER_R + 0.4), 0]} center zIndexRange={[100, 0]}>
          <div className="pointer-events-none bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-100 text-center w-36">
            <p className="text-xs font-bold text-slate-800 leading-tight">{seg.factor}</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: seg.color }}>{seg.pct}% of risk weight</p>
          </div>
        </Html>
      )}
    </mesh>
  );
}

function Donut({ segments }: { segments: Seg[] }) {
  const spinRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.z += delta * 0.25;
  });
  return (
    <group rotation={[-1.05, 0, 0]}>
      <group ref={spinRef}>
        {segments.map((s) => (
          <Segment key={s.factor} seg={s} />
        ))}
      </group>
    </group>
  );
}

function Scene({ segments }: { segments: Seg[] }) {
  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[6, 12, 8]} intensity={1.1} />
      <pointLight position={[-8, -6, 6]} intensity={0.5} color="#0ea5e9" />
      <Donut segments={segments} />
      <OrbitControls enablePan={false} enableZoom minDistance={9} maxDistance={22} maxPolarAngle={Math.PI / 1.9} minPolarAngle={Math.PI / 6} />
      <Environment preset="city" />
    </>
  );
}

function RiskDonut3DCanvas({ data, onReady }: RiskDonut3DProps & { onReady: () => void }) {
  const segments = useMemo(() => buildSegments(data), [data]);
  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden cursor-move">
      <Canvas camera={{ position: [0, 3, 14], fov: 45 }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
        <Scene segments={segments} />
        <ReadySignal onReady={onReady} />
      </Canvas>
      {/* Legend overlay */}
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-x-3 gap-y-0.5 pointer-events-none">
        {segments.map((s) => (
          <span key={s.factor} className="flex items-center gap-1 text-[9px] text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.factor} · {s.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RiskDonut3D({ data }: RiskDonut3DProps) {
  return (
    <Live3D fallback={<RiskBarsFallback data={data} />}>
      {(onReady) => <RiskDonut3DCanvas data={data} onReady={onReady} />}
    </Live3D>
  );
}
