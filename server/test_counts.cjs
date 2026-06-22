const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const drivers = ['DRV0001', 'DRV0050', 'DRV0100', 'DRV0200', 'DRV0500'];
  console.log('Driver ID | DB Trips | DB Flags');
  for (const d of drivers) {
    const driver = await prisma.driver.findUnique({ where: { driverId: d }});
    if (!driver) {
      console.log(d + ' NOT FOUND IN DB');
      continue;
    }
    const trips = await prisma.trip.count({ where: { driverId: driver.id }});
    const flags = await prisma.flag.count({ where: { driverId: driver.id }});
    console.log(d + ' | ' + trips + ' | ' + flags);
  }
}

run().finally(() => prisma.$disconnect());
