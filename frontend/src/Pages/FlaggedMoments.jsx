import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, MapPin, Clock, Video, Search, Filter } from 'lucide-react';
import { apiGetFlags } from '../api';
import { useAuth } from '../AuthContext';
import { useLanguage } from '../LanguageContext';

const FlaggedMoments = () => {
  const { driver } = useAuth();
  const { t } = useLanguage();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  useEffect(() => {
    if (driver?.driverId) {
      apiGetFlags()
        .then((res) => {
          const fetchedFlags = res?.data?.flags || res?.flags || res || [];
          setFlags(fetchedFlags);
        })
        .catch((err) => {
          console.error('Error fetching flags:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [driver]);

  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        <div className="h-20 bg-white/5 rounded-2xl w-full"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  // Helper
  const formatType = (type) => {
    if (!type) return 'Unknown Event';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Analytics Computation
  const totalIncidents = flags.length;
  const countsByType = flags.reduce((acc, flag) => {
    const type = formatType(flag.flagType);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const typeStats = Object.keys(countsByType).map(type => {
    const count = countsByType[type];
    const percentage = totalIncidents > 0 ? ((count / totalIncidents) * 100).toFixed(1) : 0;
    return { type, count, percentage };
  }).sort((a, b) => b.count - a.count);

  const availableTypes = ['All', ...Object.keys(countsByType)];

  // Filtering and Sorting
  const severityValue = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
  
  const filteredFlags = flags.filter(flag => {
    if (severityFilter !== 'All' && flag.severity?.toUpperCase() !== severityFilter.toUpperCase()) return false;
    if (typeFilter !== 'All' && formatType(flag.flagType) !== typeFilter) return false;
    return true;
  }).sort((a, b) => {
    // Primary sort: Severity (High -> Medium -> Low)
    const sA = severityValue[a.severity?.toUpperCase()] || 0;
    const sB = severityValue[b.severity?.toUpperCase()] || 0;
    if (sA !== sB) return sB - sA;
    // Secondary sort: Time (Newest first)
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-bold"
        >
          {t('Flagged Moments')}
        </motion.h1>
      </div>

      {/* Summary Analytics Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between col-span-1 md:col-span-2 lg:col-span-1 bg-gradient-to-br from-primary/20 to-black/40 border border-primary/30 shadow-[0_8px_30px_rgba(37,99,235,0.2)]">
          <div>
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">Total Incidents</p>
            <p className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{totalIncidents}</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center border border-primary/50 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <AlertTriangle size={32} />
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          {typeStats.length === 0 ? (
            <div className="col-span-full glass-panel p-4 rounded-xl text-textLight/50 flex items-center justify-center">
              No incident types found.
            </div>
          ) : typeStats.map(stat => (
            <div key={stat.type} className="glass-panel p-4 rounded-xl border border-white/10 hover:border-white/30 transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between">
              <p className="text-xs uppercase tracking-wider font-bold text-textLight/80 line-clamp-1">{stat.type}</p>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-2xl font-bold tracking-tight">{stat.count}</span>
                <span className="text-xs text-textLight/50 mb-1">{stat.percentage}%</span>
              </div>
              <div className="w-full bg-black/50 h-1.5 rounded-full mt-3 overflow-hidden border border-white/5">
                <div className="bg-warning h-full rounded-full shadow-[0_0_10px_#F59E0B]" style={{ width: `${stat.percentage}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col md:flex-row gap-4 items-center justify-between glass p-4 rounded-2xl"
      >
        <div className="flex items-center gap-2 text-textLight/70 font-medium w-full md:w-auto">
          <Filter size={18} />
          <span>Filters</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select 
            className="bg-bgDark border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="All">{t('All')}</option>
            <option value="High">{t('HIGH')}</option>
            <option value="Medium">{t('MEDIUM')}</option>
            <option value="Low">{t('LOW')}</option>
          </select>

          <select 
            className="bg-bgDark border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {availableTypes.map(type => (
              <option key={type} value={type}>{type === 'All' ? 'All Incident Types' : type}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Flags List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredFlags.length === 0 ? (
          <div className="p-4 text-textLight col-span-full">No flagged moments match the selected filters.</div>
        ) : filteredFlags.map((flag, index) => {
          const isHigh = flag.severity?.toUpperCase() === 'HIGH';
          const isMedium = flag.severity?.toUpperCase() === 'MEDIUM';
          const badgeClass = isHigh ? 'bg-danger/10 text-danger border-danger/30' : isMedium ? 'bg-warning/10 text-warning border-warning/30' : 'bg-success/10 text-success border-success/30';
          const glowColor = isHigh ? 'rgba(239, 68, 68, 0.4)' : isMedium ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)';
          const hoverClass = isHigh ? 'hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:border-danger/50' : isMedium ? 'hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:border-warning/50' : 'hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:border-success/50';
          
          return (
            <motion.div
              key={flag.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index % 10) * 0.05 }}
              className={`glass-panel p-6 rounded-2xl flex flex-col border border-white/10 bg-black/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 group ${hoverClass}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${badgeClass} bg-opacity-20`}>
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{formatType(flag.flagType)}</h3>
                    <p className="text-xs text-textLight/60 font-medium">Score: {(flag.combinedScore || flag.motionScore || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeClass} uppercase tracking-wider`}>
                  {t(flag.severity)}
                </div>
              </div>
              
              <p className="text-sm text-textLight/80 mb-4 flex-1">
                {`Detected anomalous ${formatType(flag.flagType).toLowerCase()} behavior during trip.`}
              </p>
              
              <div className="space-y-2 text-sm text-textLight/70 mb-4 bg-black/20 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  {new Date(flag.timestamp).toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  {flag.latitude && flag.longitude ? (
                    <a 
                      href={`https://www.google.com/maps?q=${flag.latitude},${flag.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors group/map"
                      title="Open incident location in Google Maps"
                    >
                      <MapPin size={14} className="text-primary group-hover/map:scale-110 transition-transform" />
                      <span className="underline decoration-primary/30 underline-offset-2 hover:decoration-primary/80">
                        {flag.latitude.toFixed(4)}, {flag.longitude.toFixed(4)}
                      </span>
                    </a>
                  ) : (
                    <>
                      <MapPin size={14} className="text-textLight/40" />
                      <span className="text-textLight/40">Location Unavailable</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/5">
                <span className="text-sm text-textLight/40 flex items-center gap-2">
                  <Video size={16} />
                  No video available
                </span>
                <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                  View Details
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

