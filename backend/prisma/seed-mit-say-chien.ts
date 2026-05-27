/**
 * Seed quy trình Chiên chân không mít sấy
 * Theo tài liệu: QUY TRÌNH CÔNG NGHỆ CHẾ BIẾN (Mít sấy chiên chân không)
 *
 * Chạy: docker compose -f docker-compose.dev.yml exec backend npx ts-node --transpile-only prisma/seed-mit-say-chien.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding quy trình Chiên chân không mít sấy...\n');

  const prodEmp = await prisma.employee.findFirst({ where: { employeeCode: 'NV0002' } })
    ?? await prisma.employee.findFirst();

  if (!prodEmp) {
    console.error('❌ Không tìm thấy nhân viên — chạy prisma db seed trước');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { id: prodEmp.userId } });

  // ─── 1. Process ──────────────────────────────────────────────────────
  const process = await prisma.process.upsert({
    where: { maQuyTrinh: 'QT-MIT-SAY-CHIEN' },
    update: {},
    create: {
      maQuyTrinh: 'QT-MIT-SAY-CHIEN',
      msnv: prodEmp.employeeCode,
      tenNhanVien: user?.firstName + ' ' + user?.lastName || 'NV Sản xuất',
      tenQuyTrinh: 'Quy trình chiên chân không mít sấy',
      loaiQuyTrinh: 'Sản xuất',
    },
  });
  console.log(`  ✅ Process: ${process.tenQuyTrinh} (${process.maQuyTrinh})`);

  // ─── 2. Flowchart ────────────────────────────────────────────────────
  const existingFc = await prisma.processFlowchart.findUnique({ where: { processId: process.id } });
  const flowchart = existingFc ?? await prisma.processFlowchart.create({ data: { processId: process.id } });
  await prisma.processFlowchartSection.deleteMany({ where: { flowchartId: flowchart.id } });

  // ─── 3. Sections (công đoạn) — theo BẢNG MÔ TẢ QUY TRÌNH CHẾ BIẾN ─────
  const sections = [
    {
      phanDoan: 'PD1',
      tenPhanDoan: 'Tiếp nhận nguyên liệu',
      noiDungCongViec:
        'Nhân viên tại khu vực trước chiên tiếp nhận nguyên liệu mít đông từ hầm trữ đông. '
        + 'Nguyên liệu bảo quản trong hầm trữ đông phải có đầy đủ thông tin truy xuất (ngày nhập kho, số lượng, đại lý). '
        + 'Nhiệt độ tâm sản phẩm ≤ -18°C. Trong thời gian chờ gia nhiệt bồn ngâm, nhân viên tập kết nguyên liệu tại bồn ngâm, '
        + 'đặt bao mít lên pallet, cắt dây miệng bao để dễ dàng đổ nguyên liệu vào bồn.',
      stt: 1,
    },
    {
      phanDoan: 'PD2',
      tenPhanDoan: 'Ngâm mạch nha',
      noiDungCongViec:
        'Pha dung dịch ngâm theo tỷ lệ công thức quy định. Khối lượng ngâm: 400kg/mẻ. '
        + 'Độ Brix: 11-12. Nhiệt độ nước nấu tan nha: 35°C. Nhiệt độ nước ngâm: 26-27°C. '
        + 'Thời gian ngâm: 30-40 phút. Tần suất thay nước ngâm: 1-2 ngày. '
        + 'Kiểm tra đường ống, bơm nước cao hơn hệ thống gia nhiệt 20cm. Bật mô tơ đảo, mở gia nhiệt. '
        + 'Đổ mạch nha rải đều vào bồn. Sau khi tan hoàn toàn, bơm thêm nước ngập hoàn toàn múi mít. '
        + 'Hệ thống đảo chiều mở suốt thời gian ngâm. Nguyên liệu cho vào sọt theo khối lượng quy định cho từng máy sấy. '
        + 'Kiểm tra độ Brix và nhiệt độ từng mẻ.',
      stt: 2,
    },
    {
      phanDoan: 'PD3',
      tenPhanDoan: 'Chiên chân không',
      noiDungCongViec:
        'Nhiệt độ dầu duy trì ở 85°C ÷ 100°C. Thời gian chiên: 90 phút. '
        + 'Nhân viên đẩy nguyên liệu vào nồi sấy, gia nhiệt làm sôi dầu, hạ lồng chiên xuống. '
        + 'Khởi động máy hút chân không hút hơi nước trong quá trình sấy. '
        + 'Khi nguyên liệu tách nước hoàn toàn và màu sắc đạt yêu cầu, ngưng cấp nhiệt, '
        + 'kéo lồng chiên lên, treo để làm ráo dầu.',
      stt: 3,
    },
    {
      phanDoan: 'PD4',
      tenPhanDoan: 'Ly tâm',
      noiDungCongViec:
        'Tốc độ máy ly tâm: 5000 vòng/phút. Thời gian ly tâm: 2 phút. '
        + 'Bán thành phẩm sấy được đưa vào máy ly tâm để tách dầu, tránh thành phẩm bị hôi dầu. '
        + 'Sau ly tâm, chuyển vào phòng phân loại.',
      stt: 4,
    },
    {
      phanDoan: 'PD5',
      tenPhanDoan: 'Phân loại',
      noiDungCongViec:
        'Nhiệt độ phòng phân loại: 20-22°C. '
        + 'Phân loại theo tiêu chuẩn chất lượng (bảng phân loại chất lượng) hoặc yêu cầu khách hàng. '
        + 'Loại bỏ sản phẩm không đạt: cháy, còn gèn, ướt, phòng. '
        + 'Phân loại thành loại A, loại B, ướt,… theo bảng tiêu chuẩn treo tại phòng phân loại.',
      stt: 5,
    },
    {
      phanDoan: 'PD6',
      tenPhanDoan: 'Đóng túi',
      noiDungCongViec:
        'Đóng gói theo đơn đặt hàng. Từng loại thành phẩm tách riêng, đóng vào bao nhôm có lồng bao PE bên trong. '
        + 'Bao nhôm hàn kín miệng sau khi đóng gói, cho vào thùng carton. '
        + 'Phân loại thùng dựa vào màu sắc băng keo. Xếp pallet theo quy cách quy định.',
      stt: 6,
    },
    {
      phanDoan: 'PD7',
      tenPhanDoan: 'Dò kim loại',
      noiDungCongViec:
        'Test thử: Fe 1.5mm; Non Fe 2.0mm; SuS 2.5mm. '
        + 'Cho từng PE qua máy dò kim loại. Đảm bảo không nhiễm mảnh kim loại Fe ≥ 1.5mm, Sus ≥ 2.5mm, Non-Fe ≥ 2.0mm. '
        + 'Cô lập sản phẩm có phát hiện mảnh kim loại để dò lại.',
      stt: 7,
    },
    {
      phanDoan: 'PD8',
      tenPhanDoan: 'Đóng thùng, ghi nhãn',
      noiDungCongViec:
        'Ghi nhãn tùy theo yêu cầu khách hàng và thị trường:\n'
        + '- Việt Nam: Nghị định 43/2023/NĐ-CP\n'
        + '- EU: Quy định (EU) 1169/2011 (bắt buộc bảng dinh dưỡng)\n'
        + '- Mỹ: FDA Nutrition Facts + COOL\n'
        + '- Trung Quốc: GACC Lệnh 248, 249, 280 (hiệu lực 01/06/2026)',
      stt: 8,
    },
    {
      phanDoan: 'PD9',
      tenPhanDoan: 'Bảo quản, lưu kho',
      noiDungCongViec:
        'Độ ẩm kho ≤ 60%. Xếp thùng carton trên pallet dọc hướng gió, cao 6-8 lớp. '
        + 'Cách tường 15-20cm, pallet cách nhau 30cm, hai hàng để lối đi 40cm. '
        + 'Thùng pallet gắn số lô, nhãn nhận diện hàng hóa.',
      stt: 9,
    },
  ];

  for (const s of sections) {
    const section = await prisma.processFlowchartSection.create({
      data: { flowchartId: flowchart.id, ...s },
    });

    // Chi phí cho từng công đoạn
    if (s.stt === 1) {
      await prisma.processFlowchartCost.create({
        data: { sectionId: section.id, loaiChiPhi: 'Nguyên liệu', tenChiPhi: 'Mít đông lạnh', donVi: 'kg', soLuongKeHoach: 400, giaKeHoach: 35000, thanhTienKeHoach: 14000000 },
      });
    }
    if (s.stt === 2) {
      await prisma.processFlowchartCost.create({
        data: { sectionId: section.id, loaiChiPhi: 'Nguyên liệu', tenChiPhi: 'Mạch nha', donVi: 'kg', soLuongKeHoach: 80, giaKeHoach: 15000, thanhTienKeHoach: 1200000 },
      });
      await prisma.processFlowchartCost.create({
        data: { sectionId: section.id, loaiChiPhi: 'Năng lượng', tenChiPhi: 'Điện gia nhiệt bồn ngâm', donVi: 'kWh', soLuongKeHoach: 150, giaKeHoach: 3500, thanhTienKeHoach: 525000 },
      });
    }
    if (s.stt === 3) {
      await prisma.processFlowchartCost.create({
        data: { sectionId: section.id, loaiChiPhi: 'Năng lượng', tenChiPhi: 'Điện chiên chân không', donVi: 'kWh', soLuongKeHoach: 800, giaKeHoach: 3500, thanhTienKeHoach: 2800000 },
      });
      await prisma.processFlowchartCost.create({
        data: { sectionId: section.id, loaiChiPhi: 'Nguyên liệu', tenChiPhi: 'Dầu cọ', donVi: 'lít', soLuongKeHoach: 200, giaKeHoach: 25000, thanhTienKeHoach: 5000000 },
      });
      await prisma.processFlowchartCost.create({
        data: { sectionId: section.id, loaiChiPhi: 'Nhân công', tenChiPhi: 'Công nhân vận hành nồi chiên', donVi: 'ngày', dinhMucLaoDong: 2, soLuongKeHoach: 10, giaKeHoach: 250000, thanhTienKeHoach: 2500000 },
      });
    }
    if (s.stt === 4) {
      await prisma.processFlowchartCost.create({
        data: { sectionId: section.id, loaiChiPhi: 'Năng lượng', tenChiPhi: 'Điện ly tâm', donVi: 'kWh', soLuongKeHoach: 100, giaKeHoach: 3500, thanhTienKeHoach: 350000 },
      });
    }
    if (s.stt === 6) {
      await prisma.processFlowchartCost.create({
        data: { sectionId: section.id, loaiChiPhi: 'Vật tư', tenChiPhi: 'Bao nhôm + PE', donVi: 'cái', soLuongKeHoach: 8000, giaKeHoach: 2000, thanhTienKeHoach: 16000000 },
      });
      await prisma.processFlowchartCost.create({
        data: { sectionId: section.id, loaiChiPhi: 'Vật tư', tenChiPhi: 'Thùng carton', donVi: 'thùng', soLuongKeHoach: 400, giaKeHoach: 35000, thanhTienKeHoach: 14000000 },
      });
      await prisma.processFlowchartCost.create({
        data: { sectionId: section.id, loaiChiPhi: 'Nhân công', tenChiPhi: 'Công nhân đóng gói', donVi: 'ngày', dinhMucLaoDong: 4, soLuongKeHoach: 20, giaKeHoach: 250000, thanhTienKeHoach: 5000000 },
      });
    }
  }

  console.log(`  ✅ ${sections.length} công đoạn + chi phí`);
  console.log('\n🎉 Done! Quy trình "Chiên chân không mít sấy" đã được seed.');
}

main()
  .catch((e) => {
    console.error('❌', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
