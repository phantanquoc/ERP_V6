import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSequence() {
  try {
    console.log('🔄 Fixing repair_requests sequence...');

    // Get the max ID from repair_requests table
    const result = await prisma.$queryRaw<Array<{ max: number | null }>>`
      SELECT MAX(id) as max FROM common.repair_requests
    `;

    const maxId = result[0]?.max || 0;
    const nextId = maxId + 1;

    console.log(`📊 Current max ID: ${maxId}`);
    console.log(`🔢 Setting sequence to: ${nextId}`);

    // Reset the sequence to the next available ID
    await prisma.$executeRaw`
      SELECT setval(pg_get_serial_sequence('common.repair_requests', 'id'), ${nextId}, false)
    `;

    console.log('✅ Sequence fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing sequence:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixSequence();

