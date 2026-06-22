import prisma from '../config/prisma.js';
import axios from 'axios';

const ML_URL = process.env.ML_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────
// GET all AI insights for the authenticated driver
// Returns most recent first, with aggregate stats.
// Falls back to live FastAPI ML insights if DB has none.
//
// driverUuid  — the internal UUID (Driver.id), used for DB FK lookups
// mlDriverId  — the alphanumeric ID (e.g. "DRV20260001"), sent to FastAPI
// ─────────────────────────────────────────────────────────────
export const getInsights = async (driverUuid, mlDriverId) => {
  const [insights, totalFlags, avgRiskScore] = await Promise.all([
    prisma.aIInsight.findMany({
      where: { driverId: driverUuid },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.flag.count({ where: { driverId: driverUuid } }),
    prisma.aIInsight.aggregate({
      where: { driverId: driverUuid },
      _avg: { riskScore: true },
    }),
  ]);

  const stats = {
    totalInsights: insights.length,
    totalFlags,
    avgRiskScore: avgRiskScore._avg.riskScore
      ? Number(avgRiskScore._avg.riskScore.toFixed(1))
      : null,
  };

  // If no persisted insights, call FastAPI for live ML-derived insights
  // Use the ML alphanumeric driver ID for FastAPI, not the UUID
  const fastApiDriverId = mlDriverId || driverUuid;
  if (insights.length === 0 && fastApiDriverId) {
    try {
      const mlRes = await axios.post(`${ML_URL}/api/ai-insights`, { driver_id: fastApiDriverId });
      const mlInsights = mlRes.data?.insights || [];
      if (mlInsights.length > 0) {
        return { insights: mlInsights, stats };
      }
    } catch (e) {
      console.warn('[insight.service] FastAPI ai-insights call failed:', e.message);
    }
  }

  return { insights, stats };
};

