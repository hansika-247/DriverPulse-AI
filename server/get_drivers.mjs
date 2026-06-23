import prisma from './src/config/prisma.js';
const drivers = await prisma.driver.findMany({ take: 3, select: { id: true, driverId: true, username: true } });
console.log('Sample drivers:', JSON.stringify(drivers, null, 2));
await prisma.$disconnect();
