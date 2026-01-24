import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateRepairRequests() {
  try {
    console.log('🔄 Bắt đầu migrate dữ liệu yêu cầu sửa chữa...');

    // Get all acceptance handovers
    const acceptanceHandovers = await prisma.acceptanceHandover.findMany({
      select: {
        id: true,
        repairRequestId: true,
        maYeuCauSuaChua: true,
        tenHeThongThietBi: true,
        tinhTrangTruocSuaChua: true,
        ngayNghiemThu: true,
      },
    });

    console.log(`📊 Tìm thấy ${acceptanceHandovers.length} nghiệm thu bàn giao`);

    // Create repair requests for each acceptance handover
    for (const handover of acceptanceHandovers) {
      // Check if repair request already exists
      const existingRequest = await prisma.repairRequest.findUnique({
        where: { id: handover.repairRequestId },
      });

      if (!existingRequest) {
        console.log(`➕ Tạo yêu cầu sửa chữa ID ${handover.repairRequestId} cho nghiệm thu ${handover.maYeuCauSuaChua}`);
        
        await prisma.repairRequest.create({
          data: {
            id: handover.repairRequestId,
            maYeuCau: handover.maYeuCauSuaChua,
            ngayThang: handover.ngayNghiemThu,
            tenHeThong: handover.tenHeThongThietBi,
            tinhTrangThietBi: handover.tinhTrangTruocSuaChua,
            loaiLoi: 'Lỗi hệ thống', // Default value
            mucDoUuTien: 'Trung bình', // Default value
            noiDungLoi: handover.tinhTrangTruocSuaChua,
            trangThai: 'Đã hoàn thành', // Since it has acceptance handover
          },
        });
      } else {
        console.log(`✅ Yêu cầu sửa chữa ID ${handover.repairRequestId} đã tồn tại`);
      }
    }

    console.log('✅ Hoàn thành migrate dữ liệu!');
  } catch (error) {
    console.error('❌ Lỗi khi migrate:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateRepairRequests();

