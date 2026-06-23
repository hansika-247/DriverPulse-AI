/**
 * server/src/services/chat.service.js
 * =====================================
 * AI Assistant backend — powered by Google Gemini.
 *
 * Flow:
 *   User question
 *     → assembleContext()              (context.service.js — retrieves all driver data)
 *     → [If Gemini key valid] RAG + Gemini
 *     → [If no Gemini key]   generateDataDrivenResponse() — real driver data, no LLM
 *     → Response saved to ChatHistory table
 *     → Returned to frontend
 */

import prisma from '../config/prisma.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { assembleContext, formatContextForPrompt } from './context.service.js';
import axios from 'axios';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8002';

// ── Gemini client ──────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let geminiModel = null;

// Detect placeholder/missing key
function isValidGeminiKey(key) {
  if (!key) return false;
  if (key.trim() === '') return false;
  if (key === 'your_gemini_api_key_here') return false;
  if (key.startsWith('your_')) return false;
  if (key === 'GEMINI_API_KEY') return false;
  return true;
}

function getGeminiModel() {
  if (!isValidGeminiKey(GEMINI_API_KEY)) return null;
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
Constraint: ONLY answer based on the provided driver context. If data is missing, say so honestly. DO NOT make up or hallucinate any numbers.
Citation: You MUST return source citations for every answer by referencing the [Source: XYZ] tags provided in the retrieved context.`;

// ─────────────────────────────────────────────────────────────
// POST /chat — real Gemini call with driver context
// ─────────────────────────────────────────────────────────────
export const chat = async (driverUuid, mlDriverId, question, language = 'en') => {
  console.log('\n' + '='.repeat(60));
  console.log('[CHAT DEBUG] ▶ New chat request');
  console.log(`[CHAT DEBUG] Driver UUID   : ${driverUuid}`);
  console.log(`[CHAT DEBUG] ML Driver ID  : ${mlDriverId}`);
  console.log(`[CHAT DEBUG] Question      : ${question}`);
  console.log(`[CHAT DEBUG] Language      : ${language}`);
  console.log('='.repeat(60));

  const model = getGeminiModel();
  const geminiKeyValid = isValidGeminiKey(GEMINI_API_KEY);

  console.log(`[CHAT DEBUG] Gemini API Key valid: ${geminiKeyValid}`);
  if (!geminiKeyValid) {
    console.warn('[CHAT DEBUG] ⚠️  No valid Gemini key — will use data-driven response from DB.');
  }

  // ─── STEP 1: Always assemble context (needed for both paths) ─
  console.log('[CHAT DEBUG] Step 1: Assembling driver context from DB + ML...');
  let ctx;
  try {
    ctx = await assembleContext(driverUuid, mlDriverId);
  } catch (err) {
    console.error(`[CHAT DEBUG] ❌ assembleContext FAILED: ${err.message}`);
    ctx = { flagData: { recentFlags: [], summary: {} }, trips: [], insights: [], profile: null, prediction: {}, assessment: null, feedback: [], mlDriverId };
  }

  const flagCount    = ctx.flagData?.recentFlags?.length ?? 0;
  const tripCount    = ctx.trips?.length ?? 0;
  const insightCount = ctx.insights?.length ?? 0;
  const flagSummary  = ctx.flagData?.summary ?? {};

  console.log(`[CHAT DEBUG] ✅ Context assembled:`);
  console.log(`[CHAT DEBUG]    Retrieved Flags   : ${flagCount}`);
  console.log(`[CHAT DEBUG]    Retrieved Trips   : ${tripCount}`);
  console.log(`[CHAT DEBUG]    Retrieved Insights: ${insightCount}`);
  console.log(`[CHAT DEBUG]    Flag Summary      : ${JSON.stringify(flagSummary)}`);
  console.log(`[CHAT DEBUG]    Profile           : ${JSON.stringify(ctx.profile)}`);
  console.log(`[CHAT DEBUG]    Prediction        : ${JSON.stringify(ctx.prediction)?.slice(0, 150)}`);

  let response;

  if (!model) {
    // ── NO GEMINI KEY: Use data-driven response ────────────────
    console.log('[CHAT DEBUG] Path: DATA-DRIVEN (no Gemini key)');
    response = generateDataDrivenResponse(question, ctx);
  } else {
    // ── GEMINI PATH ───────────────────────────────────────────
    try {
      // ─── STEP 2: RAG retrieval ────────────────────────────────
      let contextBlock;
      let chunkCount = 0;

      console.log(`[CHAT DEBUG] Step 2: Attempting RAG from ${RAG_SERVICE_URL}...`);
      try {
        const ragRes = await axios.post(`${RAG_SERVICE_URL}/api/rag/retrieve`, {
          question,
          contextData: ctx
        }, { timeout: 10000 });

        contextBlock = ragRes.data.formatted_context;
        chunkCount   = ragRes.data.results?.length ?? 0;

        console.log(`[CHAT DEBUG] ✅ RAG success — ${chunkCount} chunks retrieved`);
        if (ragRes.data.results) {
          ragRes.data.results.forEach((r, i) => {
            console.log(`[CHAT DEBUG]    Chunk[${i}] score=${r.score?.toFixed(4)} source=${r.metadata?.source} preview="${r.content?.slice(0,80)}..."`);
          });
        }
      } catch (ragErr) {
        console.warn(`[CHAT DEBUG] ⚠️  RAG failed (${ragErr.message}) — using local formatter`);
        contextBlock = formatContextForPrompt(ctx);
        chunkCount   = 0;
      }

      console.log(`[CHAT DEBUG] Retrieved Flags: ${flagCount}`);
      console.log(`[CHAT DEBUG] Retrieved Trips: ${tripCount}`);
      console.log(`[CHAT DEBUG] Retrieved Chunks: ${chunkCount}`);

      // ─── STEP 3: Build full prompt ────────────────────────────
      const fullPrompt = `${SYSTEM_PROMPT}

IMPORTANT: You MUST answer the user in the language code: ${language}. If the language code is 'en', answer in English. If it is 'hi', answer in Hindi, etc.
Do NOT include English translations if asked to answer in a different language.

DEBUG MODE: At the end of your response, you MUST append a "Sources:" section listing the data points you used to answer the question, formatted as bullet points (e.g., "* Phone Usage (14)", "* Recent Trips Analyzed: 10").

${contextBlock}

=== DRIVER QUESTION ===
${question}

=== YOUR ANSWER ===`;

      console.log(`\n[CHAT DEBUG] Step 3: Prompt (${fullPrompt.length} chars) sent to Gemini:`);
      console.log('─'.repeat(60));
      console.log(fullPrompt);
      console.log('─'.repeat(60));

      // ─── STEP 4: Call Gemini ──────────────────────────────────
      console.log('[CHAT DEBUG] Step 4: Calling Gemini...');
      const result = await model.generateContent(fullPrompt);
      response = result.response.text().trim();

      console.log(`\n[CHAT DEBUG] ✅ Raw Gemini response (${response.length} chars):`);
      console.log('─'.repeat(60));
      console.log(response);
      console.log('─'.repeat(60));

    } catch (err) {
      console.error(`[CHAT DEBUG] ❌ Gemini FAILED: ${err.message}`);
      if (err.message?.includes('API_KEY') || err.message?.includes('API key') || err.message?.includes('401') || err.message?.includes('403')) {
        console.error('[CHAT DEBUG]    ⚠️  API key error. Check GEMINI_API_KEY in server/.env');
      }
      // Even on Gemini failure, use data-driven response (not keyword fallback)
      console.warn('[CHAT DEBUG] ⚠️  Gemini failed — using data-driven response with real DB data.');
      response = generateDataDrivenResponse(question, ctx);
    }
  }

  console.log(`\n[CHAT DEBUG] Step 5: Final response to frontend:`);
  console.log(response);
  console.log('='.repeat(60) + '\n');

  // ─── STEP 5: Persist to ChatHistory ──────────────────────────
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
// DATA-DRIVEN RESPONSE — generates real answers from DB context
// Used when Gemini is unavailable (no API key or API failure).
// Returns ACTUAL driver-specific numbers, not generic explanations.
// ─────────────────────────────────────────────────────────────
function generateDataDrivenResponse(question, ctx) {
  const q           = question.toLowerCase();
  const flags       = ctx.flagData?.recentFlags ?? [];
  const summary     = ctx.flagData?.summary ?? {};
  const trips       = ctx.trips ?? [];
  const profile     = ctx.profile ?? {};
  const prediction  = ctx.prediction ?? {};
  const driverName  = profile.name ?? 'Driver';
  const totalFlags  = flags.length;

  // Helper — sort summary by count desc
  const sortedFlagTypes = Object.entries(summary).sort((a, b) => b[1] - a[1]);

  // ── Flag count questions ──────────────────────────────────────
  if (q.includes('how many') && (q.includes('flag') || q.includes('event') || q.includes('incident') || q.includes('alert'))) {
    if (totalFlags === 0) {
      return `${driverName}, you currently have **0 safety flags** recorded in your recent history. Great work maintaining clean driving!\n\n*Source: Flag records from DB (last 20 events)*`;
    }
    const summaryLines = sortedFlagTypes.map(([type, count]) => `• **${type.replace(/_/g, ' ')}**: ${count}x`).join('\n');
    const topType = sortedFlagTypes[0];
    return `${driverName}, you have **${totalFlags} safety flag events** in your recent history (last 20 events analysed).\n\n**Breakdown by category:**\n${summaryLines}\n\nYour most frequent flag type is **${topType?.[0]?.replace(/_/g, ' ')}** (${topType?.[1]}x). Focus on reducing this to improve your safety score.\n\n*Sources: Flag records (DB), total_flags=${totalFlags}*`;
  }

  // ── Most common flag category ─────────────────────────────────
  if ((q.includes('most common') || q.includes('frequent') || q.includes('top') || q.includes('category') || q.includes('type')) && (q.includes('flag') || q.includes('event') || q.includes('incident') || q.includes('safety'))) {
    if (sortedFlagTypes.length === 0) {
      return `${driverName}, you have **no safety flags** recorded yet — keep it up!\n\n*Source: Flag records from DB*`;
    }
    const top3 = sortedFlagTypes.slice(0, 3);
    const lines = top3.map(([type, count], i) => `${i + 1}. **${type.replace(/_/g, ' ')}** — ${count} occurrence${count > 1 ? 's' : ''}`).join('\n');
    return `${driverName}, your most common safety flag categories are:\n\n${lines}\n\n**#1 to fix**: Reduce **${top3[0]?.[0]?.replace(/_/g, ' ')}** events. These directly lower your motion score and feed into the ML risk model.\n\n*Sources: Flag summary (DB), ${totalFlags} total flags analysed*`;
  }

  // ── Latest incidents ──────────────────────────────────────────
  if (q.includes('latest') || q.includes('recent') || q.includes('last') || (q.includes('list') && (q.includes('incident') || q.includes('flag') || q.includes('event')))) {
    if (flags.length === 0) {
      return `${driverName}, you have **no recent incidents** on record. Excellent driving!`;
    }
    const latest5 = flags.slice(0, 5);
    const lines = latest5.map((f, i) => {
      const when = f.timestamp ? new Date(f.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Unknown time';
      return `${i + 1}. **${f.flagType?.replace(/_/g, ' ')}** — ${f.severity} severity (${when})`;
    }).join('\n');
    return `${driverName}, here are your **${Math.min(5, flags.length)} latest safety incidents**:\n\n${lines}\n\n*Sources: Flag records (DB), sorted by most recent*`;
  }

  // ── Risk level ────────────────────────────────────────────────
  if (q.includes('risk') || q.includes('danger')) {
    if (prediction.needs_assessment) {
      return `${driverName}, your risk assessment is **PENDING**. Please complete the driver assessment form to get your ML risk prediction.\n\n*Source: ML prediction engine*`;
    }
    const level = prediction.risk_level ?? 'Unknown';
    const score = prediction.predicted_safety_score ?? 'N/A';
    const conf  = prediction.confidence != null ? (prediction.confidence * 100).toFixed(1) + '%' : 'N/A';
    const topFactors = prediction.top_features?.slice(0, 3).map(f => `• ${f.feature.replace(/_/g, ' ')} (${(f.importance * 100).toFixed(0)}% weight)`).join('\n') ?? '';
    return `${driverName}, your current risk level is **${level}** with a safety score of **${score}/100** (confidence: ${conf}).\n\n${topFactors ? '**Top contributing factors:**\n' + topFactors + '\n\n' : ''}Focus on reducing your flags to move from ${level} toward LOW risk.\n\n*Sources: ML risk prediction, safety score*`;
  }

  // ── Safety score ──────────────────────────────────────────────
  if (q.includes('safe') || q.includes('score') || q.includes('safety')) {
    const score = prediction.predicted_safety_score ?? 'N/A';
    const level = prediction.risk_level ?? 'Unknown';
    return `${driverName}, your current safety score is **${score}/100** (Risk: **${level}**).\n\nYou have **${totalFlags} recent safety flags** which directly affect your score. Reducing your flag count — especially **${sortedFlagTypes[0]?.[0]?.replace(/_/g, ' ') ?? 'harsh events'}** — is the fastest way to improve.\n\n*Sources: ML safety score, flag count from DB*`;
  }

  // ── Trip summary ──────────────────────────────────────────────
  if (q.includes('trip')) {
    if (trips.length === 0) {
      return `${driverName}, you have **no trips** recorded yet.`;
    }
    const totalEarnings = trips.reduce((s, t) => s + (t.earnings || 0), 0);
    const totalDist     = trips.reduce((s, t) => s + (t.distance || 0), 0);
    const tripsWithFlags = trips.filter(t => t.flagCount > 0).length;
    return `${driverName}, here is your recent trip summary:\n\n• **Trips analysed**: ${trips.length}\n• **Total distance**: ${totalDist.toFixed(1)} km\n• **Total earnings**: ₹${totalEarnings.toFixed(0)}\n• **Trips with safety flags**: ${tripsWithFlags}/${trips.length}\n\n*Sources: Trip records (DB), last ${trips.length} trips*`;
  }

  // ── Earnings / productivity ────────────────────────────────────
  if (q.includes('earn') || q.includes('money') || q.includes('productiv') || q.includes('income')) {
    const totalEarnings = trips.reduce((s, t) => s + (t.earnings || 0), 0);
    const avgDaily      = prediction.daily_productivity != null ? `₹${prediction.daily_productivity.toFixed(0)}/day` : 'N/A';
    return `${driverName}, your recent earnings summary:\n\n• **Total earnings (recent trips)**: ₹${totalEarnings.toFixed(0)}\n• **ML-estimated daily productivity**: ${avgDaily}\n• **Trips**: ${trips.length} recent trips analysed\n\nTo improve: reduce idle time, accept surge rides, and align shifts with peak demand.\n\n*Sources: Trip earnings (DB), ML prediction*`;
  }

  // ── Insights ──────────────────────────────────────────────────
  if (q.includes('insight')) {
    const insights = ctx.insights ?? [];
    if (insights.length === 0) {
      return `${driverName}, no AI insights have been generated yet. Complete your assessment to unlock personalised insights.`;
    }
    const lines = insights.slice(0, 3).map((ins, i) =>
      `${i + 1}. **[${ins.type}]** ${ins.summary || ins.description || ''}`
    ).join('\n');
    return `${driverName}, here are your top AI insights:\n\n${lines}\n\n*Sources: AI Insights engine (${insights.length} total insights)*`;
  }

  // ── Generic fallback with real data ──────────────────────────
  const score = prediction.predicted_safety_score ?? 'N/A';
  const level = prediction.risk_level ?? 'Unknown';
  return `${driverName}, here is a quick summary of your driving profile:\n\n• **Risk Level**: ${level}\n• **Safety Score**: ${score}/100\n• **Recent Flags**: ${totalFlags}\n• **Recent Trips**: ${trips.length}\n• **Top Flag Type**: ${sortedFlagTypes[0]?.[0]?.replace(/_/g, ' ') ?? 'None'}\n\nAsk me about your risk level, safety score, flag history, trip summary, or earnings for more detail.\n\n*Sources: DB records (flags, trips), ML prediction*`;
}
