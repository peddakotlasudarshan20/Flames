import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Points, PointMaterial, Stars } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

function NebulaPoints() {
  const ref = useRef();
  const positions = useMemo(() => {
    const points = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i += 1) {
      const radius = 2.2 + Math.random() * 4.8;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 4;
      points[i * 3] = Math.cos(angle) * radius;
      points[i * 3 + 1] = height;
      points[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return points;
  }, []);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.035;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.18) * 0.05;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled>
      <PointMaterial
        transparent
        color="#70f5ff"
        size={0.018}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

function Rings() {
  const mesh = useRef();
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.z += delta * 0.08;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.35} floatIntensity={0.65}>
      <mesh ref={mesh} position={[0, -0.1, -1.4]} rotation={[1.25, 0.2, 0.4]}>
        <torusGeometry args={[2.2, 0.01, 16, 180]} />
        <meshBasicMaterial color="#ff5fd7" transparent opacity={0.48} />
      </mesh>
      <mesh position={[0, -0.1, -1.1]} rotation={[1.28, -0.35, -0.2]}>
        <torusGeometry args={[1.52, 0.008, 16, 160]} />
        <meshBasicMaterial color="#94ffb8" transparent opacity={0.4} />
      </mesh>
    </Float>
  );
}

export default function ParticleField() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full">
      <Canvas camera={{ position: [0, 0, 6], fov: 58 }} dpr={[1, 1.6]}>
        <Suspense fallback={null}>
          <color attach="background" args={["#060713"]} />
          <NebulaPoints />
          <Rings />
          <Stars radius={80} depth={40} count={700} factor={3} fade speed={0.45} />
        </Suspense>
      </Canvas>
    </div>
  );
}
