import * as insightService from '../services/insight.service.js';

// GET /insights
export const getInsights = async (req, res) => {
  // req.driver.id is the UUID (foreign key used in DB relations)
  // req.driver.driverId is the alphanumeric ML-facing ID (e.g. "DRV20260001")
  // The AIInsight, Flag, Trip models all use the UUID as driverId foreign key
  const result = await insightService.getInsights(req.driver.id, req.driver.driverId);
  res.status(200).json({
    success: true,
    data: result,
  });
};
