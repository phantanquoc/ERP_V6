import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearSystemOperationsData() {
  console.log('🗑️  Bắt đầu xóa dữ liệu...\n');

  try {
    // Xóa theo thứ tự để tránh lỗi foreign key
    // 1. Xóa QualityEvaluation trước (có FK đến FinishedProduct)
    const deletedQualityEvaluations = await prisma.qualityEvaluation.deleteMany({});
    console.log(`✅ Đã xóa ${deletedQualityEvaluations.count} bản ghi QualityEvaluation`);

    // 2. Xóa FinishedProduct
    const deletedFinishedProducts = await prisma.finishedProduct.deleteMany({});
    console.log(`✅ Đã xóa ${deletedFinishedProducts.count} bản ghi FinishedProduct`);

    // 3. Xóa SystemOperation
    const deletedSystemOperations = await prisma.systemOperation.deleteMany({});
    console.log(`✅ Đã xóa ${deletedSystemOperations.count} bản ghi SystemOperation`);

    console.log('\n🎉 Hoàn tất xóa dữ liệu!');
  } catch (error) {
    console.error('❌ Lỗi khi xóa dữ liệu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearSystemOperationsData();

