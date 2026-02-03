import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting QualityEvaluation backfill for existing FinishedProducts...\n');

  // Find all FinishedProduct records with their related data
  const finishedProducts = await prisma.finishedProduct.findMany({
    select: {
      id: true,
      maChien: true,
      thoiGianChien: true,
      tenHangHoa: true,
      machineId: true,
      tenMay: true,
      materialEvaluationId: true,
      nguoiThucHien: true,
      // Percentage fields
      aTiLe: true,
      bTiLe: true,
      bDauTiLe: true,
      cTiLe: true,
      vunLonTiLe: true,
      vunNhoTiLe: true,
      phePhamTiLe: true,
      uotTiLe: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`📊 Found ${finishedProducts.length} FinishedProduct records\n`);

  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const fp of finishedProducts) {
    // Check if QualityEvaluation already exists for this FinishedProduct
    const existingEvaluation = await prisma.qualityEvaluation.findFirst({
      where: {
        OR: [
          // Match by finishedProductId (most accurate)
          { finishedProductId: fp.id },
          // Or match by maChien + machineId (unique constraint)
          {
            maChien: fp.maChien,
            machineId: fp.machineId,
          },
        ],
      },
    });

    if (existingEvaluation) {
      console.log(`⏭️  QualityEvaluation already exists for FinishedProduct ${fp.id} (maChien: ${fp.maChien}, tenMay: ${fp.tenMay})`);
      skippedCount++;
      continue;
    }

    // Create new QualityEvaluation record
    try {
      await prisma.qualityEvaluation.create({
        data: {
          maChien: fp.maChien,
          thoiGianChien: fp.thoiGianChien,
          tenHangHoa: fp.tenHangHoa,
          machineId: fp.machineId,
          tenMay: fp.tenMay,
          materialEvaluationId: fp.materialEvaluationId,
          finishedProductId: fp.id,
          nguoiThucHien: fp.nguoiThucHien || '',
          // Auto-fill percentage fields from finished product
          aTiLe: fp.aTiLe || 0,
          bTiLe: fp.bTiLe || 0,
          bDauTiLe: fp.bDauTiLe || 0,
          cTiLe: fp.cTiLe || 0,
          vunLonTiLe: fp.vunLonTiLe || 0,
          vunNhoTiLe: fp.vunNhoTiLe || 0,
          phePhamTiLe: fp.phePhamTiLe || 0,
          uotTiLe: fp.uotTiLe || 0,
          // Quality evaluation fields default to empty
          mauSac: '',
          muiHuong: '',
          huongVi: '',
          doNgot: '',
          doGion: '',
          danhGiaTongQuan: '',
          deXuatDieuChinh: '',
        },
      });
      console.log(`✅ Created QualityEvaluation for FinishedProduct ${fp.id} (maChien: ${fp.maChien}, tenMay: ${fp.tenMay})`);
      createdCount++;
    } catch (error: any) {
      // Handle unique constraint violation (in case of race condition)
      if (error.code === 'P2002') {
        console.log(`⏭️  QualityEvaluation already exists (unique constraint) for FinishedProduct ${fp.id}`);
        skippedCount++;
      } else {
        console.error(`❌ Failed to create QualityEvaluation for FinishedProduct ${fp.id}:`, error.message);
        errorCount++;
      }
    }
  }

  console.log('\n📈 Summary:');
  console.log(`   - Total FinishedProducts: ${finishedProducts.length}`);
  console.log(`   - QualityEvaluations created: ${createdCount}`);
  console.log(`   - Skipped (already exist): ${skippedCount}`);
  console.log(`   - Errors: ${errorCount}`);
  console.log('\n✨ Backfill completed!');
}

main()
  .catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

