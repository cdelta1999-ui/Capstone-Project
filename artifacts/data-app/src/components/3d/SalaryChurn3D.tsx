import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { SalaryAttrition } from "@workspace/api-client-react";
import { Live3D, ReadySignal } from "./WebGLBoundary";
import { SalaryChurnBar } from "../DashboardCharts";

// Company-wide attrition baseline, kept in sync with the 2D SalaryChurnBar
// reference line so the 3D and print views tell the same story.
const COMPANY_AVG = 23.8;
const HEIGHT_SCALE = 0.16;
const SLOT_X = [-3.4, 0, 3.4];

const COL_COLORS: Record<string, string> = { low: "#f43f5e", medium: "#f59e0b", high: "#14b8a6" };
const COL_LABELS: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };

interface SalaryChurn3DProps {
  data: SalaryAttrition[];
}

function Column({ rate, x, color, label }: { rate: number; x: number; color: string; label: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const scaleRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  const targetHeight = Math.max(rate * HEIGHT_SCALE, 0.2);
  const c = hovered
    ? "#" + new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.3).getHexString()
    : color;

  // Animate height via the mesh transform — no per-frame React re-render.
  useFrame((_, delta) => {
    if (meshRef.current) {
      scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, targetHeight, delta * 3);
      meshRef.current.scale.y = scaleRef.current;
      meshRef.current.position.y = scaleRef.current / 2;
    }
  });

  return (
    <group position={[x, 0, 0]}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.9, 1, 1.9]} />
        <meshStandardMaterial color={c} roughness={0.15} metalness={0.18} transparent opacity={0.94} />
      </mesh>

      <Html position={[0, targetHeight + 0.7, 0]} center zIndexRange={[100, 0]}>
        <div className={`pointer-events-none transition-transform duration-300 ${hovered ? "scale-110" : "scale-100"}`}>
          <div className="bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-md shadow-sm border border-slate-100 text-xs font-bold text-slate-800 whitespace-nowrap">
            {rate.toFixed(1)}%
          </div>
        </div>
      </Html>

      <Html position={[0, -0.35, 0]} center zIndexRange={[100, 0]}>
        <div className="pointer-events-none text-[11px] font-semibold text-slate-600 whitespace-nowrap">{label}</div>
      </Html>
    </group>
  );
}

function AvgReference({ y }: { y: number }) {
  return (
    <group position={[0, y, 0]}>
      <mesh>
        <boxGeometry args={[9.6, 0.05, 2]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.5} />
      </mesh>
      <Html position={[5.4, 0, 0]} center zIndexRange={[100, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
          Avg {COMPANY_AVG}%
        </div>
      </Html>
    </group>
  );
}

function Scene({ data }: SalaryChurn3DProps) {
  const order = ["low", "medium", "high"];
  const cols = [...data].sort((a, b) => order.indexOf(a.salary) - order.indexOf(b.salary));
  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[8, 18, 10]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-8, 10, -6]} intensity={0.4} color="#6366f1" />
      <group position={[0, -2.4, 0]}>
        {cols.map((d, i) => (
          <Column
            key={d.salary}
            rate={d.attritionRate}
            x={SLOT_X[i] ?? 0}
            color={COL_COLORS[d.salary] ?? "#6366f1"}
            label={COL_LABELS[d.salary] ?? d.salary}
          />
        ))}
        <AvgReference y={COMPANY_AVG * HEIGHT_SCALE} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 14]} />
          <meshStandardMaterial color="#f8fafc" transparent opacity={0.35} roughness={0.1} />
        </mesh>
      </group>
      <OrbitControls autoRotate autoRotateSpeed={0.6} enablePan={false} maxPolarAngle={Math.PI / 2.1} minPolarAngle={Math.PI / 5} minDistance={9} maxDistance={22} />
      <Environment preset="city" />
    </>
  );
}

function SalaryChurn3DCanvas({ data, onReady }: SalaryChurn3DProps & { onReady: () => void }) {
  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden cursor-move">
      <Canvas shadows camera={{ position: [0, 3.5, 13], fov: 45 }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
        <Scene data={data} />
        <ReadySignal onReady={onReady} />
      </Canvas>
    </div>
  );
}

export default function SalaryChurn3D({ data }: SalaryChurn3DProps) {
  return (
    <Live3D fallback={<SalaryChurnBar data={data} />}>
      {(onReady) => <SalaryChurn3DCanvas data={data} onReady={onReady} />}
    </Live3D>
  );
}
