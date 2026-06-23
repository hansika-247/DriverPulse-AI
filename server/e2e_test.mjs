/**
 * Full end-to-end test of the feedback stats API.
 * Mimics exactly what FeedbackLearning.jsx does (via apiGetFeedbackStats).
 */
import prisma from './src/config/prisma.js';
import { getFeedbackStats } from './src/services/feedback.service.js';

console.log('=== FULL FEEDBACK STATS TEST ===\n');

// 1. Check DB data
const total = await prisma.incidentFeedback.count();
console.log(`📊 Database: ${total} feedback records\n`);

// 2. Call service directly (same as controller calls it)
console.log('🔄 Calling getFeedbackStats(null) [global=true]...');
const stats = await getFeedbackStats(null);

console.log('\n✅ SERVICE RESPONSE:');
console.log(JSON.stringify(stats, null, 2));

// 3. Show what the full controller response looks like
const fullControllerResponse = {
  success: true,
  data: { stats }
};
console.log('\n📦 FULL HTTP RESPONSE BODY (what frontend receives):');
console.log(JSON.stringify(fullControllerResponse, null, 2));

// 4. Show what FeedbackLearning.jsx accesses
console.log('\n🎯 What FeedbackLearning.jsx reads:');
console.log('  res (from apiGetFeedbackStats) =', JSON.stringify(fullControllerResponse));
console.log('  res.data =', JSON.stringify(fullControllerResponse.data));
console.log('  res.data.stats =', JSON.stringify(fullControllerResponse.data.stats));
console.log('  stats.retrievalAccuracy =', fullControllerResponse.data.stats.retrievalAccuracy);
console.log('  stats.correct =', fullControllerResponse.data.stats.correct);
console.log('  stats.incorrect =', fullControllerResponse.data.stats.incorrect);
console.log('  stats.total =', fullControllerResponse.data.stats.total);
console.log('  stats.topCorrectedEvents =', JSON.stringify(fullControllerResponse.data.stats.topCorrectedEvents));

await prisma.$disconnect();
console.log('\n✅ Test complete — page should display data!');
