import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Navigation, Play, Pause, RotateCcw, ThumbsUp, ThumbsDown, CircleSlash } from 'lucide-react';
import { apiGetTrips, apiGetFlags, apiPostFeedback, apiGetFeedbackStats, apiGetTripFeedback, apiExplainIncident } from '../api';
import { useLanguage } from '../LanguageContext';

const getMarkerColor = (type) => {
  const t = type?.toLowerCase() || '';
  if (t.includes('braking')) return '#EF4444'; // Red
  if (t.includes('distract')) return '#F97316'; // Orange
  if (t.includes('phone')) return '#3B82F6'; // Blue
  if (t.includes('noise')) return '#A855F7'; // Purple
  if (t.includes('speed')) return '#EAB308'; // Yellow
  return '#6B7280'; // Gray
};

const createCustomIcon = (color, isActive = false) => {
  return L.divIcon({
    className: 'custom-flag-marker',
    html: `<div style="
      background-color: ${color}; 
      width: ${isActive ? 24 : 16}px; 
      height: ${isActive ? 24 : 16}px; 
      border-radius: 50%; 
      border: ${isActive ? 4 : 2}px solid white; 
      box-shadow: 0 0 ${isActive ? 20 : 10}px ${color}, inset 0 0 ${isActive ? 10 : 5}px white; 
      animation: ${isActive ? 'pulse-glow 1.5s infinite' : 'none'};
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    "></div>
    <style>
      @keyframes pulse-glow {
        0% { box-shadow: 0 0 10px ${color}, 0 0 0 0 rgba(${color}, 0.7); }
        70% { box-shadow: 0 0 20px ${color}, 0 0 0 15px rgba(255, 255, 255, 0); }
        100% { box-shadow: 0 0 10px ${color}, 0 0 0 0 rgba(255, 255, 255, 0); }
      }
    </style>`,
    iconSize: isActive ? [24, 24] : [16, 16],
    iconAnchor: isActive ? [12, 12] : [8, 8],
    popupAnchor: [0, isActive ? -12 : -8],
  });
};

