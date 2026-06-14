import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, TrendingUp, ShieldCheck } from 'lucide-react';
import { apiGetTopPerformers } from '../api';

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await apiGetTopPerformers(10);
        setLeaders(data || []);
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-textLight animate-pulse">Loading Leaderboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="text-yellow-500 w-8 h-8" />
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent"
        >
          Top Performers
        </motion.h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Motivation Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 rounded-2xl flex flex-col items-center text-center space-y-3"
        >
          <div className="w-12 h-12 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center">
            <Medal size={24} />
          </div>
          <h3 className="font-bold text-lg">Elite Tier</h3>
          <p className="text-sm text-textLight/70">Top 10 drivers earn a 5% bonus on their weekly payout.</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-6 rounded-2xl flex flex-col items-center text-center space-y-3"
        >
          <div className="w-12 h-12 bg-success/20 text-success rounded-full flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <h3 className="font-bold text-lg">Safety First</h3>
          <p className="text-sm text-textLight/70">Maintain a LOW risk label and &gt;4.8 rating to qualify.</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-6 rounded-2xl flex flex-col items-center text-center space-y-3"
        >
          <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <h3 className="font-bold text-lg">Rising Stars</h3>
          <p className="text-sm text-textLight/70">Drivers improving their safety score are highlighted here.</p>
        </motion.div>
      </div>

      {/* Leaderboard Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className="text-xl font-bold">Current Rankings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-textLight/70 text-sm">
                <th className="p-4 font-semibold">Rank</th>
                <th className="p-4 font-semibold">Driver</th>
                <th className="p-4 font-semibold">City</th>
                <th className="p-4 font-semibold">Rating</th>
                <th className="p-4 font-semibold">Productivity</th>
                <th className="p-4 font-semibold">Risk Level</th>
                <th className="p-4 font-semibold text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {leaders.length > 0 ? leaders.map((driver, idx) => (
                <tr key={driver.driver_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/10'}`}>
                      {driver.rank}
                    </div>
                  </td>
                  <td className="p-4 font-medium">
                    <div className="flex flex-col">
                        <span>{driver.name}</span>
                        <span className="text-xs text-primary">{driver.driver_id}</span>
                    </div>
                  </td>
                  <td className="p-4 text-textLight/80">{driver.city}</td>
                  <td className="p-4 text-textLight/80">{driver.rating} <Star className="inline text-yellow-500" size={14} /></td>
                  <td className="p-4 text-success font-medium">₹{driver.daily_productivity}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${driver.risk_label === 'LOW' ? 'bg-success/20 text-success' : driver.risk_label === 'MEDIUM' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'}`}>
                      {driver.risk_label}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-primary font-bold">{driver.score.toFixed(2)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-textLight/50">No leaderboard data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Leaderboard;
