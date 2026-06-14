import prisma from '../config/prisma.js';

// GET /profile — returns authenticated driver's profile
export const getProfile = async (req, res) => {
  const driver = await prisma.driver.findUnique({
    where: { id: req.driver.id },
    select: {
      id: true,
      driverId: true,
      username: true,
      email: true,
      name: true,
      phone: true,
      vehicleNumber: true,
      vehicleType: true,
      createdAt: true,
      _count: {
        select: { trips: true, flags: true, insights: true },
      },
    },
  });

  if (!driver) {
    return res.status(404).json({ success: false, message: 'Driver not found.' });
  }

  res.status(200).json({
    success: true,
    data: { driver },
  });
};
