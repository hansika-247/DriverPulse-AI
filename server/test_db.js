import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTrips(driverIdStr) {
  // Find driver by DRV0001 format
  const driver = await prisma.driver.findFirst({
    where: { driverId: driverIdStr }
  });
  
  if (!driver) {
    console.log(`Driver ${driverIdStr} not found in DB`);
    return;
  }
  
  const trips = await prisma.trip.findMany({
    where: { driverId: driver.id },
    orderBy: { startTime: 'desc' }
  });
  
  console.log(`\n--- Driver: ${driverIdStr} ---`);
  console.log(`Number of trips returned: ${trips.length}`);
  if (trips.length > 0) {
    console.log(`First trip object:`, trips[0]);
  }
}

async function main() {
  await checkTrips('DRV0001');
  await checkTrips('DRV0050');
  await checkTrips('DRV0500');
  await prisma.$disconnect();
}

main();
