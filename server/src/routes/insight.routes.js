import { Router } from 'express';
import * as insightController from '../controllers/insight.controller.js';
import authenticate from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /insights
router.get('/', insightController.getInsights);

export default router;
