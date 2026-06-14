const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [driverId, riskLabel, confidenceStr, safetyScoreStr] = process.argv.slice(2);
  
  if (!driverId || !riskLabel || !confidenceStr || !safetyScoreStr) {
    console.error("Missing arguments");
    process.exit(1);
  }

  const confidence = parseFloat(confidenceStr);
  const safetyScore = parseFloat(safetyScoreStr);

  try {
    const prediction = await prisma.driverPrediction.create({
      data: {
        driverId,
        riskLabel,
        confidence,
        safetyScore
      }
    });
    console.log(JSON.stringify(prediction));
  } catch (err) {
    console.error("Error inserting prediction:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
