const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
Promise.all([
  p.driver.count(),
  p.trip.count(),
  p.flag.count(),
  p.aIInsight.count(),
  p.driverPrediction.count(),
  p.driver.findMany({ select: { id: true, driverId: true, username: true, name: true } })
]).then(([drivers, trips, flags, insights, predictions, driverList]) => {
  console.log('=== DB STATE ===');
  console.log('drivers    :', drivers);
  console.log('trips      :', trips);
  console.log('flags      :', flags);
  console.log('insights   :', insights);
  console.log('predictions:', predictions);
  console.log('\nDriver list:');
  driverList.forEach(d => console.log(' ', d.driverId, '|', d.username, '|', d.name, '| uuid:', d.id));
}).catch(e => {
  console.error('ERROR:', e.message);
}).finally(() => p.$disconnect());
