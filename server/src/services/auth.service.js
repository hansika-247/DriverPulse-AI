import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { normalizeDriverId } from '../utils/driverId.js';

// ─────────────────────────────────────────────────────────────
// Helper: generate unique Driver ID  →  DRV0001, DRV0002, …
// Format matches the ML training dataset so FastAPI can resolve
// the driver directly from the CSV (Case 1 prediction path).
// ─────────────────────────────────────────────────────────────
const generateDriverId = async () => {
  const count = await prisma.driver.count();
  const sequence = String(count + 1).padStart(4, '0');
  return `DRV${sequence}`;  // DRV0001, DRV0002, … matches model_loader.py format
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
  // Always normalize to DRV0001 format before storing
  const driverId = suppliedId
    ? normalizeDriverId(suppliedId.trim().toUpperCase())
    : await generateDriverId();

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
  // Normalize identifier if it looks like a Driver ID (DRV*) so DRV001 matches DRV0001 in DB
  const normalizedIdentifier = normalizeDriverId(identifier);
  const driver = await prisma.driver.findFirst({
    where: { OR: [{ username: identifier }, { driverId: normalizedIdentifier }] },
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
