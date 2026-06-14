// ============================================================
// assessment.controller.js
// Saves driver assessment form data to the DriverAssessment table.
// The actual ML prediction is handled by the Python FastAPI backend.
// ============================================================
import prisma from '../config/prisma.js';

/**
 * POST /assessment
 * Upsert assessment data for the authenticated driver.
 * Body: { city, shiftPreference, avgHoursPerDay, avgEarningsPerHour,
 *         experienceMonths, rating, dailyProductivity, avgCombinedScore,
 *         avgMotionScore, avgAudioScore, totalFlags }
 */
export const saveAssessment = async (req, res) => {
  const driverId = req.driver.driverId; // set by authenticate middleware

  const {
    city,
    shiftPreference,
    avgHoursPerDay,
    avgEarningsPerHour,
    experienceMonths,
    rating,
    dailyProductivity,
    avgCombinedScore,
    avgMotionScore,
    avgAudioScore,
    totalFlags,
  } = req.body;

  // Upsert — create if first time, update on re-submission
  const assessment = await prisma.driverAssessment.upsert({
    where: { driverId },
    update: {
      city,
      shiftPreference,
      avgHoursPerDay,
      avgEarningsPerHour,
      experienceMonths,
      rating,
      dailyProductivity,
      avgCombinedScore,
      avgMotionScore,
      avgAudioScore,
      totalFlags,
    },
    create: {
      driverId,
      city,
      shiftPreference,
      avgHoursPerDay,
      avgEarningsPerHour,
      experienceMonths,
      rating,
      dailyProductivity,
      avgCombinedScore,
      avgMotionScore,
      avgAudioScore,
      totalFlags,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Assessment data saved successfully.',
    data: { assessment },
  });
};

/**
 * GET /assessment
 * Retrieve the saved assessment for the authenticated driver.
 */
export const getAssessment = async (req, res) => {
  const driverId = req.driver.driverId;

  const assessment = await prisma.driverAssessment.findUnique({
    where: { driverId },
  });

  if (!assessment) {
    return res.status(404).json({
      success: false,
      message: 'No assessment found for this driver.',
      hasAssessment: false,
    });
  }

  res.status(200).json({
    success: true,
    hasAssessment: true,
    data: { assessment },
  });
};
