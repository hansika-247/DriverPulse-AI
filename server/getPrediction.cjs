const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [driverId] = process.argv.slice(2);
  
  if (!driverId) {
    console.error("Missing driverId");
    process.exit(1);
  }

  try {
    const prediction = await prisma.driverPrediction.findFirst({
      where: { driverId },
      orderBy: { createdAt: 'desc' }
    });
    console.log(JSON.stringify(prediction || {}));
  } catch (err) {
    console.error("Error fetching prediction:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
