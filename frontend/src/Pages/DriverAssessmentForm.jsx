import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, MapPin, Clock, Banknote, Star, Activity,
  AlertTriangle, CheckCircle2, ChevronRight, Loader2, BrainCircuit,
} from 'lucide-react';
import { useAuth }              from '../AuthContext';
import { useTheme }             from '../ThemeContext';
import { apiDriverAssessment, apiSaveAssessment } from '../api';

// ─── Field sections ────────────────────────────────────────────────────────
const CITY_OPTIONS   = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata'];
const SHIFT_OPTIONS  = ['Morning', 'Evening', 'Night'];

const DEFAULTS = {
  city:                   'Mumbai',
  shift_preference:       'Morning',
  avg_hours_per_day:      8,
  avg_earnings_per_hour:  200,
  experience_months:      12,
  rating:                 4.5,
  daily_productivity:     1500,
  avg_combined_score:     85,
  avg_motion_score:       85,
  avg_audio_score:        85,
  total_flags:            2,
};

// ─── Component ─────────────────────────────────────────────────────────────
const DriverAssessmentForm = ({ onAssessmentComplete, standalone = false }) => {
  const { driver }  = useAuth();
  const { theme }   = useTheme();
  const navigate    = useNavigate();
  const isDark      = theme === 'dark';

  const [form,    setForm]    = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [step,    setStep]    = useState(0); // 0 = form, 1 = analysing, 2 = done

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!driver?.driverId) {
      setError('Driver ID not found. Please log in again.');
      return;
    }

    setLoading(true);
    setStep(1);
    setError('');

    const payload = { driver_id: driver.driverId, ...form };

    try {
      // 1. Run ML prediction via FastAPI (saves prediction to DB)
      const res = await apiDriverAssessment(payload);
      const prediction = res?.data || res;

      // 2. Also persist raw feature data to Node/Prisma DriverAssessment table
      try {
        await apiSaveAssessment({
          city:               form.city,
          shiftPreference:    form.shift_preference,
          avgHoursPerDay:     form.avg_hours_per_day,
          avgEarningsPerHour: form.avg_earnings_per_hour,
          experienceMonths:   form.experience_months,
          rating:             form.rating,
          dailyProductivity:  form.daily_productivity,
          avgCombinedScore:   form.avg_combined_score,
          avgMotionScore:     form.avg_motion_score,
          avgAudioScore:      form.avg_audio_score,
          totalFlags:         form.total_flags,
        });
      } catch (dbErr) {
        // Non-fatal — assessment table save failed; prediction is already in DB
        console.warn('[assessment] Could not save to DriverAssessment table:', dbErr.message);
      }

      setStep(2);

      // Short delay to show completion animation, then navigate/callback
      await new Promise(r => setTimeout(r, 1400));

      if (onAssessmentComplete) {
        onAssessmentComplete(prediction);
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Assessment failed. Please try again.');
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  // ── Shared input styles ─────────────────────────────────────────────────
  const inputCls = `w-full px-3 py-2.5 rounded-xl border text-sm transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500/40
    ${isDark
      ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30'
      : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'}`;

  const labelCls = `block text-xs font-semibold uppercase tracking-wider mb-1.5
    ${isDark ? 'text-white/50' : 'text-gray-500'}`;

  // ── Section card ────────────────────────────────────────────────────────
  const Section = ({ icon: Icon, title, color, children }) => (
    <div className={`rounded-2xl border p-5 space-y-4
      ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );

  const Field = ({ label, name, type = 'number', min, max, step: s, children }) => (
    <div>
      <label className={labelCls}>{label}</label>
      {children ?? (
        <input
          type={type}
          name={name}
          value={form[name]}
          onChange={handleChange}
          min={min}
          max={max}
          step={s}
          className={inputCls}
        />
      )}
    </div>
  );

  // ── Analysing overlay ───────────────────────────────────────────────────
  if (step === 1) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-24 space-y-6 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
          flex items-center justify-center shadow-xl shadow-blue-500/30">
          <BrainCircuit size={36} className="text-white animate-pulse" />
        </div>
        <div>
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Analysing Your Profile…
          </h2>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Running Random Forest risk classifier on your data
          </p>
        </div>
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <motion.div key={i}
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ delay: i * 0.2, repeat: Infinity, duration: 0.8 }}
              className="w-2.5 h-2.5 rounded-full bg-blue-500"
            />
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Success flash ───────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-24 space-y-4 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500
            flex items-center justify-center"
        >
          <CheckCircle2 size={40} className="text-green-500" />
        </motion.div>
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Assessment Complete!
        </h2>
        <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          Redirecting to your dashboard…
        </p>
      </motion.div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`max-w-2xl mx-auto ${standalone ? 'py-10 px-4' : ''}`}
    >
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
          bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-blue-500/30 mb-4">
          <ClipboardList size={28} className="text-white" />
        </div>
        <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Driver Risk Assessment
        </h2>
        <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          One-time setup · Your Driver ID:{' '}
          <span className="font-mono text-blue-400 font-semibold">{driver?.driverId || '—'}</span>
        </p>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-red-500/10 border border-red-500/30
              text-red-400 rounded-xl px-4 py-3 mb-6 text-sm"
          >
            <AlertTriangle size={16} className="shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Location & Schedule */}
        <Section icon={MapPin} title="Location & Schedule" color="bg-blue-600">
          <Field label="City" name="city">
            <select name="city" value={form.city} onChange={handleChange} className={inputCls}>
              {CITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Shift Preference" name="shift_preference">
            <select name="shift_preference" value={form.shift_preference} onChange={handleChange} className={inputCls}>
              {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Avg Hours / Day" name="avg_hours_per_day" min={1} max={16} step={0.5} />
          <Field label="Experience (Months)" name="experience_months" min={0} max={360} />
        </Section>

        {/* Earnings */}
        <Section icon={Banknote} title="Earnings & Productivity" color="bg-emerald-600">
          <Field label="Avg Earnings / Hour (₹)" name="avg_earnings_per_hour" min={0} step={10} />
          <Field label="Daily Productivity (₹)" name="daily_productivity" min={0} step={50} />
        </Section>

        {/* Performance */}
        <Section icon={Star} title="Performance & Safety" color="bg-amber-500">
          <Field label="Driver Rating (0–5)" name="rating" min={0} max={5} step={0.1} />
          <Field label="Total Flags" name="total_flags" min={0} />
        </Section>

        {/* Sensor Scores */}
        <Section icon={Activity} title="Sensor Scores (0–100)" color="bg-violet-600">
          <Field label="Combined Behaviour Score" name="avg_combined_score" min={0} max={100} step={0.1} />
          <Field label="Motion / Acceleration Score" name="avg_motion_score" min={0} max={100} step={0.1} />
          <Field label="Audio / Distraction Score"  name="avg_audio_score"  min={0} max={100} step={0.1} />
        </Section>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl
            bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500
            disabled:opacity-60 text-white font-bold text-base transition-all duration-200
            shadow-lg shadow-blue-500/30"
        >
          {loading ? (
            <><Loader2 size={20} className="animate-spin" /> Generating Risk Profile…</>
          ) : (
            <><BrainCircuit size={20} /> Generate My Risk Profile <ChevronRight size={18} /></>
          )}
        </motion.button>

        <p className={`text-center text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
          Your data is processed locally and used only for risk classification.
          You only need to complete this once.
        </p>
      </form>
    </motion.div>
  );
};

export default DriverAssessmentForm;
