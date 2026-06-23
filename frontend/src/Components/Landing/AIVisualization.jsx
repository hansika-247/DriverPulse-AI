import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';

const GlowingRoute = ({ start, end, color, speed, delay }) => {
  const lineRef = useRef();
  
  // Create a curved path
  const curve = useMemo(() => {
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    midPoint.y += Math.random() * 2; // arch up slightly
    midPoint.x += (Math.random() - 0.5) * 2;
    return new THREE.QuadraticBezierCurve3(start, midPoint, end);
  }, [start, end]);

  const points = useMemo(() => curve.getPoints(50), [curve]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + delay;
    if (lineRef.current) {
      // Create a pulsing effect on the line material
      lineRef.current.material.dashOffset = -t * 2;
    }
  });

  return (
    <group>
      <Line
        ref={lineRef}
        points={points}
        color={color}
        lineWidth={2}
        transparent
        opacity={0.6}
        dashed
        dashScale={20}
        dashSize={5}
        dashOffset={0}
      />
      <Sphere args={[0.05, 16, 16]} position={end}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </Sphere>
    </group>
  );
};

const AIVisualization = () => {
  const group = useRef();

  useFrame((state) => {
    // Slowly rotate the entire visualization group
    if (group.current) {
      group.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  // Generate some random paths around the scene
  const paths = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      start: new THREE.Vector3((Math.random() - 0.5) * 20, 0.1, (Math.random() - 0.5) * 20),
      end: new THREE.Vector3((Math.random() - 0.5) * 10, Math.random() * 2 + 1, (Math.random() - 0.5) * 10),
      color: Math.random() > 0.5 ? '#00f0ff' : '#9d00ff',
      speed: Math.random() * 0.5 + 0.2,
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <group ref={group} position={[0, -0.5, 0]}>
      {paths.map((path) => (
        <GlowingRoute key={path.id} {...path} />
      ))}
      
      {/* Floating data nodes (Incident Markers) */}
      {Array.from({ length: 15 }).map((_, i) => {
        const pos = [
          (Math.random() - 0.5) * 15,
          Math.random() * 3,
          (Math.random() - 0.5) * 15
        ];
        return (
          <mesh key={`node-${i}`} position={pos}>
            <octahedronGeometry args={[0.08]} />
            <meshBasicMaterial color="#ff0055" wireframe transparent opacity={0.6} />
          </mesh>
        );
      })}
    </group>
  );
};

export default AIVisualization;
