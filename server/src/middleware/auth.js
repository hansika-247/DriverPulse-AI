import jwt from 'jsonwebtoken';
import { normalizeDriverId } from '../utils/driverId.js';

/**
 * JWT Authentication Middleware
 * Protects routes by verifying Bearer tokens.
 * Attaches req.driver = { id, driverId } on success.
 * driverId is always normalized to DRV0001 format before being attached.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Normalize driverId so all downstream services receive DRV0001 format
    // regardless of how it was originally encoded in the JWT.
    req.driver = {
      ...decoded,
      driverId: normalizeDriverId(decoded.driverId),
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

export default authenticate;
