import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, MapPin, Clock, Video, ShieldAlert, Volume2, Search } from 'lucide-react';

const flaggedEvents = [
  { id: 1, type: 'Hard Braking', severity: 'High', time: '10:45 AM, Today', location: 'I-95 South, Mile 42', desc: 'Sudden deceleration from 65mph to 20mph. Cabin audio spike detected.', score: 0.85, video: true },
  { id: 2, type: 'Speeding', severity: 'Medium', time: '09:12 AM, Today', location: 'Route 1 North', desc: 'Exceeded speed limit by 15mph for 2 minutes.', score: 0.62, video: false },
  { id: 3, type: 'Phone Usage', severity: 'High', time: '04:30 PM, Yesterday', location: 'Downtown Avenue', desc: 'Driver interacted with mobile device while vehicle was in motion.', score: 0.91, video: true },
  { id: 4, type: 'Tailgating', severity: 'Low', time: '02:15 PM, Yesterday', location: 'Hwy 61', desc: 'Following distance dropped below 2 seconds.', score: 0.45, video: false },
];

const FlaggedMoments = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-bold"
        >
          Flagged Moments
        </motion.h1>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full md:w-auto"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textLight/50" size={18} />
          <input 
            type="text" 
            placeholder="Search events..." 
            className="w-full md:w-64 bg-cardDark/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {flaggedEvents.map((event, index) => {
          const isHigh = event.severity === 'High';
          const isMedium = event.severity === 'Medium';
          const badgeClass = isHigh ? 'bg-danger/10 text-danger border-danger/20' : isMedium ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20';
          
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass p-5 rounded-2xl flex flex-col hover:border-white/20 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${badgeClass} bg-opacity-20`}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{event.type}</h3>
                    <p className="text-xs text-textLight/60 font-medium">Score: {event.score.toFixed(2)}</p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeClass} uppercase tracking-wider`}>
                  {event.severity}
                </div>
              </div>
              
              <p className="text-sm text-textLight/80 mb-4 flex-1">
                {event.desc}
              </p>
              
              <div className="space-y-2 text-sm text-textLight/70 mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  {event.time}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-primary" />
                  {event.location}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/5">
                {event.video ? (
                  <button className="flex items-center gap-2 text-sm font-medium text-primary hover:text-blue-400 transition-colors">
                    <Video size={16} />
                    View Dashcam
                  </button>
                ) : (
                  <span className="text-sm text-textLight/40 flex items-center gap-2">
                    <Video size={16} />
                    No video available
                  </span>
                )}
                <button className="text-sm text-textLight/60 hover:text-textLight transition-colors">
                  Details
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default FlaggedMoments;
