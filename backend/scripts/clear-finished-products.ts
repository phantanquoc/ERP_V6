import prisma from '../src/config/database';

async function clearFinishedProducts() {
  try {
    console.log('🗑️  Đang xóa tất cả finished_products...');
    
    const result = await prisma.finishedProduct.deleteMany({});
    
    console.log(`✅ Đã xóa ${result.count} bản ghi finished_products`);
    console.log('✨ Hoàn thành!');
  } catch (error) {
    console.error('❌ Lỗi khi xóa dữ liệu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearFinishedProducts();

