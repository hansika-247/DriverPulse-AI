import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Helper to parse CSV manually without dependencies
function loadRiskLabels() {
  const csvPath = path.resolve(__dirname, '../../processed/final_driver_dataset.csv');
  if (!fs.existsSync(csvPath)) {
      console.log("CSV not found at", csvPath, "- falling back to default LOW risk for everyone");
      return {};
  }
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split('\n');
  const headers = lines[0].split(',');
  const idIndex = headers.indexOf('driver_id');
  const riskIndex = headers.indexOf('risk_label');
  
  if (idIndex === -1 || riskIndex === -1) {
      console.log("Could not find driver_id or risk_label in CSV headers");
      return {};
  }
  
  const riskMap = {};
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = lines[i].split(',');
    if (row[idIndex]) {
      riskMap[row[idIndex]] = row[riskIndex];
    }
  }
  return riskMap;
}

const FLAG_TYPES = ['harsh_braking', 'rapid_acceleration', 'distraction', 'phone_usage', 'fatigue', 'noise_event'];

function generateRoute() {
  const points = [];
  let lat = 19.076 + (Math.random() - 0.5) * 0.1;
  let lng = 72.877 + (Math.random() - 0.5) * 0.1;
  const numPoints = Math.floor(Math.random() * 20) + 10;
  for (let i=0; i<numPoints; i++) {
    points.push([lng, lat]);
    lat += (Math.random() - 0.5) * 0.01;
    lng += (Math.random() - 0.5) * 0.01;
  }
  return points;
}

async function seed() {
  console.log('Loading risk labels from CSV...');
  const riskMap = loadRiskLabels();
  
  console.log('Fetching drivers from database...');
  const drivers = await prisma.driver.findMany();
  console.log(`Found ${drivers.length} drivers.`);
  
  console.log('Deleting existing trips and flags to ensure a clean state...');
  await prisma.flag.deleteMany();
  await prisma.trip.deleteMany();
  console.log('Deleted existing trips and flags.');
  
  let totalTrips = 0;
  let totalFlags = 0;
  const tripsDist = {};
  const flagsDist = {};
  
  console.log('Generating new trips and flags (this might take a minute)...');
  
  for (const driver of drivers) {
    const riskLabel = riskMap[driver.driverId] || 'LOW';
    
    // Target 7-10 trips (min 4)
    const numTrips = Math.floor(Math.random() * (10 - 4 + 1)) + 4;
    tripsDist[driver.driverId] = numTrips;
    flagsDist[driver.driverId] = 0;
    
    for (let t=0; t<numTrips; t++) {
      const now = new Date();
      // Random start time in last 30 days
      const startDaysAgo = Math.floor(Math.random() * 30);
      const startHoursAgo = Math.floor(Math.random() * 24);
      const startTime = new Date(now.getTime() - (startDaysAgo * 24 + startHoursAgo) * 3600000);
      
      const durationMins = Math.floor(Math.random() * 60) + 15;
      const endTime = new Date(startTime.getTime() + durationMins * 60000);
      
      const distance = Math.round((Math.random() * 40 + 5) * 10) / 10;
      const earnings = Math.round((distance * (Math.random() * 10 + 10)) * 100) / 100;
      const avgSpeed = Math.round(distance / (durationMins / 60));
      const routeCoordinates = generateRoute();
      
      const trip = await prisma.trip.create({
        data: {
          driverId: driver.id,
          startTime,
          endTime,
          distance,
          earnings,
          avgSpeed,
          route: 'Generated Route',
          routeCoordinates: JSON.stringify(routeCoordinates),
          status: 'COMPLETED'
        }
      });
      totalTrips++;
      
      // Flags
      let minFlags = 0;
      let maxFlags = 5;
      
      // Apply probability weight based on risk label
      if (riskLabel === 'HIGH') {
         minFlags = 2; maxFlags = 5;
      } else if (riskLabel === 'MEDIUM') {
         minFlags = 1; maxFlags = 3;
      } else { // LOW
         minFlags = 0; maxFlags = 1;
      }
      
      let numFlags = Math.floor(Math.random() * (maxFlags - minFlags + 1)) + minFlags;
      if (Math.random() < 0.1 && numFlags < 5) numFlags++;
      if (numFlags > 5) numFlags = 5;
      
      const flagsToCreate = [];
      for (let f=0; f<numFlags; f++) {
         const coord = routeCoordinates[Math.floor(Math.random() * routeCoordinates.length)];
         const type = FLAG_TYPES[Math.floor(Math.random() * FLAG_TYPES.length)];
         const severities = ['LOW', 'MEDIUM', 'HIGH'];
         const sev = severities[Math.floor(Math.random() * severities.length)];
         
         flagsToCreate.push({
            tripId: trip.id,
            driverId: driver.id,
            flagType: type,
            severity: sev,
            latitude: coord[1],
            longitude: coord[0],
            timestamp: new Date(startTime.getTime() + Math.random() * durationMins * 60000),
            combinedScore: Math.round(Math.random() * 100 * 10) / 10
         });
         
         flagsDist[driver.driverId]++;
      }
      
      if (flagsToCreate.length > 0) {
          await prisma.flag.createMany({
              data: flagsToCreate
          });
          totalFlags += flagsToCreate.length;
      }
    }
  }
  
  console.log('\n--- Generation Complete ---');
  console.log(`Total trips created: ${totalTrips}`);
  console.log(`Total flags created: ${totalFlags}`);
  
  console.log('\nTrips per driver distribution (Sample of 10):');
  Object.keys(tripsDist).slice(0, 10).forEach(d => {
     console.log(`${d}: ${tripsDist[d]} trips, ${flagsDist[d]} flags (Risk: ${riskMap[d] || 'LOW'})`);
  });
}

seed().then(() => {
  console.log('Successfully completed seeding script.');
  process.exit(0);
}).catch(e => {
  console.error('Error during seeding:', e);
  process.exit(1);
});
