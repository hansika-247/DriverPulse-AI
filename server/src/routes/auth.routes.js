import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import validate, { signupSchema, loginSchema } from '../middleware/validate.js';
import authenticate from '../middleware/auth.js';

const router = Router();

// POST /auth/signup
router.post('/signup', validate(signupSchema), authController.signup);

// POST /auth/login
router.post('/login', validate(loginSchema), authController.login);

// GET /auth/me  — returns current driver from JWT
router.get('/me', authenticate, authController.getMe);

// POST /auth/test-login — Developer testing mode
router.post('/test-login', authController.testLogin);

export default router;
