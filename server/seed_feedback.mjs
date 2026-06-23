/**
 * Seeds 100 IncidentFeedback records spread across existing drivers/trips/flags.
 * Safe to run multiple times — uses createMany with skipDuplicates.
 */
import prisma from './src/config/prisma.js';

const FEEDBACK_TYPES = ['CORRECT', 'INCORRECT', 'NOT_RELEVANT'];

async function seedFeedback() {
  console.log('🔍 Checking existing data...');

  // Get existing feedback to know current count
  const existingCount = await prisma.incidentFeedback.count();
  console.log(`  Existing feedback records: ${existingCount}`);

  if (existingCount >= 100) {
    console.log('✅ Already have 100+ feedback records. No seeding needed.');
    await prisma.$disconnect();
    return;
  }

  const needed = 100 - existingCount;
  console.log(`  Need to seed ${needed} more records.`);

  // Get flags that don't have feedback yet (since flagId is @unique in IncidentFeedback)
  const existingFeedbackFlagIds = await prisma.incidentFeedback.findMany({
    select: { flagId: true }
  });
  const usedFlagIds = new Set(existingFeedbackFlagIds.map(f => f.flagId));

  // Fetch flags that haven't been used yet
  const availableFlags = await prisma.flag.findMany({
    take: needed + 50, // fetch a bit extra for safety
    where: {
      id: { notIn: [...usedFlagIds] }
    },
    select: { id: true, driverId: true, tripId: true }
  });

  if (availableFlags.length === 0) {
    console.error('❌ No unused flags available to attach feedback to!');
    await prisma.$disconnect();
    return;
  }

  const toSeed = availableFlags.slice(0, needed);
  console.log(`  Seeding ${toSeed.length} records...`);

  const feedbackData = toSeed.map((flag, i) => ({
    driverId: flag.driverId,
    tripId: flag.tripId,
    flagId: flag.id,
    feedbackType: FEEDBACK_TYPES[i % FEEDBACK_TYPES.length],
  }));

  const result = await prisma.incidentFeedback.createMany({
    data: feedbackData,
    skipDuplicates: true,
  });

  console.log(`✅ Seeded ${result.count} feedback records.`);

  const finalCount = await prisma.incidentFeedback.count();
  console.log(`📊 Total feedback records now: ${finalCount}`);

  // Show a quick stats preview
  const group = await prisma.incidentFeedback.groupBy({
    by: ['feedbackType'],
    _count: { _all: true }
  });
  console.log('\n📈 Feedback distribution:');
  group.forEach(g => console.log(`   ${g.feedbackType}: ${g._count._all}`));

  await prisma.$disconnect();
  console.log('\n✅ Done!');
}

seedFeedback().catch(e => {
  console.error('Seed failed:', e);
  process.exit(1);
});
