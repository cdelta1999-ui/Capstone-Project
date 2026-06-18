import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Environment, Float } from "@react-three/drei";
import * as THREE from "three";
import type { RiskFactor } from "@workspace/api-client-react";
import { WebGLBoundary, RiskBarsFallback, isWebGLAvailable } from "./WebGLBoundary";

interface RiskBubblesProps {
  data: RiskFactor[];
}

function lerpColor(color1: string, color2: string, factor: number) {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  return c1.lerp(c2, factor).getHexString();
}

function Bubble({ data, index, total }: { data: RiskFactor; index: number; total: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const importanceScale = Math.max(data.importance * 12, 0.8);
  const color = `#${lerpColor("#14b8a6", "#f43f5e", data.importance)}`;
  const orbitSpeed = (1 - data.importance) * 0.5 + 0.2;
  const radius = 4 + (index % 3) * 2.5;
  const initialAngle = (index / total) * Math.PI * 2;

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const time = clock.getElapsedTime();
      const angle = initialAngle + time * orbitSpeed * (index % 2 === 0 ? 1 : -1);
      meshRef.current.position.x = Math.cos(angle) * radius;
      meshRef.current.position.z = Math.sin(angle) * radius;
      meshRef.current.position.y = Math.sin(time * 2 + index) * 0.5;
      const targetScale = hovered ? importanceScale * 1.1 : importanceScale;
      meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1));
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={0.8}
          transmission={0.4}
          roughness={0.1}
          thickness={1}
          ior={1.5}
        />
        <Html center position={[0, 0, 0]} zIndexRange={[100, 0]}>
          <div className={`transition-opacity duration-300 pointer-events-none flex flex-col items-center ${hovered ? "opacity-100" : "opacity-0"}`}>
            <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-lg shadow-lg border border-slate-100 text-center w-40">
              <p className="text-sm font-bold text-slate-800">{data.factor}</p>
              <p className="text-xs text-slate-500 mt-1">{data.description}</p>
              <div className="mt-2 text-xs font-semibold text-rose-600">
                Risk Score: {(data.importance * 100).toFixed(0)}
              </div>
            </div>
          </div>
        </Html>
      </mesh>
    </group>
  );
}

function Scene({ data }: RiskBubblesProps) {
  const topRisks = data.slice(0, 6);
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
      <pointLight position={[-10, -10, -5]} color="#0ea5e9" intensity={1} />
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#6366f1" wireframe transparent opacity={0.3} />
        </mesh>
      </Float>
      {topRisks.map((factor, i) => (
        <Bubble key={factor.factor} data={factor} index={i} total={topRisks.length} />
      ))}
      <OrbitControls enablePan={false} enableZoom={true} autoRotate autoRotateSpeed={0.2} />
      <Environment preset="studio" />
    </>
  );
}

function RiskBubblesCanvas({ data }: RiskBubblesProps) {
  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden cursor-move">
      <Canvas camera={{ position: [0, 5, 15], fov: 50 }} gl={{ alpha: true, antialias: true }}>
        <Scene data={data} />
      </Canvas>
    </div>
  );
}

export default function RiskBubbles({ data }: RiskBubblesProps) {
  if (!isWebGLAvailable()) {
    return <RiskBarsFallback data={data} />;
  }
  return (
    <WebGLBoundary fallback={<RiskBarsFallback data={data} />}>
      <RiskBubblesCanvas data={data} />
    </WebGLBoundary>
  );
}
