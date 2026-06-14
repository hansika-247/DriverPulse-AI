import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

// ─────────────────────────────────────────────────────────────
// Helper: generate unique Driver ID  →  DRV20250001
// ─────────────────────────────────────────────────────────────
const generateDriverId = async () => {
  const year = new Date().getFullYear();
  const prefix = `DRV${year}`;

  // Count existing drivers whose driverId starts with this year's prefix
  const count = await prisma.driver.count({
    where: { driverId: { startsWith: prefix } },
  });

  // Zero-pad to 4 digits → DRV20250001
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}${sequence}`;
};

// ─────────────────────────────────────────────────────────────
// Strip sensitive fields before returning to client
// ─────────────────────────────────────────────────────────────
const sanitizeDriver = (driver) => {
  const { passwordHash, ...safe } = driver;
  return safe;
};

// ─────────────────────────────────────────────────────────────
// Sign JWT
// ─────────────────────────────────────────────────────────────
const signToken = (driver) =>
  jwt.sign(
    { id: driver.id, driverId: driver.driverId, username: driver.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// ─────────────────────────────────────────────────────────────
// SIGNUP
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// SIGNUP  — accepts user-supplied driverId OR auto-generates one
// ─────────────────────────────────────────────────────────────
export const signup = async ({ name, email, phone, username, password, vehicleNumber, vehicleType, driverId: suppliedId }) => {
  // Check uniqueness across email, username, and driverId
  const existing = await prisma.driver.findFirst({
    where: {
      OR: [
        { email },
        { username },
        ...(suppliedId ? [{ driverId: suppliedId }] : []),
      ],
    },
  });

  if (existing) {
    let field = 'email';
    if (existing.username === username)  field = 'username';
    if (suppliedId && existing.driverId === suppliedId) field = 'Driver ID';
    const error = new Error(`A driver with this ${field} already exists.`);
    error.statusCode = 409;
    throw error;
  }

  const saltRounds  = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Use supplied ID if provided; otherwise auto-generate as fallback
  const driverId = suppliedId ? suppliedId.trim().toUpperCase() : await generateDriverId();

  const driver = await prisma.driver.create({
    data: { driverId, username, email, passwordHash, name, phone, vehicleNumber, vehicleType },
  });

  const token = signToken(driver);
  return { driver: sanitizeDriver(driver), token };
};

// ─────────────────────────────────────────────────────────────
// LOGIN  (identifier = username OR driverId)
// ─────────────────────────────────────────────────────────────
export const login = async ({ identifier, password }) => {
  const driver = await prisma.driver.findFirst({
    where: { OR: [{ username: identifier }, { driverId: identifier }] },
  });

  if (!driver) {
    const error = new Error('Invalid credentials.');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, driver.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid credentials.');
    error.statusCode = 401;
    throw error;
  }

  const token = signToken(driver);
  return { driver: sanitizeDriver(driver), token };
};
