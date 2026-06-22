import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Sparkles, TrendingUp, Lightbulb, AlertCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useLanguage } from '../LanguageContext';
import { apiPostAiInsights } from '../api';
import VoiceReadout from '../Components/VoiceReadout';

const AIInsights = () => {
  const { driver } = useAuth();
  const { t, selectedLanguage } = useLanguage();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await apiPostAiInsights(driver?.driverId || 'DRV0001', selectedLanguage);
        setInsights(res.insights || []);
      } catch (err) {
        console.error("Failed to load AI insights", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, [driver, selectedLanguage]);

  if (loading) {
    return <div className="p-6 text-center text-textLight animate-pulse">Generating AI Insights...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BrainCircuit className="text-primary w-8 h-8" />
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-bold bg-gradient-to-r from-white to-textLight/70 bg-clip-text text-transparent flex-1"
        >
          {t('AI Insights')}
        </motion.h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Analysis */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 rounded-2xl border border-primary/20 relative overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>
          
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-primary" size={20} />
            <h2 className="text-xl font-semibold">Weekly Synthesis</h2>
          </div>
          
          <p className="text-textLight/80 leading-relaxed mb-4">
            Analysis of 142 trips over the past 7 days indicates a <strong>15% improvement</strong> in overall safety score compared to the previous week.
          </p>
          <p className="text-textLight/80 leading-relaxed">
            The most significant improvement was observed in cornering smoothness. However, there is a slight negative trend in maintaining optimal following distance during peak traffic hours (4 PM - 6 PM).
          </p>
        </motion.div>

        {/* Predictive Risk */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-6 rounded-2xl relative overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-danger/10 rounded-full blur-2xl"></div>
          
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-danger" size={20} />
            <h2 className="text-xl font-semibold">Predictive Risk Factors</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
              <span className="text-sm font-medium">Fatigue Probability (Next 2h)</span>
              <span className="text-danger font-bold">12%</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
              <span className="text-sm font-medium">High Traffic Risk Correlation</span>
              <span className="text-warning font-bold">Moderate</span>
            </div>
            <p className="text-sm text-textLight/60 mt-2">
              Based on your current driving streak of 3 hours, the AI model predicts a slight increase in reaction time. A 15-minute break is recommended soon.
            </p>
          </div>
        </motion.div>

        {/* Optimization Suggestions - Dynamic */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-6 rounded-2xl col-span-1 md:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Lightbulb className="text-success" size={20} />
              <h2 className="text-xl font-semibold">Actionable Recommendations</h2>
            </div>
            {insights.length > 0 && <VoiceReadout text={insights.map(i => i.title + ". " + i.description).join(" ")} />}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.length > 0 ? insights.map((rec, i) => (
              <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-success/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center mb-3">
                  <TrendingUp size={16} />
                </div>
                <h3 className="font-semibold text-sm mb-2">{rec.title}</h3>
                <p className="text-xs text-textLight/70">{rec.description}</p>
              </div>
            )) : (
              <p className="text-textLight/70">No insights generated yet.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AIInsights;
