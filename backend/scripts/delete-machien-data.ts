import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteMaChienData(maChien: string) {
  console.log(`\n🔍 Đang tìm dữ liệu với mã chiên: "${maChien}"...\n`);

  // Count existing records
  const systemOpsCount = await prisma.systemOperation.count({ where: { maChien } });
  const finishedProductsCount = await prisma.finishedProduct.count({ where: { maChien } });
  const qualityEvaluationsCount = await prisma.qualityEvaluation.count({ where: { maChien } });

  console.log(`📊 Tìm thấy:`);
  console.log(`   - SystemOperation: ${systemOpsCount} bản ghi`);
  console.log(`   - FinishedProduct: ${finishedProductsCount} bản ghi`);
  console.log(`   - QualityEvaluation: ${qualityEvaluationsCount} bản ghi`);

  if (systemOpsCount === 0 && finishedProductsCount === 0 && qualityEvaluationsCount === 0) {
    console.log(`\n⚠️  Không tìm thấy dữ liệu nào với mã chiên "${maChien}"`);
    return;
  }

  console.log(`\n🗑️  Đang xóa dữ liệu...`);

  // Delete in transaction (order matters due to foreign keys)
  await prisma.$transaction(async (tx) => {
    // 1. Delete QualityEvaluation first (references FinishedProduct)
    const deletedQE = await tx.qualityEvaluation.deleteMany({ where: { maChien } });
    console.log(`   ✅ Đã xóa ${deletedQE.count} QualityEvaluation`);

    // 2. Delete FinishedProduct
    const deletedFP = await tx.finishedProduct.deleteMany({ where: { maChien } });
    console.log(`   ✅ Đã xóa ${deletedFP.count} FinishedProduct`);

    // 3. Delete SystemOperation
    const deletedSO = await tx.systemOperation.deleteMany({ where: { maChien } });
    console.log(`   ✅ Đã xóa ${deletedSO.count} SystemOperation`);
  });

  console.log(`\n🎉 Hoàn tất! Đã xóa tất cả dữ liệu của mã chiên "${maChien}"`);
}

// Get maChien from command line argument or default to "C001"
const maChien = process.argv[2] || 'C001';

deleteMaChienData(maChien)
  .catch((error) => {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

