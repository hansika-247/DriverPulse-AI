import { Router } from 'express';
import * as chatController from '../controllers/chat.controller.js';
import authenticate from '../middleware/auth.js';
import validate, { chatSchema } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

// POST /chat
router.post('/', validate(chatSchema), chatController.sendMessage);

// GET /chat/history
router.get('/history', chatController.getChatHistory);

export default router;
