/**
 * server/src/services/chat.service.js
 * =====================================
 * AI Assistant backend — powered by Google Gemini.
 *
 * Flow:
 *   User question
 *     → assembleContext()       (context.service.js — retrieves all driver data)
 *     → formatContextForPrompt() (serialises context to a structured prompt block)
 *     → Gemini generateContent() (gemini-2.0-flash-lite)
 *     → Response saved to ChatHistory table
 *     → Returned to frontend
 *
 * Future RAG migration:
 *   Replace assembleContext()       → LangChain retrieval chain + ChromaDB
 *   Replace formatContextForPrompt() → LangChain PromptTemplate
 *   Replace Gemini call             → LangChain LLMChain with any model
 */

import prisma from '../config/prisma.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { assembleContext, formatContextForPrompt } from './context.service.js';

// ── Gemini client ──────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let geminiModel = null;

function getGeminiModel() {
  if (!GEMINI_API_KEY) return null;
  if (!geminiModel) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
  }
  return geminiModel;
}

// ── System prompt ──────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Pulse AI, an intelligent driving assistant embedded in the DriverPulse fleet management platform.

Your role:
- Explain ML risk predictions in plain English
- Interpret safety scores, flag counts, and trip analytics
- Give personalised, actionable driving improvement recommendations
- Answer questions about the driver's specific data shown in the context below
- Explain how the DriverPulse system works (risk tiers, scoring, leaderboard)

Tone: Professional, concise, encouraging. Do not be overly formal.
Format: Use short paragraphs. Use bullet points for lists of 3+ items.
Length: Keep answers under 200 words unless the question requires detail.
Constraint: Only answer based on the provided driver context. If data is missing, say so honestly.`;

// ─────────────────────────────────────────────────────────────
// POST /chat — real Gemini call with driver context
// ─────────────────────────────────────────────────────────────
export const chat = async (driverUuid, mlDriverId, question, language = 'en') => {
  const model = getGeminiModel();

  let response;

  if (!model) {
    // Graceful fallback: Gemini key not configured
    response = generateFallbackResponse(question);
  } else {
    try {
      // 1. Retrieve all driver context
      const ctx = await assembleContext(driverUuid, mlDriverId);

      // 2. Format context into prompt block
      const contextBlock = formatContextForPrompt(ctx);

      // 3. Build the full prompt
      const fullPrompt = `${SYSTEM_PROMPT}
      
IMPORTANT: You MUST answer the user in the language code: ${language}. If the language code is 'en', answer in English. If it is 'hi', answer in Hindi, etc.
Do NOT include English translations if asked to answer in a different language.

${contextBlock}

=== DRIVER QUESTION ===
${question}

=== YOUR ANSWER ===`;

      // 4. Call Gemini
      const result = await model.generateContent(fullPrompt);
      response = result.response.text().trim();
    } catch (err) {
      console.error('[chat.service] Gemini call failed:', err.message);
      response = generateFallbackResponse(question);
    }
  }

  // 5. Persist to ChatHistory
  const record = await prisma.chatHistory.create({
    data: { driverId: driverUuid, question, response },
  });

  return record;
};

// ─────────────────────────────────────────────────────────────
// GET /chat/history — paginated history
// ─────────────────────────────────────────────────────────────
export const getChatHistory = async (driverUuid, limit = 50) => {
  return prisma.chatHistory.findMany({
    where:   { driverId: driverUuid },
    orderBy: { createdAt: 'asc' },
    take:    limit,
  });
};

// ─────────────────────────────────────────────────────────────
// Fallback — used when GEMINI_API_KEY is absent or Gemini fails
// Deterministic keyword matching — better than an empty error.
// ─────────────────────────────────────────────────────────────
function generateFallbackResponse(question) {
  const q = question.toLowerCase();

  if (q.includes('risk') || q.includes('danger'))
    return 'Your risk level is determined by a Random Forest model trained on 12 driving features including safety flags, ratings, productivity, and sensor scores. HIGH risk means multiple factors are elevated simultaneously. Check your AI Insights page for a full breakdown.';

  if (q.includes('safe') || q.includes('score') || q.includes('safety'))
    return 'Your safety score is a 0-100 composite derived from your ML risk prediction. LOW risk = 85-100, MEDIUM risk = 65-80, HIGH risk = 30-60. Reducing safety flags and improving your sensor scores are the fastest ways to improve it.';

  if (q.includes('flag') || q.includes('brake') || q.includes('alert') || q.includes('event'))
    return 'Safety flags are recorded when sensor data detects hard braking, speeding, phone usage, or tailgating. Each flag affects your motion and audio scores, which feed directly into the ML risk model. Aim to stay below the fleet average of 6 flags.';

  if (q.includes('earn') || q.includes('money') || q.includes('productiv') || q.includes('income'))
    return 'Productivity is measured as daily earnings (Rs./day). The fleet average is Rs.1,250/day. To improve: align shifts with demand peaks, accept more rides during surge, and minimise idle time between trips.';

  if (q.includes('trip'))
    return 'Your trip history is tracked per session. Each trip logs distance, earnings, speed, and any safety flag events. View your Trip Summary page for a full breakdown with charts.';

  if (q.includes('rank') || q.includes('leader') || q.includes('top'))
    return 'The leaderboard ranks drivers by predicted safety score. Scores are recalculated on each login using the ML model. To climb the leaderboard: lower your risk level, improve your rating, and reduce flag count.';

  if (q.includes('assess') || q.includes('form') || q.includes('new driver'))
    return 'The assessment form is a one-time questionnaire for new drivers. It collects your driving metrics (hours, earnings, experience) so the ML model can generate your first prediction without historical trip data.';

  if (q.includes('insight'))
    return 'AI Insights are generated by a deterministic rule engine that combines your ML prediction, sensor scores, flag counts, and productivity. Each insight has a severity level (positive/neutral/warning/critical) and includes a specific improvement recommendation.';

  return 'I am Pulse AI, your DriverPulse assistant. I can explain your risk predictions, safety score, trip history, safety flags, earnings, AI insights, or leaderboard ranking. What would you like to know?';
}
