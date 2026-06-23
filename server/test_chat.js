import prisma from './src/config/prisma.js';
import { chat } from './src/services/chat.service.js';
import { assembleContext, formatContextForPrompt } from './src/services/context.service.js';
import 'dotenv/config';

async function main() {
  console.log("==================================================");
  console.log("DRIVER PULSE AI AUDIT TRACE");
  console.log("==================================================");

  // 1. Get a driver to test
  const driver = await prisma.driver.findFirst();
  if (!driver) {
    console.log("No drivers found.");
    return;
  }
  const driverUuid = driver.id;
  const mlDriverId = driver.driverId;

  console.log(`\\n[1] Driver ID Used: ${driverUuid} (${mlDriverId})`);

  // 2. Trace Context Retrieval (Database Queries Executed implicitly inside assembleContext)
  console.log(`\\n[2] Executing Context Retrieval Queries...`);
  const ctx = await assembleContext(driverUuid, mlDriverId);
  const contextBlock = formatContextForPrompt(ctx);
  
  console.log(`\\n[3] Retrieved Data (Local Formatter - Bypassing ChromaDB/Similarity Scores due to RAG Service absence):`);
  console.log("--------------------------------------------------");
  console.log(contextBlock);
  console.log("--------------------------------------------------");

  // 3. Test queries
  const questions = [
    "Why am I high risk?",
    "Which category is most in my flagged events?",
    "How many harsh braking events do I have?",
    "Which route has the most incidents?",
  ];

  for (const q of questions) {
    console.log(`\\n\\n>>> Query: "${q}"`);
    console.log("...Calling Gemini...");
    const record = await chat(driverUuid, mlDriverId, q, 'en');
    console.log("\\n>>> AI Response:");
    console.log(record.response);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
