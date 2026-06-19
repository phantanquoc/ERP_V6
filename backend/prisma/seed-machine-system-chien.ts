/**
 * Seed hệ thống máy: Hệ thống Chiên Chân Không (Vacuum Frying System)
 *
 * Tạo 1 template HT-CCK-MAU + 8 máy vật lý HT-CCK-01..08 bằng BFS clone.
 *
 * Chạy: cd backend && npx ts-node --transpile-only prisma/seed-machine-system-chien.ts
 * Idempotent: chạy lại không tạo trùng và không lỗi.
 */

import { PrismaClient, MachineSystemCategory, MachineStatus, MachineSystemDetailType } from '@prisma/client';

const prisma = new PrismaClient();

// ── Inline BFS clone ────────────────────────────────────────────────────────
// Replicates machineSystemService.clone logic so seed can run standalone
// without resolving @services/* path aliases.
async function cloneSystem(
  sourceId: string,
  overrides: { maHeThong: string; tenHeThong: string; khuVuc?: string; viTri?: string },
): Promise<void> {
  const source = await prisma.machineSystem.findUnique({
    where: { id: sourceId },
    include: { details: { orderBy: { thuTu: 'asc' } } },
  });
  if (!source) throw new Error(`Source system ${sourceId} not found`);

  const parts = overrides.maHeThong.split('-');
  const suffix = parts[parts.length - 1] ?? overrides.maHeThong;
  const sourceIdentifier = source.maHeThong.split('-').pop() ?? source.maHeThong;

  await prisma.$transaction(async (tx) => {
    const newSystem = await tx.machineSystem.create({
      data: {
        khuVuc: overrides.khuVuc ?? source.khuVuc,
        viTri: overrides.viTri ?? source.viTri,
        maHeThong: overrides.maHeThong,
        tenHeThong: overrides.tenHeThong,
        chucNang: source.chucNang,
        loaiHeThong: source.loaiHeThong,
        hoatDong: source.hoatDong,
        trangThai: MachineStatus.HOAT_DONG,
        parentSystemId: sourceId,
      },
    });

    if (source.details.length === 0) return;

    const oldToNew = new Map<string, string>();
    const rootDetails = source.details.filter((d) => d.parentDetailId === null);
    let queue = [...rootDetails];

    while (queue.length > 0) {
      const nextQueue: typeof queue = [];
      for (const detail of queue) {
        const newMaChiTiet = detail.maChiTiet.replace(sourceIdentifier, suffix);

        const existing = await tx.machineSystemDetail.findUnique({
          where: { maChiTiet: newMaChiTiet },
        });
        if (existing) {
          // Already cloned in a previous seed run — record id mapping and skip
          oldToNew.set(detail.id, existing.id);
          const children = source.details.filter((d) => d.parentDetailId === detail.id);
          nextQueue.push(...children);
          continue;
        }

        const newParentDetailId = detail.parentDetailId
          ? (oldToNew.get(detail.parentDetailId) ?? null)
          : null;

        const created = await tx.machineSystemDetail.create({
          data: {
            machineSystemId: newSystem.id,
            parentDetailId: newParentDetailId,
            loaiChiTiet: detail.loaiChiTiet,
            maChiTiet: newMaChiTiet,
            tenChiTiet: detail.tenChiTiet,
            viTri: detail.viTri,
            moTa: detail.moTa,
            maNguoiPhuTrach: detail.maNguoiPhuTrach,
            nguoiPhuTrach: detail.nguoiPhuTrach,
            thuTu: detail.thuTu,
            hoatDong: detail.hoatDong,
            trangThai: detail.trangThai,
          },
        });

        oldToNew.set(detail.id, created.id);
        const children = source.details.filter((d) => d.parentDetailId === detail.id);
        nextQueue.push(...children);
      }
      queue = nextQueue;
    }
  });
}

