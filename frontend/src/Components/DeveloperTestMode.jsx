import React, { useState, useEffect } from 'react';
import { apiTestLogin } from '../api';
import { useAuth } from '../AuthContext';

const DeveloperTestMode = () => {
  const [expanded, setExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    const isDev = import.meta.env.MODE === 'development' || import.meta.env.DEV;
    const isAdmin = localStorage.getItem('adminMode') === 'true';
    if (isDev || isAdmin) {
      setIsVisible(true);
    }
  }, []);

  const handleDisable = () => {
    localStorage.setItem('adminMode', 'false');
    setIsVisible(false);
  };

  const handleDriverSelect = async (e) => {
    const driverId = e.target.value;
    if (!driverId) return;
    try {
      const res = await apiTestLogin(driverId);
      if (res.success) {
        login(res.data.token, res.data.driver);
        // Force reload to refresh dashboard, trips, flags, etc.
        window.location.reload();
      }
    } catch (err) {
      console.error('Test login failed', err);
      alert('Failed to load test driver: ' + (err.message || 'Unknown error'));
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-red-500/10 border border-red-500 rounded-lg mb-6 overflow-hidden relative">
       {/* Badge */}
       <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">DEV</div>
       
       <div 
         className="p-3 cursor-pointer flex justify-between items-center bg-red-500/5 hover:bg-red-500/10 transition-colors"
         onClick={() => setExpanded(!expanded)}
       >
         <h2 className="text-red-500 font-bold flex items-center gap-2">
           Developer Tools {expanded ? '▲' : '▼'}
         </h2>
       </div>

       {expanded && (
         <div className="p-4 border-t border-red-500/20 flex flex-col gap-4">
           <div>
             <label className="block text-sm font-medium text-red-400 mb-2">Select Dataset Driver</label>
             <select 
               className="p-2 rounded bg-black/40 border border-red-500/50 text-white w-full max-w-md focus:outline-none focus:ring-2 focus:ring-red-500/50"
               onChange={handleDriverSelect}
               defaultValue=""
             >
               <option value="" disabled>-- Choose Driver --</option>
               <option value="DRV0001">DRV0001</option>
               <option value="DRV0050">DRV0050</option>
               <option value="DRV0100">DRV0100</option>
               <option value="DRV0200">DRV0200</option>
               <option value="DRV0500">DRV0500</option>
             </select>
           </div>
           
           <div className="flex items-center gap-2 mt-2 pt-4 border-t border-red-500/20">
             <input 
               type="checkbox" 
               id="devModeToggle" 
               checked={true} 
               onChange={handleDisable}
               className="accent-red-500 w-4 h-4 cursor-pointer"
             />
             <label htmlFor="devModeToggle" className="text-sm text-red-400 cursor-pointer font-medium">Enable Developer Mode</label>
           </div>
         </div>
       )}
    </div>
  );
};

export default DeveloperTestMode;
