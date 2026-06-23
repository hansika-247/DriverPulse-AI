import prisma from '../config/prisma.js';

/**
 * Creates or updates feedback for a specific flag.
 * A driver can only submit feedback for their own flags.
 */
export const upsertFeedback = async (driverId, data) => {
  const { tripId, flagId, feedbackType } = data;

  // Verify the flag exists and belongs to the driver
  const flag = await prisma.flag.findUnique({
    where: { id: flagId }
  });

  if (!flag) {
    const error = new Error('Flag not found.');
    error.statusCode = 404;
    throw error;
  }

  if (flag.driverId !== driverId) {
    const error = new Error('Forbidden. You do not own this flag.');
    error.statusCode = 403;
    throw error;
  }

  // Upsert the feedback
  return prisma.incidentFeedback.upsert({
    where: { flagId },
    update: { feedbackType },
    create: {
      driverId,
      tripId,
      flagId,
      feedbackType,
    }
  });
};

/**
 * Gets global (or driver-specific) stats for model validation
 */
export const getFeedbackStats = async (driverId = null) => {
  try {
    const whereClause = driverId ? { driverId } : {};

    const total = await prisma.incidentFeedback.count({ where: whereClause });
    if (total === 0) {
      return {
        correct: 0,
        incorrect: 0,
        notRelevant: 0,
        total: 0,
        retrievalAccuracy: 0,
        topCorrectedEvents: []
      };
    }

    const group = await prisma.incidentFeedback.groupBy({
      by: ['feedbackType'],
      where: whereClause,
      _count: {
        _all: true
      }
    });

    const stats = {
      correct: 0,
      incorrect: 0,
      notRelevant: 0,
      total,
      retrievalAccuracy: 0,
      topCorrectedEvents: []
    };

    let correctCount = 0;
    let incorrectCount = 0;

    group.forEach(g => {
      const percentage = Math.round((g._count._all / total) * 100);
      if (g.feedbackType === 'CORRECT') {
        stats.correct = percentage;
        correctCount = g._count._all;
      }
      else if (g.feedbackType === 'INCORRECT') {
        stats.incorrect = percentage;
        incorrectCount = g._count._all;
      }
      else if (g.feedbackType === 'NOT_RELEVANT') stats.notRelevant = percentage;
    });

    if (correctCount + incorrectCount > 0) {
      stats.retrievalAccuracy = Math.round((correctCount / (correctCount + incorrectCount)) * 100);
    }
    
    const topFlagsQuery = await prisma.incidentFeedback.findMany({
      where: whereClause,
      select: {
        flag: {
          select: {
            flagType: true
          }
        }
      }
    });
    
    const flagCounts = {};
    topFlagsQuery.forEach(fb => {
      if (fb.flag && fb.flag.flagType) {
        flagCounts[fb.flag.flagType] = (flagCounts[fb.flag.flagType] || 0) + 1;
      }
    });
    
    stats.topCorrectedEvents = Object.entries(flagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => ({ type: entry[0], count: entry[1] }));

    return stats;
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    throw error;
  }
};

/**
 * Gets feedback given by a driver for a specific trip's flags.
 */
export const getTripFeedback = async (driverId, tripId) => {
  return prisma.incidentFeedback.findMany({
    where: {
      driverId,
      tripId
    }
  });
};
