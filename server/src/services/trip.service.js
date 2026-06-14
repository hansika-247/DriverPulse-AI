import prisma from '../config/prisma.js';

// ─────────────────────────────────────────────────────────────
// GET all trips for the authenticated driver
// ─────────────────────────────────────────────────────────────
export const getTrips = async (driverId) => {
  return prisma.trip.findMany({
    where: { driverId },
    include: {
      flags: {
        select: { id: true, flagType: true, severity: true, timestamp: true },
      },
    },
    orderBy: { startTime: 'desc' },
  });
};

// ─────────────────────────────────────────────────────────────
// GET single trip by ID — enforces ownership
// ─────────────────────────────────────────────────────────────
export const getTripById = async (tripId, driverId) => {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { flags: true },
  });

  if (!trip) {
    const error = new Error('Trip not found.');
    error.statusCode = 404;
    throw error;
  }

  if (trip.driverId !== driverId) {
    const error = new Error('Forbidden. You do not own this trip.');
    error.statusCode = 403;
    throw error;
  }

  return trip;
};
