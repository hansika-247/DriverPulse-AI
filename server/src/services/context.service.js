/**
 * server/src/services/context.service.js
 * =========================================
 * Context Retrieval Layer — assembles all driver-specific data
 * into a structured context object for the AI assistant.
 *
 * Architecture is designed for future RAG migration:
 *
 *   Current:  assembleContext() → plain object → Gemini prompt string
 *   Future:   assembleContext() → embed chunks → ChromaDB upsert
 *             query(question)   → ChromaDB similarity → top-k chunks → LangChain chain
 *
 * Each "retriever" is an isolated async function that can be swapped
 * independently when moving to vector storage.
 */

import prisma from '../config/prisma.js';
import axios from 'axios';

const ML_URL = process.env.ML_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────
// Individual context retrievers
// Each returns a plain object. Future: each becomes a Document[]
// to be embedded and stored in ChromaDB.
// ─────────────────────────────────────────────────────────────

/** Retriever 1: ML prediction result (risk, confidence, safety score) */
async function retrievePrediction(mlDriverId) {
  try {
    const res = await axios.post(`${ML_URL}/api/predict-risk`, { driver_id: mlDriverId });
    return res.data ?? {};
  } catch {
    return {};
  }
}

/** Retriever 2: AI insights from the deterministic engine */
async function retrieveInsights(mlDriverId) {
  try {
    const res = await axios.post(`${ML_URL}/api/ai-insights`, { driver_id: mlDriverId });
    return res.data?.insights ?? [];
  } catch {
    return [];
  }
}

/** Retriever 3: Recent trips summary (last 10) */
async function retrieveTrips(driverUuid) {
  try {
    const trips = await prisma.trip.findMany({
      where: { driverId: driverUuid },
      orderBy: { startTime: 'desc' },
      take: 10,
      include: {
        flags: { select: { flagType: true, severity: true } },
      },
    });
    console.log(`[context.service] retrieveTrips(${driverUuid}) → ${trips.length} trips found`);
    return trips.map((t) => ({
      id:          t.id,
      startTime:   t.startTime,
      endTime:     t.endTime,
      distance:    t.distance,
      earnings:    t.earnings,
      avgSpeed:    t.avgSpeed,
      route:       t.route,
      status:      t.status,
      flagCount:   t.flags.length,
      flagTypes:   [...new Set(t.flags.map((f) => f.flagType))],
    }));
  } catch (err) {
    console.error(`[context.service] retrieveTrips ERROR: ${err.message}`);
    return [];
  }
}

/** Retriever 4: Recent safety flags (last 20) */
async function retrieveFlags(driverUuid) {
  try {
    const flags = await prisma.flag.findMany({
      where:   { driverId: driverUuid },
      orderBy: { timestamp: 'desc' },
      take:    20,
      select:  { id: true, flagType: true, severity: true, timestamp: true, motionScore: true, audioScore: true, incidentFeedback: true },
    });
    const counts = {};
    for (const f of flags) counts[f.flagType] = (counts[f.flagType] || 0) + 1;
    console.log(`[context.service] retrieveFlags(${driverUuid}) → ${flags.length} flags found, summary: ${JSON.stringify(counts)}`);
    return { recentFlags: flags, summary: counts };
  } catch (err) {
    console.error(`[context.service] retrieveFlags ERROR: ${err.message}`);
    return { recentFlags: [], summary: {} };
  }
}

/** Retriever 5: Driver assessment form answers (if completed) */
async function retrieveAssessment(driverUuid) {
  try {
    const a = await prisma.driverAssessment.findFirst({
      where: { driverId: driverUuid },
    });
    return a ?? null;
  } catch {
    return null;
  }
}

/** Retriever 6: Driver profile from DB */
async function retrieveProfile(driverUuid) {
  try {
    return await prisma.driver.findUnique({
      where:  { id: driverUuid },
      select: { name: true, driverId: true, vehicleType: true, createdAt: true },
    });
  } catch {
    return null;
  }
}

