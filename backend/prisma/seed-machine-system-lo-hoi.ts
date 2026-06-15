/**
 * Seed hệ thống máy: Hệ thống Lò Hơi (Boiler System)
 * Loại: HOI — 12 thiết bị + maintenance templates từ form Excel
 * Sử dụng auto-generate code giống service (an toàn cho prod)
 *
 * Chạy: docker compose -f docker-compose.dev.yml exec backend npx ts-node --transpile-only prisma/seed-machine-system-lo-hoi.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SYSTEM_PREFIX = 'HI';
const DETAIL_PREFIX: Record<string, string> = {
  THIET_BI: 'TB',
  CUM: 'CUM',
  LINH_KIEN: 'LK',
  DIEM_KIEM_TRA: 'DKT',
};

async function generateSystemCode(): Promise<string> {
  const all = await prisma.machineSystem.findMany({
    where: { maHeThong: { startsWith: `${SYSTEM_PREFIX}-` } },
    select: { maHeThong: true },
  });
  let maxSeq = 0;
  for (const row of all) {
    const suffix = row.maHeThong.slice(`${SYSTEM_PREFIX}-`.length);
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxSeq) maxSeq = num;
  }
  return `${SYSTEM_PREFIX}-${String(maxSeq + 1).padStart(3, '0')}`;
}

async function generateDetailCode(loai: string): Promise<string> {
  const prefix = DETAIL_PREFIX[loai];
  const all = await prisma.machineSystemDetail.findMany({
    where: { maChiTiet: { startsWith: `${prefix}-` } },
    select: { maChiTiet: true },
  });
  let maxSeq = 0;
  for (const row of all) {
    const suffix = row.maChiTiet.slice(`${prefix}-`.length);
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxSeq) maxSeq = num;
  }
  return `${prefix}-${String(maxSeq + 1).padStart(3, '0')}`;
}

async function main(): Promise<void> {
  console.log('🌱 Seeding hệ thống máy: Lò Hơi...\n');

  let system = await prisma.machineSystem.findFirst({
    where: { tenHeThong: 'Hệ thống lò hơi' },
  });

  if (!system) {
    const maHeThong = await generateSystemCode();
    system = await prisma.machineSystem.create({
      data: {
        maHeThong,
        tenHeThong: 'Hệ thống lò hơi',
        khuVuc: 'Khu phụ trợ',
        viTri: 'Nhà lò hơi',
        chucNang: 'Cung cấp hơi nước bão hòa cho dây chuyền sản xuất: sấy, hấp, tiệt trùng, gia nhiệt. Áp suất làm việc 7-10 kg/cm², công suất 2 tấn hơi/giờ, nhiên liệu trấu/củi.',
        loaiHeThong: 'HOI',
        hoatDong: true,
      },
    });
  }
  console.log(`  ✅ Hệ thống: ${system.tenHeThong} (${system.maHeThong})`);

  await prisma.maintenanceTemplate.deleteMany({
    where: { machineSystemDetail: { machineSystemId: system.id } },
  });
  await prisma.machineSystemDetail.deleteMany({ where: { machineSystemId: system.id } });

  let order = 0;
  const createDetail = async (data: {
    loai: 'THIET_BI' | 'CUM' | 'LINH_KIEN' | 'DIEM_KIEM_TRA';
    ten: string; parentId?: string; viTri?: string; moTa?: string;
  }) => {
    order++;
    const maChiTiet = await generateDetailCode(data.loai);
    return prisma.machineSystemDetail.create({
      data: {
        machineSystemId: system.id,
        parentDetailId: data.parentId ?? null,
        loaiChiTiet: data.loai,
        maChiTiet,
        tenChiTiet: data.ten,
        viTri: data.viTri,
        moTa: data.moTa,
        thuTu: order,
        hoatDong: true,
        trangThai: 'Hoạt động',
      },
    });
  };

  // ═══════════════════════════════════════════════════════════════════════
  // 1. ĐỒNG HỒ ĐO ÁP SUẤT
  // ═══════════════════════════════════════════════════════════════════════
  const tb1 = await createDetail({
    ten: 'Đồng hồ đo áp suất', loai: 'THIET_BI',
    viTri: 'Thân lò - mặt trước', moTa: 'Đo áp suất hơi trong lò, dải đo 0-16 kg/cm²',
  });
  await createDetail({ ten: 'Mặt kính đồng hồ', loai: 'LINH_KIEN', parentId: tb1.id });
  await createDetail({ ten: 'Kim chỉ thị', loai: 'LINH_KIEN', parentId: tb1.id });
  await createDetail({ ten: 'Khớp nối đồng hồ', loai: 'LINH_KIEN', parentId: tb1.id });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. CÔNG TẮC ÁP SUẤT
  // ═══════════════════════════════════════════════════════════════════════
  const tb2 = await createDetail({
    ten: 'Công tắc áp suất', loai: 'THIET_BI',
    viTri: 'Thân lò - mặt trước', moTa: 'Cảm biến áp suất, ngắt lò khi vượt áp suất cho phép',
  });
  await createDetail({ ten: 'Tiếp điểm công tắc', loai: 'LINH_KIEN', parentId: tb2.id });
  await createDetail({ ten: 'Khớp nối công tắc áp suất', loai: 'LINH_KIEN', parentId: tb2.id });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. VAN AN TOÀN
  // ═══════════════════════════════════════════════════════════════════════
  const tb3 = await createDetail({
    ten: 'Van an toàn', loai: 'THIET_BI',
    viTri: 'Đỉnh lò', moTa: 'Xả áp tự động khi áp suất vượt ngưỡng an toàn (10.5 kg/cm²)',
  });
  await createDetail({ ten: 'Lò xo van an toàn', loai: 'LINH_KIEN', parentId: tb3.id });
  await createDetail({ ten: 'Thân van an toàn', loai: 'LINH_KIEN', parentId: tb3.id });

  // ═══════════════════════════════════════════════════════════════════════
  // 4. QUẠT THỔI
  // ═══════════════════════════════════════════════════════════════════════
  const tb4 = await createDetail({
    ten: 'Quạt thổi', loai: 'THIET_BI',
    viTri: 'Buồng đốt - phía sau', moTa: 'Cấp gió cho buồng đốt, motor 5.5kW, 2900 rpm',
  });
  const tb4_cum = await createDetail({ ten: 'Cụm truyền động quạt thổi', loai: 'CUM', parentId: tb4.id });
  await createDetail({ ten: 'Motor quạt thổi', loai: 'LINH_KIEN', parentId: tb4_cum.id });
  await createDetail({ ten: 'Dây curoa quạt thổi', loai: 'LINH_KIEN', parentId: tb4_cum.id });
  await createDetail({ ten: 'Cánh quạt thổi', loai: 'LINH_KIEN', parentId: tb4.id });

  // ═══════════════════════════════════════════════════════════════════════
  // 5. QUẠT HÚT
  // ═══════════════════════════════════════════════════════════════════════
  const tb5 = await createDetail({
    ten: 'Quạt hút', loai: 'THIET_BI',
    viTri: 'Ống khói - phía sau', moTa: 'Hút khí thải ra ống khói, motor 7.5kW, 1450 rpm',
  });
  const tb5_cum = await createDetail({ ten: 'Cụm truyền động quạt hút', loai: 'CUM', parentId: tb5.id });
  await createDetail({ ten: 'Motor quạt hút', loai: 'LINH_KIEN', parentId: tb5_cum.id });
  await createDetail({ ten: 'Dây curoa quạt hút', loai: 'LINH_KIEN', parentId: tb5_cum.id });

  // ═══════════════════════════════════════════════════════════════════════
  // 6. BƠM CẤP NƯỚC
  // ═══════════════════════════════════════════════════════════════════════
  const tb6 = await createDetail({
    ten: 'Bơm cấp nước', loai: 'THIET_BI',
    viTri: 'Bồn nước mềm - cạnh lò', moTa: 'Bơm nước mềm vào lò, 2 bơm (1 chính + 1 dự phòng), motor 3kW',
  });
  await createDetail({ ten: 'Motor bơm cấp nước', loai: 'LINH_KIEN', parentId: tb6.id });
  await createDetail({ ten: 'Phớt cơ khí bơm', loai: 'LINH_KIEN', parentId: tb6.id });

  // ═══════════════════════════════════════════════════════════════════════
  // 7. ỐNG THỦY SÁNG
  // ═══════════════════════════════════════════════════════════════════════
  const tb7 = await createDetail({
    ten: 'Ống thủy sáng', loai: 'THIET_BI',
    viTri: 'Thân lò - bên phải', moTa: 'Quan sát mức nước trong lò bằng mắt, ống thủy tiện chịu nhiệt',
  });
  await createDetail({ ten: 'Ống thủy tinh', loai: 'LINH_KIEN', parentId: tb7.id });
  await createDetail({ ten: 'Van trên/dưới ống thủy', loai: 'LINH_KIEN', parentId: tb7.id });

  // ═══════════════════════════════════════════════════════════════════════
  // 8. BƠM HÚT NƯỚC LỌC KHÓI
  // ═══════════════════════════════════════════════════════════════════════
  const tb8 = await createDetail({
    ten: 'Bơm hút nước lọc khói', loai: 'THIET_BI',
    viTri: 'Tháp lọc khói', moTa: 'Bơm tuần hoàn nước cho tháp lọc bụi ướt, motor 2.2kW',
  });
  await createDetail({ ten: 'Motor bơm lọc khói', loai: 'LINH_KIEN', parentId: tb8.id });

  // ═══════════════════════════════════════════════════════════════════════
  // 9. QUẠT HÚT GIÓ
  // ═══════════════════════════════════════════════════════════════════════
  const tb9 = await createDetail({
    ten: 'Quạt hút gió', loai: 'THIET_BI',
    viTri: 'Tháp lọc khói - trên', moTa: 'Quạt hút khí sau lọc ra ống khói, motor 3kW',
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 10. BỘ PHẬN CHỊU ÁP LỰC
  // ═══════════════════════════════════════════════════════════════════════
  const tb10 = await createDetail({
    ten: 'Các bộ phận chịu áp lực', loai: 'THIET_BI',
    viTri: 'Thân lò', moTa: 'Thân lò, mặt sàng, ống lò, ống lửa — các bộ phận chịu áp suất cao',
  });
  await createDetail({ ten: 'Thân lò', loai: 'LINH_KIEN', parentId: tb10.id });
  await createDetail({ ten: 'Mặt sàng', loai: 'LINH_KIEN', parentId: tb10.id });
  await createDetail({ ten: 'Ống lò / ống lửa', loai: 'LINH_KIEN', parentId: tb10.id });

  // ═══════════════════════════════════════════════════════════════════════
  // 11. ỐNG CẤP NƯỚC SẠCH
  // ═══════════════════════════════════════════════════════════════════════
  const tb11 = await createDetail({
    ten: 'Ống cấp nước sạch', loai: 'THIET_BI',
    viTri: 'Từ bồn nước đến lò', moTa: 'Đường ống dẫn nước mềm đã xử lý vào lò, DN50, inox 304',
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 12. TỦ ĐIỆN
  // ═══════════════════════════════════════════════════════════════════════
  const tb12 = await createDetail({
    ten: 'Tủ điện điều khiển', loai: 'THIET_BI',
    viTri: 'Nhà lò hơi - bên trái', moTa: 'Tủ điện động lực + điều khiển lò hơi, 3 pha 380V/50Hz',
  });
  await createDetail({ ten: 'Terminal / cầu đấu', loai: 'LINH_KIEN', parentId: tb12.id });
  await createDetail({ ten: 'Đèn báo pha / đèn sự cố', loai: 'LINH_KIEN', parentId: tb12.id });
  await createDetail({ ten: 'Contactor / CB', loai: 'LINH_KIEN', parentId: tb12.id });

  // ═══════════════════════════════════════════════════════════════════════
  // MAINTENANCE TEMPLATES — 40 nội dung bảo dưỡng định kỳ
  // ═══════════════════════════════════════════════════════════════════════
  const templates = [
    { detailId: tb1.id, noiDung: 'Kiểm tra mặt kính không nứt, vỡ, không đọng hơi nước', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb1.id, noiDung: 'Kiểm tra kim chỉ thị không cong, không kẹt', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb1.id, noiDung: 'Kiểm tra rò rỉ khí tại khớp nối', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb1.id, noiDung: 'Vệ sinh đồng hồ', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb2.id, noiDung: 'Kiểm tra tiếp điểm, tín hiệu ON/OFF', tanSuat: 'BA_THANG', to: 'CO_DIEN' },
    { detailId: tb2.id, noiDung: 'Kiểm tra rò rỉ khí tại khớp nối', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb2.id, noiDung: 'Kiểm tra áp suất cài đặt', tanSuat: 'BA_THANG', to: 'CO_DIEN' },
    { detailId: tb2.id, noiDung: 'Vệ sinh thiết bị', tanSuat: 'BA_THANG', to: 'CO_DIEN' },
    { detailId: tb3.id, noiDung: 'Kiểm tra lò xo', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb3.id, noiDung: 'Kiểm tra trạng thái đóng mở, rò rỉ của van', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb3.id, noiDung: 'Vệ sinh thiết bị', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb4.id, noiDung: 'Kiểm tra tiếng ồn, độ rung thiết bị', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb4.id, noiDung: 'Kiểm tra nhiệt độ motor', tanSuat: 'BA_THANG', to: 'CO_DIEN' },
    { detailId: tb4.id, noiDung: 'Kiểm tra dây curoa', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb4.id, noiDung: 'Vệ sinh thiết bị', tanSuat: 'BA_THANG', to: 'CO_DIEN' },
    { detailId: tb5.id, noiDung: 'Kiểm tra tiếng ồn, độ rung thiết bị', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb5.id, noiDung: 'Kiểm tra nhiệt độ, điện áp, dòng điện motor', tanSuat: 'BA_THANG', to: 'CO_DIEN' },
    { detailId: tb5.id, noiDung: 'Kiểm tra dây curoa', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb5.id, noiDung: 'Vệ sinh thiết bị', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb6.id, noiDung: 'Kiểm tra rò rỉ', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb6.id, noiDung: 'Kiểm tra tiếng ồn', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb6.id, noiDung: 'Kiểm tra nhiệt độ, điện áp, dòng điện motor', tanSuat: 'BA_THANG', to: 'CO_DIEN' },
    { detailId: tb6.id, noiDung: 'Vệ sinh bơm', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb7.id, noiDung: 'Kiểm tra ngoại quan xem có nứt, bể ống không', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb7.id, noiDung: 'Kiểm tra rò rỉ van trên/dưới', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb7.id, noiDung: 'Vệ sinh thiết bị', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb8.id, noiDung: 'Kiểm tra rò rỉ', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb8.id, noiDung: 'Kiểm tra tiếng ồn', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb8.id, noiDung: 'Kiểm tra nhiệt độ, điện áp, dòng điện motor', tanSuat: 'BA_THANG', to: 'CO_DIEN' },
    { detailId: tb8.id, noiDung: 'Vệ sinh thiết bị', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb9.id, noiDung: 'Kiểm tra độ rung thiết bị', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb9.id, noiDung: 'Kiểm tra hướng hút của quạt', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb9.id, noiDung: 'Vệ sinh thiết bị', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb10.id, noiDung: 'Kiểm tra thân lò, mặt sàng, ống lò, ống lửa xem có bị nứt, bị xì không', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb11.id, noiDung: 'Kiểm tra rò rỉ đường ống', tanSuat: 'BA_THANG', to: 'CO_KHI' },
    { detailId: tb12.id, noiDung: 'Kiểm tra terminal, thiết bị trong tủ điện có bị lỏng', tanSuat: 'BA_THANG', to: 'CO_DIEN' },
    { detailId: tb12.id, noiDung: 'Kiểm tra đèn báo pha, đèn sự cố, còi', tanSuat: 'BA_THANG', to: 'CO_DIEN' },
    { detailId: tb12.id, noiDung: 'Kiểm tra nguồn điện', tanSuat: 'BA_THANG', to: 'CO_DIEN' },
    { detailId: tb12.id, noiDung: 'Kiểm tra rò rỉ', tanSuat: 'BA_THANG', to: 'CO_DIEN' },
    { detailId: tb12.id, noiDung: 'Vệ sinh thiết bị', tanSuat: 'BA_THANG', to: 'CO_DIEN' },
  ];

  for (const t of templates) {
    await prisma.maintenanceTemplate.create({
      data: {
        machineSystemDetailId: t.detailId,
        noiDung: t.noiDung,
        tanSuat: t.tanSuat as any,
        toThucHien: t.to as any,
        hoatDong: true,
      },
    });
  }

  console.log(`  ✅ Đã tạo ${templates.length} maintenance templates`);
  console.log('\n🎉 Seed hoàn tất: 12 thiết bị + linh kiện + 40 templates bảo dưỡng');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
