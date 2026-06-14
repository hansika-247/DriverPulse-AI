import React from 'react';
import { motion } from 'framer-motion';
import { Map, Play, Pause, FastForward, Navigation, MapPin } from 'lucide-react';

const RouteAnalytics = () => {
  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <motion.h1 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-3xl font-bold flex-shrink-0"
      >
        Route Analytics
      </motion.h1>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Sidebar Controls */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 glass rounded-2xl p-5 flex flex-col overflow-y-auto hide-scrollbar"
        >
          <h3 className="text-lg font-semibold mb-4">Trip Details</h3>
          
          <div className="space-y-4 mb-8">
            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <p className="text-xs text-textLight/60 mb-1">Select Route</p>
              <select className="w-full bg-transparent border-none text-sm focus:outline-none cursor-pointer font-medium">
                <option value="1">TRP-1042 (Today)</option>
                <option value="2">TRP-1041 (Today)</option>
                <option value="3">TRP-1040 (Yesterday)</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <p className="text-xs text-textLight/60 mb-1">Distance</p>
                <p className="font-semibold">24.5 mi</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <p className="text-xs text-textLight/60 mb-1">Duration</p>
                <p className="font-semibold">42 min</p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-4">Route Playback</h3>
          <div className="flex justify-center gap-4 mb-6">
            <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <Play size={18} className="ml-1" />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <Pause size={18} />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <FastForward size={18} />
            </button>
          </div>

          <h3 className="text-lg font-semibold mb-4">Events on Route</h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:border-primary/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-danger/20 text-danger flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} />
                </div>
                <div>
                  <p className="text-sm font-medium">Hard Braking</p>
                  <p className="text-xs text-textLight/60">10:45 AM • Mile 12.4</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Map Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 glass rounded-2xl relative overflow-hidden bg-bgDark border border-white/10 flex items-center justify-center"
        >
          {/* Placeholder for actual map implementation (e.g., Mapbox, Google Maps) */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          
          <div className="text-center relative z-10 p-8 rounded-2xl bg-cardDark/80 backdrop-blur-md border border-white/10 shadow-2xl">
            <Map className="w-16 h-16 text-primary mx-auto mb-4 opacity-80" />
            <h2 className="text-2xl font-bold mb-2">Interactive Map Area</h2>
            <p className="text-textLight/70 max-w-sm">
              Integration ready for Mapbox GL JS or Google Maps API to display GPS traces, heatmaps, and event markers.
            </p>
            <button className="mt-6 bg-primary/20 text-primary border border-primary/50 px-6 py-2 rounded-xl font-medium hover:bg-primary hover:text-white transition-colors">
              Initialize Map Engine
            </button>
          </div>
          
          {/* Overlay elements that would typically be on a map */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button className="w-10 h-10 bg-cardDark border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/10">
              +
            </button>
            <button className="w-10 h-10 bg-cardDark border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/10">
              -
            </button>
            <button className="w-10 h-10 bg-cardDark border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/10 mt-2">
              <Navigation size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RouteAnalytics;
