import { Router } from 'express';
import * as flagController from '../controllers/flag.controller.js';
import authenticate from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /flags  (?severity=HIGH&flagType=hard_braking&tripId=xxx)
router.get('/', flagController.getFlags);

// GET /flags/:id
router.get('/:id', flagController.getFlagById);

export default router;
