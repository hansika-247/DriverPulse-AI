import React from 'react';
import { motion } from 'framer-motion';
import { Car, MapPin, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

const dummyTrips = [
  { id: 'TRP-1042', date: 'Today, 10:24 AM', route: 'Downtown -> Airport', duration: '42 min', status: 'Completed', score: 98, flags: 0 },
  { id: 'TRP-1041', date: 'Today, 08:15 AM', route: 'Airport -> City Center', duration: '55 min', status: 'Completed', score: 85, flags: 2 },
  { id: 'TRP-1040', date: 'Yesterday, 04:30 PM', route: 'Suburbs -> Downtown', duration: '1h 12m', status: 'Completed', score: 92, flags: 1 },
  { id: 'TRP-1039', date: 'Yesterday, 01:00 PM', route: 'City Center -> North Hills', duration: '35 min', status: 'Completed', score: 100, flags: 0 },
  { id: 'TRP-1038', date: 'Mon, 09:00 AM', route: 'North Hills -> Industrial Park', duration: '48 min', status: 'Completed', score: 78, flags: 4 },
];

const TripSummary = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-bold"
        >
          Trip Summary
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
              {dummyTrips.map((trip, index) => (
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
                        <p className="font-medium">{trip.id}</p>
                        <p className="text-sm text-textLight/60">{trip.date}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-textLight/80">
                      <MapPin size={16} className="text-primary" />
                      {trip.route}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-textLight/80">
                      <Clock size={16} />
                      {trip.duration}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <ShieldCheck size={18} className={trip.score >= 90 ? 'text-success' : trip.score >= 80 ? 'text-warning' : 'text-danger'} />
                      {trip.score}
                    </div>
                  </td>
                  <td className="p-4">
                    {trip.flags > 0 ? (
                      <div className="inline-flex items-center gap-1.5 bg-warning/10 text-warning px-2.5 py-1 rounded-full text-sm font-medium">
                        <AlertTriangle size={14} />
                        {trip.flags} Flags
                      </div>
                    ) : (
                      <span className="text-textLight/50 text-sm">No flags</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="inline-flex items-center gap-1.5 bg-success/10 text-success px-2.5 py-1 rounded-full text-sm font-medium">
                      {trip.status}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TripSummary;
