import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { DepartmentAttrition } from "@workspace/api-client-react";
import { WebGLBoundary, DeptBarsFallback, isWebGLAvailable } from "./WebGLBoundary";

const DEPT_COLORS = [
  "#6366f1", // indigo
  "#0ea5e9", // sky
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#64748b", // slate
  "#06b6d4", // cyan
  "#ec4899", // pink
];

interface DeptBarsProps {
  data: DepartmentAttrition[];
}

function Bar({ data, index, total, baseColor }: { data: DepartmentAttrition; index: number; total: number; baseColor: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const scaleRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  const targetHeight = Math.max(data.attritionRate * 0.15, 0.2);
  const angle = (index / total) * Math.PI * 2;
  const radius = 6;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  // Lighten color on hover
  const color = hovered
    ? "#" + new THREE.Color(baseColor).lerp(new THREE.Color("#ffffff"), 0.3).getHexString()
    : baseColor;

  // Animate via the mesh transform directly — no per-frame React re-render.
  useFrame((_, delta) => {
    if (meshRef.current) {
      scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, targetHeight, delta * 3);
      meshRef.current.scale.y = scaleRef.current;
      meshRef.current.position.y = scaleRef.current / 2;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.5, 1, 1.5]} />
        <meshStandardMaterial
          color={color}
          roughness={0.15}
          metalness={0.15}
          transparent
          opacity={0.92}
        />
      </mesh>

      <Html position={[0, Math.max(targetHeight, 0.3) + 0.6, 0]} center zIndexRange={[100, 0]}>
        <div className={`transition-all duration-300 pointer-events-none flex flex-col items-center ${hovered ? "opacity-100 scale-110" : "opacity-75 scale-100"}`}>
          <div className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-md shadow-sm border border-slate-100 text-xs font-semibold whitespace-nowrap text-slate-800">
            {data.department}
          </div>
          {hovered && (
            <div className="text-white text-[10px] px-2 py-0.5 rounded-full mt-1" style={{ background: baseColor }}>
              {data.attritionRate.toFixed(1)}% Attrition
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

function Scene({ data }: DeptBarsProps) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-8, 10, -8]} intensity={0.4} color="#6366f1" />
      <group position={[0, -2, 0]}>
        {data.map((dept, i) => (
          <Bar
            key={dept.department}
            data={dept}
            index={i}
            total={data.length}
            baseColor={DEPT_COLORS[i % DEPT_COLORS.length]}
          />
        ))}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#f8fafc" transparent opacity={0.35} roughness={0.1} />
        </mesh>
      </group>
      <OrbitControls autoRotate autoRotateSpeed={0.6} enablePan={false} maxPolarAngle={Math.PI / 2.1} minPolarAngle={Math.PI / 5} minDistance={10} maxDistance={25} />
      <Environment preset="city" />
    </>
  );
}

function DeptBarsCanvas({ data }: DeptBarsProps) {
  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden cursor-move">
      <Canvas shadows camera={{ position: [0, 8, 20], fov: 45 }} gl={{ alpha: true, antialias: true }}>
        <Scene data={data} />
      </Canvas>
    </div>
  );
}

export default function DeptBars({ data }: DeptBarsProps) {
  const fallbackData = data.map(d => ({
    department: d.department,
    attritionRate: d.attritionRate,
    leftCount: d.left,
    totalCount: d.total,
  }));
  if (!isWebGLAvailable()) {
    return <DeptBarsFallback data={fallbackData} />;
  }
  return (
    <WebGLBoundary fallback={<DeptBarsFallback data={fallbackData} />}>
      <DeptBarsCanvas data={data} />
    </WebGLBoundary>
  );
}
