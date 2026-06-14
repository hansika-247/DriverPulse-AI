import prisma from '../config/prisma.js';

// ─────────────────────────────────────────────────────────────
// GET all AI insights for the authenticated driver
// Returns most recent first, with aggregate stats
// ─────────────────────────────────────────────────────────────
export const getInsights = async (driverId) => {
  const [insights, totalFlags, avgRiskScore] = await Promise.all([
    prisma.aIInsight.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.flag.count({ where: { driverId } }),
    prisma.aIInsight.aggregate({
      where: { driverId },
      _avg: { riskScore: true },
    }),
  ]);

  return {
    insights,
    stats: {
      totalInsights: insights.length,
      totalFlags,
      avgRiskScore: avgRiskScore._avg.riskScore
        ? Number(avgRiskScore._avg.riskScore.toFixed(1))
        : null,
    },
  };
};
