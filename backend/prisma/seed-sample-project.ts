import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding sample project...');

  const admin = await prisma.user.findFirst({ where: { email: 'admin@example.com' } });
  if (!admin) {
    console.log('❌ Admin user not found. Run main seed first.');
    return;
  }

  const existing = await prisma.project.findFirst({ where: { maDuAn: 'DA-2026-003' } });
  if (existing) {
    console.log('⚠️  Project DA-2026-003 already exists, skipping.');
    return;
  }

  // Lấy nhân viên thật từ DB (format tên giống EmployeePicker: lastName firstName)
  const employees = await prisma.employee.findMany({
    select: { id: true, employeeCode: true, user: { select: { firstName: true, lastName: true } } },
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
      maDuAn: 'DA-2026-003',
      tenDuAn: 'Lắp đặt dây chuyền sấy trái cây tự động',
      moTa: 'Dự án lắp đặt dây chuyền sấy trái cây công suất 2 tấn/ngày tại nhà máy An Bình Foods. Bao gồm thiết kế, mua sắm thiết bị, lắp đặt, chạy thử và nghiệm thu.',
      ngayBatDau: new Date('2026-06-01'),
      ngayKetThuc: new Date('2026-12-31'),
      trangThai: 'Đang thực hiện',
      nguoiTaoId: admin.id,
    },
  });

  await prisma.projectMember.create({
    data: { projectId: project.id, userId: admin.id, vaiTro: 'Quản lý' },
  });

  const phases = [
    {
      tenGiaiDoan: 'Khảo sát & Thiết kế',
      moTa: 'Khảo sát hiện trạng nhà xưởng, thiết kế layout dây chuyền, lập bản vẽ kỹ thuật',
      ngayBatDau: new Date('2026-06-01'),
      ngayKetThuc: new Date('2026-07-15'),
      trangThai: 'Hoàn thành',
      nguoiPhuTrach: nv2,
      chuSoHuu: nv1,
      nganSach: 150000000,
      tasks: [
        { tieuDe: 'Khảo sát mặt bằng nhà xưởng', trangThai: 'Hoàn thành', nguoiPhuTrach: nv2, ngayBatDau: new Date('2026-06-01'), ngayKetThuc: new Date('2026-06-07') },
        { tieuDe: 'Lập bản vẽ thiết kế layout', trangThai: 'Hoàn thành', nguoiPhuTrach: nv3, ngayBatDau: new Date('2026-06-08'), ngayKetThuc: new Date('2026-06-25') },
        { tieuDe: 'Phê duyệt thiết kế', trangThai: 'Hoàn thành', nguoiPhuTrach: nv1, laMilestone: true, deadline: new Date('2026-06-30') },
        { tieuDe: 'Lập dự toán chi phí', trangThai: 'Hoàn thành', nguoiPhuTrach: nv4, ngayBatDau: new Date('2026-07-01'), ngayKetThuc: new Date('2026-07-15') },
      ],
    },
    {
      tenGiaiDoan: 'Mua sắm thiết bị',
      moTa: 'Đấu thầu, đặt hàng máy sấy, băng tải, hệ thống điều khiển PLC',
      ngayBatDau: new Date('2026-07-16'),
      ngayKetThuc: new Date('2026-09-15'),
      trangThai: 'Đang thực hiện',
      nguoiPhuTrach: `${nv4}, ${nv3}`,
      chuSoHuu: nv2,
      nganSach: 800000000,
      tasks: [
        { tieuDe: 'Lập hồ sơ đấu thầu', trangThai: 'Hoàn thành', nguoiPhuTrach: nv4, ngayBatDau: new Date('2026-07-16'), ngayKetThuc: new Date('2026-07-25') },
        { tieuDe: 'Đánh giá nhà cung cấp', trangThai: 'Hoàn thành', nguoiPhuTrach: `${nv4}, ${nv3}`, ngayBatDau: new Date('2026-07-26'), ngayKetThuc: new Date('2026-08-05') },
        { tieuDe: 'Ký hợp đồng mua thiết bị', trangThai: 'Đang làm', nguoiPhuTrach: nv1, laMilestone: true, deadline: new Date('2026-08-15'), mucDoUuTien: 'KHAN_CAP' },
        { tieuDe: 'Theo dõi sản xuất & vận chuyển', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv3, ngayBatDau: new Date('2026-08-16'), ngayKetThuc: new Date('2026-09-15'), mucDoUuTien: 'CAO' },
      ],
    },
    {
      tenGiaiDoan: 'Lắp đặt & Kết nối',
      moTa: 'Lắp đặt thiết bị tại nhà xưởng, kết nối hệ thống điện, khí nén, nước',
      ngayBatDau: new Date('2026-09-16'),
      ngayKetThuc: new Date('2026-11-15'),
      trangThai: 'Chưa bắt đầu',
      nguoiPhuTrach: `${nv2}, ${nv3}`,
      chuSoHuu: nv2,
      nganSach: 300000000,
      tasks: [
        { tieuDe: 'Chuẩn bị móng & hạ tầng', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv2, ngayBatDau: new Date('2026-09-16'), ngayKetThuc: new Date('2026-09-30'), mucDoUuTien: 'CAO' },
        { tieuDe: 'Lắp đặt máy sấy chính', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: `${nv2}, ${nv3}`, ngayBatDau: new Date('2026-10-01'), ngayKetThuc: new Date('2026-10-20'), mucDoUuTien: 'KHAN_CAP' },
        { tieuDe: 'Lắp đặt băng tải & hệ thống phụ trợ', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv3, ngayBatDau: new Date('2026-10-21'), ngayKetThuc: new Date('2026-11-05') },
        { tieuDe: 'Kết nối hệ thống điều khiển PLC', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv4, ngayBatDau: new Date('2026-11-01'), ngayKetThuc: new Date('2026-11-15'), mucDoUuTien: 'CAO' },
        { tieuDe: 'Hoàn thành lắp đặt', laMilestone: true, trangThai: 'Chưa bắt đầu', deadline: new Date('2026-11-15') },
      ],
    },
    {
      tenGiaiDoan: 'Chạy thử & Nghiệm thu',
      moTa: 'Chạy thử không tải, có tải, hiệu chỉnh thông số, nghiệm thu bàn giao',
      ngayBatDau: new Date('2026-11-16'),
      ngayKetThuc: new Date('2026-12-31'),
      trangThai: 'Chưa bắt đầu',
      nguoiPhuTrach: `${nv2}, ${nv4}`,
      chuSoHuu: nv1,
      nganSach: 50000000,
      tasks: [
        { tieuDe: 'Chạy thử không tải', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv2, ngayBatDau: new Date('2026-11-16'), ngayKetThuc: new Date('2026-11-25') },
        { tieuDe: 'Chạy thử có tải (sản phẩm thật)', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: `${nv2}, ${nv4}`, ngayBatDau: new Date('2026-11-26'), ngayKetThuc: new Date('2026-12-10'), mucDoUuTien: 'CAO' },
        { tieuDe: 'Hiệu chỉnh thông số vận hành', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv4, ngayBatDau: new Date('2026-12-11'), ngayKetThuc: new Date('2026-12-20') },
        { tieuDe: 'Đào tạo vận hành cho công nhân', trangThai: 'Chưa bắt đầu', nguoiPhuTrach: nv3, ngayBatDau: new Date('2026-12-15'), ngayKetThuc: new Date('2026-12-25'), mucDoUuTien: 'TRUNG_BINH' },
        { tieuDe: 'Nghiệm thu & Bàn giao', laMilestone: true, trangThai: 'Chưa bắt đầu', deadline: new Date('2026-12-31'), mucDoUuTien: 'KHAN_CAP' },
      ],
    },
  ];

  for (let i = 0; i < phases.length; i++) {
    const { tasks, ...phaseData } = phases[i];
    const phase = await prisma.projectPhase.create({
      data: {
        projectId: project.id,
        tenGiaiDoan: phaseData.tenGiaiDoan,
        moTa: phaseData.moTa,
        ngayBatDau: phaseData.ngayBatDau,
        ngayKetThuc: phaseData.ngayKetThuc,
        trangThai: phaseData.trangThai,
        nguoiPhuTrach: phaseData.nguoiPhuTrach,
        chuSoHuu: phaseData.chuSoHuu,
        nganSach: phaseData.nganSach,
        tienDo: 0,
        thuTu: i + 1,
      },
    });

    for (let j = 0; j < tasks.length; j++) {
      const t = tasks[j];
      await prisma.projectTask.create({
        data: {
          projectId: project.id,
          projectPhaseId: phase.id,
          tieuDe: t.tieuDe,
          trangThai: t.trangThai,
          nguoiPhuTrach: t.nguoiPhuTrach ?? null,
          ngayBatDau: t.ngayBatDau ?? null,
          ngayKetThuc: t.ngayKetThuc ?? null,
          deadline: t.deadline ?? null,
          laMilestone: t.laMilestone ?? false,
          mucDoUuTien: (t as any).mucDoUuTien ?? null,
          tienDo: t.trangThai === 'Hoàn thành' ? 100 : 0,
          thuTu: j + 1,
        },
      });
    }
  }

  console.log('✅ Sample project created: DA-2026-003');
  console.log(`   Nhân viên: ${nv1}, ${nv2}, ${nv3}, ${nv4}`);
  console.log(`   4 phases, ${phases.reduce((s, p) => s + p.tasks.length, 0)} tasks`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
