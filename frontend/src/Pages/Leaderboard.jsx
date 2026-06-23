import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, TrendingUp, ShieldCheck } from 'lucide-react';
import { apiGetTopPerformers } from '../api';
import { useLanguage } from '../LanguageContext';

const Leaderboard = () => {
  const { t } = useLanguage();
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
          {t('Leaderboard')}
        </motion.h1>
      </div>

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Motivation Cards */}
        <motion.div 
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center space-y-3 border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent shadow-[0_8px_30px_rgba(234,179,8,0.15)] relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-yellow-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <motion.div 
            animate={{ rotateY: [0, 360] }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="w-14 h-14 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.4)]"
          >
            <Medal size={28} />
          </motion.div>
          <h3 className="font-bold text-lg text-white">Elite Tier</h3>
          <p className="text-sm text-textLight/70">Top 10 drivers earn a 5% bonus on their weekly payout.</p>
        </motion.div>

        <motion.div 
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center space-y-3 border border-success/30 bg-gradient-to-br from-success/10 to-transparent shadow-[0_8px_30px_rgba(16,185,129,0.1)] relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-success/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="w-14 h-14 bg-success/20 text-success rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <ShieldCheck size={24} />
          </div>
          <h3 className="font-bold text-lg text-white">Safety First</h3>
          <p className="text-sm text-textLight/70">Maintain a LOW risk label and &gt;4.8 rating to qualify.</p>
        </motion.div>

        <motion.div 
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center space-y-3 border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent shadow-[0_8px_30px_rgba(59,130,246,0.1)] relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="w-14 h-14 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <TrendingUp size={28} />
          </div>
          <h3 className="font-bold text-lg text-white">Rising Stars</h3>
          <p className="text-sm text-textLight/70">Drivers improving their safety score are highlighted here.</p>
        </motion.div>
      </motion.div>

      {/* Leaderboard Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
      >
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
          <h2 className="text-xl font-bold tracking-wide">Global Rankings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-textLight/70 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Rank</th>
                <th className="p-4 font-bold">Driver</th>
                <th className="p-4 font-bold">City</th>
                <th className="p-4 font-bold">Rating</th>
                <th className="p-4 font-bold">Productivity</th>
                <th className="p-4 font-bold">Risk Level</th>
                <th className="p-4 font-bold text-right">Score</th>
              </tr>
            </thead>
            <motion.tbody
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.4 } }
              }}
            >
              {leaders.length > 0 ? leaders.map((driver, idx) => (
                <motion.tr 
                  variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                  key={driver.driver_id} 
                  className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group"
                >
                  <td className="p-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-yellow-500 text-black shadow-[0_0_10px_#eab308]' : idx === 1 ? 'bg-gray-300 text-black shadow-[0_0_10px_#d1d5db]' : idx === 2 ? 'bg-amber-700 text-white shadow-[0_0_10px_#b45309]' : 'bg-white/10'}`}>
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
                    <span className={`px-2 py-1 rounded text-xs font-bold ${driver.risk_label === 'HIGH' ? 'bg-danger/20 text-danger' : driver.risk_label === 'MEDIUM' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                      {t(driver.risk_label)}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-primary font-bold group-hover:text-blue-400 transition-colors">{driver.score.toFixed(2)}</td>
                </motion.tr>
              )) : (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-textLight/50">No leaderboard data available</td>
                </tr>
              )}
            </motion.tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Leaderboard;
