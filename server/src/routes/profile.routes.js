import { Router } from 'express';
import * as profileController from '../controllers/profile.controller.js';
import authenticate from '../middleware/auth.js';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

// GET /profile
router.get('/', profileController.getProfile);

export default router;
