import * as feedbackService from '../services/feedback.service.js';

export const submitFeedback = async (req, res) => {
  const data = await feedbackService.upsertFeedback(req.driver.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Feedback submitted successfully.',
    data
  });
};

export const getStats = async (req, res) => {
  // Can get global stats or driver specific stats. Let's do global for the analytics display.
  // Or driver specific if query param is passed.
  const driverId = req.query.global === 'true' ? null : req.driver.id;
  const stats = await feedbackService.getFeedbackStats(driverId);
  res.status(200).json({
    success: true,
    data: { stats }
  });
};

export const getTripFeedback = async (req, res) => {
  const { tripId } = req.query;
  if (!tripId) {
    return res.status(400).json({ success: false, message: 'tripId query parameter is required.' });
  }
  const feedbackList = await feedbackService.getTripFeedback(req.driver.id, tripId);
  res.status(200).json({
    success: true,
    data: { feedback: feedbackList }
  });
};
