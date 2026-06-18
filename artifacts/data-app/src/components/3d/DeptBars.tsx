import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { DepartmentAttrition } from "@workspace/api-client-react";
import { WebGLBoundary, DeptBarsFallback, isWebGLAvailable } from "./WebGLBoundary";

interface DeptBarsProps {
  data: DepartmentAttrition[];
}

function Bar({ data, index, total }: { data: DepartmentAttrition; index: number; total: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [scaleY, setScaleY] = useState(0);

  const targetHeight = data.attritionRate * 15;
  const angle = (index / total) * Math.PI * 2;
  const radius = 6;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  useFrame((state, delta) => {
    if (meshRef.current) {
      setScaleY((prev) => THREE.MathUtils.lerp(prev, targetHeight, delta * 3));
      meshRef.current.scale.y = scaleY;
      meshRef.current.position.y = scaleY / 2;
      const targetRotationY = hovered ? state.clock.elapsedTime * 0.5 : 0;
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotationY, delta * 5);
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
          color={hovered ? "#6366f1" : "#14b8a6"}
          roughness={0.2}
          metalness={0.1}
          transparent
          opacity={0.9}
        />
      </mesh>

      <Html position={[0, Math.max(scaleY, 0.5) + 0.5, 0]} center zIndexRange={[100, 0]}>
        <div className={`transition-all duration-300 pointer-events-none flex flex-col items-center ${hovered ? "opacity-100 scale-110" : "opacity-70 scale-100"}`}>
          <div className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-md shadow-sm border border-slate-100 text-xs font-semibold whitespace-nowrap text-slate-800">
            {data.department}
          </div>
          {hovered && (
            <div className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full mt-1">
              {(data.attritionRate * 100).toFixed(1)}% Attrition
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
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <group position={[0, -3, 0]}>
        {data.map((dept, i) => (
          <Bar key={dept.department} data={dept} index={i} total={data.length} />
        ))}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#f8fafc" transparent opacity={0.4} roughness={0.1} />
        </mesh>
      </group>
      <OrbitControls autoRotate autoRotateSpeed={0.5} enablePan={false} maxPolarAngle={Math.PI / 2.1} minPolarAngle={Math.PI / 4} minDistance={10} maxDistance={25} />
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
  if (!isWebGLAvailable()) {
    return <DeptBarsFallback data={data} />;
  }
  return (
    <WebGLBoundary fallback={<DeptBarsFallback data={data} />}>
      <DeptBarsCanvas data={data} />
    </WebGLBoundary>
  );
}
