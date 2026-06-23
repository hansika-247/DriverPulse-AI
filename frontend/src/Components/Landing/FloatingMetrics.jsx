import React, { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import { motion, animate } from 'framer-motion';

const AnimatedCounter = ({ from = 0, to, duration = 2, prefix = "", suffix = "" }) => {
  const [count, setCount] = useState(from);

  useEffect(() => {
    const controls = animate(from, to, {
      duration: duration,
      ease: "easeOut",
      onUpdate(value) {
        setCount(value);
      },
    });
    return () => controls.stop();
  }, [from, to, duration]);

  // Format based on value
  const formattedCount = to % 1 !== 0 
    ? count.toFixed(1) 
    : Math.floor(count).toLocaleString();

  return <span>{prefix}{formattedCount}{suffix}</span>;
};

const HolographicPanel = ({ title, value, color, position, delay = 0, suffix = "", prefix = "" }) => {
  return (
    <Html position={position} center transform distanceFactor={12} zIndexRange={[100, 0]}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.5, rotateY: 90 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{ delay, duration: 1, type: "spring", stiffness: 100, damping: 20 }}
        className="relative group cursor-default"
      >
        {/* Holographic background glow */}
        <div 
          className="absolute inset-0 blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 rounded-2xl"
          style={{ backgroundColor: color }}
        />
        
        {/* Panel Container */}
        <div 
          className="relative backdrop-blur-md bg-black/40 border rounded-2xl p-5 flex flex-col min-w-[180px] overflow-hidden"
          style={{
            borderColor: `${color}40`,
            boxShadow: `inset 0 0 20px ${color}10, 0 8px 32px 0 rgba(0, 0, 0, 0.5)`,
          }}
        >
          {/* Cyberpunk accent lines */}
          <div className="absolute top-0 left-0 w-full h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
          <div className="absolute bottom-0 left-0 w-full h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
          <div className="absolute top-0 left-0 w-[2px] h-full" style={{ background: `linear-gradient(180deg, transparent, ${color}, transparent)` }} />

          {/* Scanner sweep line */}
          <motion.div 
            animate={{ y: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: Math.random() * 2 }}
            className="absolute left-0 right-0 h-[2px] opacity-20"
            style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
          />

          <span className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
            {title}
          </span>
          
          <span 
            className="text-white text-4xl font-black tracking-tighter" 
            style={{ 
              color: '#ffffff',
              textShadow: `0 0 20px ${color}80, 0 0 40px ${color}40` 
            }}
          >
            <AnimatedCounter to={value} duration={2 + delay} suffix={suffix} prefix={prefix} />
          </span>

          {/* Tech decorative corners */}
          <div className="absolute top-2 right-2 w-2 h-2 border-t border-r" style={{ borderColor: color }} />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l" style={{ borderColor: color }} />
        </div>
      </motion.div>
    </Html>
  );
};

const FloatingMetrics = () => {
  return (
    <group>
      <HolographicPanel 
        title="Safety Score" 
        value={98.5} 
        color="#00f0ff" 
        position={[-4, 2, 0]} 
        delay={0.2} 
      />
      
      <HolographicPanel 
        title="Risk Prediction" 
        value={92}
        suffix="%"
        color="#ff0055" 
        position={[3.5, 2.5, -1]} 
        delay={0.4} 
      />
      
      <HolographicPanel 
        title="Trips Analyzed" 
        value={36402} 
        color="#9d00ff" 
        position={[-3, 0, 2]} 
        delay={0.6} 
      />
      
      <HolographicPanel 
        title="Drivers Monitored" 
        value={5211} 
        color="#00ff88" 
        position={[4, 0.5, 1]} 
        delay={0.8} 
      />

      <HolographicPanel 
        title="Flags Detected" 
        value={1204} 
        color="#ffaa00" 
        position={[0, 3, -3]} 
        delay={1.0} 
      />
    </group>
  );
};

export default FloatingMetrics;
