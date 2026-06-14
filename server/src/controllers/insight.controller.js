import * as insightService from '../services/insight.service.js';

// GET /insights
export const getInsights = async (req, res) => {
  const result = await insightService.getInsights(req.driver.id);
  res.status(200).json({
    success: true,
    data: result,
  });
};
