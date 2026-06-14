import { Router } from 'express';
import * as tripController from '../controllers/trip.controller.js';
import authenticate from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /trips
router.get('/', tripController.getTrips);

// GET /trips/:id
router.get('/:id', tripController.getTripById);

export default router;
