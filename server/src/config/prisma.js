import { PrismaClient } from '@prisma/client';

// Singleton pattern — prevents multiple Prisma instances during development hot reload
const globalForPrisma = globalThis;

const prisma = globalForPrisma.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

export default prisma;
