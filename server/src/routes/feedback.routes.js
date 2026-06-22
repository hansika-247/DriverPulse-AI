import express from 'express';
import authenticate from '../middleware/auth.js';
import * as feedbackController from '../controllers/feedback.controller.js';

const router = express.Router();

router.use(authenticate);

// POST /feedback
router.post('/', feedbackController.submitFeedback);

// GET /feedback/stats
router.get('/stats', feedbackController.getStats);

// GET /feedback/trip
router.get('/trip', feedbackController.getTripFeedback);

export default router;
