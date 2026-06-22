const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function main() {
  const prisma = new PrismaClient();
  const drivers = ['DRV0001', 'DRV0050', 'DRV0100', 'DRV0200', 'DRV0500'];
  
  console.log('--- DB STATS ---');
  for (const id of drivers) {
    const driver = await prisma.driver.findFirst({
      where: { driverId: id },
      include: {
        _count: { select: { trips: true, flags: true } }
      }
    });
    if (driver) {
      console.log(id, 'Trips:', driver._count.trips, 'Flags:', driver._count.flags);
    } else {
      console.log(id, 'Not Found in DB');
    }
  }
  
  console.log('\n--- CSV STATS ---');
  const csvData = fs.readFileSync('../backend/data/processed/final_driver_dataset.csv', 'utf8').split('\n');
  const headers = csvData[0].split(',');
  const idIdx = headers.indexOf('driver_id');
  const flagsIdx = headers.indexOf('total_flags');
  
  if (idIdx === -1) {
    console.log('driver_id not found in CSV. Row indices might be used.');
  }
  
  for (const id of drivers) {
    let found = false;
    for (let i = 1; i < csvData.length; i++) {
       const row = csvData[i].split(',');
       if (idIdx !== -1 && row[idIdx] === id) {
          console.log(id, 'CSV Flags:', row[flagsIdx]);
          found = true;
          break;
       } else if (idIdx === -1) {
          const rowNum = parseInt(id.replace('DRV', ''), 10);
          if (i === rowNum) {
             console.log(id, 'CSV Flags:', row[flagsIdx]);
             found = true;
             break;
          }
       }
    }
    if (!found) console.log(id, 'Not found in CSV');
  }
  
  await prisma.$disconnect();
}
main();
