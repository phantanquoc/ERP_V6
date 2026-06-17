import { PrismaClient, TaskPriority } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding project DA-2026-005: Lắp đặt nồi chiên chân không...');

  const admin = await prisma.user.findFirst({ where: { email: 'admin@example.com' } });
  if (!admin) {
    console.log('❌ Admin user not found. Run main seed first.');
    return;
  }

  const existing = await prisma.project.findFirst({ where: { maDuAn: 'DA-2026-005' } });
  if (existing) {
    console.log('⚠️  Project DA-2026-005 already exists, skipping.');
    return;
  }

  const employees = await prisma.employee.findMany({
    select: { id: true, employeeCode: true, user: { select: { id: true, firstName: true, lastName: true } } },
    take: 6,
  });

  if (employees.length < 4) {
    console.log('❌ Cần ít nhất 4 nhân viên trong DB. Hiện có:', employees.length);
    return;
  }

  const empName = (idx: number) => {
    const e = employees[idx % employees.length];
    return `${e.user.lastName} ${e.user.firstName}`.trim();
  };

  const [nv1, nv2, nv3, nv4] = [empName(0), empName(1), empName(2), empName(3)];

  const project = await prisma.project.create({
    data: {
      maDuAn: 'DA-2026-005',
      tenDuAn: 'Lắp đặt nồi chiên chân không',
      moTa: 'Dự án lắp đặt hệ thống nồi chiên chân không công suất 150kg/mẻ tại phân xưởng chế biến An Bình Foods. Bao gồm chuẩn bị mặt bằng, lắp đặt cơ khí & điện, chạy thử nghiệm thu, đào tạo vận hành. Thiết bị: buồng chiên chân không + bơm chân không + hệ thống lọc dầu + ly tâm tách dầu + tủ PLC điều khiển.',
      ngayBatDau: new Date('2026-04-14'),
      ngayKetThuc: new Date('2026-08-15'),
      trangThai: 'Đang thực hiện',
      nguoiTaoId: admin.id,
    },
  });

  // Members — skip employees whose userId matches admin
  const memberData = [
    { projectId: project.id, userId: admin.id, vaiTro: 'Quản lý dự án' },
    ...employees
      .filter((e) => e.user.id !== admin.id)
      .slice(0, 4)
      .map((e, i) => ({
        projectId: project.id,
        userId: e.user.id,
        vaiTro: ['Giám sát công trường', 'Kỹ sư cơ khí', 'Kỹ sư điện', 'QA/QC'][i],
      })),
  ];
  await prisma.projectMember.createMany({ data: memberData });

  const phases = [
    {
      tenGiaiDoan: 'Chuẩn bị mặt bằng & móng máy',
      moTa: 'Khảo sát, đổ bê tông móng, kéo đường ống cấp/thoát, hệ thống xả khí',
      trangThai: 'Hoàn thành',
      tienDo: 100,
      thuTu: 1,
      ngayBatDau: '2026-04-14',
      ngayKetThuc: '2026-04-28',
      tasks: [
        { tieuDe: 'Khảo sát mặt bằng hiện trạng', trangThai: 'Hoàn thành', nguoiPhuTrach: nv1, ngayBatDau: '2026-04-14', ngayKetThuc: '2026-04-15', thuTu: 1, mucDoUuTien: 'CAO' },
        { tieuDe: 'Thiết kế bản vẽ bố trí thiết bị', trangThai: 'Hoàn thành', nguoiPhuTrach: nv2, ngayBatDau: '2026-04-15', ngayKetThuc: '2026-04-17', thuTu: 2, mucDoUuTien: 'CAO' },
        { tieuDe: 'Đổ bê tông móng máy (M250, dày 200mm)', trangThai: 'Hoàn thành', nguoiPhuTrach: nv1, ngayBatDau: '2026-04-18', ngayKetThuc: '2026-04-22', thuTu: 3, mucDoUuTien: 'KHAN_CAP' },
        { tieuDe: 'Kéo đường ống nước cấp DN50 + thoát DN100', trangThai: 'Hoàn thành', nguoiPhuTrach: nv2, ngayBatDau: '2026-04-22', ngayKetThuc: '2026-04-24', thuTu: 4, mucDoUuTien: 'TRUNG_BINH' },
        { tieuDe: 'Lắp hệ thống xả khí + quạt hút công nghiệp', trangThai: 'Hoàn thành', nguoiPhuTrach: nv3, ngayBatDau: '2026-04-24', ngayKetThuc: '2026-04-26', thuTu: 5, mucDoUuTien: 'TRUNG_BINH' },
        { tieuDe: 'Nghiệm thu móng & hạ tầng — Milestone', trangThai: 'Hoàn thành', nguoiPhuTrach: nv4, ngayBatDau: '2026-04-27', ngayKetThuc: '2026-04-28', thuTu: 6, mucDoUuTien: 'CAO', laMilestone: true },
      ],
      costs: [
        { taskIndex: 0, loaiChiPhi: 'Nhân công', tenChiPhi: 'Đội xây dựng (10 ngày)', soLuongKeHoach: 10, giaKeHoach: 2500000, soLuongThucTe: 10, giaThucTe: 2500000 },
        { taskIndex: 2, loaiChiPhi: 'Vật tư', tenChiPhi: 'Bê tông M250 + cốt thép', soLuongKeHoach: 1, giaKeHoach: 18000000, soLuongThucTe: 1, giaThucTe: 17500000 },
        { taskIndex: 3, loaiChiPhi: 'Vật tư', tenChiPhi: 'Ống thép DN50 + DN100 + phụ kiện', soLuongKeHoach: 1, giaKeHoach: 8500000, soLuongThucTe: 1, giaThucTe: 9200000 },
        { taskIndex: 4, loaiChiPhi: 'Khác', tenChiPhi: 'Thuê xe cẩu + vận chuyển vật tư', soLuongKeHoach: 3, giaKeHoach: 3000000, soLuongThucTe: 3, giaThucTe: 3000000 },
      ],
    },
    {
      tenGiaiDoan: 'Vận chuyển & tiếp nhận thiết bị',
      moTa: 'Vận chuyển nồi chiên, bơm chân không, hệ thống lọc dầu, ly tâm, tủ PLC từ nhà máy sản xuất',
      trangThai: 'Hoàn thành',
      tienDo: 100,
      thuTu: 2,
      ngayBatDau: '2026-04-29',
      ngayKetThuc: '2026-05-05',
      tasks: [
        { tieuDe: 'Đóng gói & vận chuyển thiết bị chính từ Bình Dương', trangThai: 'Hoàn thành', nguoiPhuTrach: nv1, ngayBatDau: '2026-04-29', ngayKetThuc: '2026-04-30', thuTu: 1, mucDoUuTien: 'KHAN_CAP' },
        { tieuDe: 'Tiếp nhận & kiểm đếm theo packing list', trangThai: 'Hoàn thành', nguoiPhuTrach: nv4, ngayBatDau: '2026-05-01', ngayKetThuc: '2026-05-01', thuTu: 2, mucDoUuTien: 'CAO' },
        { tieuDe: 'Kiểm tra ngoại quan — phát hiện hư hỏng vận chuyển', trangThai: 'Hoàn thành', nguoiPhuTrach: nv4, ngayBatDau: '2026-05-02', ngayKetThuc: '2026-05-02', thuTu: 3, mucDoUuTien: 'CAO' },
        { tieuDe: 'Đưa thiết bị vào vị trí bằng xe nâng + cẩu 5T', trangThai: 'Hoàn thành', nguoiPhuTrach: nv1, ngayBatDau: '2026-05-03', ngayKetThuc: '2026-05-04', thuTu: 4, mucDoUuTien: 'CAO' },
        { tieuDe: 'Lập biên bản tiếp nhận & bàn giao mặt bằng', trangThai: 'Hoàn thành', nguoiPhuTrach: nv4, ngayBatDau: '2026-05-05', ngayKetThuc: '2026-05-05', thuTu: 5, mucDoUuTien: 'TRUNG_BINH', laMilestone: true },
      ],
      costs: [
        { taskIndex: 0, loaiChiPhi: 'Khác', tenChiPhi: 'Vận chuyển xe đầu kéo + bảo hiểm hàng', soLuongKeHoach: 1, giaKeHoach: 15000000, soLuongThucTe: 1, giaThucTe: 14500000 },
        { taskIndex: 3, loaiChiPhi: 'Nhân công', tenChiPhi: 'Đội bốc xếp + xe nâng (5 ngày)', soLuongKeHoach: 5, giaKeHoach: 1800000, soLuongThucTe: 5, giaThucTe: 1800000 },
        { taskIndex: 3, loaiChiPhi: 'Khác', tenChiPhi: 'Thuê cẩu 5 tấn (2 ca)', soLuongKeHoach: 2, giaKeHoach: 4000000, soLuongThucTe: 2, giaThucTe: 4200000 },
      ],
    },
    {
      tenGiaiDoan: 'Lắp đặt cơ khí',
      moTa: 'Lắp buồng chiên SUS304, bơm chân không vòng nước, hệ thống lọc dầu tuần hoàn, ly tâm tách dầu, bồn condenser',
      trangThai: 'Đang thực hiện',
      tienDo: 65,
      thuTu: 3,
      ngayBatDau: '2026-05-06',
      ngayKetThuc: '2026-06-03',
      tasks: [
        { tieuDe: 'Cố định buồng chiên lên móng (bu-lông M16 hóa chất)', trangThai: 'Hoàn thành', nguoiPhuTrach: nv2, ngayBatDau: '2026-05-06', ngayKetThuc: '2026-05-08', thuTu: 1, mucDoUuTien: 'KHAN_CAP' },
        { tieuDe: 'Lắp bơm chân không vòng nước + đường ống DN80', trangThai: 'Hoàn thành', nguoiPhuTrach: nv2, ngayBatDau: '2026-05-09', ngayKetThuc: '2026-05-12', thuTu: 2, mucDoUuTien: 'CAO' },
        { tieuDe: 'Lắp hệ thống gia nhiệt dầu (coil + bơm tuần hoàn)', trangThai: 'Hoàn thành', nguoiPhuTrach: nv2, ngayBatDau: '2026-05-13', ngayKetThuc: '2026-05-16', thuTu: 3, mucDoUuTien: 'CAO' },
        { tieuDe: 'Lắp hệ thống lọc dầu (lọc thô + lọc tinh 5μm)', trangThai: 'Hoàn thành', nguoiPhuTrach: nv2, ngayBatDau: '2026-05-17', ngayKetThuc: '2026-05-20', thuTu: 4, mucDoUuTien: 'TRUNG_BINH' },
        { tieuDe: 'Lắp ly tâm tách dầu 800 vòng/phút', trangThai: 'Đang làm', nguoiPhuTrach: nv2, ngayBatDau: '2026-05-21', ngayKetThuc: '2026-05-24', thuTu: 5, mucDoUuTien: 'CAO' },
        { tieuDe: 'Lắp bồn condenser + đường nước giải nhiệt', trangThai: 'Đang làm', nguoiPhuTrach: nv1, ngayBatDau: '2026-05-25', ngayKetThuc: '2026-05-28', thuTu: 6, mucDoUuTien: 'TRUNG_BINH' },
        { tieuDe: 'Kết nối đường ống giữa các cụm thiết bị', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv2, ngayBatDau: '2026-05-29', ngayKetThuc: '2026-05-31', thuTu: 7, mucDoUuTien: 'CAO' },
        { tieuDe: 'Thử kín đường ống (áp suất 6 bar / 30 phút)', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv4, ngayBatDau: '2026-06-01', ngayKetThuc: '2026-06-02', thuTu: 8, mucDoUuTien: 'KHAN_CAP' },
        { tieuDe: 'Nghiệm thu lắp đặt cơ khí — Milestone', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv4, ngayBatDau: '2026-06-03', ngayKetThuc: '2026-06-03', thuTu: 9, mucDoUuTien: 'CAO', laMilestone: true },
      ],
      costs: [
        { taskIndex: 0, loaiChiPhi: 'Nhân công', tenChiPhi: 'Kỹ sư cơ khí + thợ hàn inox (28 ngày)', soLuongKeHoach: 28, giaKeHoach: 3200000, soLuongThucTe: 20, giaThucTe: 3200000 },
        { taskIndex: 0, loaiChiPhi: 'Vật tư', tenChiPhi: 'Bu-lông hóa chất M16 + đệm chống rung', soLuongKeHoach: 1, giaKeHoach: 4500000, soLuongThucTe: 1, giaThucTe: 4800000 },
        { taskIndex: 1, loaiChiPhi: 'Vật tư', tenChiPhi: 'Ống inox SUS304 DN80 + phụ kiện hàn', soLuongKeHoach: 1, giaKeHoach: 22000000, soLuongThucTe: 1, giaThucTe: 21500000 },
        { taskIndex: 2, loaiChiPhi: 'Phụ liệu', tenChiPhi: 'Que hàn inox 308L + gas argon + đá cắt', soLuongKeHoach: 1, giaKeHoach: 6000000, soLuongThucTe: 1, giaThucTe: 5800000 },
        { taskIndex: 7, loaiChiPhi: 'Khác', tenChiPhi: 'Thuê thiết bị thử áp + đo laser', soLuongKeHoach: 1, giaKeHoach: 3500000 },
      ],
    },
    {
      tenGiaiDoan: 'Lắp đặt điện & tích hợp PLC',
      moTa: 'Kéo cáp nguồn 380V 3 pha, đấu nối tủ PLC Siemens S7-1200, cảm biến nhiệt độ/áp suất, HMI 7 inch',
      trangThai: 'Chưa bắt đầu',
      tienDo: 0,
      thuTu: 4,
      ngayBatDau: '2026-06-04',
      ngayKetThuc: '2026-06-23',
      tasks: [
        { tieuDe: 'Kéo cáp nguồn 3P+N+PE từ tủ phân phối chính', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv3, ngayBatDau: '2026-06-04', ngayKetThuc: '2026-06-06', thuTu: 1, mucDoUuTien: 'CAO' },
        { tieuDe: 'Lắp tủ điện động lực + MCCB + contactor', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv3, ngayBatDau: '2026-06-07', ngayKetThuc: '2026-06-09', thuTu: 2, mucDoUuTien: 'CAO' },
        { tieuDe: 'Đấu nối motor bơm chân không + bơm dầu + ly tâm', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv3, ngayBatDau: '2026-06-10', ngayKetThuc: '2026-06-12', thuTu: 3, mucDoUuTien: 'CAO' },
        { tieuDe: 'Lắp cảm biến nhiệt PT100 + áp suất 0-1 bar', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv3, ngayBatDau: '2026-06-13', ngayKetThuc: '2026-06-14', thuTu: 4, mucDoUuTien: 'TRUNG_BINH' },
        { tieuDe: 'Cấu hình PLC S7-1200 + lập trình logic điều khiển', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv3, ngayBatDau: '2026-06-15', ngayKetThuc: '2026-06-18', thuTu: 5, mucDoUuTien: 'KHAN_CAP' },
        { tieuDe: 'Cài đặt HMI 7" — giao diện vận hành', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv3, ngayBatDau: '2026-06-19', ngayKetThuc: '2026-06-20', thuTu: 6, mucDoUuTien: 'TRUNG_BINH' },
        { tieuDe: 'Kiểm tra cách điện + tiếp đất (Megger test)', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv4, ngayBatDau: '2026-06-21', ngayKetThuc: '2026-06-22', thuTu: 7, mucDoUuTien: 'CAO' },
        { tieuDe: 'Nghiệm thu điện & PLC — Milestone', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv4, ngayBatDau: '2026-06-23', ngayKetThuc: '2026-06-23', thuTu: 8, mucDoUuTien: 'CAO', laMilestone: true },
      ],
      costs: [
        { taskIndex: 0, loaiChiPhi: 'Nhân công', tenChiPhi: 'Kỹ sư điện + thợ điện CN (20 ngày)', soLuongKeHoach: 20, giaKeHoach: 3500000 },
        { taskIndex: 0, loaiChiPhi: 'Vật tư', tenChiPhi: 'Cáp CVV 4x16mm² + máng cáp + ống luồn', soLuongKeHoach: 1, giaKeHoach: 15000000 },
        { taskIndex: 4, loaiChiPhi: 'Vật tư', tenChiPhi: 'Tủ PLC Siemens S7-1200 + module I/O', soLuongKeHoach: 1, giaKeHoach: 45000000 },
        { taskIndex: 5, loaiChiPhi: 'Vật tư', tenChiPhi: 'HMI Siemens KTP700 + cảm biến PT100 + transmitter', soLuongKeHoach: 1, giaKeHoach: 18000000 },
        { taskIndex: 2, loaiChiPhi: 'Phụ liệu', tenChiPhi: 'Đầu cos, co thít, domino, kẹp cáp', soLuongKeHoach: 1, giaKeHoach: 2500000 },
      ],
    },
    {
      tenGiaiDoan: 'Chạy thử & nghiệm thu',
      moTa: 'Chạy không tải, chạy có tải với nguyên liệu thử (mít, khoai lang), đo thông số, hiệu chỉnh PID, nghiệm thu SAT',
      trangThai: 'Chưa bắt đầu',
      tienDo: 0,
      thuTu: 5,
      ngayBatDau: '2026-06-24',
      ngayKetThuc: '2026-07-14',
      tasks: [
        { tieuDe: 'Chạy không tải — kiểm tra chiều quay motor, rò rỉ', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv2, ngayBatDau: '2026-06-24', ngayKetThuc: '2026-06-25', thuTu: 1, mucDoUuTien: 'CAO' },
        { tieuDe: 'Test hút chân không (đạt -0.095 MPa trong 5 phút)', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv2, ngayBatDau: '2026-06-26', ngayKetThuc: '2026-06-27', thuTu: 2, mucDoUuTien: 'KHAN_CAP' },
        { tieuDe: 'Chạy thử có tải — mẻ 1: khoai lang 50kg', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv1, ngayBatDau: '2026-06-28', ngayKetThuc: '2026-06-30', thuTu: 3, mucDoUuTien: 'CAO' },
        { tieuDe: 'Hiệu chỉnh PID nhiệt độ dầu (80-120°C ±2°C)', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv3, ngayBatDau: '2026-07-01', ngayKetThuc: '2026-07-03', thuTu: 4, mucDoUuTien: 'CAO' },
        { tieuDe: 'Chạy thử mẻ 2: mít 100kg — đo độ ẩm sản phẩm', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv1, ngayBatDau: '2026-07-04', ngayKetThuc: '2026-07-06', thuTu: 5, mucDoUuTien: 'CAO' },
        { tieuDe: 'Chạy thử mẻ 3: full load 150kg — kiểm tra năng suất', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv1, ngayBatDau: '2026-07-07', ngayKetThuc: '2026-07-09', thuTu: 6, mucDoUuTien: 'KHAN_CAP', laMilestone: true },
        { tieuDe: 'Đo lường: điện năng tiêu thụ, thời gian chu kỳ, chất lượng dầu', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv4, ngayBatDau: '2026-07-10', ngayKetThuc: '2026-07-11', thuTu: 7, mucDoUuTien: 'TRUNG_BINH' },
        { tieuDe: 'Lập biên bản nghiệm thu SAT — Milestone', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv4, ngayBatDau: '2026-07-12', ngayKetThuc: '2026-07-14', thuTu: 8, mucDoUuTien: 'CAO', laMilestone: true },
      ],
      costs: [
        { taskIndex: 0, loaiChiPhi: 'Nhân công', tenChiPhi: 'Đội vận hành thử (20 ngày)', soLuongKeHoach: 20, giaKeHoach: 2800000 },
        { taskIndex: 2, loaiChiPhi: 'Vật tư', tenChiPhi: 'Nguyên liệu thử nghiệm (mít, khoai lang 300kg)', soLuongKeHoach: 300, giaKeHoach: 35000 },
        { taskIndex: 4, loaiChiPhi: 'Vật tư', tenChiPhi: 'Dầu chiên chân không chuyên dụng (500L)', soLuongKeHoach: 500, giaKeHoach: 42000 },
        { taskIndex: 6, loaiChiPhi: 'Khác', tenChiPhi: 'Thuê thiết bị đo (nhiệt kế chuẩn, đồng hồ điện)', soLuongKeHoach: 1, giaKeHoach: 5000000 },
      ],
    },
    {
      tenGiaiDoan: 'Đào tạo vận hành & bàn giao',
      moTa: 'Đào tạo công nhân vận hành, bảo trì định kỳ, lập hồ sơ kỹ thuật, bàn giao chính thức',
      trangThai: 'Chưa bắt đầu',
      tienDo: 0,
      thuTu: 6,
      ngayBatDau: '2026-07-15',
      ngayKetThuc: '2026-08-01',
      tasks: [
        { tieuDe: 'Đào tạo lý thuyết — nguyên lý chiên chân không', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv1, ngayBatDau: '2026-07-15', ngayKetThuc: '2026-07-16', thuTu: 1, mucDoUuTien: 'TRUNG_BINH' },
        { tieuDe: 'Đào tạo thực hành — vận hành HMI + quy trình SOP', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv3, ngayBatDau: '2026-07-17', ngayKetThuc: '2026-07-19', thuTu: 2, mucDoUuTien: 'CAO' },
        { tieuDe: 'Đào tạo bảo trì — vệ sinh, thay lọc, tra dầu', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv2, ngayBatDau: '2026-07-20', ngayKetThuc: '2026-07-22', thuTu: 3, mucDoUuTien: 'CAO' },
        { tieuDe: 'Đào tạo xử lý sự cố — alarm code + quy trình khẩn cấp', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv3, ngayBatDau: '2026-07-23', ngayKetThuc: '2026-07-25', thuTu: 4, mucDoUuTien: 'CAO' },
        { tieuDe: 'Lập hồ sơ kỹ thuật (as-built drawing, manual)', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv2, ngayBatDau: '2026-07-26', ngayKetThuc: '2026-07-28', thuTu: 5, mucDoUuTien: 'TRUNG_BINH' },
        { tieuDe: 'Ký biên bản bàn giao chính thức — Milestone', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv4, ngayBatDau: '2026-07-30', ngayKetThuc: '2026-08-01', thuTu: 6, mucDoUuTien: 'KHAN_CAP', laMilestone: true },
      ],
      costs: [
        { taskIndex: 0, loaiChiPhi: 'Nhân công', tenChiPhi: 'Kỹ sư đào tạo (15 ngày)', soLuongKeHoach: 15, giaKeHoach: 3500000 },
        { taskIndex: 1, loaiChiPhi: 'Phụ liệu', tenChiPhi: 'In tài liệu SOP + poster an toàn', soLuongKeHoach: 1, giaKeHoach: 2000000 },
        { taskIndex: 5, loaiChiPhi: 'Khác', tenChiPhi: 'Phí chứng chỉ vận hành cho 8 CN', soLuongKeHoach: 8, giaKeHoach: 500000 },
      ],
    },
  ];

  // EXECUTION_PLACEHOLDER
  for (const phaseData of phases) {
    const phase = await prisma.projectPhase.create({
      data: {
        projectId: project.id,
        tenGiaiDoan: phaseData.tenGiaiDoan,
        moTa: phaseData.moTa,
        trangThai: phaseData.trangThai,
        tienDo: phaseData.tienDo,
        thuTu: phaseData.thuTu,
        ngayBatDau: phaseData.ngayBatDau ? new Date(phaseData.ngayBatDau) : undefined,
        ngayKetThuc: phaseData.ngayKetThuc ? new Date(phaseData.ngayKetThuc) : undefined,
      },
    });

    const createdTasks: { id: string }[] = [];
    for (const taskData of phaseData.tasks) {
      const t = await prisma.projectTask.create({
        data: {
          projectId: project.id,
          projectPhaseId: phase.id,
          tieuDe: taskData.tieuDe,
          trangThai: taskData.trangThai,
          nguoiPhuTrach: taskData.nguoiPhuTrach,
          ngayBatDau: taskData.ngayBatDau ? new Date(taskData.ngayBatDau) : undefined,
          ngayKetThuc: taskData.ngayKetThuc ? new Date(taskData.ngayKetThuc) : undefined,
          thuTu: taskData.thuTu,
          mucDoUuTien: (taskData.mucDoUuTien as TaskPriority) ?? null,
          laMilestone: taskData.laMilestone ?? false,
        },
      });
      createdTasks.push(t);
    }

    for (const costData of phaseData.costs) {
      const kh = (costData.soLuongKeHoach ?? 0) * (costData.giaKeHoach ?? 0);
      const tt = costData.soLuongThucTe && costData.giaThucTe
        ? costData.soLuongThucTe * costData.giaThucTe
        : null;
      const taskId = costData.taskIndex != null ? createdTasks[costData.taskIndex]?.id : undefined;
      await prisma.projectCost.create({
        data: {
          projectId: project.id,
          projectPhaseId: phase.id,
          projectTaskId: taskId ?? null,
          loaiChiPhi: costData.loaiChiPhi,
          tenChiPhi: costData.tenChiPhi,
          soLuongKeHoach: costData.soLuongKeHoach,
          giaKeHoach: costData.giaKeHoach,
          thanhTienKeHoach: kh,
          soLuongThucTe: costData.soLuongThucTe ?? null,
          giaThucTe: costData.giaThucTe ?? null,
          thanhTienThucTe: tt,
        },
      });
    }

    console.log(`  ✓ ${phaseData.tenGiaiDoan} — ${phaseData.tasks.length} tasks, ${phaseData.costs.length} costs`);
  }

  console.log('✅ Seeded DA-2026-005 successfully! (6 phases, 46 tasks, 25 costs)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
