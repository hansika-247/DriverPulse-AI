import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing old data...');
  await prisma.flag.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.aIInsight.deleteMany();
  await prisma.chatHistory.deleteMany();
  await prisma.driver.deleteMany();

  console.log('Generating 5 drivers...');
  const drivers = [];
  
  for (let i = 1; i <= 5; i++) {
    const passwordHash = await bcrypt.hash('password123', 10);
    const driver = await prisma.driver.create({
      data: {
        driverId: `DRV2025000${i}`,
        username: `driver${i}`,
        email: `driver${i}@driverpulse.com`,
        passwordHash,
        name: `Driver ${i} Name`,
        phone: `+1555100000${i}`,
        vehicleNumber: `MH0${i}AB123${i}`,
        vehicleType: i % 2 === 0 ? 'suv' : 'sedan',
      },
    });
    drivers.push(driver);
    console.log(`Created driver: ${driver.name} (${driver.driverId})`);
  }

  const flagTypes = ['hard_braking', 'speeding', 'phone_usage', 'tailgating'];
  const severities = ['LOW', 'MEDIUM', 'HIGH'];

  for (const driver of drivers) {
    console.log(`Generating 100 trips for ${driver.driverId}...`);
    
    // Generate 100 trips
    for (let t = 0; t < 100; t++) {
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - Math.floor(Math.random() * 30)); // random within last 30 days
      const endTime = new Date(startTime.getTime() + (Math.random() * 2 + 0.5) * 60 * 60 * 1000); // 30 mins to 2.5 hours

      const trip = await prisma.trip.create({
        data: {
          driverId: driver.id,
          startTime,
          endTime,
          distance: Math.random() * 50 + 5,
          earnings: Math.random() * 40 + 10,
          avgSpeed: Math.random() * 40 + 20,
          route: `Location A to Location B`,
          status: 'COMPLETED',
        },
      });

      // Add 0-3 flags per trip
      const numFlags = Math.floor(Math.random() * 4);
      for (let f = 0; f < numFlags; f++) {
        await prisma.flag.create({
          data: {
            tripId: trip.id,
            driverId: driver.id,
            flagType: flagTypes[Math.floor(Math.random() * flagTypes.length)],
            severity: severities[Math.floor(Math.random() * severities.length)],
            latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
            longitude: -122.4194 + (Math.random() - 0.5) * 0.1,
            motionScore: Math.random(),
            audioScore: Math.random(),
            combinedScore: Math.random(),
            timestamp: new Date(startTime.getTime() + Math.random() * (endTime.getTime() - startTime.getTime())),
          },
        });
      }
    }

    console.log(`Generating AI insights for ${driver.driverId}...`);
    await prisma.aIInsight.create({
      data: {
        driverId: driver.id,
        summary: 'Your driving behavior is generally safe. Most flagged events are moderate braking incidents.',
        recommendation: 'Consider increasing following distance during peak traffic to smooth out decelerations.',
        riskScore: Math.random() * 20 + 80, // 80-100
      },
    });
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
