import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Car, MapPin, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { apiGetTrips } from '../api';
import { useAuth } from '../AuthContext';
import { useLanguage } from '../LanguageContext';

const TripSummary = () => {
  const { driver } = useAuth();
  const { t } = useLanguage();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (driver?.driverId) {
      console.log('DriverId used:', driver.driverId);
      apiGetTrips()
        .then((res) => {
          const fetchedTrips = res?.data?.trips || res?.trips || res || [];
          console.log(`Number of trips returned: ${fetchedTrips.length}`);
          if (fetchedTrips.length > 0) {
            console.log('First trip object:', fetchedTrips[0]);
          }
          setTrips(fetchedTrips);
        })
        .catch((err) => {
          console.error('Error fetching trips:', err);
          setTrips([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [driver?.driverId]);

  const calculateDuration = (start, end) => {
    if (!end) return 'In Progress';
    const ms = new Date(end) - new Date(start);
    if (ms < 0) return 'Unknown';
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins % 60}m`;
    }
    return `${mins} min`;
  };

  const getScore = (trip) => {
      const baseScore = 100;
      const flagsCount = trip.flags?.length || 0;
      return Math.max(0, baseScore - (flagsCount * 5));
  };

  if (loading) {
      return <div className="animate-pulse space-y-6"><div className="h-10 w-48 bg-white/5 rounded-lg"></div><div className="h-64 bg-white/5 rounded-2xl w-full"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-bold"
        >
          {t('Trip Summary')}
        </motion.h1>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-textLight/70">
                <th className="p-4 font-medium">Trip ID & Date</th>
                <th className="p-4 font-medium">Route</th>
                <th className="p-4 font-medium">Duration</th>
                <th className="p-4 font-medium">Safety Score</th>
                <th className="p-4 font-medium">Flags</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {trips.length > 0 ? trips.map((trip, index) => {
                const tripFlagsCount = trip.flags?.length || 0;
                const tripScore = getScore(trip);
                return (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={trip.id} 
                  className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <Car size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">TRP-{trip.id.substring(0, 6).toUpperCase()}</p>
                        <p className="text-xs text-textLight/60">{new Date(trip.startTime).toLocaleString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-2 text-textLight/80">
                      <MapPin size={16} className="text-primary flex-shrink-0" />
                      {trip.route || 'N/A'}
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-2 text-textLight/80">
                      <Clock size={16} />
                      {calculateDuration(trip.startTime, trip.endTime)}
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <ShieldCheck size={18} className={tripScore >= 90 ? 'text-success' : tripScore >= 80 ? 'text-warning' : 'text-danger'} />
                      {tripScore}
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    {tripFlagsCount > 0 ? (
                      <div className="inline-flex items-center gap-1.5 bg-warning/10 text-warning px-2.5 py-1 rounded-full font-medium">
                        <AlertTriangle size={14} />
                        {tripFlagsCount} Flags
                      </div>
                    ) : (
                      <span className="text-textLight/50">No flags</span>
                    )}
                  </td>
                  <td className="p-4 text-sm">
                    <div className="inline-flex items-center gap-1.5 bg-success/10 text-success px-2.5 py-1 rounded-full font-medium">
                      {trip.status}
                    </div>
                  </td>
                </motion.tr>
              )}) : (
                <tr>
                    <td colSpan="6" className="p-8 text-center text-textLight/60 text-sm">
                        No trips found for this driver.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TripSummary;
