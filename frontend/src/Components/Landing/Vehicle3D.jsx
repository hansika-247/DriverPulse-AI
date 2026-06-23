import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Grid, ContactShadows, Environment, MeshReflectorMaterial, PointMaterial, Points } from '@react-three/drei';
import * as THREE from 'three';
import AIVisualization from './AIVisualization';

// Particle System for floating atmosphere/speed lines
const Particles = ({ count = 500 }) => {
  const points = useRef();
  
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40; // x
      positions[i * 3 + 1] = Math.random() * 10;     // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40; // z
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      // Move particles towards the camera to simulate forward motion
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        points.current.geometry.attributes.position.array[i3 + 2] += 0.2; // Move along Z
        
        // Reset if they go too far back
        if (points.current.geometry.attributes.position.array[i3 + 2] > 20) {
          points.current.geometry.attributes.position.array[i3 + 2] = -20;
          points.current.geometry.attributes.position.array[i3] = (Math.random() - 0.5) * 40;
        }
      }
      points.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <Points ref={points} positions={particlesPosition} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#00f0ff" size={0.05} sizeAttenuation={true} depthWrite={false} opacity={0.4} />
    </Points>
  );
};

// Premium Abstract Vehicle
const PremiumVehicle = () => {
  const group = useRef();
  const wheelsRef = useRef([]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Smooth camera parallax
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, (state.mouse.x * Math.PI) / 15, 0.05);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, (state.mouse.y * Math.PI) / 20, 0.05);
    
    // Simulate slight suspension movement
    group.current.position.y = Math.sin(t * 10) * 0.01 + 0.5;

    // Rotate wheels
    wheelsRef.current.forEach((wheel) => {
      if (wheel) wheel.rotation.x -= 0.2;
    });
  });

  return (
    <group ref={group} position={[0, 0.5, 0]}>
      {/* Vehicle Body Container */}
      <group position={[0, 0, 0]}>
        
        {/* Main Chassis - Sleek Carbon/Metal */}
        <mesh castShadow position={[0, 0.3, 0]}>
          <boxGeometry args={[1.9, 0.35, 4.2]} />
          <meshPhysicalMaterial 
            color="#0a0a0a" 
            metalness={0.9} 
            roughness={0.2} 
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>
        
        {/* Upper Cabin - Dark Glass */}
        <mesh castShadow position={[0, 0.65, -0.3]}>
          <boxGeometry args={[1.5, 0.45, 2.2]} />
          <meshPhysicalMaterial 
            color="#000000" 
            metalness={0.9} 
            roughness={0.05} 
            transmission={0.95} 
            thickness={1}
            ior={1.5}
          />
        </mesh>

        {/* Front Headlights - Glowing Cyan */}
        <mesh position={[0.7, 0.35, 2.11]}>
          <boxGeometry args={[0.4, 0.05, 0.05]} />
          <meshBasicMaterial color="#00f0ff" toneMapped={false} />
          <pointLight color="#00f0ff" intensity={2} distance={5} position={[0, 0, 0.2]} />
        </mesh>
        <mesh position={[-0.7, 0.35, 2.11]}>
          <boxGeometry args={[0.4, 0.05, 0.05]} />
          <meshBasicMaterial color="#00f0ff" toneMapped={false} />
          <pointLight color="#00f0ff" intensity={2} distance={5} position={[0, 0, 0.2]} />
        </mesh>

        {/* Rear Taillights - Glowing Red */}
        <mesh position={[0, 0.35, -2.11]}>
          <boxGeometry args={[1.7, 0.05, 0.05]} />
          <meshBasicMaterial color="#ff0055" toneMapped={false} />
          <pointLight color="#ff0055" intensity={1} distance={3} position={[0, 0, -0.2]} />
        </mesh>

        {/* Wheels */}
        {[-0.95, 0.95].map((x, xIdx) => 
          [-1.3, 1.3].map((z, zIdx) => {
            const index = xIdx * 2 + zIdx;
            return (
              <group key={`${x}-${z}`} position={[x, 0.1, z]}>
                {/* Wheel mesh */}
                <mesh 
                  ref={el => wheelsRef.current[index] = el}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.35, 0.35, 0.25, 32]} />
                  <meshStandardMaterial color="#050505" metalness={0.8} roughness={0.4} />
                  
                  {/* Glowing inner rim */}
                  <mesh position={[0, x > 0 ? 0.13 : -0.13, 0]}>
                    <ringGeometry args={[0.2, 0.25, 32]} />
                    <meshBasicMaterial color="#00f0ff" side={THREE.DoubleSide} toneMapped={false} />
                  </mesh>
                </mesh>
              </group>
            );
          })
        )}
      </group>
    </group>
  );
};

// Endless glowing highway
const NeonHighway = () => {
  const gridRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Animate the grid offset if possible, otherwise we just rely on particles to simulate movement.
    // Drei's Grid doesn't natively support texture offset animation easily without custom shaders.
    // The particles will handle the illusion of forward speed perfectly.
  });

  return (
    <group position={[0, -1, 0]}>
      {/* Highly reflective floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <MeshReflectorMaterial
          blur={[400, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={80}
          roughness={0.2}
          depthScale={1.5}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#050505"
          metalness={0.8}
        />
      </mesh>

      {/* Futuristic Grid overlay */}
      <Grid 
        ref={gridRef}
        position={[0, 0.01, 0]} 
        args={[100, 100]} 
        cellSize={1} 
        cellThickness={0.5} 
        cellColor="#004455" 
        sectionSize={5} 
        sectionThickness={1} 
        sectionColor="#00f0ff" 
        fadeDistance={40} 
      />
    </group>
  );
};

const Vehicle3D = () => {
  return (
    <>
      <color attach="background" args={['#010101']} />
      <fog attach="fog" args={['#010101', 5, 40]} />
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
      <spotLight position={[0, 10, 0]} intensity={3} angle={0.6} penumbra={1} color="#00f0ff" />
      
      {/* High-quality reflections */}
      <Environment preset="city" />

      <Particles count={600} />
      <PremiumVehicle />
      <NeonHighway />
      <AIVisualization />

      {/* Ground Shadow */}
      <ContactShadows position={[0, -0.99, 0]} opacity={0.7} scale={15} blur={2.5} far={4} />
    </>
  );
};

export default Vehicle3D;
