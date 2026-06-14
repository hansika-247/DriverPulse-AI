import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, UserPlus, Gauge, AlertCircle, CheckCircle,
  IdCard, Car, Hash,
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useAuth }  from '../AuthContext';
import { apiSignup } from '../api';

const VEHICLE_TYPES = ['sedan', 'suv', 'hatchback', 'truck', 'van', 'motorcycle', 'other'];

const Signup = () => {
  const { theme } = useTheme();
  const { login } = useAuth();
  const navigate  = useNavigate();
  const isDark    = theme === 'dark';

  const [form, setForm] = useState({
    name: '', email: '', phone: '', username: '',
    password: '', vehicleNumber: '', vehicleType: 'sedan',
    driverId: '',
  });
  const [showPw,       setShowPw]       = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [fieldErrors,  setFieldErrors]  = useState({});

  const handleChange = (e) => {
    setError('');
    setFieldErrors(p => ({ ...p, [e.target.name]: '' }));
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    try {
      const { data } = await apiSignup(form);
      login(data.token, data.driver);
      navigate('/', { replace: true });
    } catch (err) {
      if (err.errors) {
        const fe = {};
        err.errors.forEach(({ field, message }) => { fe[field] = message; });
        setFieldErrors(fe);
      } else {
        setError(err.message || 'Signup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field) =>
    `w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200
     focus:outline-none focus:ring-2 focus:ring-primary/40
     ${fieldErrors[field]
       ? 'border-danger/60 bg-danger/5 focus:ring-danger/30'
       : isDark
         ? 'bg-bgDark border-white/10 text-textLight placeholder:text-textLight/30'
         : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'}`;

  const Field = ({ label, name, type = 'text', placeholder, autoComplete, children }) => (
    <div className="space-y-1.5">
      <label className={`text-sm font-medium ${isDark ? 'text-textLight/80' : 'text-gray-700'}`}>
        {label}
      </label>
      {children || (
        <input
          name={name}
          type={type}
          value={form[name]}
          onChange={handleChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={inputCls(name)}
        />
      )}
      {fieldErrors[name] && (
        <p className="text-danger text-xs flex items-center gap-1 mt-1">
          <AlertCircle size={12} /> {fieldErrors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-bgDark' : 'bg-[#F8FAFC]'}`}>
      {/* ── Left branding ── */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-slate-900 via-blue-950 to-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white"
              style={{ width: `${(i+1)*100}px`, height: `${(i+1)*100}px`,
                top: '40%', left: '40%', transform: 'translate(-50%,-50%)' }} />
          ))}
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Gauge size={22} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xl leading-none">Driver Pulse</p>
            <p className="text-blue-300 text-xs">AI-Powered Safety Platform</p>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            'Enter your own Driver ID (e.g. DRV001)',
            'AI-generated driving safety insights',
            'Real-time flag detection and analysis',
            'Secure JWT-protected account',
          ].map(item => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle size={18} className="text-success shrink-0" />
              <span className="text-blue-100 text-sm">{item}</span>
            </div>
          ))}
        </div>

        <p className="text-blue-300/50 text-xs relative z-10">
          © {new Date().getFullYear()} Driver Pulse
        </p>
      </div>

      {/* ── Right form ── */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg py-8"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Gauge size={18} className="text-white" />
            </div>
            <span className={`font-bold text-lg ${isDark ? 'text-textLight' : 'text-gray-900'}`}>
              Driver Pulse
            </span>
          </div>

          <h1 className={`text-3xl font-extrabold mb-1 ${isDark ? 'text-textLight' : 'text-gray-900'}`}>
            Create your account
          </h1>
          <p className={`text-sm mb-7 ${isDark ? 'text-textLight/60' : 'text-gray-500'}`}>
            Enter your Driver ID — e.g.{' '}
            <span className="font-mono text-primary font-semibold">DRV001</span>,{' '}
            <span className="font-mono text-primary font-semibold">DRV20260005</span>
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

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Driver ID — prominent, first field */}
            <div className={`rounded-xl border-2 border-primary/40 p-4 space-y-1.5
              ${isDark ? 'bg-primary/5' : 'bg-blue-50'}`}
            >
              <label className="flex items-center gap-2 text-sm font-semibold text-primary">
                <IdCard size={16} />
                Your Driver ID <span className="text-danger">*</span>
              </label>
              <input
                name="driverId"
                value={form.driverId}
                onChange={handleChange}
                placeholder="e.g. DRV001, DRV20260005"
                autoComplete="off"
                className={inputCls('driverId')}
              />
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                This ID will be used to look up your driving data. Enter exactly as assigned.
              </p>
              {fieldErrors.driverId && (
                <p className="text-danger text-xs flex items-center gap-1">
                  <AlertCircle size={12} /> {fieldErrors.driverId}
                </p>
              )}
            </div>

            {/* Name + Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name"  name="name"     placeholder="Alex Johnson" />
              <Field label="Username"   name="username" placeholder="alex_j" autoComplete="username" />
            </div>

            <Field label="Email Address" name="email" type="email" placeholder="alex@example.com" autoComplete="email" />
            <Field label="Phone Number"  name="phone" type="tel"   placeholder="+91 98765 43210" />

            {/* Password */}
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
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  className={`${inputCls('password')} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded
                    ${isDark ? 'text-textLight/40 hover:text-textLight' : 'text-gray-400 hover:text-gray-600'}
                    transition-colors`}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-danger text-xs flex items-center gap-1">
                  <AlertCircle size={12} /> {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Vehicle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Vehicle Number" name="vehicleNumber" placeholder="e.g. MH01AB1234">
                <div className="relative">
                  <Car size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                  <input
                    name="vehicleNumber"
                    value={form.vehicleNumber}
                    onChange={handleChange}
                    placeholder="MH01AB1234"
                    className={`${inputCls('vehicleNumber')} pl-9`}
                  />
                </div>
              </Field>

              <div className="space-y-1.5">
                <label className={`text-sm font-medium ${isDark ? 'text-textLight/80' : 'text-gray-700'}`}>
                  Vehicle Type
                </label>
                <select
                  name="vehicleType"
                  value={form.vehicleType}
                  onChange={handleChange}
                  className={`${inputCls('vehicleType')} capitalize cursor-pointer`}
                >
                  {VEHICLE_TYPES.map(v => (
                    <option key={v} value={v} className="capitalize bg-cardDark">
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50
                text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200
                flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Account
                </>
              )}
            </button>
          </form>

          <p className={`text-center text-sm mt-6 ${isDark ? 'text-textLight/50' : 'text-gray-500'}`}>
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
