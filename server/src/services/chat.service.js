import prisma from '../config/prisma.js';

// ─────────────────────────────────────────────────────────────
// POST /chat — save a question and return a placeholder response
// NOTE: Real AI (Gemini/OpenAI) integration will be added later.
//       For now the service stores the message and returns a
//       deterministic safety-analysis placeholder.
// ─────────────────────────────────────────────────────────────
export const chat = async (driverId, question) => {
  // Placeholder response — replace with LLM call in the future
  const response = generatePlaceholderResponse(question);

  const record = await prisma.chatHistory.create({
    data: { driverId, question, response },
  });

  return record;
};

// ─────────────────────────────────────────────────────────────
// GET all chat history for the authenticated driver
// ─────────────────────────────────────────────────────────────
export const getChatHistory = async (driverId, limit = 50) => {
  return prisma.chatHistory.findMany({
    where: { driverId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
};

// ─────────────────────────────────────────────────────────────
// Placeholder response generator (no AI yet)
// ─────────────────────────────────────────────────────────────
const generatePlaceholderResponse = (question) => {
  const q = question.toLowerCase();

  if (q.includes('safe') || q.includes('score')) {
    return 'Your overall safety score is 92/100. You have performed well this week with only minor braking flags detected. Keep maintaining safe following distances.';
  }
  if (q.includes('flag') || q.includes('brake') || q.includes('alert')) {
    return 'You had 8 flags this week. Most were classified as moderate hard-braking events. Focus on anticipating traffic flow to reduce sudden stops.';
  }
  if (q.includes('earn') || q.includes('money') || q.includes('income')) {
    return 'Your total earnings this week were $4,250 across 142 trips. Your best earning day was Saturday with $350 in revenue.';
  }
  if (q.includes('speed') || q.includes('fast')) {
    return 'Your average speed was 45 mph this week, which is within safe limits. You had 2 speeding flags on highway segments.';
  }
  if (q.includes('trip')) {
    return 'You completed 142 trips this week. Your longest trip was 1 hour 12 minutes from Suburbs to Downtown.';
  }

  return 'I am your Driver Pulse AI Assistant. Ask me about your safety score, trip history, earnings, or flagged moments and I will help you understand your performance.';
};
