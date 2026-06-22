import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bell, Palette, Shield, ChevronRight, Check } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { apiGetDriverProfile, apiUpdateProfile } from '../api';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../AuthContext';
import LanguageSelector from '../Components/LanguageSelector';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const { driver } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    driverId: ''
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiGetDriverProfile(driver?.driverId || 'DRV0001');
        setFormData({
          name: data?.name || driver?.name || '',
          email: data?.email || driver?.email || '',
          phone: data?.phone || driver?.phone || '',
          driverId: data?.driver_id || driver?.driverId || ''
        });
      } catch (err) {
        console.error('Failed to fetch profile', err);
        // Fallback to auth driver data if ML profile fetch fails
        setFormData({
          name: driver?.name || '',
          email: driver?.email || '',
          phone: driver?.phone || '',
          driverId: driver?.driverId || ''
        });
      } finally {
        setLoading(false);
      }
    };
    if (driver) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [driver]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiUpdateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      });
      alert('Changes saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const navItems = [
    { id: 'profile', name: t('Profile'), icon: User },
    { id: 'notifications', name: t('Notifications'), icon: Bell },
    { id: 'appearance', name: t('Appearance'), icon: Palette },
    { id: 'security', name: t('Security'), icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.h1 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-3xl font-bold"
      >
        {t('Settings')}
      </motion.h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Settings Navigation */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-1 space-y-2"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-medium border-l-4 border-primary' 
                    : 'text-textLight/70 hover:bg-white/5 hover:text-textLight'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} />
                  {item.name}
                </div>
                {isActive && <ChevronRight size={16} />}
              </button>
            );
          })}
        </motion.div>

        {/* Settings Content Area */}
        <div className="md:col-span-3">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="glass rounded-2xl p-6"
              >
                <h2 className="text-xl font-semibold mb-6 border-b border-white/10 pb-4">Profile Settings</h2>
                
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-blue-400 p-1 flex items-center justify-center overflow-hidden">
                      <div className="w-full h-full rounded-full bg-cardDark flex items-center justify-center text-2xl font-bold text-white uppercase">
                        {formData.name ? formData.name.charAt(0) : 'U'}
                      </div>
                    </div>
                    <div>
                      <button type="button" className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-medium transition-colors mb-2">
                        {t('Change Photo')}
                      </button>
                      <p className="text-xs text-textLight/50">JPG, GIF or PNG. Max size 2MB.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm text-textLight/70">{t('Full Name')}</label>
                      <input 
                        type="text" 
                        name="name"
                        value={formData.name} 
                        onChange={handleChange}
                        className="w-full bg-bgDark border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm text-textLight/70">{t('Driver ID')}</label>
                      <input 
                        type="text" 
                        value={formData.driverId} 
                        disabled 
                        className="w-full bg-bgDark/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-textLight/50 cursor-not-allowed" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm text-textLight/70">{t('Email Address')}</label>
                      <input 
                        type="email" 
                        name="email"
                        value={formData.email} 
                        onChange={handleChange}
                        className="w-full bg-bgDark border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm text-textLight/70">{t('Phone Number')}</label>
                      <input 
                        type="tel" 
                        name="phone"
                        value={formData.phone} 
                        onChange={handleChange}
                        className="w-full bg-bgDark border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors" 
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10 flex justify-end gap-3">
                    <button type="button" className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors">
                      {t('Cancel')}
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSaving}
                      className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isSaving ? t('Saving...') : t('Save Changes')}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'appearance' && (
              <motion.div 
                key="appearance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="glass rounded-2xl p-6"
              >
                <h2 className="text-xl font-semibold mb-6 border-b border-white/10 pb-4">Appearance Settings</h2>
                
                <div className="space-y-6">
                  <div className="mb-6 pb-6 border-b border-white/10">
                    <h3 className="text-lg font-medium mb-4">{t('Language')}</h3>
                    <div className="max-w-xs">
                      <LanguageSelector />
                    </div>
                  </div>

                  <p className="text-sm text-textLight/70">
                    Customize your interface appearance. Choose between the classic Pulse SaaS dark mode or the light Uber Driver Dashboard design.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    
                    {/* Light Theme Card */}
                    <div 
                      onClick={() => setTheme('light')}
                      className={`relative overflow-hidden rounded-2xl border-2 cursor-pointer transition-all duration-300 p-4 ${
                        theme === 'light' 
                          ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Uber style mini preview */}
                      <div className="h-24 bg-[#F8FAFC] rounded-xl border border-gray-200 p-3 mb-4 flex flex-col justify-between shadow-inner">
                        <div className="flex gap-2 items-center">
                          <div className="w-5 h-5 rounded-full bg-[#000000] flex items-center justify-center text-[10px] text-white">
                            DP
                          </div>
                          <div className="w-12 h-2.5 bg-gray-300 rounded" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="h-6 bg-white rounded border border-gray-100 flex flex-col justify-center px-1">
                            <div className="w-4 h-1 bg-gray-300 rounded mb-1" />
                            <div className="w-6 h-1.5 bg-[#06C167] rounded" />
                          </div>
                          <div className="h-6 bg-white rounded border border-gray-100 flex flex-col justify-center px-1">
                            <div className="w-5 h-1 bg-gray-300 rounded mb-1" />
                            <div className="w-4 h-1.5 bg-[#000000] rounded" />
                          </div>
                          <div className="h-6 bg-white rounded border border-gray-100" />
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-textLight">Uber Light Theme</p>
                          <p className="text-xs text-textLight/50">Clean, stark, high contrast</p>
                        </div>
                        {theme === 'light' && (
                          <div className="w-6 h-6 rounded-full bg-[#06C167] flex items-center justify-center text-white">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dark Theme Card */}
                    <div 
                      onClick={() => setTheme('dark')}
                      className={`relative overflow-hidden rounded-2xl border-2 cursor-pointer transition-all duration-300 p-4 ${
                        theme === 'dark' 
                          ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]' 
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Dark SaaS style mini preview */}
                      <div className="h-24 bg-[#0F172A] rounded-xl border border-white/5 p-3 mb-4 flex flex-col justify-between shadow-inner">
                        <div className="flex gap-2 items-center">
                          <div className="w-5 h-5 rounded-full bg-[#2563EB] flex items-center justify-center text-[10px] text-white">
                            DP
                          </div>
                          <div className="w-12 h-2.5 bg-slate-700 rounded" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="h-6 bg-[#1E293B] rounded border border-white/5 flex flex-col justify-center px-1">
                            <div className="w-4 h-1 bg-slate-500 rounded mb-1" />
                            <div className="w-6 h-1.5 bg-[#22C55E] rounded" />
                          </div>
                          <div className="h-6 bg-[#1E293B] rounded border border-white/5 flex flex-col justify-center px-1">
                            <div className="w-5 h-1 bg-slate-500 rounded mb-1" />
                            <div className="w-4 h-1.5 bg-[#2563EB] rounded" />
                          </div>
                          <div className="h-6 bg-[#1E293B] rounded border border-white/5" />
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-textLight">Pulse Dark Theme</p>
                          <p className="text-xs text-textLight/50">Modern, rich, easy on the eyes</p>
                        </div>
                        {theme === 'dark' && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="glass rounded-2xl p-6"
              >
                <h2 className="text-xl font-semibold mb-6 border-b border-white/10 pb-4">Notifications Settings</h2>
                <p className="text-sm text-textLight/70">Configure your alert and notice preferences. Features coming soon.</p>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div 
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="glass rounded-2xl p-6"
              >
                <h2 className="text-xl font-semibold mb-6 border-b border-white/10 pb-4">Security Settings</h2>
                <p className="text-sm text-textLight/70">Manage your passwords, active sessions, and access keys. Features coming soon.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default Settings;