/** Retriever 7: Incident Feedback */
async function retrieveFeedback(driverUuid) {
  try {
    const feedback = await prisma.incidentFeedback.findMany({
      where: { driverId: driverUuid },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { flagId: true, tripId: true, feedbackType: true, createdAt: true }
    });
    return feedback;
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// Primary assembler — called by chat.service.js before each Gemini call
//
// Future RAG migration path:
//   1. Replace each retriever with a ChromaDB vector query
//   2. Replace assembleContext() with a LangChain retrieval chain
//   3. formatContextForPrompt() becomes the prompt template
// ─────────────────────────────────────────────────────────────
export async function assembleContext(driverUuid, mlDriverId) {
  console.log(`[context.service] assembleContext called — UUID=${driverUuid}, mlDriverId=${mlDriverId}`);

  const [prediction, insights, trips, flagData, assessment, profile, feedback] = await Promise.all([
    retrievePrediction(mlDriverId),
    retrieveInsights(mlDriverId),
    retrieveTrips(driverUuid),
    retrieveFlags(driverUuid),
    retrieveAssessment(driverUuid),
    retrieveProfile(driverUuid),
    retrieveFeedback(driverUuid),
  ]);

  console.log(`[context.service] assembleContext COMPLETE:`);
  console.log(`  profile    : ${JSON.stringify(profile)}`);
  console.log(`  prediction : ${JSON.stringify(prediction)?.slice(0, 120)}`);
  console.log(`  trips      : ${trips.length} rows`);
  console.log(`  flags      : ${flagData.recentFlags?.length} rows, summary=${JSON.stringify(flagData.summary)}`);
  console.log(`  insights   : ${insights.length} rows`);
  console.log(`  assessment : ${assessment ? 'found' : 'null'}`);
  console.log(`  feedback   : ${feedback.length} rows`);

  return {
    prediction,
    insights,
    trips,
    flagData,
    assessment,
    profile,
    feedback,
    mlDriverId,
    retrievedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// Context → Prompt string formatter
// Future: replace with LangChain PromptTemplate
// ─────────────────────────────────────────────────────────────
export function formatContextForPrompt(ctx) {
  const p  = ctx.prediction  || {};
  const pr = ctx.profile      || {};
  const as = ctx.assessment   || null;

  // Prediction block
  const predBlock = p.needs_assessment
    ? 'Risk Assessment: PENDING (driver has not yet completed their assessment form)'
    : [
        `Risk Level: ${p.risk_level ?? 'Unknown'}`,
        `Confidence: ${p.confidence != null ? (p.confidence * 100).toFixed(1) + '%' : 'N/A'}`,
        `Safety Score: ${p.predicted_safety_score ?? 'N/A'} / 100`,
        `Rating: ${p.rating ?? 'N/A'} / 5`,
        `Daily Productivity: ${p.daily_productivity != null ? 'Rs.' + p.daily_productivity.toFixed(0) : 'N/A'}`,
        `Total Flags in Profile: ${p.total_flags ?? 'N/A'}`,
        p.top_features?.length
          ? `Top Risk Factors: ${p.top_features.slice(0, 3).map((f) => `${f.feature.replace(/_/g, ' ')} (${(f.importance * 100).toFixed(0)}%)`).join(', ')}`
          : '',
      ].filter(Boolean).join('\n');

  // Trips block
  const tripCount = ctx.trips.length;
  const totalEarnings = ctx.trips.reduce((s, t) => s + (t.earnings || 0), 0);
  const totalDist     = ctx.trips.reduce((s, t) => s + (t.distance || 0), 0);
  const tripsBlock = tripCount
    ? [
        `Recent Trips Analyzed: ${tripCount}`,
        `Total Distance (recent): ${totalDist.toFixed(1)} km`,
        `Total Earnings (recent): Rs.${totalEarnings.toFixed(0)}`,
        `Trips With Flags: ${ctx.trips.filter((t) => t.flagCount > 0).length}`,
      ].join('\n')
    : 'No trip data available yet.';

  // Flags block
  const flagSummary = Object.entries(ctx.flagData.summary)
    .map(([type, count]) => `${type.replace(/_/g, ' ')}: ${count}x`)
    .join(', ') || 'No flags recorded';

  // Insights block (first 3 summaries)
  const insightsBlock = ctx.insights.length
    ? ctx.insights
        .slice(0, 3)
        .map((ins) => `- [${ins.type}] ${ins.summary || ins.description || ''}`)
        .join('\n')
    : 'No insights generated yet.';

  // Assessment block
  const assessBlock = as
    ? [
        `City: ${as.city ?? 'N/A'}`,
        `Experience: ${as.experienceMonths ?? 'N/A'} months`,
        `Shift: ${as.shiftPreference ?? 'N/A'}`,
        `Avg Hours/Day: ${as.avgHoursPerDay ?? 'N/A'}`,
      ].join(', ')
    : 'Assessment form not yet completed.';

  return `
=== DRIVER CONTEXT ===
Driver ID: ${ctx.mlDriverId}
Name: ${pr.name ?? 'Unknown'}
Vehicle Type: ${pr.vehicleType ?? 'N/A'}
City: ${pr.city ?? 'N/A'}

=== RISK PREDICTION ===
${predBlock}

=== RECENT TRIPS ===
${tripsBlock}

=== SAFETY FLAGS ===
${flagSummary}

=== AI INSIGHTS ===
${insightsBlock}

=== DRIVER ASSESSMENT ===
${assessBlock}
`.trim();
}
