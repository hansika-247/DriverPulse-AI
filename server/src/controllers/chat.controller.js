import * as chatService from '../services/chat.service.js';

// POST /chat
export const sendMessage = async (req, res) => {
  const { question, language } = req.body;

  // req.driver.id       = internal UUID  (DB foreign key)
  // req.driver.driverId = alphanumeric ML ID (e.g. "DRV0001") sent to FastAPI
  const record = await chatService.chat(req.driver.id, req.driver.driverId, question, language || 'en');

  res.status(201).json({
    success: true,
    data: { message: record },
  });
};

// GET /chat/history
export const getChatHistory = async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const history = await chatService.getChatHistory(req.driver.id, limit);
  res.status(200).json({
    success: true,
    count: history.length,
    data: { history },
  });
};
