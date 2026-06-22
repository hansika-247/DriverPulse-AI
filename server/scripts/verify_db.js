import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Verifying Database ---');
  
  // 1. Verify counts
  const tripsCount = await prisma.$queryRaw`SELECT count(*) FROM trips`;
  const flagsCount = await prisma.$queryRaw`SELECT count(*) FROM flags`;

  console.log(`\nRow counts:`);
  console.log(`trips: ${tripsCount[0].count}`);
  console.log(`flags: ${flagsCount[0].count}`);

  // 2. Print sample records
  console.log(`\n--- Sample Records ---`);
  
  const sampleTrip = await prisma.$queryRaw`SELECT * FROM trips LIMIT 1`;
  console.log(`\nSample Trip:`);
  console.log(sampleTrip[0]);

  const sampleFlag = await prisma.$queryRaw`SELECT * FROM flags LIMIT 1`;
  console.log(`\nSample Flag:`);
  console.log(sampleFlag[0]);

  console.log('\nVerification complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
