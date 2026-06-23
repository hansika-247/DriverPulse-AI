import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    const count = await prisma.incidentFeedback.count();
    console.log('IncidentFeedback count:', count);
    const flagCount = await prisma.flag.count();
    console.log('Flag count:', flagCount);
    const driverCount = await prisma.driver.count();
    console.log('Driver count:', driverCount);
    const tripCount = await prisma.trip.count();
    console.log('Trip count:', tripCount);

    if (count > 0) {
      const sample = await prisma.incidentFeedback.findMany({ take: 3, include: { flag: true } });
      console.log('Sample feedback:', JSON.stringify(sample, null, 2));
    } else {
      console.log('⚠️  incident_feedback table is EMPTY — need to seed data!');
    }
  } catch(e) {
    console.error('DB error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
check();
