import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Graceful shutdown - đóng connection pool khi process tắt
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;

