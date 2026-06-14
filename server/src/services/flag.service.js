import prisma from '../config/prisma.js';

// ─────────────────────────────────────────────────────────────
// GET all flags for the authenticated driver
// Optional: filter by severity or flagType via query params
// ─────────────────────────────────────────────────────────────
export const getFlags = async (driverId, { severity, flagType, tripId } = {}) => {
  const where = { driverId };

  if (severity) where.severity = severity.toUpperCase();
  if (flagType) where.flagType = flagType;
  if (tripId)   where.tripId = tripId;

  return prisma.flag.findMany({
    where,
    include: {
      trip: { select: { id: true, route: true, startTime: true } },
    },
    orderBy: { timestamp: 'desc' },
  });
};

// ─────────────────────────────────────────────────────────────
// GET single flag by ID — enforces ownership
// ─────────────────────────────────────────────────────────────
export const getFlagById = async (flagId, driverId) => {
  const flag = await prisma.flag.findUnique({
    where: { id: flagId },
    include: { trip: true },
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

  return flag;
};
