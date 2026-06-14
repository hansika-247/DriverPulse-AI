import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area
} from "recharts";
import { useTheme } from "../ThemeContext";

const API_BASE = import.meta.env.VITE_API_URL || "";

function DriverSafetyAnalytics({ driverId }) {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    fetch(`${API_BASE}/api/flagged-moments`)
      .then(res => res.json())
      .then(json => {
        setData(json)
      })
  },[])

  useEffect(()=>{
    if(!driverId) return

    const filtered = data.filter(
      r => r.driver_id === driverId
    )
    setFilteredData(filtered)
  },[driverId,data])

  // ------------------------
  // Severity Counts
  // ------------------------
  const severityCounts = filteredData.reduce((acc,row)=>{
    const sev = row.severity || "low"
    acc[sev] = (acc[sev] || 0) + 1
    return acc
  },{})

  const severityData = Object.entries(severityCounts).map(
    ([severity,count])=>({
      name:severity,
      value:count
    })
  )

  // ------------------------
  // Flag Type Distribution
  // ------------------------
  const flagCounts = filteredData.reduce((acc,row)=>{
    const type = row.flag_type || "unknown"
    acc[type] = (acc[type] || 0) + 1
    return acc
  },{})

  const flagTypeData = Object.entries(flagCounts).map(
    ([type,count])=>({
      type,
      count
    })
  )

  // ------------------------
  // Risk Score Calculation
  // ------------------------
  const severityWeights = {
    low:1,
    medium:3,
    high:5
  }

  let totalPoints = 0
  filteredData.forEach(row=>{
    totalPoints += severityWeights[row.severity] || 0
  })

  const maxPoints = filteredData.length * 5
  const riskScore = maxPoints === 0 ? 0 : Math.round((totalPoints/maxPoints)*100)

  let riskLevel = "Low"
  if(riskScore > 70) riskLevel = "High"
  else if(riskScore > 40) riskLevel = "Medium"

  const mainIssue =
    flagTypeData.length > 0
      ? flagTypeData.reduce((a,b)=>a.count>b.count?a:b).type
      : "None"

  // ------------------------
  // Radar Chart Data
  // ------------------------
  const avgMotion =
    filteredData.length
      ? (filteredData.reduce((s,r)=>s+parseFloat(r.motion_score||0),0)/filteredData.length)*100
      : 0;

  const avgAudio =
    filteredData.length
      ? (filteredData.reduce((s,r)=>s+parseFloat(r.audio_score||0),0)/filteredData.length)*100
      : 0;

  const avgCombined =
    filteredData.length
      ? (filteredData.reduce((s,r)=>s+parseFloat(r.combined_score||0),0)/filteredData.length)*100
      : 0;

  const highPercent =
    filteredData.length
      ? (filteredData.filter(r=>r.severity==="high").length/filteredData.length)*100
      : 0;

  const radarData = [
    { metric:"Motion", value:avgMotion },
    { metric:"Audio", value:avgAudio },
    { metric:"Combined", value:avgCombined },
    { metric:"Risk", value:riskScore },
    { metric:"High %", value:highPercent }
  ];

  // ------------------------
  // Timeline Data
  // ------------------------
  const timelineData = filteredData.map((r,i)=>({
    index:i+1,
    motion:parseFloat(r.motion_score || 0),
    audio:parseFloat(r.audio_score || 0),
    combined:parseFloat(r.combined_score || 0)
  }))

  // Dynamic Theme Colors
  const themeColors = {
    grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    text: isDark ? 'rgba(248, 250, 252, 0.5)' : 'rgba(15, 23, 42, 0.6)',
    primary: isDark ? '#2563EB' : '#000000',
    success: isDark ? '#22C55E' : '#06C167',
    warning: '#F59E0B',
    danger: '#EF4444',
    tooltipBg: isDark ? '#1E293B' : '#FFFFFF',
    tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
    tooltipText: isDark ? '#F8FAFC' : '#0F172A',
    polarGrid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  };

  const SEVERITY_COLORS = [themeColors.success, themeColors.warning, themeColors.danger];

  const FLAG_TYPE_COLORS = {
    moderate_brake: themeColors.success,
    sustained_stress: "#3b82f6",
    conflict_moment: themeColors.danger,
    harsh_braking: "#f97316",
    audio_spike: "#a855f7"
  };

  return (
    <div className="mt-10 space-y-8">
      {/* Driver Safety Insights */}
      <div className="glass p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-6">Driver Safety Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-textLight/70 mb-1">Risk Score</p>
            <h2 className="text-3xl font-extrabold text-primary mb-3">
              {riskScore} / 100
            </h2>
            <div className="h-2.5 bg-bgDark/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${riskScore}%` }}
              />
            </div>
          </div>

          <div>
            <p className="text-sm text-textLight/70 mb-1">Risk Level</p>
            <h2
              className="text-3xl font-extrabold mb-3"
              style={{
                color:
                  riskLevel === "High"
                    ? themeColors.danger
                    : riskLevel === "Medium"
                    ? themeColors.warning
                    : themeColors.success
              }}
            >
              {riskLevel}
            </h2>
          </div>

          <div>
            <p className="text-sm text-textLight/70 mb-1">Main Risk Factor</p>
            <h2 className="text-2xl font-bold text-textLight capitalize mb-3">
              {mainIssue.replace('_', ' ')}
            </h2>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass p-5 rounded-2xl">
          <h3 className="text-lg font-semibold mb-2">Severity Distribution</h3>
          <p className="text-xs text-textLight/60 mb-4">This chart shows how many of your alerts were minor (green), moderate (yellow), or serious (red). Mostly green is great — it means most events were small.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={index} fill={SEVERITY_COLORS[index % SEVERITY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: themeColors.tooltipBg, border: `1px solid ${themeColors.tooltipBorder}`, borderRadius: '8px', color: themeColors.tooltipText }} />
                <Legend formatter={(value) => <span className="capitalize text-xs font-medium text-textLight/80">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-5 rounded-2xl">
          <h3 className="text-lg font-semibold mb-2">Flag Type Distribution</h3>
          <p className="text-xs text-textLight/60 mb-4">This shows what kind of events were detected — like hard braking, cabin noise, or stress moments. Taller bars mean that type happened more often.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flagTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} vertical={false} />
                <XAxis dataKey="type" stroke={themeColors.text} tick={{ fill: themeColors.text, fontSize: 10 }} formatter={(v) => v.replace('_', ' ')} />
                <YAxis stroke={themeColors.text} tick={{ fill: themeColors.text, fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: themeColors.tooltipBg, border: `1px solid ${themeColors.tooltipBorder}`, borderRadius: '8px', color: themeColors.tooltipText }} formatter={(value) => [value, "Occurrences"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {flagTypeData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={FLAG_TYPE_COLORS[entry.type] || themeColors.primary}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass p-5 rounded-2xl">
          <h3 className="text-lg font-semibold mb-2">Driver Risk Profile</h3>
          <p className="text-xs text-textLight/60 mb-4">This radar chart shows your overall driving pattern. A smaller shape means safer driving. Each point measures: Motion (braking/swerving), Audio (cabin noise), Combined (overall), Risk (your risk score), and High % (how many events were serious).</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke={themeColors.polarGrid} />
                <PolarAngleAxis dataKey="metric" stroke={themeColors.text} tick={{ fill: themeColors.text, fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke={themeColors.polarGrid} tick={{ fill: themeColors.text, fontSize: 9 }} />
                <Radar
                  dataKey="value"
                  stroke={themeColors.primary}
                  fill={themeColors.primary}
                  fillOpacity={0.35}
                  strokeWidth={2}
                />
                <Tooltip contentStyle={{ backgroundColor: themeColors.tooltipBg, border: `1px solid ${themeColors.tooltipBorder}`, borderRadius: '8px', color: themeColors.tooltipText }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-5 rounded-2xl">
          <h3 className="text-lg font-semibold mb-2">Score Timeline</h3>
          <p className="text-xs text-textLight/60 mb-4">This shows how your driving scores changed over each flagged event. Orange = motion score (braking/acceleration), Purple = audio score (cabin noise), Blue = combined overall score. Lower lines mean smoother driving.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                <XAxis dataKey="index" stroke={themeColors.text} tick={{ fill: themeColors.text }} />
                <YAxis stroke={themeColors.text} tick={{ fill: themeColors.text }} />
                <Tooltip contentStyle={{ backgroundColor: themeColors.tooltipBg, border: `1px solid ${themeColors.tooltipBorder}`, borderRadius: '8px', color: themeColors.tooltipText }} />
                <Area
                  type="monotone"
                  dataKey="motion"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="audio"
                  stroke="#a855f7"
                  fill="#a855f7"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="combined"
                  stroke={themeColors.primary}
                  fill={themeColors.primary}
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DriverSafetyAnalytics;