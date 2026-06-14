import * as authService from '../services/auth.service.js';
import prisma from '../config/prisma.js';

// POST /auth/signup
export const signup = async (req, res) => {
  const result = await authService.signup(req.body);
  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    data: result,
  });
};

// POST /auth/login
export const login = async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: result,
  });
};

// GET /auth/me — return authenticated driver profile
export const getMe = async (req, res) => {
  const driver = await prisma.driver.findUnique({
    where: { id: req.driver.id },
    select: {
      id:            true,
      driverId:      true,
      username:      true,
      email:         true,
      name:          true,
      phone:         true,
      vehicleNumber: true,
      vehicleType:   true,
      createdAt:     true,
      _count: { select: { trips: true, flags: true } },
    },
  });

  if (!driver) {
    return res.status(404).json({ success: false, message: 'Driver not found.' });
  }

  res.status(200).json({ success: true, data: { driver } });
};
