import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  TrendingUp, Activity, DollarSign, AlertTriangle, Gauge, ShieldAlert, Sparkles, BrainCircuit
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import { useLanguage } from '../LanguageContext';
import { apiGetTrips, apiGetFlags, apiGetInsights, apiGetDriverProfile } from '../api';
import DriverAssessmentForm from './DriverAssessmentForm';
import DeveloperTestMode from '../Components/DeveloperTestMode';
import VoiceReadout from '../Components/VoiceReadout';

const COLORS = ['#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#10B981'];

const Dashboard = () => {
  const { theme } = useTheme();
  const { driver } = useAuth();
  const { t, selectedLanguage } = useLanguage();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsAssessment, setNeedsAssessment] = useState(false);

  // Data states
  const [kpiData, setKpiData] = useState([]);
  const [tripTrendData, setTripTrendData] = useState([]);
  const [safetyScoreData, setSafetyScoreData] = useState([]);
  const [earningsData, setEarningsData] = useState([]);
  const [flagDistribution, setFlagDistribution] = useState([]);
  const [riskRadarData, setRiskRadarData] = useState([]);
  const [insightMessage, setInsightMessage] = useState('');
  const [safetyScore, setSafetyScore] = useState(100);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const driverId = driver?.driverId;
        if (!driverId) {
          setError('No driver ID found. Please log in again.');
          setLoading(false);
          return;
        }

        // We catch individual errors so one failed call doesn't break the whole dashboard
        const [tripsRes, flagsRes, insightsRes, profileRes] = await Promise.all([
          apiGetTrips().catch(() => ({ data: { trips: [] } })),
          apiGetFlags().catch(() => ({ data: { flags: [] } })),
          apiGetInsights(driverId, selectedLanguage).catch(() => ({ data: { insights: [], stats: {} } })),
          apiGetDriverProfile(driverId).catch(() => null),
        ]);

        const trips = tripsRes?.data?.trips || tripsRes?.trips || tripsRes || [];
        const flags = flagsRes?.data?.flags || flagsRes?.flags || flagsRes || [];
        const insights = insightsRes?.data?.insights || insightsRes?.insights || [];
        const stats = insightsRes?.data?.stats || {};

        // --- Calculate KPIs ---
        const totalTrips = trips.length || 0;
        const totalEarnings = Array.isArray(trips) ? trips.reduce((sum, t) => sum + Number(t.earnings || 0), 0) : 0;
        const avgSpeed = (Array.isArray(trips) && trips.length) ? trips.reduce((sum, t) => sum + Number(t.avgSpeed || 0), 0) / trips.length : 0;
        
        // ── Needs assessment check ────────────────────────────────────────────
        if (profileRes?.needs_assessment) {
          setNeedsAssessment(true);
          setLoading(false);
          return;
        }

        let currentScore        = stats?.avgRiskScore ? Math.round(stats.avgRiskScore) : 92;
        let riskLevel           = currentScore > 85 ? 'Low' : currentScore > 70 ? 'Medium' : 'High';
        let totalFlags          = Array.isArray(flags) ? flags.length : 0;
        let predictionConfidence = 0.85;

        // Use real profile data if available
        if (profileRes && !profileRes.needs_assessment) {
          currentScore         = profileRes.predicted_safety_score || Math.round((profileRes.rating / 5) * 100);
          riskLevel            = profileRes.predicted_risk_label || profileRes.risk_level || profileRes.risk_label || riskLevel;
          totalFlags           = profileRes.total_flags ?? totalFlags;
          predictionConfidence = profileRes.prediction_confidence ?? profileRes.confidence ?? predictionConfidence;
        }

        setSafetyScore(currentScore);

        setKpiData([
          { title: t('Total Trips'), value: totalTrips.toString(), icon: Activity, color: 'text-primary' },
          { title: t('Performance Score'), value: profileRes ? `$${profileRes.daily_productivity}/day` : `$${totalEarnings.toFixed(2)}`, icon: DollarSign, color: 'text-success' },
          { title: t('Safety Score'), value: `${currentScore}/100`, icon: ShieldAlert, color: 'text-primary' },
          { title: t('Flags Detected'), value: totalFlags.toString(), icon: AlertTriangle, color: 'text-warning' },
          { title: t('Rating'), value: profileRes ? `${profileRes.rating} ⭐` : `${Math.round(avgSpeed)} mph`, icon: Gauge, color: 'text-textLight' },
          { title: t('Risk Level'), value: t(riskLevel.toUpperCase()) || riskLevel, icon: TrendingUp, color: 'text-success' },
          { title: t('ML Confidence'), value: `${(predictionConfidence * 100).toFixed(1)}%`, icon: BrainCircuit, color: 'text-primary' },
        ]);

        // --- Calculate Trend Data (Last 7 Days) ---
        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d;
        });

        const dTrip = [];
        const dEarn = [];
        const dScore = [];

        last7Days.forEach(date => {
          const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
          const dayStart = new Date(date.setHours(0,0,0,0));
          const dayEnd = new Date(date.setHours(23,59,59,999));

          const dayTrips = trips.filter(t => new Date(t.startTime) >= dayStart && new Date(t.startTime) <= dayEnd);
          const dayEarnings = dayTrips.reduce((sum, t) => sum + Number(t.earnings), 0);
          
          dTrip.push({ day: dayStr, trips: dayTrips.length });
          dEarn.push({ day: dayStr, amount: Math.round(dayEarnings) });
          // Deterministic daily score variation based on trips and currentScore
          let dailyScore = currentScore;
          if (dayTrips.length > 0) {
              const dayFlags = flags.filter(f => new Date(f.timestamp) >= dayStart && new Date(f.timestamp) <= dayEnd);
              dailyScore = Math.max(0, currentScore - (dayFlags.length * 5) + (dayTrips.length > 5 ? 2 : -2));
          } else {
              // slight deterministic drift if no trips
              dailyScore = currentScore + (date.getDate() % 5) - 2;
          }
          dScore.push({ week: dayStr, score: Math.max(50, Math.min(100, dailyScore)) });
        });

        setTripTrendData(dTrip);
        setEarningsData(dEarn);
        setSafetyScoreData(dScore);

        // --- Flag Distribution ---
        const fDist = {};
        let totalFlagsForDist = 0;
        if (Array.isArray(flags)) {
          flags.forEach(f => {
            if (f.flagType) {
                const name = f.flagType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                fDist[name] = (fDist[name] || 0) + 1;
                totalFlagsForDist++;
            }
          });
        }
        setFlagDistribution(Object.keys(fDist).map(k => ({ 
          name: k, 
          value: fDist[k], 
          percentage: totalFlagsForDist > 0 ? Math.round((fDist[k]/totalFlagsForDist)*100) : 0 
        })));

        // --- Risk Radar (Mock from Flags) ---
        setRiskRadarData([
          { subject: 'Speeding', A: fDist['Speeding'] ? fDist['Speeding'] * 20 : 20, fullMark: 100 },
          { subject: 'Braking', A: fDist['Hard Braking'] ? fDist['Hard Braking'] * 20 : 30, fullMark: 100 },
          { subject: 'Focus', A: fDist['Phone Usage'] ? fDist['Phone Usage'] * 20 : 10, fullMark: 100 },
          { subject: 'Tailgating', A: fDist['Tailgating'] ? fDist['Tailgating'] * 20 : 20, fullMark: 100 },
          { subject: 'Cornering', A: 25, fullMark: 100 },
        ]);

        // --- Insights ---
        if (insights.length > 0) {
          // New ML insights return {summary, recommendation}
          if (insights[0].summary) {
            setInsightMessage(insights[0].summary + " " + (insights[0].recommendation || ""));
          } else if (insights[0].description) {
            setInsightMessage(insights[0].description);
          }
        } else {
          setInsightMessage("Your driving behavior is generally safe. Keep up the good work!");
        }

      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [driver, selectedLanguage]);

  // Dynamic Theme Colors for Charts
  const themeColors = {
    grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    text: isDark ? 'rgba(248, 250, 252, 0.5)' : 'rgba(15, 23, 42, 0.6)',
    primary: isDark ? '#2563EB' : '#000000',
    success: isDark ? '#22C55E' : '#06C167',
    tooltipBg: isDark ? '#1E293B' : '#FFFFFF',
    tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
    tooltipText: isDark ? '#F8FAFC' : '#0F172A',
    polarGrid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass p-3 rounded-lg border border-white/10 shadow-xl" style={{ backgroundColor: themeColors.tooltipBg }}>
          <p className="font-bold text-sm" style={{ color: themeColors.text }}>{data.name}</p>
          <p className="text-sm mt-1" style={{ color: themeColors.text }}>{data.value} incidents</p>
          <p className="text-xs mt-1 font-semibold" style={{ color: themeColors.primary }}>{data.percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        <div className="h-20 bg-white/5 rounded-2xl w-full"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-2xl"></div>)}
        </div>
        <div className="h-40 bg-white/5 rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-white/5 rounded-2xl"></div>
          <div className="h-64 bg-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (needsAssessment) {
    const handleAssessmentDone = (prediction) => {
      // Update dashboard state from the returned prediction — no page reload
      setNeedsAssessment(false);
      setSafetyScore(prediction?.predicted_safety_score || 75);
      const riskLevel = prediction?.risk_level || 'MEDIUM';
      setKpiData([
        { title: t('Total Trips'),        value: '0',            icon: Activity,    color: 'text-primary' },
        { title: t('Performance Score'),  value: '—',            icon: DollarSign,  color: 'text-success' },
        { title: t('Safety Score'),       value: `${prediction?.predicted_safety_score || 75}/100`, icon: ShieldAlert, color: 'text-primary' },
        { title: t('Flags Detected'),     value: '0',            icon: AlertTriangle, color: 'text-warning' },
        { title: t('Rating'),             value: '—',            icon: Gauge,       color: 'text-textLight' },
        { title: t('Risk Level'),         value: t(riskLevel.toUpperCase()) || riskLevel,      icon: TrendingUp,  color: 'text-success' },
        { title: t('ML Confidence'),      value: `${((prediction?.confidence || 0) * 100).toFixed(1)}%`, icon: BrainCircuit, color: 'text-primary' },
      ]);
      setInsightMessage(
        `Your initial risk profile has been generated. Risk level: ${riskLevel}. ` +
        `Safety score: ${prediction?.predicted_safety_score}. ` +
        'Start completing trips to build your live analytics.'
      );
    };

    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-textLight/60 text-sm -mt-4">
          Welcome, <span className="text-primary font-semibold">{driver?.name?.split(' ')[0] || 'Driver'}</span>!
          Complete the one-time assessment below to generate your risk profile.
        </p>
        <DriverAssessmentForm onAssessmentComplete={handleAssessmentDone} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger/10 border border-danger/20 text-danger p-6 rounded-2xl text-center">
        <AlertTriangle size={32} className="mx-auto mb-3" />
        <h2 className="text-xl font-bold mb-1">Error Loading Dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 relative z-10">
      <DeveloperTestMode />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight"
          >
            Welcome back, <span className="text-primary font-bold">{driver?.name?.split(' ')[0] || 'Driver'}</span>
          </motion.h1>
          <p className="text-textLight/70 mt-1 flex items-center gap-2">
            Status: <span className="flex items-center gap-1 text-success font-medium"><div className="w-2 h-2 rounded-full bg-success animate-pulse"></div> Online & Monitoring</span>
          </p>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-4 glass-panel px-6 py-4 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/10"
        >
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-textLight/50 font-bold mb-1">{t('Safety Score')}</p>
            <p className={`text-3xl font-black ${safetyScore > 85 ? 'text-success drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]' : safetyScore > 70 ? 'text-warning drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'text-danger drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]'}`}>
              {safetyScore}
            </p>
          </div>
          
          {/* Animated 3D-styled SVG Gauge */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
              <circle 
                cx="50" cy="50" r="42" fill="transparent" 
                stroke={safetyScore > 85 ? '#22C55E' : safetyScore > 70 ? '#F59E0B' : '#EF4444'} 
                strokeWidth="12" 
                strokeDasharray="264" 
                strokeDashoffset={264 - (264 * safetyScore) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className={`absolute text-2xl font-black ${safetyScore > 85 ? 'text-success drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]' : safetyScore > 70 ? 'text-warning drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'text-danger drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]'}`}>
              {safetyScore > 85 ? 'A' : safetyScore > 70 ? 'B' : 'C'}
            </div>
          </div>
        </motion.div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiData.map((kpi, index) => {
          const isRisk = kpi.title === 'Risk Level';
          const riskColor = kpi.value === 'HIGH' ? '#EF4444' : kpi.value === 'MEDIUM' ? '#F59E0B' : '#10B981';
          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ delay: index * 0.1 }}
              className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-white/30 transition-all shadow-lg hover:shadow-2xl relative overflow-hidden group backdrop-blur-xl bg-black/40"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <p className="text-[10px] uppercase tracking-widest text-textLight/70 font-bold">{kpi.title}</p>
                <kpi.icon size={16} className={`${kpi.color} drop-shadow-[0_0_5px_currentColor]`} />
              </div>
              <div className="flex items-center gap-3 relative z-10">
                {isRisk && (
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], boxShadow: [`0 0 10px ${riskColor}`, `0 0 25px ${riskColor}`, `0 0 10px ${riskColor}`] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: riskColor }}
                  />
                )}
                <p className="text-2xl font-black tracking-tight">{kpi.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* AI Summary Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative overflow-hidden rounded-2xl bg-black/60 border border-primary/30 p-6 shadow-[0_8px_30px_rgba(37,99,235,0.15)] glass-panel"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <BrainCircuit size={120} className="text-primary animate-pulse" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="text-primary" size={20} />
              <h2 className="text-lg font-bold tracking-wide">AI SAFETY SUMMARY</h2>
            </div>
            <VoiceReadout text={insightMessage} />
          </div>
          
          <div className="font-mono text-sm text-textLight/90 leading-relaxed max-w-3xl min-h-[60px]">
            {/* Typewriter Effect via Framer Motion */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key={insightMessage}
            >
              {insightMessage.split('').map((char, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                >
                  {char}
                </motion.span>
              ))}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="inline-block w-2 h-4 bg-primary ml-1 align-middle"
              />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Safety Score Timeline */}
        {/* Safety Score Timeline */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.01 }}
          className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-white/30 transition-all shadow-lg backdrop-blur-xl bg-black/40"
        >
          <h3 className="text-lg font-semibold mb-4">{t('Safety Score Trend (7 Days)')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={safetyScoreData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={themeColors.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={themeColors.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                <XAxis dataKey="week" stroke={themeColors.text} tick={{ fill: themeColors.text }} />
                <YAxis domain={['dataMin - 5', 100]} stroke={themeColors.text} tick={{ fill: themeColors.text }} />
                <Tooltip contentStyle={{ backgroundColor: themeColors.tooltipBg, border: `1px solid ${themeColors.tooltipBorder}`, borderRadius: '8px', color: themeColors.tooltipText }} />
                <Area type="monotone" dataKey="score" stroke={themeColors.primary} strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Trip Trend Chart */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.01 }}
          className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-white/30 transition-all shadow-lg backdrop-blur-xl bg-black/40"
        >
          <h3 className="text-lg font-semibold mb-4">{t('Trip Trend (Last 7 Days)')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tripTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} vertical={false} />
                <XAxis dataKey="day" stroke={themeColors.text} tick={{ fill: themeColors.text }} />
                <YAxis stroke={themeColors.text} tick={{ fill: themeColors.text }} />
                <Tooltip cursor={{fill: isDark ? '#ffffff05' : 'rgba(0,0,0,0.02)'}} contentStyle={{ backgroundColor: themeColors.tooltipBg, border: `1px solid ${themeColors.tooltipBorder}`, borderRadius: '8px', color: themeColors.tooltipText }} />
                <Bar dataKey="trips" fill={themeColors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Earnings Velocity Graph */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.01 }}
          className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-white/30 transition-all shadow-lg backdrop-blur-xl bg-black/40"
        >
          <h3 className="text-lg font-semibold mb-4">{t('Earnings Velocity')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={earningsData}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                <XAxis dataKey="day" stroke={themeColors.text} tick={{ fill: themeColors.text }} />
                <YAxis stroke={themeColors.text} tick={{ fill: themeColors.text }} />
                <Tooltip contentStyle={{ backgroundColor: themeColors.tooltipBg, border: `1px solid ${themeColors.tooltipBorder}`, borderRadius: '8px', color: themeColors.tooltipText }} />
                <Line type="monotone" dataKey="amount" stroke={themeColors.success} strokeWidth={3} dot={{ r: 4, fill: themeColors.success }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Flag Distribution */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.01 }}
          className="glass-panel p-5 rounded-2xl flex flex-col items-center border border-white/10 hover:border-white/30 transition-all shadow-lg backdrop-blur-xl bg-black/40"
        >
          <h3 className="text-lg font-semibold mb-2 self-start">{t('Flag Distribution')}</h3>
          <div className="h-64 w-full mt-4">
            {flagDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={flagDistribution}
                    cx="40%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={renderCustomizedLabel}
                    labelLine={false}
                  >
                    {flagDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value, entry) => {
                      const { payload } = entry;
                      return <span style={{ color: themeColors.text }} className="ml-1">{value} ({payload?.value || 0})</span>;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-textLight/50 text-sm">
                No flags recorded
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Risk Radar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          className="glass-panel p-5 rounded-2xl flex flex-col items-center border border-white/10 hover:border-white/30 transition-all shadow-lg backdrop-blur-xl bg-black/40 lg:col-span-2 xl:col-span-1"
        >
          <h3 className="text-lg font-semibold mb-2 self-start">{t('Risk Radar')}</h3>
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={riskRadarData}>
                <PolarGrid stroke={themeColors.polarGrid} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: themeColors.text, fontSize: 10 }} />
                <Radar name="Risk" dataKey="A" stroke="#EF4444" fill="#EF4444" fillOpacity={0.4} />
                <Tooltip contentStyle={{ backgroundColor: themeColors.tooltipBg, border: `1px solid ${themeColors.tooltipBorder}`, borderRadius: '8px', color: themeColors.tooltipText }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Dashboard;
