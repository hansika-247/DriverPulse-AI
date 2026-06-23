import prisma from './src/config/prisma.js';
// Get a driver from the DB to test with - pick the first one
const drivers = await prisma.driver.findMany({
  take: 5,
  select: { id: true, driverId: true, username: true, passwordHash: true }
});
console.log('Sample drivers:');
drivers.forEach(d => console.log(`  driverId=${d.driverId}, username=${d.username}, has_hash=${d.passwordHash?.length > 0}`));
await prisma.$disconnect();
