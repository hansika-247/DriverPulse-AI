// ============================================================
// assessment.routes.js
// Routes for driver assessment form data persistence.
// Mounted at: /assessment
// ============================================================
import { Router } from 'express';
import * as assessmentController from '../controllers/assessment.controller.js';
import authenticate from '../middleware/auth.js';

const router = Router();

// All assessment routes require authentication
router.use(authenticate);

// POST /assessment — save/update assessment form data
router.post('/', assessmentController.saveAssessment);

// GET /assessment — retrieve saved assessment for current driver
router.get('/', assessmentController.getAssessment);

export default router;
