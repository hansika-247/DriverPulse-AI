import React, { useEffect, useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { motion, useScroll, useTransform, animate } from 'framer-motion';
import { ArrowRight, ShieldAlert, Map, Bot, Activity, ChevronDown } from 'lucide-react';

const Vehicle3D = React.lazy(() => import('../Components/Landing/Vehicle3D'));
const FloatingMetrics = React.lazy(() => import('../Components/Landing/FloatingMetrics'));

const Counter = ({ from, to, duration = 2 }) => {
  const [count, setCount] = useState(from);

  useEffect(() => {
    const controls = animate(from, to, {
      duration: duration,
      onUpdate(value) {
        setCount(Math.floor(value));
      },
    });
    return () => controls.stop();
  }, [from, to, duration]);

  return <span>{count.toLocaleString()}</span>;
};

const FeatureCard = ({ icon: Icon, title, desc, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.6, delay }}
    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors group cursor-pointer"
  >
    <div className="bg-primary/20 p-4 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform">
      <Icon className="w-8 h-8 text-primary" />
    </div>
    <h3 className="text-2xl font-semibold text-white mb-4">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{desc}</p>
  </motion.div>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  
  return (
    <div className="bg-[#020202] min-h-screen text-white overflow-hidden font-sans selection:bg-primary/30">
      
      {/* Navbar Overlay */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center backdrop-blur-md bg-black/20 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Activity className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">DriverPulse</span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="text-sm font-medium text-white/80 hover:text-white transition-colors px-4 py-2"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <div className="relative h-screen w-full">
        {/* 3D Canvas Background */}
        <div className="absolute inset-0 z-0 cursor-move">
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-[#010101]">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <Canvas camera={{ position: [0, 2, 8], fov: 45 }} gl={{ powerPreference: "high-performance", antialias: true }}>
              <Vehicle3D />
              <FloatingMetrics />
            </Canvas>
          </Suspense>
        </div>

        {/* UI Overlay */}
        <motion.div 
          style={{ opacity: heroOpacity }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none mt-20"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-center max-w-4xl px-4"
          >
            <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-md">
              <span className="text-primary font-medium text-sm tracking-wide">ENTERPRISE AI FLEET INTELLIGENCE</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500 drop-shadow-2xl">
              The Future of <br/> Fleet Safety is Here
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Empower your fleet with predictive AI, real-time route analytics, and autonomous driver coaching. Palantir-grade insights with a Tesla-like experience.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pointer-events-auto">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-primary hover:bg-blue-600 text-white rounded-full font-semibold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_#2563eb] flex items-center gap-2"
              >
                Launch DriverPulse <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-white rounded-full font-semibold transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                Watch Demo
              </button>
            </div>
          </motion.div>
          
          {/* Scroll Indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="absolute bottom-10 animate-bounce pointer-events-auto cursor-pointer"
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
          >
            <ChevronDown className="w-8 h-8 text-gray-500" />
          </motion.div>
        </motion.div>
      </div>

      {/* Fleet Intelligence Section */}
      <div className="relative z-20 bg-[#020202] py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Unmatched Fleet Intelligence</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Our proprietary machine learning models analyze millions of data points to predict incidents before they happen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={ShieldAlert}
              title="Predictive Risk Detection"
              desc="Identify high-risk patterns in real-time. Our AI flags harsh braking, speeding, and erratic maneuvers instantly."
              delay={0.1}
            />
            <FeatureCard 
              icon={Map}
              title="Spatial Route Analytics"
              desc="Visualize every trip with precision. Replay incidents on the map and identify dangerous intersections across your fleet."
              delay={0.2}
            />
            <FeatureCard 
              icon={Bot}
              title="Autonomous AI Coaching"
              desc="Personalized, RAG-powered feedback loops for drivers. Automate training and improve safety scores without human intervention."
              delay={0.3}
            />
          </div>
        </div>
      </div>

      {/* Showcase Section: Split Layout */}
      <div className="py-24 border-t border-white/5 bg-gradient-to-b from-[#020202] to-[#050505]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2"
            >
              <h2 className="text-4xl font-bold mb-6">Palantir-Grade Route Analytics</h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Dive deep into spatial data. Our route analytics dashboard provides a mission-control view of your entire operation. Playback trips, analyze telemetry, and uncover hidden risks.
              </p>
              <ul className="space-y-4 mb-8">
                {['Interactive map replays', 'High-risk zone heatmaps', 'Telemetry synchronized playback'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => navigate('/login')}
                className="text-primary font-semibold hover:text-white transition-colors flex items-center gap-2"
              >
                Explore Analytics <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="lg:w-1/2 relative"
            >
              {/* Abstract Representation of Map UI */}
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0a] relative shadow-[0_0_50px_rgba(var(--color-primary),0.1)] group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 border border-primary/30 rounded-xl bg-black/50 backdrop-blur-sm p-4 flex flex-col">
                   <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                     <div className="w-24 h-4 bg-white/10 rounded" />
                     <div className="w-8 h-4 bg-primary/40 rounded" />
                   </div>
                   <div className="flex-1 relative">
                     {/* Fake route line */}
                     <svg className="absolute inset-0 w-full h-full drop-shadow-[0_0_8px_rgba(var(--color-primary),1)]" viewBox="0 0 100 100" preserveAspectRatio="none">
                       <path d="M 10 90 Q 30 50 50 70 T 90 10" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary animate-pulse" />
                     </svg>
                     {/* Fake Incident marker */}
                     <div className="absolute top-[30%] left-[50%] w-4 h-4 bg-red-500 rounded-full animate-ping" />
                     <div className="absolute top-[30%] left-[50%] w-4 h-4 bg-red-500 rounded-full shadow-[0_0_15px_red]" />
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="py-32 bg-black border-y border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 blur-[120px]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-6xl font-black text-white mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                <Counter from={0} to={5211} />
              </div>
              <div className="text-xl text-primary font-medium uppercase tracking-widest">Active Drivers</div>
            </div>
            <div>
              <div className="text-6xl font-black text-white mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                <Counter from={0} to={36501} />
              </div>
              <div className="text-xl text-primary font-medium uppercase tracking-widest">Trips Analyzed</div>
            </div>
            <div>
              <div className="text-6xl font-black text-white mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                <Counter from={0} to={50702} />
              </div>
              <div className="text-xl text-primary font-medium uppercase tracking-widest">Risk Flags Detected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="py-32 text-center px-6">
        <h2 className="text-5xl font-bold mb-8">Ready to transform your fleet?</h2>
        <button 
          onClick={() => navigate('/login')}
          className="px-10 py-5 bg-white text-black hover:bg-gray-200 rounded-full font-bold text-lg transition-transform hover:scale-105"
        >
          Get Started Today
        </button>
      </div>

    </div>
  );
};

export default LandingPage;