// ── Seed main ───────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('Seeding: Hệ thống chiên chân không...\n');

  // ── Bước 1: Upsert template HT-CCK-MAU ──────────────────────────────────
  const template = await prisma.machineSystem.upsert({
    where: { maHeThong: 'HT-CCK-MAU' },
    update: {},
    create: {
      maHeThong: 'HT-CCK-MAU',
      tenHeThong: 'Mẫu hệ thống nồi chiên chân không',
      khuVuc: 'Xưởng sản xuất',
      viTri: 'Khu chiên - Template',
      chucNang:
        'Chiên nguyên liệu (mít, chuối, khoai môn) trong dầu ở nhiệt độ 85-100°C dưới áp suất chân không ' +
        '-0.08 đến -0.095 MPa. Giữ màu sắc, dinh dưỡng, giảm hấp thụ dầu so với chiên thường.',
      loaiHeThong: MachineSystemCategory.SAN_XUAT,
      hoatDong: true,
      trangThai: MachineStatus.HOAT_DONG,
      parentSystemId: null,
    },
  });
  console.log(`  Template: ${template.tenHeThong} (${template.maHeThong})`);

  // Xoá và tái tạo details của template (idempotent)
  const existingDetailsCount = await prisma.machineSystemDetail.count({
    where: { machineSystemId: template.id },
  });

  if (existingDetailsCount === 0) {
    await seedTemplateDetails(template.id);
    const total = await prisma.machineSystemDetail.count({ where: { machineSystemId: template.id } });
    console.log(`  Template: ${total} chi tiết đã tạo`);
  } else {
    console.log(`  Template: ${existingDetailsCount} chi tiết đã có (bỏ qua tạo mới)`);
  }

  // ── Bước 2: Clone 8 máy HT-CCK-01..08 ───────────────────────────────────
  const locations = [
    'Khu chiên - Dây chuyền 1, vị trí 1',
    'Khu chiên - Dây chuyền 1, vị trí 2',
    'Khu chiên - Dây chuyền 1, vị trí 3',
    'Khu chiên - Dây chuyền 1, vị trí 4',
    'Khu chiên - Dây chuyền 2, vị trí 1',
    'Khu chiên - Dây chuyền 2, vị trí 2',
    'Khu chiên - Dây chuyền 2, vị trí 3',
    'Khu chiên - Dây chuyền 2, vị trí 4',
  ];

  for (let i = 1; i <= 8; i++) {
    const num = String(i).padStart(2, '0');
    const maHeThong = `HT-CCK-${num}`;
    const tenHeThong = `Hệ thống nồi chiên chân không số ${num}`;

    const existing = await prisma.machineSystem.findUnique({ where: { maHeThong } });
    if (existing) {
      const detailCount = await prisma.machineSystemDetail.count({
        where: { machineSystemId: existing.id },
      });
      console.log(`  ${maHeThong}: đã tồn tại (${detailCount} chi tiết) — bỏ qua`);
      continue;
    }

    await cloneSystem(template.id, {
      maHeThong,
      tenHeThong,
      khuVuc: 'Xưởng sản xuất',
      viTri: locations[i - 1],
    });

    const created = await prisma.machineSystem.findUnique({
      where: { maHeThong },
      include: { _count: { select: { details: true } } },
    });
    console.log(`  ${maHeThong}: tạo xong (${created?._count.details ?? 0} chi tiết)`);
  }

  console.log('\nDone! 1 template + 8 máy chiên chân không đã được seed.');
}

