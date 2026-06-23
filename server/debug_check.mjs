import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const drivers = await prisma.driver.findMany({ 
    take: 10, 
    select: { id: true, driverId: true, name: true } 
  });
  
  console.log('\n=== DRIVERS IN DB ===');
  console.log(JSON.stringify(drivers, null, 2));
  
  console.log('\n=== FLAG COUNTS PER DRIVER ===');
  for (const d of drivers) {
    const flagCount = await prisma.flag.count({ where: { driverId: d.id } });
    const tripCount = await prisma.trip.count({ where: { driverId: d.id } });
    console.log(`${d.driverId} (UUID: ${d.id.slice(0,8)}...) → ${flagCount} flags, ${tripCount} trips`);
  }
  
  console.log('\n=== SAMPLE FLAGS (first 5) ===');
  const flags = await prisma.flag.findMany({ take: 5, select: { id: true, flagType: true, severity: true, driverId: true } });
  console.log(JSON.stringify(flags, null, 2));

} catch (err) {
  console.error('DB Error:', err.message);
} finally {
  await prisma.$disconnect();
}
