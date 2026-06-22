import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ? values[i].trim() : null;
    });
    return obj;
  });
}

async function main() {
  console.log('Clearing old data...');
  await prisma.flag.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.aIInsight.deleteMany();
  await prisma.chatHistory.deleteMany();
  await prisma.driverPrediction.deleteMany();
  await prisma.driverAssessment.deleteMany();
  await prisma.driver.deleteMany();

  const driversCsv = parseCSV(path.join(__dirname, '../../processed/final_driver_dataset.csv'));
  const tripsCsv = parseCSV(path.join(__dirname, '../../backend/output_data/trips.csv'));
  const flagsCsv = parseCSV(path.join(__dirname, '../../backend/output_data/flagged_moments.csv'));

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Drivers
  console.log('Importing drivers...');
  const driverMap = {}; // mapping DRV0001 -> driver.id
  for (const row of driversCsv) {
    const dId = row.driver_id;
    if (!dId) continue;
    const driver = await prisma.driver.create({
      data: {
        driverId: dId,
        username: dId.toLowerCase(),
        email: `${dId.toLowerCase()}@driverpulse.com`,
        passwordHash,
        name: row.name || `Driver ${dId}`,
        phone: `+1555000${dId.replace(/\D/g, '')}`,
        vehicleNumber: `MH01AB${dId.replace(/\D/g, '').substring(0, 4) || '1234'}`,
        vehicleType: 'sedan',
      }
    });
    driverMap[dId] = driver.id; // full format e.g. DRV0001
  }

  // Helper to match DRV001 (trips) with DRV0001 (driver map)
  function getFullDriverId(shortId) {
    if (!shortId) return null;
    const numeric = parseInt(shortId.replace(/\D/g, ''), 10);
    return `DRV${String(numeric).padStart(4, '0')}`;
  }

  // 2. Create Trips
  console.log('Importing trips...');
  const tripMap = {}; // trip_id -> db trip.id
  for (const row of tripsCsv) {
    const fullDriverId = getFullDriverId(row.driver_id);
    const dbDriverId = driverMap[fullDriverId];
    if (!dbDriverId) {
      // console.log(`Driver not found for trip ${row.trip_id}: ${fullDriverId}`);
      continue;
    }
    
    const startTime = new Date(`${row.date}T${row.start_time}Z`);
    const endTime = new Date(`${row.date}T${row.end_time}Z`);
    
    const trip = await prisma.trip.create({
      data: {
        id: row.trip_id, // Keep the ID from CSV
        driverId: dbDriverId,
        startTime,
        endTime,
        distance: parseFloat(row.distance_km) || 0,
        earnings: parseFloat(row.fare) || 0,
        avgSpeed: (parseFloat(row.distance_km) / (parseFloat(row.duration_min)/60)) || 0,
        route: `${row.pickup_location} -> ${row.dropoff_location}`,
        status: 'COMPLETED'
      }
    });
    tripMap[row.trip_id] = trip.id;
  }

  // 3. Create Flags
  console.log('Importing flags...');
  for (const row of flagsCsv) {
    const dbTripId = tripMap[row.trip_id];
    if (!dbTripId) continue;

    const fullDriverId = getFullDriverId(row.driver_id);
    const dbDriverId = driverMap[fullDriverId];
    if (!dbDriverId) continue;

    await prisma.flag.create({
      data: {
        tripId: dbTripId,
        driverId: dbDriverId,
        flagType: row.flag_type,
        severity: row.severity.toUpperCase(),
        latitude: parseFloat(row.latitude) || 0,
        longitude: parseFloat(row.longitude) || 0,
        motionScore: parseFloat(row.motion_score) || 0,
        audioScore: parseFloat(row.audio_score) || 0,
        combinedScore: parseFloat(row.combined_score) || 0,
        timestamp: new Date(`${row.timestamp}Z`)
      }
    });
  }

  console.log('Database seeded with real CSV data!');
}

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
