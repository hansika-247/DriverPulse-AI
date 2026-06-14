import * as flagService from '../services/flag.service.js';

// GET /flags  (supports ?severity=HIGH&flagType=hard_braking&tripId=xxx)
export const getFlags = async (req, res) => {
  const { severity, flagType, tripId } = req.query;
  const flags = await flagService.getFlags(req.driver.id, { severity, flagType, tripId });
  res.status(200).json({
    success: true,
    count: flags.length,
    data: { flags },
  });
};

// GET /flags/:id
export const getFlagById = async (req, res) => {
  const flag = await flagService.getFlagById(req.params.id, req.driver.id);
  res.status(200).json({
    success: true,
    data: { flag },
  });
};
