import prisma from './src/config/prisma.js';

// Test the exact same code as getFeedbackStats
const whereClause = {};

console.log('Step 1: counting...');
const total = await prisma.incidentFeedback.count({ where: whereClause });
console.log('Total:', total);

console.log('Step 2: groupBy...');
const group = await prisma.incidentFeedback.groupBy({
  by: ['feedbackType'],
  where: whereClause,
  _count: { _all: true }
});
console.log('GroupBy result:', JSON.stringify(group, null, 2));

console.log('Step 3: findMany with include flag...');
const topFlagsQuery = await prisma.incidentFeedback.findMany({
  where: whereClause,
  include: { flag: true }
});
console.log('FindMany count:', topFlagsQuery.length);
console.log('Sample:', JSON.stringify(topFlagsQuery[0], null, 2));

await prisma.$disconnect();
console.log('DONE');
