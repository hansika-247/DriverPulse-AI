import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Grid, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { apiGetInsights } from '../../api';
import { useAuth } from '../../AuthContext';

const NeuralParticles = ({ count = 400, color }) => {
  const points = useRef();
  
  const particlesPosition = React.useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40; 
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;     
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40; 
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      const t = state.clock.getElapsedTime();
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        points.current.geometry.attributes.position.array[i3 + 1] += Math.sin(t + i) * 0.01;
        points.current.geometry.attributes.position.array[i3 + 2] += 0.02; 
        if (points.current.geometry.attributes.position.array[i3 + 2] > 20) {
          points.current.geometry.attributes.position.array[i3 + 2] = -20;
        }
      }
      points.current.geometry.attributes.position.needsUpdate = true;
      
      // Mouse parallax
      points.current.rotation.x = THREE.MathUtils.lerp(points.current.rotation.x, (state.mouse.y * Math.PI) / 40, 0.05);
      points.current.rotation.y = THREE.MathUtils.lerp(points.current.rotation.y, (state.mouse.x * Math.PI) / 40, 0.05);
    }
  });

  return (
    <Points ref={points} positions={particlesPosition} stride={3} frustumCulled={false}>
      <PointMaterial transparent color={color} size={0.06} sizeAttenuation={true} depthWrite={false} opacity={0.6} />
    </Points>
  );
};

const FlowingRoutes = ({ color }) => {
  const linesRef = useRef([]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    linesRef.current.forEach((line, i) => {
      if (line) {
        line.position.z += 0.05 * (i % 3 + 1);
        if (line.position.z > 20) line.position.z = -20;
      }
    });
  });

  const routes = React.useMemo(() => {
    const paths = [];
    for(let i=0; i<15; i++) {
      const points = [];
      const xOffset = (Math.random() - 0.5) * 30;
      for(let j=0; j<10; j++) {
        points.push(new THREE.Vector3(
          xOffset + Math.sin(j * 0.5) * 2,
          -2,
          j * 4 - 20
        ));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      paths.push(geometry);
    }
    return paths;
  }, []);

  return (
    <group>
      {routes.map((geo, idx) => (
        <line key={idx} ref={el => linesRef.current[idx] = el} geometry={geo}>
          <lineBasicMaterial color={color} transparent opacity={0.3} toneMapped={false} />
        </line>
      ))}
    </group>
  );
};

const Scene = ({ color }) => {
  useFrame((state) => {
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, state.mouse.x * 2, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 1.5 + state.mouse.y * 1, 0.05);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <color attach="background" args={['#02040a']} />
      <fog attach="fog" args={['#02040a', 5, 30]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} color={color} />
      <spotLight position={[0, 10, 0]} intensity={2} angle={0.8} penumbra={1} color={color} distance={20} />
      
      <Environment preset="night" />

      <NeuralParticles color={color} />
      <FlowingRoutes color={color} />

      <group position={[0, -2, 0]}>
        <Grid 
          args={[60, 60]} 
          cellSize={1} 
          cellThickness={0.5} 
          cellColor="#111" 
          sectionSize={4} 
          sectionThickness={1} 
          sectionColor={color} 
          fadeDistance={30} 
        />
      </group>
    </>
  );
};

const Ambient3DBackground = () => {
  const { driver } = useAuth();
  const [glowColor, setGlowColor] = useState('#3B82F6'); // Default Blue

  useEffect(() => {
    let mounted = true;
    if (driver?.driverId) {
      apiGetInsights(driver.driverId)
        .then(res => {
          if (mounted && res?.data?.insights?.safety_score) {
            const score = res.data.insights.safety_score;
            if (score > 85) setGlowColor('#10B981'); // Green / Low Risk
            else if (score > 70) setGlowColor('#F59E0B'); // Amber / Med Risk
            else setGlowColor('#EF4444'); // Red / High Risk
          }
        })
        .catch(err => console.error("Error fetching insights for ambient bg:", err));
    }
    return () => { mounted = false; };
  }, [driver]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 1.5, 5], fov: 60 }} gl={{ powerPreference: "high-performance", alpha: false }}>
        <Scene color={glowColor} />
      </Canvas>
    </div>
  );
};

export default Ambient3DBackground;
