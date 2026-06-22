import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Gauge, AlertCircle } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import { apiLogin } from '../api';
import { normalizeDriverId } from '../utils/driverId';

const Login = () => {
  const { theme } = useTheme();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = theme === 'dark';

  const from = location.state?.from?.pathname || '/';

  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setError('');
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // { success, message, data: { driver, token } }
      const payload = { ...form, identifier: normalizeDriverId(form.identifier) };
      const res = await apiLogin(payload);
      login(res.data.token, res.data.driver);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
    isDark
      ? 'bg-bgDark border-white/10 text-textLight placeholder:text-textLight/30'
      : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'
  }`;

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-bgDark' : 'bg-[#F8FAFC]'}`}>
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-blue-700 to-blue-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white"
              style={{
                width: `${(i + 1) * 120}px`,
                height: `${(i + 1) * 120}px`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Gauge size={22} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl">Driver Pulse</span>
          </div>
          <p className="text-blue-200 text-sm">AI-Powered Driver Safety Platform</p>
        </div>

        <div className="relative z-10 space-y-6">
          {[
            { metric: '92', label: 'Avg Safety Score' },
            { metric: '142', label: 'Trips Analysed' },
            { metric: '$4,250', label: 'Weekly Earnings' },
          ].map(({ metric, label }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="text-3xl font-extrabold text-white">{metric}</div>
              <div className="text-blue-200 text-sm">{label}</div>
            </div>
          ))}
        </div>

        <p className="text-blue-200/60 text-xs relative z-10">
          © {new Date().getFullYear()} Driver Pulse. All rights reserved.
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Gauge size={18} className="text-white" />
            </div>
            <span className={`font-bold text-lg ${isDark ? 'text-textLight' : 'text-gray-900'}`}>
              Driver Pulse
            </span>
          </div>

          <h1 className={`text-3xl font-extrabold mb-2 ${isDark ? 'text-textLight' : 'text-gray-900'}`}>
            Welcome back
          </h1>
          <p className={`text-sm mb-8 ${isDark ? 'text-textLight/60' : 'text-gray-500'}`}>
            Sign in with your username or Driver ID
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-3 mb-6 text-sm"
            >
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className={`text-sm font-medium ${isDark ? 'text-textLight/80' : 'text-gray-700'}`}>
                Username or Driver ID
              </label>
              <input
                name="identifier"
                value={form.identifier}
                onChange={handleChange}
                placeholder="e.g. alex_j or DRV0001"
                autoComplete="username"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className={`text-sm font-medium ${isDark ? 'text-textLight/80' : 'text-gray-700'}`}>
                Password
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded ${isDark ? 'text-textLight/40 hover:text-textLight' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className={`text-center text-sm mt-8 ${isDark ? 'text-textLight/50' : 'text-gray-500'}`}>
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