const createEndpointIcon = (color) => {
  return L.divIcon({
    className: 'endpoint-marker',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

const createVehicleIcon = (rotation) => L.divIcon({
  className: 'vehicle-marker',
  html: `
    <div style="
      transform: rotate(${rotation}deg); 
      transform-origin: center; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      width: 40px; 
      height: 40px; 
      filter: drop-shadow(0 0 15px #00f0ff);
      transition: transform 0.1s linear;
    ">
      <div style="
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(0,240,255,0.4) 0%, transparent 70%);
        z-index: -1;
      "></div>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="#00f0ff" stroke="white" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">
        <polygon points="12,2 22,20 12,17 2,20" />
      </svg>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const startIcon = createEndpointIcon('#10B981'); // Green
const endIcon = createEndpointIcon('#EF4444');   // Red

// Component to fit map to polyline
const MapEffect = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
};

// Component to center map on active event
const MapController = ({ activeFlagId, flags }) => {
  const map = useMap();
  useEffect(() => {
    if (activeFlagId) {
      const flag = flags.find(f => f.id === activeFlagId);
      if (flag && flag.latitude && flag.longitude) {
        map.flyTo([flag.latitude, flag.longitude], 15, { animate: true, duration: 1.5 });
      }
    }
  }, [activeFlagId, flags, map]);
  return null;
};

const RouteAnalytics = () => {
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t, selectedLanguage } = useLanguage();

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [activeFlagId, setActiveFlagId] = useState(null);
  
  // Feedback state
  const [stats, setStats] = useState({ correct: 0, incorrect: 0, notRelevant: 0, total: 0 });
  const [tripFeedbackMap, setTripFeedbackMap] = useState({}); // flagId -> feedbackType

  // Explainability state
  const [explanation, setExplanation] = useState(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const markerRefs = useRef({});
  const lastProgress = useRef(0);
  const lastRotation = useRef(0);

  const fetchStats = async () => {
    try {
      const res = await apiGetFeedbackStats(true); // Get global stats
      if (res?.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch feedback stats", err);
    }
  };

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const res = await apiGetTrips();
        const tripData = res?.data?.trips || res?.trips || res || [];
        setTrips(tripData);
        if (tripData.length > 0) {
          setSelectedTripId(tripData[0].id);
        }
      } catch (err) {
        console.error("Failed to load trips", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
    fetchStats();
  }, []);

  useEffect(() => {
    if (!selectedTripId) return;
    const fetchFlagsAndFeedback = async () => {
      try {
        const [flagsRes, feedbackRes] = await Promise.all([
          apiGetFlags({ tripId: selectedTripId }),
          apiGetTripFeedback(selectedTripId)
        ]);
        setFlags(flagsRes?.data?.flags || flagsRes?.flags || []);
        
        const feedbackData = feedbackRes?.data?.feedback || [];
        const fMap = {};
        feedbackData.forEach(f => {
          fMap[f.flagId] = f.feedbackType;
        });
        setTripFeedbackMap(fMap);
      } catch (err) {
        console.error("Failed to fetch flags or feedback for trip", err);
      }
    };
    fetchFlagsAndFeedback();
    
    // Reset playback
    setProgress(0);
    setIsPlaying(false);
    setActiveFlagId(null);
    setExplanation(null);
    lastProgress.current = 0;
  }, [selectedTripId]);

  const selectedTrip = trips.find(t => t.id === selectedTripId);

  const positions = useMemo(() => {
    if (!selectedTrip?.routeCoordinates) return [];
    try {
      const coords = typeof selectedTrip.routeCoordinates === 'string' 
        ? JSON.parse(selectedTrip.routeCoordinates) 
        : selectedTrip.routeCoordinates;
      return coords.map(c => [c[1], c[0]]); // [lat, lng]
    } catch (e) {
      return [];
    }
  }, [selectedTrip]);

  const routeSegments = useMemo(() => {
    if (positions.length < 2) return { segments: [], stats: { safe: 0, moderate: 0, high: 0 } };
    
    let safeCount = 0;
    let moderateCount = 0;
    let highCount = 0;

    const getDist = (p1, p2) => Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
    const segments = [];
    
    for (let i = 0; i < positions.length - 1; i++) {
      const p1 = positions[i];
      const p2 = positions[i + 1];
      const segmentMidpoint = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
      
      let maxRisk = 'SAFE';
      
      flags.forEach(flag => {
        if (!flag.latitude || !flag.longitude) return;
        const dist = getDist(segmentMidpoint, [flag.latitude, flag.longitude]);
        // ~0.005 degrees is roughly 500m
        if (dist < 0.005) {
          if (flag.severity === 'HIGH') {
            maxRisk = 'HIGH';
          } else if (flag.severity === 'MEDIUM' && maxRisk !== 'HIGH') {
            maxRisk = 'MODERATE';
          } else if (flag.severity === 'LOW' && maxRisk === 'SAFE') {
            maxRisk = 'MODERATE';
          }
        }
      });
      
      let color = '#10B981'; // Green
      if (maxRisk === 'HIGH') { color = '#EF4444'; highCount++; }
      else if (maxRisk === 'MODERATE') { color = '#EAB308'; moderateCount++; }
      else { safeCount++; }
      
      segments.push({
        id: `seg-${i}`,
        positions: [p1, p2],
        color,
        risk: maxRisk
      });
    }
    
    const total = segments.length || 1;
    return {
      segments,
      stats: {
        safe: Math.round((safeCount / total) * 100),
        moderate: Math.round((moderateCount / total) * 100),
        high: Math.round((highCount / total) * 100)
      }
    };
  }, [positions, flags]);

  const startTimeMs = selectedTrip?.startTime ? new Date(selectedTrip.startTime).getTime() : 0;
  const endTimeMs = selectedTrip?.endTime ? new Date(selectedTrip.endTime).getTime() : 0;
  const currentTimeMs = startTimeMs + (endTimeMs - startTimeMs) * progress;

  // Playback loop
  useEffect(() => {
    if (!isPlaying || !selectedTrip || positions.length === 0) return;

    const baseDurationMs = 15000; // 15s real-time for 1x playback
    const tickMs = 50;
    
    const interval = setInterval(() => {
      setProgress(p => {
        const increment = (tickMs / baseDurationMs) * playbackSpeed;
        const nextP = p + increment;
        if (nextP >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return nextP;
      });
    }, tickMs);
    
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, selectedTrip, positions]);

  // Sync flags with progress
  useEffect(() => {
    const prevProgress = lastProgress.current;
    
    if (isPlaying && progress > prevProgress && endTimeMs > startTimeMs) {
       const triggeredFlag = flags.find(f => {
          const t = new Date(f.timestamp).getTime();
          const fp = (t - startTimeMs) / (endTimeMs - startTimeMs);
          return fp >= prevProgress && fp <= progress;
       });
       
       if (triggeredFlag && triggeredFlag.id !== activeFlagId) {
          setActiveFlagId(triggeredFlag.id);
          const marker = markerRefs.current[triggeredFlag.id];
          if (marker) marker.openPopup();
       }
    }
    
    lastProgress.current = progress;
  }, [progress, isPlaying, flags, startTimeMs, endTimeMs, activeFlagId]);

  // Fetch explainability when active flag changes
  useEffect(() => {
    if (!activeFlagId) {
      setExplanation(null);
      return;
    }
    const flag = flags.find(f => f.id === activeFlagId);
    if (!flag) return;

    const getExplanation = async () => {
      setIsExplaining(true);
      try {
        const res = await apiExplainIncident({
          flagType: flag.flagType,
          severity: flag.severity,
          combinedScore: flag.combinedScore,
          latitude: flag.latitude,
          longitude: flag.longitude
        }, selectedLanguage);
        setExplanation(res);
      } catch (err) {
        console.error("Failed to explain incident", err);
        setExplanation(null);
      } finally {
        setIsExplaining(false);
      }
    };
    getExplanation();
  }, [activeFlagId, flags]);

  // Calculate Vehicle position & rotation
  const vehicleState = useMemo(() => {
    if (positions.length === 0) return null;
    if (positions.length === 1) return { pos: positions[0], rot: 0 };
    
    const exactIndex = progress * (positions.length - 1);
    const floorIdx = Math.floor(exactIndex);
    const ceilIdx = Math.ceil(exactIndex);
    
    let pos, rot;
    if (floorIdx === ceilIdx) {
      pos = positions[floorIdx];
      rot = lastRotation.current;
    } else {
      const fraction = exactIndex - floorIdx;
      const p1 = positions[floorIdx];
      const p2 = positions[ceilIdx];
      pos = [
        p1[0] + (p2[0] - p1[0]) * fraction,
        p1[1] + (p2[1] - p1[1]) * fraction
      ];
      
      const dLat = p2[0] - p1[0];
      const dLng = p2[1] - p1[1];
      rot = Math.atan2(dLng, dLat) * (180 / Math.PI);
      lastRotation.current = rot;
    }
    
    return { pos, rot };
  }, [positions, progress]);

  const formatTime = (ms) => {
    if (!ms) return '--:--';
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleFeedback = async (e, flagId, type) => {
    if (e) e.stopPropagation();
    try {
      // Optimistic update
      setTripFeedbackMap(prev => ({ ...prev, [flagId]: type }));
      await apiPostFeedback({ tripId: selectedTripId, flagId, feedbackType: type });
      await fetchStats();
    } catch (err) {
      console.error("Failed to submit feedback", err);
    }
  };

  const renderFeedbackButtons = (flagId) => {
    const currentFeedback = tripFeedbackMap[flagId];
    return (
      <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
        <button 
          onClick={(e) => handleFeedback(e, flagId, 'CORRECT')}
          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${currentFeedback === 'CORRECT' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-white/5 hover:bg-white/10 text-textLight/70'}`}
        >
          👍 Correct
        </button>
        <button 
          onClick={(e) => handleFeedback(e, flagId, 'INCORRECT')}
          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${currentFeedback === 'INCORRECT' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-white/5 hover:bg-white/10 text-textLight/70'}`}
        >
          👎 Incorrect
        </button>
        <button 
          onClick={(e) => handleFeedback(e, flagId, 'NOT_RELEVANT')}
          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${currentFeedback === 'NOT_RELEVANT' ? 'bg-gray-500/20 text-gray-400 border border-gray-500/50' : 'bg-white/5 hover:bg-white/10 text-textLight/70'}`}
        >
          ⭕ Not Relevant
        </button>
      </div>
    );
  };

  if (loading) {
    return <div className="p-6 text-center text-textLight animate-pulse">Loading Route Data...</div>;
  }

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <motion.h1 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-3xl font-bold flex-shrink-0"
      >
        {t('Route Analytics')}
      </motion.h1>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Sidebar Controls */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 glass-panel rounded-2xl p-5 flex flex-col overflow-y-auto custom-scrollbar border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
        >
          <h3 className="text-lg font-bold tracking-tight mb-4 text-white">Trip Details</h3>
          
          <div className="space-y-4 mb-6">
            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <p className="text-xs text-textLight/60 mb-1">Select Route</p>
              <select 
                className="w-full bg-transparent border-none text-sm focus:outline-none cursor-pointer font-medium"
                value={selectedTripId}
                onChange={e => setSelectedTripId(e.target.value)}
              >
                {trips.length === 0 && <option value="" disabled>No trips available</option>}
                {trips.map(t => (
                  <option key={t.id} value={t.id} className="bg-gray-900 text-white">
                    {t.route || t.id.split('-')[0]} ({new Date(t.startTime).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
            
            {selectedTrip && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-xs text-textLight/60 mb-1">Distance</p>
                  <p className="font-semibold">{selectedTrip.distance ? `${selectedTrip.distance.toFixed(1)} km` : 'N/A'}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-xs text-textLight/60 mb-1">Duration</p>
                  <p className="font-semibold">
                    {selectedTrip.endTime && selectedTrip.startTime 
                      ? `${Math.round((new Date(selectedTrip.endTime) - new Date(selectedTrip.startTime)) / 60000)} min`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <h3 className="text-lg font-semibold mb-4">Route Risk Profile</h3>
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6">
            <p className="text-xs text-textLight/70 mb-3">
              Route risk is mapped using nearby incidents, behavior context, and motion scores.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#10B981]"></div> Safe</span>
                <span className="font-bold text-[#10B981]">{routeSegments.stats.safe}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#10B981]" style={{ width: `${routeSegments.stats.safe}%` }}></div>
              </div>
              
              <div className="flex justify-between items-center text-sm pt-1">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#EAB308]"></div> Moderate</span>
                <span className="font-bold text-[#EAB308]">{routeSegments.stats.moderate}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#EAB308]" style={{ width: `${routeSegments.stats.moderate}%` }}></div>
              </div>

              <div className="flex justify-between items-center text-sm pt-1">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#EF4444]"></div> High Risk</span>
                <span className="font-bold text-[#EF4444]">{routeSegments.stats.high}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#EF4444]" style={{ width: `${routeSegments.stats.high}%` }}></div>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-4">Model Validation</h3>
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6">
            <p className="text-xs text-textLight/70 mb-3">
              Driver feedback continuously improves our event detection quality.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Correct</span>
                <span className="font-bold">{stats.correct}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${stats.correct}%` }}></div>
              </div>
              
              <div className="flex justify-between items-center text-sm pt-1">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Incorrect</span>
                <span className="font-bold">{stats.incorrect}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: `${stats.incorrect}%` }}></div>
              </div>

              <div className="flex justify-between items-center text-sm pt-1">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-400"></div> Not Relevant</span>
                <span className="font-bold">{stats.notRelevant}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gray-400" style={{ width: `${stats.notRelevant}%` }}></div>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-4">Route Playback</h3>
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6 flex-shrink-0">
            <div className="flex justify-between items-center text-xs font-medium text-textLight/70 mb-2">
              <span>{formatTime(startTimeMs)}</span>
              <span className="text-primary font-bold">{formatTime(currentTimeMs)}</span>
              <span>{formatTime(endTimeMs)}</span>
            </div>
            
            <div className="relative w-full h-2 bg-black/40 rounded-full mb-4 overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-primary" 
                style={{ width: `${progress * 100}%` }}
              />
              <input 
                type="range" 
                min="0" max="1" step="0.001" 
                value={progress}
                onChange={e => {
                  setProgress(parseFloat(e.target.value));
                  setActiveFlagId(null);
                }}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex justify-between items-center text-xs text-textLight/50 mb-3">
              <span>Progress</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button 
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  onClick={() => {
                     if (progress >= 1) setProgress(0);
                     setIsPlaying(!isPlaying);
                  }}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-1" />}
                </button>
                <button 
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  onClick={() => {
                    setProgress(0);
                    setIsPlaying(true);
                  }}
                  title="Replay"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
              
              <div className="flex gap-1 bg-black/40 rounded-full p-1 border border-white/5">
                {[1, 2, 4].map(s => (
                  <button 
                    key={s}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${playbackSpeed === s ? 'bg-primary text-white' : 'text-textLight/70 hover:bg-white/10'}`}
                    onClick={() => setPlaybackSpeed(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeFlagId && (
            <>
              <h3 className="text-lg font-semibold mb-4">Explainability Panel</h3>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6">
                {isExplaining ? (
                  <p className="text-sm text-textLight/70 animate-pulse">Analyzing incident data...</p>
                ) : explanation ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-textLight/60 mb-1">Why was this detected?</p>
                      <p className="text-sm font-medium text-white">{explanation.primary_reason}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-textLight/60">Confidence:</p>
                      <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${explanation.confidence >= 90 ? 'bg-green-500/20 text-green-400' : explanation.confidence >= 75 ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>
                        {explanation.confidence}%
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-textLight/60 mb-2">Contributing Factors:</p>
                      <div className="flex flex-wrap gap-2">
                        {explanation.contributing_factors.map((factor, idx) => (
                          <span key={idx} className="bg-black/40 border border-white/10 px-2 py-1 rounded text-xs text-textLight/80">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-textLight/70">No explanation available.</p>
                )}
              </div>
            </>
          )}

          <h3 className="text-lg font-semibold mb-4 flex-shrink-0">Events on Route</h3>
          <div className="space-y-3 h-[400px] flex-shrink-0 overflow-y-auto custom-scrollbar scroll-smooth pr-2 pb-4">
            {flags.length === 0 && (
              <p className="text-sm text-textLight/60 text-center mt-4">No events recorded for this trip.</p>
            )}
            {flags.map((flag) => {
              const color = getMarkerColor(flag.flagType);
              const isActive = flag.id === activeFlagId;
              return (
                <div 
                  key={flag.id} 
                  className={`flex flex-col p-4 rounded-xl border transition-all cursor-pointer ${isActive ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-[1.02]' : 'bg-white/5 border-white/5 hover:border-primary/50'}`}
                  onClick={() => {
                    setActiveFlagId(flag.id);
                    const marker = markerRefs.current[flag.id];
                    if (marker) marker.openPopup();
                  }}
                >
                  <div className="flex gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-inner border border-white/10"
                      style={{ backgroundColor: `${color}20`, color: color }}
                    >
                      <MapPin size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-bold capitalize text-white">{flag.flagType.replace(/_/g, ' ')}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          flag.severity === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                          flag.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 
                          'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                          {flag.severity}
                        </span>
                      </div>
                      <p className="text-xs text-textLight/60 mb-2">{new Date(flag.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                      
                      <div className="flex flex-col gap-1 mt-1">
                        {flag.combinedScore !== undefined && (
                          <p className="text-xs text-textLight/80">
                            Confidence: <span className="font-semibold text-white">{Math.round(flag.combinedScore * 100)}%</span>
                          </p>
                        )}
                        {(flag.latitude && flag.longitude) && (
                          <p className="text-[10px] text-textLight/50 font-mono bg-black/20 p-1 rounded inline-block w-fit">
                            {flag.latitude.toFixed(4)}, {flag.longitude.toFixed(4)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {renderFeedbackButtons(flag.id)}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Map Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 glass rounded-2xl relative overflow-hidden bg-bgDark border border-white/10 w-full h-full min-h-[400px]"
        >
          {positions.length > 0 ? (
            <MapContainer 
              center={positions[0]} 
              zoom={13} 
              style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <MapEffect positions={positions} />
              <MapController activeFlagId={activeFlagId} flags={flags} />
              
              {/* Render Segmented Heatmap Overlay with Glow Effect */}
              {routeSegments.segments.map(seg => (
                <React.Fragment key={seg.id}>
                  {/* Outer Glow */}
                  <Polyline 
                    positions={seg.positions} 
                    color={seg.color} 
                    weight={15} 
                    opacity={0.15} 
                  />
                  {/* Inner Line */}
                  <Polyline 
                    positions={seg.positions} 
                    color={seg.color} 
                    weight={4} 
                    opacity={1} 
                  />
                </React.Fragment>
              ))}
              
              {/* Endpoint Markers */}
              <Marker position={positions[0]} icon={startIcon}>
                <Popup className="text-black">Start Point</Popup>
              </Marker>
              <Marker position={positions[positions.length - 1]} icon={endIcon}>
                <Popup className="text-black">End Point</Popup>
              </Marker>

              {/* Event Markers */}
              {flags.filter(f => f.latitude && f.longitude).map(flag => (
                <Marker 
                  key={flag.id} 
                  position={[flag.latitude, flag.longitude]} 
                  icon={createCustomIcon(getMarkerColor(flag.flagType), flag.id === activeFlagId)}
                  ref={(r) => { if (r) markerRefs.current[flag.id] = r; }}
                >
                  <Popup className="custom-popup">
                    <div className="font-sans text-gray-800">
                      <p className="font-bold text-sm mb-1 capitalize text-black">{flag.flagType.replace(/_/g, ' ')}</p>
                      <p className="text-xs mb-1">Time: {new Date(flag.timestamp).toLocaleString()}</p>
                      <p className="text-xs font-semibold mb-1">Severity: <span className="text-red-500">{flag.severity}</span></p>
                      <p className="text-xs text-gray-500 mb-2">Coord: {flag.latitude.toFixed(4)}, {flag.longitude.toFixed(4)}</p>
                      
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <p className="text-[10px] text-gray-500 mb-1 font-semibold uppercase">Feedback</p>
                        <div className="flex gap-1">
                          <button 
                            onClick={(e) => handleFeedback(e, flag.id, 'CORRECT')}
                            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${tripFeedbackMap[flag.id] === 'CORRECT' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                          >
                            👍 Correct
                          </button>
                          <button 
                            onClick={(e) => handleFeedback(e, flag.id, 'INCORRECT')}
                            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${tripFeedbackMap[flag.id] === 'INCORRECT' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                          >
                            👎 Incorrect
                          </button>
                          <button 
                            onClick={(e) => handleFeedback(e, flag.id, 'NOT_RELEVANT')}
                            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${tripFeedbackMap[flag.id] === 'NOT_RELEVANT' ? 'bg-gray-200 text-gray-800 border border-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                          >
                            ⭕ Not Relevant
                          </button>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Vehicle Marker */}
              {vehicleState && (
                <Marker 
                  position={vehicleState.pos} 
                  icon={createVehicleIcon(vehicleState.rot)}
                  zIndexOffset={1000}
                />
              )}
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full w-full">
              <div className="text-center p-8">
                <Navigation className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
                <p>No route data available for the selected trip.</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default RouteAnalytics;
