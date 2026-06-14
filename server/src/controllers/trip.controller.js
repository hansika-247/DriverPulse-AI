import * as tripService from '../services/trip.service.js';

// GET /trips
export const getTrips = async (req, res) => {
  const trips = await tripService.getTrips(req.driver.id);
  res.status(200).json({
    success: true,
    count: trips.length,
    data: { trips },
  });
};

// GET /trips/:id
export const getTripById = async (req, res) => {
  const trip = await tripService.getTripById(req.params.id, req.driver.id);
  res.status(200).json({
    success: true,
    data: { trip },
  });
};
