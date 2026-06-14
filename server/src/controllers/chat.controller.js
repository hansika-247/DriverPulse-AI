import * as chatService from '../services/chat.service.js';

// POST /chat
export const sendMessage = async (req, res) => {
  const { question } = req.body;
  const record = await chatService.chat(req.driver.id, question);
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
