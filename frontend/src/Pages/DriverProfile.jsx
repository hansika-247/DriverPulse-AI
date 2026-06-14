import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Mail, MapPin, Truck, ShieldCheck, Edit, BrainCircuit, AlertTriangle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { apiGetDriverProfile, apiPredictRisk } from '../api';
import DriverAssessmentForm from './DriverAssessmentForm';

const DriverProfile = () => {
  const { driver } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [showAssessment, setShowAssessment] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiGetDriverProfile(driver?.driverId || 'DRV0001');
        setProfile(data);
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [driver]);

  const handlePredict = async () => {
    if (profile?.needs_assessment) {
      setShowAssessment(true);
      return;
    }
    try {
      setPredicting(true);
      const res = await apiPredictRisk(profile?.driver_id || driver?.driverId || 'DRV0001');
      setPredictionResult(res);
    } catch (err) {
      console.error("Prediction failed", err);
      alert("Failed to predict risk.");
    } finally {
      setPredicting(false);
    }
  };

  const displayName = profile?.name || driver?.name || 'Driver';
  const initials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  if (loading) {
    return <div className="p-6 text-center text-textLight">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-bold"
        >
          Driver Profile
        </motion.h1>
        <motion.button 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl transition-colors font-medium"
        >
          <Edit size={18} />
          Edit Profile
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 rounded-2xl flex flex-col items-center text-center col-span-1"
        >
          <div className="relative mb-4">
            <div className="w-32 h-32 rounded-full border-4 border-cardDark bg-gradient-to-br from-primary to-blue-300 flex items-center justify-center text-white text-4xl font-bold shadow-xl overflow-hidden">
              {initials}
            </div>
            <div className="absolute bottom-0 right-2 bg-success text-white p-1.5 rounded-full border-2 border-cardDark">
              <ShieldCheck size={16} />
            </div>
          </div>
          <h2 className="text-2xl font-bold">{displayName}</h2>
          <p className="text-primary font-medium mb-1">ID: {profile?.driver_id || driver?.driverId}</p>
          <div className="inline-flex items-center gap-1.5 bg-success/10 text-success px-3 py-1 rounded-full text-sm font-medium mt-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            Active
          </div>

          {/* Predict Risk Button */}
          <button 
            onClick={handlePredict}
            disabled={predicting}
            className="mt-6 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg font-medium w-full justify-center disabled:opacity-50"
          >
            {predicting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
            ) : (
                <><BrainCircuit size={18} /> {profile?.needs_assessment ? "Generate Risk Assessment" : "Predict Risk"}</>
            )}
          </button>
        </motion.div>

        {/* Info Grid */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass p-5 rounded-2xl space-y-4"
          >
            <h3 className="text-lg font-semibold border-b border-white/10 pb-2 mb-4">Contact Information</h3>
            
            <div className="flex items-center gap-3 text-textLight/80">
              <Phone className="text-primary" size={20} />
              <span>{driver?.phone || '+1 (555) 123-4567'}</span>
            </div>
            <div className="flex items-center gap-3 text-textLight/80">
              <Mail className="text-primary" size={20} />
              <span>{driver?.email || 'alex.johnson@driverpulse.com'}</span>
            </div>
            <div className="flex items-center gap-3 text-textLight/80">
              <MapPin className="text-primary" size={20} />
              <span>San Francisco, CA</span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass p-5 rounded-2xl space-y-4"
          >
            <h3 className="text-lg font-semibold border-b border-white/10 pb-2 mb-4">Vehicle Information</h3>
            
            <div className="flex items-center gap-3 text-textLight/80">
              <Truck className="text-primary" size={20} />
              <div>
                <p className="font-medium text-textLight capitalize">{driver?.vehicleType || 'sedan'} Vehicle</p>
                <p className="text-sm">Driver Pulse Registered</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-textLight/80">
              <div className="w-5 flex justify-center text-primary font-bold">#</div>
              <span>License: <span className="text-textLight font-medium uppercase">{driver?.vehicleNumber || 'CA-9482X'}</span></span>
            </div>
            <div className="flex items-center gap-3 text-textLight/80">
              <ShieldCheck className="text-primary" size={20} />
              <span>Inspection valid until: <span className="text-success font-medium">Oct 2026</span></span>
            </div>
          </motion.div>
          
          {/* Driver Assessment Form */}
          {showAssessment && (
            <div className="col-span-1 sm:col-span-2">
              <DriverAssessmentForm 
                onAssessmentComplete={(res) => {
                  setShowAssessment(false);
                  setPredictionResult(res);
                  // Refresh profile to remove needs_assessment
                  apiGetDriverProfile(driver?.driverId).then(setProfile);
                }} 
              />
            </div>
          )}

          {/* Detailed Stats */}
          {profile && !profile.needs_assessment && (
             <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
             className="glass p-5 rounded-2xl space-y-4 col-span-1 sm:col-span-2"
           >
             <h3 className="text-lg font-semibold border-b border-white/10 pb-2 mb-4">Performance Statistics</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-xs text-textLight/60 mb-1">Daily Productivity</p>
                  <p className="text-xl font-bold text-success">₹{profile.daily_productivity}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-xs text-textLight/60 mb-1">Rating</p>
                  <p className="text-xl font-bold">{profile.rating} ⭐</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-xs text-textLight/60 mb-1">Total Flags</p>
                  <p className="text-xl font-bold text-warning">{profile.total_flags}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-xs text-textLight/60 mb-1">Risk Label</p>
                  <p className={`text-xl font-bold ${profile.risk_label === 'HIGH' ? 'text-danger' : profile.risk_label === 'MEDIUM' ? 'text-warning' : 'text-success'}`}>{profile.risk_label}</p>
                </div>
             </div>
           </motion.div>
          )}

          {/* Prediction Result Modal/Card */}
          {predictionResult && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass p-6 rounded-2xl col-span-1 sm:col-span-2 border border-blue-500/30 bg-gradient-to-br from-cardDark to-blue-900/20"
            >
              <div className="flex items-center gap-3 mb-4">
                <BrainCircuit className="text-blue-400 w-8 h-8" />
                <h3 className="text-xl font-bold">AI Risk Prediction</h3>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-3 bg-white/5 p-4 rounded-xl">
                  <div className="flex justify-between items-center">
                     <span className="text-textLight/70">Predicted Risk Level</span>
                     <span className={`font-bold px-3 py-1 rounded-full text-sm ${predictionResult.risk_level === 'HIGH' ? 'bg-danger/20 text-danger' : predictionResult.risk_level === 'MEDIUM' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                       {predictionResult.risk_level}
                     </span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-textLight/70">Confidence Score</span>
                     <span className="font-bold text-white">{(predictionResult.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
                
                <div className="flex-1 space-y-2 bg-white/5 p-4 rounded-xl">
                  <h4 className="text-sm font-semibold text-textLight/80 border-b border-white/10 pb-1 mb-2">Top Contributing Features</h4>
                  {predictionResult.top_features.map((feat, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-textLight/60 capitalize">{feat.feature.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${feat.importance * 100}%` }}></div>
                        </div>
                        <span className="text-xs text-textLight/50 w-8 text-right">{(feat.importance * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DriverProfile;
