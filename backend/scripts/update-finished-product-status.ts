import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting FinishedProduct trangThai update...\n');

  // Find all FinishedProduct records
  const finishedProducts = await prisma.finishedProduct.findMany({
    select: {
      id: true,
      maChien: true,
      machineId: true,
      tenMay: true,
      trangThai: true,
    },
  });

  console.log(`📊 Found ${finishedProducts.length} FinishedProduct records\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;

  for (const fp of finishedProducts) {
    // Skip if no tenMay to match
    if (!fp.tenMay) {
      console.log(`⚠️  FinishedProduct ${fp.id} (maChien: ${fp.maChien}) has no tenMay, skipping...`);
      notFoundCount++;
      continue;
    }

    // Find corresponding SystemOperation by maChien and tenMay (more reliable for old records)
    const systemOperation = await prisma.systemOperation.findFirst({
      where: {
        maChien: fp.maChien,
        tenMay: fp.tenMay,
      },
      select: {
        id: true,
        trangThai: true,
        tenMay: true,
      },
    });

    if (!systemOperation) {
      console.log(`⚠️  No SystemOperation found for FinishedProduct ${fp.id} (maChien: ${fp.maChien}, machineId: ${fp.machineId})`);
      notFoundCount++;
      continue;
    }

    // Update FinishedProduct with trangThai from SystemOperation
    try {
      await prisma.finishedProduct.update({
        where: { id: fp.id },
        data: { trangThai: systemOperation.trangThai },
      });
      console.log(`✅ Updated FinishedProduct ${fp.id} (maChien: ${fp.maChien}) -> trangThai: ${systemOperation.trangThai}`);
      updatedCount++;
    } catch (error) {
      console.error(`❌ Failed to update FinishedProduct ${fp.id}:`, error);
      skippedCount++;
    }
  }

  console.log('\n📈 Summary:');
  console.log(`   - Total records: ${finishedProducts.length}`);
  console.log(`   - Updated: ${updatedCount}`);
  console.log(`   - Not found (no matching SystemOperation): ${notFoundCount}`);
  console.log(`   - Skipped (errors): ${skippedCount}`);
  console.log('\n✨ Update completed!');
}

main()
  .catch((e) => {
    console.error('❌ Update failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

