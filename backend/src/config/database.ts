import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  // Chỉ hiển thị errors và warnings, tắt query logs để console sạch hơn
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export default prisma;

