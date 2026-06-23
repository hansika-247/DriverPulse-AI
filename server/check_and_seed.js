import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking IncidentFeedback data...');
  const count = await prisma.incidentFeedback.count();
  console.log(`Found ${count} records.`);

  if (count === 0) {
    console.log('Seeding feedback data...');
    // Find some drivers with flags
    const flags = await prisma.flag.findMany({
      take: 20,
    });

    if (flags.length === 0) {
      console.log('No flags found in the database. Cannot seed feedback.');
      return;
    }

    const feedbackTypes = ['CORRECT', 'CORRECT', 'CORRECT', 'INCORRECT', 'NOT_RELEVANT'];
    
    for (let i = 0; i < flags.length; i++) {
      const flag = flags[i];
      const feedbackType = feedbackTypes[i % feedbackTypes.length];
      
      await prisma.incidentFeedback.create({
        data: {
          driverId: flag.driverId,
          tripId: flag.tripId,
          flagId: flag.id,
          feedbackType: feedbackType,
        }
      });
    }
    console.log(`Seeded ${flags.length} feedback records.`);
  } else {
    console.log('Feedback data already exists. No seeding required.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
