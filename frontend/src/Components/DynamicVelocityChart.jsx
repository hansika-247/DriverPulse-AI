import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { useTheme } from "../ThemeContext";

function DynamicVelocityChart({ trips }) {
  const [visibleData, setVisibleData] = useState([]);
  const [index, setIndex] = useState(0);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Dynamic Theme Colors for Charts
  const themeColors = {
    grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    text: isDark ? 'rgba(248, 250, 252, 0.5)' : 'rgba(15, 23, 42, 0.6)',
    primary: isDark ? '#2563EB' : '#000000',
    success: isDark ? '#22C55E' : '#06C167',
    tooltipBg: isDark ? '#1E293B' : '#FFFFFF',
    tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
    tooltipText: isDark ? '#F8FAFC' : '#0F172A',
  };

  // prepare dataset
  const timeline = trips
    .map(row => ({
      timestamp: new Date(row.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      }),
      current_velocity: Number(row.current_velocity),
      target_velocity: Number(row.target_velocity),
      status: row.forecast_status
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // reset when driver changes
  useEffect(() => {
    setVisibleData([]);
    setIndex(0);
  }, [trips]);

  // animate plotting
  useEffect(() => {
    if (index >= timeline.length) return;

    const interval = setTimeout(() => {
      setVisibleData(prev => [...prev, timeline[index]]);
      setIndex(index + 1);
    }, 800);

    return () => clearTimeout(interval);
  }, [index, timeline]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={visibleData}>
        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
        <XAxis dataKey="timestamp" stroke={themeColors.text} tick={{ fill: themeColors.text }} />
        <YAxis stroke={themeColors.text} tick={{ fill: themeColors.text }} />
        <Tooltip contentStyle={{ backgroundColor: themeColors.tooltipBg, border: `1px solid ${themeColors.tooltipBorder}`, borderRadius: '8px', color: themeColors.tooltipText }} />
        <Line
          type="monotone"
          dataKey="current_velocity"
          stroke={themeColors.primary}
          strokeWidth={3}
          name="Current Velocity"
        />
        <Line
          type="monotone"
          dataKey="target_velocity"
          stroke={themeColors.success}
          strokeWidth={3}
          name="Target Velocity"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default DynamicVelocityChart;