// ── Chi tiết template ────────────────────────────────────────────────────────
async function seedTemplateDetails(systemId: string): Promise<void> {
  let order = 0;
  const create = (data: {
    ma: string;
    ten: string;
    loai: MachineSystemDetailType;
    parentId?: string;
    viTri?: string;
    moTa?: string;
  }) => {
    order++;
    return prisma.machineSystemDetail.create({
      data: {
        machineSystemId: systemId,
        parentDetailId: data.parentId ?? null,
        loaiChiTiet: data.loai,
        maChiTiet: data.ma,
        tenChiTiet: data.ten,
        viTri: data.viTri,
        moTa: data.moTa,
        thuTu: order,
        hoatDong: true,
        trangThai: 'Hoạt động',
      },
    });
  };

  const TB = MachineSystemDetailType.THIET_BI;
  const CUM = MachineSystemDetailType.CUM;
  const LK = MachineSystemDetailType.LINH_KIEN;
  const DKT = MachineSystemDetailType.DIEM_KIEM_TRA;

  // ═══════════════════════════════════════════════════════════════════════
  // 1. BUỒNG CHIÊN CHÂN KHÔNG
  // ═══════════════════════════════════════════════════════════════════════
  const tb1 = await create({
    ma: 'HT-CCK-MAU-TB01', ten: 'Buồng chiên chân không', loai: TB,
    viTri: 'Khu chiên - vị trí chính',
    moTa: 'Bình kín SUS304, dung tích 800L, chiên nguyên liệu ở 85-100°C dưới áp suất -0.09 MPa',
  });

  // Cụm 1.1 - Thân nồi và nắp
  const c01 = await create({ ma: 'HT-CCK-MAU-C01', ten: 'Cụm thân nồi và nắp', loai: CUM, parentId: tb1.id });
  await create({ ma: 'HT-CCK-MAU-LK001', ten: 'Thân nồi hình trụ SUS304', loai: LK, parentId: c01.id, moTa: 'Chịu áp suất âm, dung tích 800L, dày 6mm' });
  await create({ ma: 'HT-CCK-MAU-LK002', ten: 'Nắp nồi (mở bằng xylanh khí nén)', loai: LK, parentId: c01.id, moTa: 'Nắp bản lề, đóng mở tự động bằng xylanh' });
  await create({ ma: 'HT-CCK-MAU-LK003', ten: 'Ron kín cửa (silicon chịu nhiệt)', loai: LK, parentId: c01.id, moTa: 'Silicon food-grade, chịu 200°C, thay mỗi 6 tháng' });
  await create({ ma: 'HT-CCK-MAU-LK004', ten: 'Bản lề nắp nồi', loai: LK, parentId: c01.id });
  await create({ ma: 'HT-CCK-MAU-LK005', ten: 'Chốt khóa nắp khí nén', loai: LK, parentId: c01.id, moTa: 'Khóa an toàn tự động khi buồng đạt chân không' });
  await create({ ma: 'HT-CCK-MAU-DK01', ten: 'KT: Tình trạng ron kín cửa', loai: DKT, parentId: c01.id, moTa: 'Kiểm tra nứt, biến dạng, rò rỉ — hàng ngày trước ca' });
  await create({ ma: 'HT-CCK-MAU-DK02', ten: 'KT: Độ kín buồng (leak test)', loai: DKT, parentId: c01.id, moTa: 'Đạt -0.09 MPa trong <5 phút, giữ 10 phút mất <0.005 MPa' });

  // Cụm 1.2 - Giỏ chiên và cơ cấu nâng hạ
  const c02 = await create({ ma: 'HT-CCK-MAU-C02', ten: 'Cụm giỏ chiên và nâng hạ', loai: CUM, parentId: tb1.id });
  await create({ ma: 'HT-CCK-MAU-LK006', ten: 'Giỏ chiên lưới SUS304 (3 tầng)', loai: LK, parentId: c02.id, moTa: 'Kích thước 600x400mm/tầng, lỗ lưới 3mm' });
  await create({ ma: 'HT-CCK-MAU-LK007', ten: 'Trục nâng hạ giỏ', loai: LK, parentId: c02.id, moTa: 'Trục SUS316, dẫn hướng tuyến tính' });
  await create({ ma: 'HT-CCK-MAU-LK008', ten: 'Xylanh khí nén nâng hạ', loai: LK, parentId: c02.id, moTa: 'Festo DSBC-63, hành trình 500mm' });
  await create({ ma: 'HT-CCK-MAU-LK009', ten: 'Phớt cơ khí trục xuyên vách', loai: LK, parentId: c02.id, moTa: 'Mechanical seal — giữ chân không khi trục di chuyển, thay mỗi 3 tháng' });
  await create({ ma: 'HT-CCK-MAU-LK010', ten: 'Motor ly tâm tách dầu (spinner)', loai: LK, parentId: c02.id, moTa: '3 pha, 2.2kW, quay giỏ 450 rpm để tách dầu sau chiên' });
  await create({ ma: 'HT-CCK-MAU-LK011', ten: 'Vòng bi trục giỏ', loai: LK, parentId: c02.id, moTa: 'SKF 6208-2RS, bôi trơn mỡ chịu nhiệt' });
  await create({ ma: 'HT-CCK-MAU-DK03', ten: 'KT: Phớt trục — rò rỉ dầu/chân không', loai: DKT, parentId: c02.id, moTa: 'Quan sát dầu rỉ quanh trục — hàng ngày. Hỏng phớt = mất chân không đột ngột' });
  await create({ ma: 'HT-CCK-MAU-DK04', ten: 'KT: Motor ly tâm — dòng điện, rung', loai: DKT, parentId: c02.id, moTa: 'Đo ampe kẹp <5A, nghe tiếng mài bất thường — hàng tuần' });
  await create({ ma: 'HT-CCK-MAU-DK05', ten: 'KT: Giỏ chiên — biến dạng, mối hàn', loai: DKT, parentId: c02.id, moTa: 'Kiểm tra gãy mắt lưới, cong vênh — hàng tuần' });

  // Cụm 1.3 - Gia nhiệt dầu trong buồng
  const c03 = await create({ ma: 'HT-CCK-MAU-C03', ten: 'Cụm gia nhiệt dầu', loai: CUM, parentId: tb1.id });
  await create({ ma: 'HT-CCK-MAU-LK012', ten: 'Điện trở gia nhiệt nhúng dầu', loai: LK, parentId: c03.id, moTa: '3 bộ x 6kW, SUS316L, tổng 18kW' });
  await create({ ma: 'HT-CCK-MAU-LK013', ten: 'Cảm biến nhiệt độ dầu Pt100 (#1)', loai: LK, parentId: c03.id, moTa: 'Gần heater, range 0-200°C, output 4-20mA' });
  await create({ ma: 'HT-CCK-MAU-LK014', ten: 'Cảm biến nhiệt độ dầu Pt100 (#2)', loai: LK, parentId: c03.id, moTa: 'Xa heater (vùng chiên), range 0-200°C' });
  await create({ ma: 'HT-CCK-MAU-DK06', ten: 'KT: Điện trở — cách điện (megger test)', loai: DKT, parentId: c03.id, moTa: 'Đo điện trở cách điện >5MΩ — hàng tháng' });
  await create({ ma: 'HT-CCK-MAU-DK07', ten: 'KT: Cảm biến nhiệt — hiệu chuẩn', loai: DKT, parentId: c03.id, moTa: 'So sánh với nhiệt kế chuẩn, sai số ≤1°C — 6 tháng/lần' });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. HỆ THỐNG TUẦN HOÀN DẦU
  // ═══════════════════════════════════════════════════════════════════════
  const tb2 = await create({
    ma: 'HT-CCK-MAU-TB02', ten: 'Hệ thống tuần hoàn dầu', loai: TB,
    viTri: 'Bên dưới buồng chiên',
    moTa: 'Cấp dầu từ bồn chứa vào buồng chiên, tuần hoàn duy trì nhiệt đồng đều, lọc cặn',
  });

  // Cụm 2.1 - Bồn chứa dầu
  const c04 = await create({ ma: 'HT-CCK-MAU-C04', ten: 'Bồn chứa dầu', loai: CUM, parentId: tb2.id });
  await create({ ma: 'HT-CCK-MAU-LK015', ten: 'Thân bồn chứa dầu SUS304', loai: LK, parentId: c04.id, moTa: 'Dung tích 500L, bảo ôn nhiệt, có kính quan sát mức' });
  await create({ ma: 'HT-CCK-MAU-LK016', ten: 'Cảm biến mức dầu (float switch)', loai: LK, parentId: c04.id, moTa: 'Báo mức thấp/cao, output relay' });
  await create({ ma: 'HT-CCK-MAU-LK017', ten: 'Van xả đáy bồn', loai: LK, parentId: c04.id, moTa: 'Ball valve DN50, xả cặn bẩn' });
  await create({ ma: 'HT-CCK-MAU-DK08', ten: 'KT: Mức dầu — kiểm tra hàng ngày', loai: DKT, parentId: c04.id, moTa: 'Bổ sung dầu nếu mức thấp hơn vạch MIN' });
  await create({ ma: 'HT-CCK-MAU-DK09', ten: 'KT: Chất lượng dầu — TPM', loai: DKT, parentId: c04.id, moTa: 'Đo TPM (Total Polar Materials) bằng testo 270, thay dầu nếu >24%' });

  // Cụm 2.2 - Bơm tuần hoàn dầu
  const c05 = await create({ ma: 'HT-CCK-MAU-C05', ten: 'Bơm tuần hoàn dầu', loai: CUM, parentId: tb2.id });
  await create({ ma: 'HT-CCK-MAU-LK018', ten: 'Bơm bánh răng chịu nhiệt', loai: LK, parentId: c05.id, moTa: 'Gear pump SUS316, lưu lượng 5m³/h, chịu 150°C' });
  await create({ ma: 'HT-CCK-MAU-LK019', ten: 'Motor bơm tuần hoàn', loai: LK, parentId: c05.id, moTa: '3 pha, 1.5kW, 1450 rpm' });
  await create({ ma: 'HT-CCK-MAU-LK020', ten: 'Phớt cơ khí trục bơm', loai: LK, parentId: c05.id, moTa: 'Mechanical seal carbon/ceramic' });
  await create({ ma: 'HT-CCK-MAU-LK021', ten: 'Van một chiều (check valve)', loai: LK, parentId: c05.id });
  await create({ ma: 'HT-CCK-MAU-LK022', ten: 'Đồng hồ áp suất đường ống', loai: LK, parentId: c05.id, moTa: 'Bourdon 0-6 bar' });
  await create({ ma: 'HT-CCK-MAU-DK10', ten: 'KT: Phớt bơm — rò rỉ dầu', loai: DKT, parentId: c05.id, moTa: 'Quan sát dầu rỉ tại đầu trục bơm — hàng ngày' });
  await create({ ma: 'HT-CCK-MAU-DK11', ten: 'KT: Áp suất bơm — so thông số thiết kế', loai: DKT, parentId: c05.id, moTa: 'Áp suất đầu đẩy 2-4 bar, đầu hút không âm quá -0.3 bar' });

  // Cụm 2.3 - Bộ lọc dầu
  const c06 = await create({ ma: 'HT-CCK-MAU-C06', ten: 'Bộ lọc dầu', loai: CUM, parentId: tb2.id });
  await create({ ma: 'HT-CCK-MAU-LK023', ten: 'Vỏ lọc SUS304', loai: LK, parentId: c06.id, moTa: 'Chịu áp 6 bar, đường kính DN80' });
  await create({ ma: 'HT-CCK-MAU-LK024', ten: 'Lưới lọc inox 100 micron', loai: LK, parentId: c06.id, moTa: 'Phần tử lọc, vệ sinh hàng ngày sau mỗi mẻ' });
  await create({ ma: 'HT-CCK-MAU-LK025', ten: 'Đồng hồ chênh áp (DP gauge)', loai: LK, parentId: c06.id, moTa: 'Chỉ thị khi lọc bị tắc, ngưỡng 1.5 bar' });
  await create({ ma: 'HT-CCK-MAU-LK026', ten: 'Van xả cặn đáy lọc', loai: LK, parentId: c06.id });
  await create({ ma: 'HT-CCK-MAU-DK12', ten: 'KT: Chênh áp lọc — vệ sinh khi >1.5 bar', loai: DKT, parentId: c06.id, moTa: 'Đọc DP gauge sau mỗi mẻ, vệ sinh lưới nếu vượt ngưỡng' });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. HỆ THỐNG BƠM CHÂN KHÔNG
  // ═══════════════════════════════════════════════════════════════════════
  const tb3 = await create({
    ma: 'HT-CCK-MAU-TB03', ten: 'Hệ thống bơm chân không', loai: TB,
    viTri: 'Phía sau buồng chiên',
    moTa: 'Tạo và duy trì áp suất -0.08 ~ -0.095 MPa trong buồng chiên. Bơm cánh quạt quay (rotary vane) có dầu bôi trơn.',
  });

  // Cụm 3.1 - Bơm chân không chính
  const c07 = await create({ ma: 'HT-CCK-MAU-C07', ten: 'Bơm chân không chính (rotary vane)', loai: CUM, parentId: tb3.id });
  await create({ ma: 'HT-CCK-MAU-LK027', ten: 'Thân bơm (pump housing)', loai: LK, parentId: c07.id, moTa: 'Gang, lưu lượng hút 100 m³/h' });
  await create({ ma: 'HT-CCK-MAU-LK028', ten: 'Rotor + cánh trượt graphite', loai: LK, parentId: c07.id, moTa: '4 cánh graphite, mòn theo thời gian — thay mỗi 2000h' });
  await create({ ma: 'HT-CCK-MAU-LK029', ten: 'Motor dẫn động bơm', loai: LK, parentId: c07.id, moTa: '3 pha, 5.5kW, 1450 rpm' });
  await create({ ma: 'HT-CCK-MAU-LK030', ten: 'Bình chứa dầu bôi trơn bơm', loai: LK, parentId: c07.id, moTa: 'Dầu chân không chuyên dụng, cửa sổ quan sát mức' });
  await create({ ma: 'HT-CCK-MAU-LK031', ten: 'Bộ tách dầu khỏi khí xả (oil mist separator)', loai: LK, parentId: c07.id, moTa: 'Tách dầu trước khi khí xả ra ngoài, thay khi DP >0.5 bar' });
  await create({ ma: 'HT-CCK-MAU-LK032', ten: 'Bộ lọc khí đầu hút', loai: LK, parentId: c07.id, moTa: 'Lọc hơi ẩm/tạp chất trước khi vào bơm' });
  await create({ ma: 'HT-CCK-MAU-LK033', ten: 'Khớp nối motor-bơm', loai: LK, parentId: c07.id, moTa: 'Khớp nối mềm, hấp thụ rung' });
  await create({ ma: 'HT-CCK-MAU-DK13', ten: 'KT: Mức dầu bơm — quan sát cửa sổ', loai: DKT, parentId: c07.id, moTa: 'Mức dầu giữa MIN-MAX, bổ sung nếu thấp — hàng ngày' });
  await create({ ma: 'HT-CCK-MAU-DK14', ten: 'KT: Màu dầu bơm', loai: DKT, parentId: c07.id, moTa: 'Vàng/nâu nhạt = tốt; đen/đục = thay ngay. Thay toàn bộ mỗi 500h' });
  await create({ ma: 'HT-CCK-MAU-DK15', ten: 'KT: Áp suất chân không đạt', loai: DKT, parentId: c07.id, moTa: 'Đạt -0.095 MPa trong <3 phút (buồng rỗng). Không đạt = kiểm tra rò rỉ hoặc cánh mòn' });

  // Cụm 3.2 - Đường ống và van chân không
  const c08 = await create({ ma: 'HT-CCK-MAU-C08', ten: 'Đường ống và van chân không', loai: CUM, parentId: tb3.id });
  await create({ ma: 'HT-CCK-MAU-LK034', ten: 'Đường ống chân không SUS304 DN80', loai: LK, parentId: c08.id, moTa: 'Mối hàn kín, flanges có ron' });
  await create({ ma: 'HT-CCK-MAU-LK035', ten: 'Van cô lập buồng chiên (butterfly valve)', loai: LK, parentId: c08.id, moTa: 'Dẫn động khí nén, đóng/mở tự động theo PLC' });
  await create({ ma: 'HT-CCK-MAU-LK036', ten: 'Van nạp khí (vent valve)', loai: LK, parentId: c08.id, moTa: 'Phá chân không an toàn khi kết thúc mẻ chiên' });
  await create({ ma: 'HT-CCK-MAU-LK037', ten: 'Van an toàn (relief valve)', loai: LK, parentId: c08.id, moTa: 'ASME rated, mở tại -0.1 MPa để bảo vệ buồng' });
  await create({ ma: 'HT-CCK-MAU-LK038', ten: 'Đồng hồ đo chân không (Bourdon)', loai: LK, parentId: c08.id, moTa: 'Hiển thị cơ học, -0.1 ~ 0 MPa' });
  await create({ ma: 'HT-CCK-MAU-LK039', ten: 'Cảm biến áp suất chân không (transducer)', loai: LK, parentId: c08.id, moTa: '4-20mA gửi về PLC, range -0.1 ~ 0 MPa' });
  await create({ ma: 'HT-CCK-MAU-DK16', ten: 'KT: Rò rỉ đường ống chân không', loai: DKT, parentId: c08.id, moTa: 'Kiểm tra tốc độ mất chân không khi bơm tắt — hàng tuần' });
  await create({ ma: 'HT-CCK-MAU-DK17', ten: 'KT: Van an toàn — kiểm tra không kẹt', loai: DKT, parentId: c08.id, moTa: 'Thử vận hành thủ công, kiểm tra lò xo — hàng tháng' });

  // ═══════════════════════════════════════════════════════════════════════
  // 4. HỆ THỐNG TỤ NGƯNG
  // ═══════════════════════════════════════════════════════════════════════
  const tb4 = await create({
    ma: 'HT-CCK-MAU-TB04', ten: 'Hệ thống tụ ngưng', loai: TB,
    viTri: 'Giữa buồng chiên và bơm chân không',
    moTa: 'Ngưng tụ hơi nước/hơi dầu từ sản phẩm, bảo vệ bơm chân không khỏi ẩm và dầu.',
  });

  const c09 = await create({ ma: 'HT-CCK-MAU-C09', ten: 'Bộ tụ ngưng (condenser)', loai: CUM, parentId: tb4.id });
  await create({ ma: 'HT-CCK-MAU-LK040', ten: 'Thân thiết bị tụ ngưng (shell-and-tube)', loai: LK, parentId: c09.id, moTa: 'SUS304, diện tích trao đổi nhiệt 8m²' });
  await create({ ma: 'HT-CCK-MAU-LK041', ten: 'Ống xoắn trao đổi nhiệt', loai: LK, parentId: c09.id, moTa: 'Ống đồng Ø16, 40 ống' });
  await create({ ma: 'HT-CCK-MAU-LK042', ten: 'Van điều tiết nước làm mát', loai: LK, parentId: c09.id, moTa: 'Motorized valve, điều khiển lưu lượng theo nhiệt độ đầu ra' });
  await create({ ma: 'HT-CCK-MAU-LK043', ten: 'Bình thu nước ngưng', loai: LK, parentId: c09.id, moTa: 'SUS304, 50L, có phao tự xả' });
  await create({ ma: 'HT-CCK-MAU-LK044', ten: 'Cảm biến nhiệt độ nước ra', loai: LK, parentId: c09.id, moTa: 'Pt100, theo dõi hiệu quả ngưng tụ' });
  await create({ ma: 'HT-CCK-MAU-DK18', ten: 'KT: Nhiệt độ nước làm mát đầu vào', loai: DKT, parentId: c09.id, moTa: 'Không vượt quá 30°C, kiểm tra hàng ngày' });
  await create({ ma: 'HT-CCK-MAU-DK19', ten: 'KT: Xả bình thu nước ngưng', loai: DKT, parentId: c09.id, moTa: 'Xả sau mỗi mẻ, kiểm tra phao tự xả hoạt động' });
  await create({ ma: 'HT-CCK-MAU-DK20', ten: 'KT: Vệ sinh ống trao đổi nhiệt', loai: DKT, parentId: c09.id, moTa: 'Vệ sinh cặn scale bằng axit loãng — hàng tháng' });

  // ═══════════════════════════════════════════════════════════════════════
  // 5. HỆ THỐNG ĐIỀU KHIỂN
  // ═══════════════════════════════════════════════════════════════════════
  const tb5 = await create({
    ma: 'HT-CCK-MAU-TB05', ten: 'Tủ điều khiển PLC/HMI', loai: TB,
    viTri: 'Bên cạnh buồng chiên',
    moTa: 'Điều khiển tự động toàn bộ quy trình chiên: gia nhiệt, hút chân không, ly tâm, nạp khí.',
  });

  const c10 = await create({ ma: 'HT-CCK-MAU-C10', ten: 'Cụm PLC và HMI', loai: CUM, parentId: tb5.id });
  await create({ ma: 'HT-CCK-MAU-LK045', ten: 'PLC Mitsubishi FX5U-32M', loai: LK, parentId: c10.id, moTa: '32 I/O, mở rộng analog module' });
  await create({ ma: 'HT-CCK-MAU-LK046', ten: 'Màn hình HMI cảm ứng 10 inch', loai: LK, parentId: c10.id, moTa: 'Hiển thị nhiệt độ, áp suất, thời gian, alarm' });
  await create({ ma: 'HT-CCK-MAU-LK047', ten: 'Biến tần (VFD) motor ly tâm', loai: LK, parentId: c10.id, moTa: 'Mitsubishi FR-D720, 2.2kW, điều tốc mềm' });
  await create({ ma: 'HT-CCK-MAU-LK048', ten: 'Nguồn 24VDC', loai: LK, parentId: c10.id, moTa: 'Mean Well NDR-120-24, cấp nguồn PLC/sensors' });
  await create({ ma: 'HT-CCK-MAU-LK049', ten: 'Relay bảo vệ motor (3 bộ)', loai: LK, parentId: c10.id, moTa: 'Thermal overload relay cho motor bơm dầu, bơm CK, ly tâm' });

  const c11 = await create({ ma: 'HT-CCK-MAU-C11', ten: 'Cảm biến và đo lường', loai: CUM, parentId: tb5.id });
  await create({ ma: 'HT-CCK-MAU-LK050', ten: 'Cảm biến vị trí giỏ (proximity)', loai: LK, parentId: c11.id, moTa: 'Inductive, phát hiện giỏ ở vị trí trên/dưới' });
  await create({ ma: 'HT-CCK-MAU-LK051', ten: 'Cảm biến nắp đóng (limit switch)', loai: LK, parentId: c11.id, moTa: 'Interlock an toàn — bơm CK không chạy nếu nắp mở' });
  await create({ ma: 'HT-CCK-MAU-LK052', ten: 'Bộ ghi dữ liệu (data logger)', loai: LK, parentId: c11.id, moTa: 'Ghi log nhiệt độ + áp suất mỗi 30s, lưu thẻ SD' });
  await create({ ma: 'HT-CCK-MAU-DK21', ten: 'KT: Hiệu chuẩn cảm biến nhiệt', loai: DKT, parentId: c11.id, moTa: 'So sánh với nhiệt kế chuẩn, sai số ≤1°C — 6 tháng/lần' });
  await create({ ma: 'HT-CCK-MAU-DK22', ten: 'KT: Pin backup PLC', loai: DKT, parentId: c11.id, moTa: 'Kiểm tra báo low battery trên HMI — hàng tháng' });
  await create({ ma: 'HT-CCK-MAU-DK23', ten: 'KT: Kết nối cáp cảm biến', loai: DKT, parentId: c11.id, moTa: 'Kiểm tra oxy hóa, lỏng đầu cos tại tủ điều khiển — hàng quý' });

  // ═══════════════════════════════════════════════════════════════════════
  // 6. CỤM CẤP KHÍ NÉN
  // ═══════════════════════════════════════════════════════════════════════
  const tb6 = await create({
    ma: 'HT-CCK-MAU-TB06', ten: 'Cụm cấp khí nén', loai: TB,
    viTri: 'Phía sau hệ thống',
    moTa: 'Cấp khí nén cho xylanh nâng hạ giỏ, van butterfly, chốt khóa nắp. Áp suất 6 bar.',
  });

  await create({ ma: 'HT-CCK-MAU-LK053', ten: 'Bộ lọc-điều áp-bôi trơn (FRL)', loai: LK, parentId: tb6.id, moTa: 'SMC AC40, lọc 5μm, điều áp 0-10 bar' });
  await create({ ma: 'HT-CCK-MAU-LK054', ten: 'Van solenoid 5/2 (nâng hạ giỏ)', loai: LK, parentId: tb6.id, moTa: 'SMC SY5120, 24VDC, điều khiển xylanh 2 chiều' });
  await create({ ma: 'HT-CCK-MAU-LK055', ten: 'Van solenoid 5/2 (khóa nắp)', loai: LK, parentId: tb6.id, moTa: 'SMC SY3120, 24VDC' });
  await create({ ma: 'HT-CCK-MAU-DK24', ten: 'KT: Áp suất khí nén đầu vào', loai: DKT, parentId: tb6.id, moTa: 'Đọc đồng hồ FRL, yêu cầu ≥5.5 bar — hàng ngày' });
  await create({ ma: 'HT-CCK-MAU-DK25', ten: 'KT: Xả nước bộ lọc FRL', loai: DKT, parentId: tb6.id, moTa: 'Xả nước ngưng cuối ca — hàng ngày' });
}

main()
  .catch((e) => {
    console.error('Lỗi seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
