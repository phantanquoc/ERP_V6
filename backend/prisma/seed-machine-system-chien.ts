/**
 * Seed hệ thống máy: Hệ thống Chiên Chân Không (Vacuum Frying System)
 * Loại: SAN_XUAT — đầy đủ thiết bị, cụm, linh kiện, điểm kiểm tra
 *
 * Chạy: docker compose -f docker-compose.dev.yml exec backend npx ts-node --transpile-only prisma/seed-machine-system-chien.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding hệ thống máy: Chiên chân không...\n');

  // Upsert hệ thống chính
  const system = await prisma.machineSystem.upsert({
    where: { maHeThong: 'HT-CCK-01' },
    update: {},
    create: {
      maHeThong: 'HT-CCK-01',
      tenHeThong: 'Hệ thống chiên chân không',
      khuVuc: 'Xưởng sản xuất',
      viTri: 'Khu chiên - Tầng 1',
      chucNang: 'Chiên nguyên liệu (mít, chuối, khoai môn) trong dầu ở nhiệt độ 85-100°C dưới áp suất chân không -0.08 đến -0.095 MPa. Giữ màu sắc, dinh dưỡng, giảm hấp thụ dầu so với chiên thường.',
      loaiHeThong: 'SAN_XUAT',
      hoatDong: true,
    },
  });
  console.log(`  ✅ Hệ thống: ${system.tenHeThong} (${system.maHeThong})`);

  // Xoá details cũ nếu re-seed
  await prisma.machineSystemDetail.deleteMany({ where: { machineSystemId: system.id } });

  // Helper tạo detail
  let order = 0;
  const createDetail = (
    data: { ma: string; ten: string; loai: 'THIET_BI' | 'CUM' | 'LINH_KIEN' | 'DIEM_KIEM_TRA'; parentId?: string; viTri?: string; moTa?: string },
  ) => {
    order++;
    return prisma.machineSystemDetail.create({
      data: {
        machineSystemId: system.id,
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

  // ═══════════════════════════════════════════════════════════════════════
  // 1. BUỒNG CHIÊN CHÂN KHÔNG
  // ═══════════════════════════════════════════════════════════════════════
  const tb1 = await createDetail({
    ma: 'CCK-TB01', ten: 'Buồng chiên chân không', loai: 'THIET_BI',
    viTri: 'Khu chiên - vị trí chính',
    moTa: 'Bình kín SUS304, dung tích 800L, chiên nguyên liệu ở 85-100°C dưới áp suất -0.09 MPa',
  });

  // Cụm 1.1 - Thân nồi và nắp
  const cum11 = await createDetail({ ma: 'CCK-C01', ten: 'Cụm thân nồi và nắp', loai: 'CUM', parentId: tb1.id });
  await createDetail({ ma: 'CCK-LK001', ten: 'Thân nồi hình trụ SUS304', loai: 'LINH_KIEN', parentId: cum11.id, moTa: 'Chịu áp suất âm, dung tích 800L, dày 6mm' });
  await createDetail({ ma: 'CCK-LK002', ten: 'Nắp nồi (mở bằng xylanh khí nén)', loai: 'LINH_KIEN', parentId: cum11.id, moTa: 'Nắp bản lề, đóng mở tự động bằng xylanh' });
  await createDetail({ ma: 'CCK-LK003', ten: 'Ron kín cửa (silicon chịu nhiệt)', loai: 'LINH_KIEN', parentId: cum11.id, moTa: 'Silicon food-grade, chịu 200°C, thay mỗi 6 tháng' });
  await createDetail({ ma: 'CCK-LK004', ten: 'Bản lề nắp nồi', loai: 'LINH_KIEN', parentId: cum11.id });
  await createDetail({ ma: 'CCK-LK005', ten: 'Chốt khóa nắp khí nén', loai: 'LINH_KIEN', parentId: cum11.id, moTa: 'Khóa an toàn tự động khi buồng đạt chân không' });
  await createDetail({ ma: 'CCK-DKT01', ten: 'KT: Tình trạng ron kín cửa', loai: 'DIEM_KIEM_TRA', parentId: cum11.id, moTa: 'Kiểm tra nứt, biến dạng, rò rỉ — hàng ngày trước ca' });
  await createDetail({ ma: 'CCK-DKT02', ten: 'KT: Độ kín buồng (leak test)', loai: 'DIEM_KIEM_TRA', parentId: cum11.id, moTa: 'Đạt -0.09 MPa trong <5 phút, giữ 10 phút mất <0.005 MPa' });

  // Cụm 1.2 - Giỏ chiên và cơ cấu nâng hạ
  const cum12 = await createDetail({ ma: 'CCK-C02', ten: 'Cụm giỏ chiên và nâng hạ', loai: 'CUM', parentId: tb1.id });
  await createDetail({ ma: 'CCK-LK006', ten: 'Giỏ chiên lưới SUS304 (3 tầng)', loai: 'LINH_KIEN', parentId: cum12.id, moTa: 'Kích thước 600x400mm/tầng, lỗ lưới 3mm' });
  await createDetail({ ma: 'CCK-LK007', ten: 'Trục nâng hạ giỏ', loai: 'LINH_KIEN', parentId: cum12.id, moTa: 'Trục SUS316, dẫn hướng tuyến tính' });
  await createDetail({ ma: 'CCK-LK008', ten: 'Xylanh khí nén nâng hạ', loai: 'LINH_KIEN', parentId: cum12.id, moTa: 'Festo DSBC-63, hành trình 500mm' });
  await createDetail({ ma: 'CCK-LK009', ten: 'Phớt cơ khí trục xuyên vách', loai: 'LINH_KIEN', parentId: cum12.id, moTa: 'Mechanical seal — giữ chân không khi trục di chuyển, thay mỗi 3 tháng' });
  await createDetail({ ma: 'CCK-LK010', ten: 'Motor ly tâm tách dầu (spinner)', loai: 'LINH_KIEN', parentId: cum12.id, moTa: '3 pha, 2.2kW, quay giỏ 450 rpm để tách dầu sau chiên' });
  await createDetail({ ma: 'CCK-LK011', ten: 'Vòng bi trục giỏ', loai: 'LINH_KIEN', parentId: cum12.id, moTa: 'SKF 6208-2RS, bôi trơn mỡ chịu nhiệt' });
  await createDetail({ ma: 'CCK-DKT03', ten: 'KT: Phớt trục — rò rỉ dầu/chân không', loai: 'DIEM_KIEM_TRA', parentId: cum12.id, moTa: 'Quan sát dầu rỉ quanh trục — hàng ngày. Hỏng phớt = mất chân không đột ngột' });
  await createDetail({ ma: 'CCK-DKT04', ten: 'KT: Motor ly tâm — dòng điện, rung', loai: 'DIEM_KIEM_TRA', parentId: cum12.id, moTa: 'Đo ampe kẹp <5A, nghe tiếng mài bất thường — hàng tuần' });
  await createDetail({ ma: 'CCK-DKT05', ten: 'KT: Giỏ chiên — biến dạng, mối hàn', loai: 'DIEM_KIEM_TRA', parentId: cum12.id, moTa: 'Kiểm tra gãy mắt lưới, cong vênh — hàng tuần' });

  // Cụm 1.3 - Gia nhiệt dầu trong buồng
  const cum13 = await createDetail({ ma: 'CCK-C03', ten: 'Cụm gia nhiệt dầu', loai: 'CUM', parentId: tb1.id });
  await createDetail({ ma: 'CCK-LK012', ten: 'Điện trở gia nhiệt nhúng dầu', loai: 'LINH_KIEN', parentId: cum13.id, moTa: '3 bộ x 6kW, SUS316L, tổng 18kW' });
  await createDetail({ ma: 'CCK-LK013', ten: 'Cảm biến nhiệt độ dầu Pt100 (#1)', loai: 'LINH_KIEN', parentId: cum13.id, moTa: 'Gần heater, range 0-200°C, output 4-20mA' });
  await createDetail({ ma: 'CCK-LK014', ten: 'Cảm biến nhiệt độ dầu Pt100 (#2)', loai: 'LINH_KIEN', parentId: cum13.id, moTa: 'Xa heater (vùng chiên), range 0-200°C' });
  await createDetail({ ma: 'CCK-DKT06', ten: 'KT: Điện trở — cách điện (megger test)', loai: 'DIEM_KIEM_TRA', parentId: cum13.id, moTa: 'Đo điện trở cách điện >5MΩ — hàng tháng' });
  await createDetail({ ma: 'CCK-DKT07', ten: 'KT: Cảm biến nhiệt — hiệu chuẩn', loai: 'DIEM_KIEM_TRA', parentId: cum13.id, moTa: 'So sánh với nhiệt kế chuẩn, sai số ≤1°C — 6 tháng/lần' });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. HỆ THỐNG TUẦN HOÀN DẦU
  // ═══════════════════════════════════════════════════════════════════════
  const tb2 = await createDetail({
    ma: 'CCK-TB02', ten: 'Hệ thống tuần hoàn dầu', loai: 'THIET_BI',
    viTri: 'Bên dưới buồng chiên',
    moTa: 'Cấp dầu từ bồn chứa vào buồng chiên, tuần hoàn duy trì nhiệt đồng đều, lọc cặn',
  });

  // PLACEHOLDER_SECTION_2
  // Cụm 2.1 - Bồn chứa dầu
  const cum21 = await createDetail({ ma: 'CCK-C04', ten: 'Bồn chứa dầu', loai: 'CUM', parentId: tb2.id });
  await createDetail({ ma: 'CCK-LK015', ten: 'Thân bồn chứa dầu SUS304', loai: 'LINH_KIEN', parentId: cum21.id, moTa: 'Dung tích 500L, bảo ôn nhiệt, có kính quan sát mức' });
  await createDetail({ ma: 'CCK-LK016', ten: 'Cảm biến mức dầu (float switch)', loai: 'LINH_KIEN', parentId: cum21.id, moTa: 'Báo mức thấp/cao, output relay' });
  await createDetail({ ma: 'CCK-LK017', ten: 'Van xả đáy bồn', loai: 'LINH_KIEN', parentId: cum21.id, moTa: 'Ball valve DN50, xả cặn bẩn' });
  await createDetail({ ma: 'CCK-DKT08', ten: 'KT: Mức dầu — kiểm tra hàng ngày', loai: 'DIEM_KIEM_TRA', parentId: cum21.id, moTa: 'Bổ sung dầu nếu mức thấp hơn vạch MIN' });
  await createDetail({ ma: 'CCK-DKT09', ten: 'KT: Chất lượng dầu — TPM', loai: 'DIEM_KIEM_TRA', parentId: cum21.id, moTa: 'Đo TPM (Total Polar Materials) bằng testo 270, thay dầu nếu >24%' });

  // Cụm 2.2 - Bơm tuần hoàn dầu
  const cum22 = await createDetail({ ma: 'CCK-C05', ten: 'Bơm tuần hoàn dầu', loai: 'CUM', parentId: tb2.id });
  await createDetail({ ma: 'CCK-LK018', ten: 'Bơm bánh răng chịu nhiệt', loai: 'LINH_KIEN', parentId: cum22.id, moTa: 'Gear pump SUS316, lưu lượng 5m³/h, chịu 150°C' });
  await createDetail({ ma: 'CCK-LK019', ten: 'Motor bơm tuần hoàn', loai: 'LINH_KIEN', parentId: cum22.id, moTa: '3 pha, 1.5kW, 1450 rpm' });
  await createDetail({ ma: 'CCK-LK020', ten: 'Phớt cơ khí trục bơm', loai: 'LINH_KIEN', parentId: cum22.id, moTa: 'Mechanical seal carbon/ceramic' });
  await createDetail({ ma: 'CCK-LK021', ten: 'Van một chiều (check valve)', loai: 'LINH_KIEN', parentId: cum22.id });
  await createDetail({ ma: 'CCK-LK022', ten: 'Đồng hồ áp suất đường ống', loai: 'LINH_KIEN', parentId: cum22.id, moTa: 'Bourdon 0-6 bar' });
  await createDetail({ ma: 'CCK-DKT10', ten: 'KT: Phớt bơm — rò rỉ dầu', loai: 'DIEM_KIEM_TRA', parentId: cum22.id, moTa: 'Quan sát dầu rỉ tại đầu trục bơm — hàng ngày' });
  await createDetail({ ma: 'CCK-DKT11', ten: 'KT: Áp suất bơm — so thông số thiết kế', loai: 'DIEM_KIEM_TRA', parentId: cum22.id, moTa: 'Áp suất đầu đẩy 2-4 bar, đầu hút không âm quá -0.3 bar' });

  // Cụm 2.3 - Bộ lọc dầu
  const cum23 = await createDetail({ ma: 'CCK-C06', ten: 'Bộ lọc dầu', loai: 'CUM', parentId: tb2.id });
  await createDetail({ ma: 'CCK-LK023', ten: 'Vỏ lọc SUS304', loai: 'LINH_KIEN', parentId: cum23.id, moTa: 'Chịu áp 6 bar, đường kính DN80' });
  await createDetail({ ma: 'CCK-LK024', ten: 'Lưới lọc inox 100 micron', loai: 'LINH_KIEN', parentId: cum23.id, moTa: 'Phần tử lọc, vệ sinh hàng ngày sau mỗi mẻ' });
  await createDetail({ ma: 'CCK-LK025', ten: 'Đồng hồ chênh áp (DP gauge)', loai: 'LINH_KIEN', parentId: cum23.id, moTa: 'Chỉ thị khi lọc bị tắc, ngưỡng 1.5 bar' });
  await createDetail({ ma: 'CCK-LK026', ten: 'Van xả cặn đáy lọc', loai: 'LINH_KIEN', parentId: cum23.id });
  await createDetail({ ma: 'CCK-DKT12', ten: 'KT: Chênh áp lọc — vệ sinh khi >1.5 bar', loai: 'DIEM_KIEM_TRA', parentId: cum23.id, moTa: 'Đọc DP gauge sau mỗi mẻ, vệ sinh lưới nếu vượt ngưỡng' });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. HỆ THỐNG BƠM CHÂN KHÔNG
  // ═══════════════════════════════════════════════════════════════════════
  const tb3 = await createDetail({
    ma: 'CCK-TB03', ten: 'Hệ thống bơm chân không', loai: 'THIET_BI',
    viTri: 'Phía sau buồng chiên',
    moTa: 'Tạo và duy trì áp suất -0.08 ~ -0.095 MPa trong buồng chiên. Bơm cánh quạt quay (rotary vane) có dầu bôi trơn.',
  });

  // Cụm 3.1 - Bơm chân không chính
  const cum31 = await createDetail({ ma: 'CCK-C07', ten: 'Bơm chân không chính (rotary vane)', loai: 'CUM', parentId: tb3.id });
  await createDetail({ ma: 'CCK-LK027', ten: 'Thân bơm (pump housing)', loai: 'LINH_KIEN', parentId: cum31.id, moTa: 'Gang, lưu lượng hút 100 m³/h' });
  await createDetail({ ma: 'CCK-LK028', ten: 'Rotor + cánh trượt graphite', loai: 'LINH_KIEN', parentId: cum31.id, moTa: '4 cánh graphite, mòn theo thời gian — thay mỗi 2000h' });
  await createDetail({ ma: 'CCK-LK029', ten: 'Motor dẫn động bơm', loai: 'LINH_KIEN', parentId: cum31.id, moTa: '3 pha, 5.5kW, 1450 rpm' });
  await createDetail({ ma: 'CCK-LK030', ten: 'Bình chứa dầu bôi trơn bơm', loai: 'LINH_KIEN', parentId: cum31.id, moTa: 'Dầu chân không chuyên dụng, cửa sổ quan sát mức' });
  await createDetail({ ma: 'CCK-LK031', ten: 'Bộ tách dầu khỏi khí xả (oil mist separator)', loai: 'LINH_KIEN', parentId: cum31.id, moTa: 'Tách dầu trước khi khí xả ra ngoài, thay khi DP >0.5 bar' });
  await createDetail({ ma: 'CCK-LK032', ten: 'Bộ lọc khí đầu hút', loai: 'LINH_KIEN', parentId: cum31.id, moTa: 'Lọc hơi ẩm/tạp chất trước khi vào bơm' });
  await createDetail({ ma: 'CCK-LK033', ten: 'Khớp nối motor-bơm', loai: 'LINH_KIEN', parentId: cum31.id, moTa: 'Khớp nối mềm, hấp thụ rung' });
  await createDetail({ ma: 'CCK-DKT13', ten: 'KT: Mức dầu bơm — quan sát cửa sổ', loai: 'DIEM_KIEM_TRA', parentId: cum31.id, moTa: 'Mức dầu giữa MIN-MAX, bổ sung nếu thấp — hàng ngày' });
  await createDetail({ ma: 'CCK-DKT14', ten: 'KT: Màu dầu bơm', loai: 'DIEM_KIEM_TRA', parentId: cum31.id, moTa: 'Vàng/nâu nhạt = tốt; đen/đục = thay ngay. Thay toàn bộ mỗi 500h' });
  await createDetail({ ma: 'CCK-DKT15', ten: 'KT: Áp suất chân không đạt', loai: 'DIEM_KIEM_TRA', parentId: cum31.id, moTa: 'Đạt -0.095 MPa trong <3 phút (buồng rỗng). Không đạt = kiểm tra rò rỉ hoặc cánh mòn' });

  // Cụm 3.2 - Đường ống và van chân không
  const cum32 = await createDetail({ ma: 'CCK-C08', ten: 'Đường ống và van chân không', loai: 'CUM', parentId: tb3.id });
  await createDetail({ ma: 'CCK-LK034', ten: 'Đường ống chân không SUS304 DN80', loai: 'LINH_KIEN', parentId: cum32.id, moTa: 'Mối hàn kín, flanges có ron' });
  await createDetail({ ma: 'CCK-LK035', ten: 'Van cô lập buồng chiên (butterfly valve)', loai: 'LINH_KIEN', parentId: cum32.id, moTa: 'Dẫn động khí nén, đóng/mở tự động theo PLC' });
  await createDetail({ ma: 'CCK-LK036', ten: 'Van nạp khí (vent valve)', loai: 'LINH_KIEN', parentId: cum32.id, moTa: 'Phá chân không an toàn khi kết thúc mẻ chiên' });
  await createDetail({ ma: 'CCK-LK037', ten: 'Van an toàn (relief valve)', loai: 'LINH_KIEN', parentId: cum32.id, moTa: 'ASME rated, mở tại -0.1 MPa để bảo vệ buồng' });
  await createDetail({ ma: 'CCK-LK038', ten: 'Đồng hồ đo chân không (Bourdon)', loai: 'LINH_KIEN', parentId: cum32.id, moTa: 'Hiển thị cơ học, -0.1 ~ 0 MPa' });
  await createDetail({ ma: 'CCK-LK039', ten: 'Cảm biến áp suất chân không (transducer)', loai: 'LINH_KIEN', parentId: cum32.id, moTa: '4-20mA gửi về PLC, range -0.1 ~ 0 MPa' });
  await createDetail({ ma: 'CCK-DKT16', ten: 'KT: Rò rỉ đường ống chân không', loai: 'DIEM_KIEM_TRA', parentId: cum32.id, moTa: 'Kiểm tra tốc độ mất chân không khi bơm tắt — hàng tuần' });
  await createDetail({ ma: 'CCK-DKT17', ten: 'KT: Van an toàn — kiểm tra không kẹt', loai: 'DIEM_KIEM_TRA', parentId: cum32.id, moTa: 'Thử vận hành thủ công, kiểm tra lò xo — hàng tháng' });

  // ═══════════════════════════════════════════════════════════════════════
  // 4. HỆ THỐNG TỤ NGƯNG
  // ═══════════════════════════════════════════════════════════════════════
  const tb4 = await createDetail({
    ma: 'CCK-TB04', ten: 'Hệ thống tụ ngưng', loai: 'THIET_BI',
    viTri: 'Giữa buồng chiên và bơm chân không',
    moTa: 'Ngưng tụ hơi nước/hơi dầu từ sản phẩm, bảo vệ bơm chân không khỏi ẩm và dầu.',
  });

  const cum41 = await createDetail({ ma: 'CCK-C09', ten: 'Bộ tụ ngưng (condenser)', loai: 'CUM', parentId: tb4.id });
  await createDetail({ ma: 'CCK-LK040', ten: 'Thân thiết bị tụ ngưng (shell-and-tube)', loai: 'LINH_KIEN', parentId: cum41.id, moTa: 'SUS304, diện tích trao đổi nhiệt 8m²' });
  await createDetail({ ma: 'CCK-LK041', ten: 'Ống xoắn trao đổi nhiệt', loai: 'LINH_KIEN', parentId: cum41.id, moTa: 'Ống đồng Ø16, 40 ống' });
  await createDetail({ ma: 'CCK-LK042', ten: 'Van điều tiết nước làm mát', loai: 'LINH_KIEN', parentId: cum41.id, moTa: 'Motorized valve, điều khiển lưu lượng theo nhiệt độ đầu ra' });
  await createDetail({ ma: 'CCK-LK043', ten: 'Bình thu nước ngưng', loai: 'LINH_KIEN', parentId: cum41.id, moTa: 'SUS304, 50L, có phao tự xả' });
  await createDetail({ ma: 'CCK-LK044', ten: 'Cảm biến nhiệt độ nước ra', loai: 'LINH_KIEN', parentId: cum41.id, moTa: 'Pt100, theo dõi hiệu quả ngưng tụ' });
  await createDetail({ ma: 'CCK-DKT18', ten: 'KT: Nhiệt độ nước làm mát đầu vào', loai: 'DIEM_KIEM_TRA', parentId: cum41.id, moTa: 'Không vượt quá 30°C, kiểm tra hàng ngày' });
  await createDetail({ ma: 'CCK-DKT19', ten: 'KT: Xả bình thu nước ngưng', loai: 'DIEM_KIEM_TRA', parentId: cum41.id, moTa: 'Xả sau mỗi mẻ, kiểm tra phao tự xả hoạt động' });
  await createDetail({ ma: 'CCK-DKT20', ten: 'KT: Vệ sinh ống trao đổi nhiệt', loai: 'DIEM_KIEM_TRA', parentId: cum41.id, moTa: 'Vệ sinh cặn scale bằng axit loãng — hàng tháng' });

  // ═══════════════════════════════════════════════════════════════════════
  // 5. HỆ THỐNG ĐIỀU KHIỂN
  // ═══════════════════════════════════════════════════════════════════════
  const tb5 = await createDetail({
    ma: 'CCK-TB05', ten: 'Tủ điều khiển PLC/HMI', loai: 'THIET_BI',
    viTri: 'Bên cạnh buồng chiên',
    moTa: 'Điều khiển tự động toàn bộ quy trình chiên: gia nhiệt, hút chân không, ly tâm, nạp khí.',
  });

  const cum51 = await createDetail({ ma: 'CCK-C10', ten: 'Cụm PLC và HMI', loai: 'CUM', parentId: tb5.id });
  await createDetail({ ma: 'CCK-LK045', ten: 'PLC Mitsubishi FX5U-32M', loai: 'LINH_KIEN', parentId: cum51.id, moTa: '32 I/O, mở rộng analog module' });
  await createDetail({ ma: 'CCK-LK046', ten: 'Màn hình HMI cảm ứng 10 inch', loai: 'LINH_KIEN', parentId: cum51.id, moTa: 'Hiển thị nhiệt độ, áp suất, thời gian, alarm' });
  await createDetail({ ma: 'CCK-LK047', ten: 'Biến tần (VFD) motor ly tâm', loai: 'LINH_KIEN', parentId: cum51.id, moTa: 'Mitsubishi FR-D720, 2.2kW, điều tốc mềm' });
  await createDetail({ ma: 'CCK-LK048', ten: 'Nguồn 24VDC', loai: 'LINH_KIEN', parentId: cum51.id, moTa: 'Mean Well NDR-120-24, cấp nguồn PLC/sensors' });
  await createDetail({ ma: 'CCK-LK049', ten: 'Relay bảo vệ motor (3 bộ)', loai: 'LINH_KIEN', parentId: cum51.id, moTa: 'Thermal overload relay cho motor bơm dầu, bơm CK, ly tâm' });

  const cum52 = await createDetail({ ma: 'CCK-C11', ten: 'Cảm biến và đo lường', loai: 'CUM', parentId: tb5.id });
  await createDetail({ ma: 'CCK-LK050', ten: 'Cảm biến vị trí giỏ (proximity)', loai: 'LINH_KIEN', parentId: cum52.id, moTa: 'Inductive, phát hiện giỏ ở vị trí trên/dưới' });
  await createDetail({ ma: 'CCK-LK051', ten: 'Cảm biến nắp đóng (limit switch)', loai: 'LINH_KIEN', parentId: cum52.id, moTa: 'Interlock an toàn — bơm CK không chạy nếu nắp mở' });
  await createDetail({ ma: 'CCK-LK052', ten: 'Bộ ghi dữ liệu (data logger)', loai: 'LINH_KIEN', parentId: cum52.id, moTa: 'Ghi log nhiệt độ + áp suất mỗi 30s, lưu thẻ SD' });
  await createDetail({ ma: 'CCK-DKT21', ten: 'KT: Hiệu chuẩn cảm biến nhiệt', loai: 'DIEM_KIEM_TRA', parentId: cum52.id, moTa: 'So sánh với nhiệt kế chuẩn, sai số ≤1°C — 6 tháng/lần' });
  await createDetail({ ma: 'CCK-DKT22', ten: 'KT: Pin backup PLC', loai: 'DIEM_KIEM_TRA', parentId: cum52.id, moTa: 'Kiểm tra báo low battery trên HMI — hàng tháng' });
  await createDetail({ ma: 'CCK-DKT23', ten: 'KT: Kết nối cáp cảm biến', loai: 'DIEM_KIEM_TRA', parentId: cum52.id, moTa: 'Kiểm tra oxy hóa, lỏng đầu cos tại tủ điều khiển — hàng quý' });

  // ═══════════════════════════════════════════════════════════════════════
  // 6. HỆ THỐNG KHÍ NÉN
  // ═══════════════════════════════════════════════════════════════════════
  const tb6 = await createDetail({
    ma: 'CCK-TB06', ten: 'Cụm cấp khí nén', loai: 'THIET_BI',
    viTri: 'Phía sau hệ thống',
    moTa: 'Cấp khí nén cho xylanh nâng hạ giỏ, van butterfly, chốt khóa nắp. Áp suất 6 bar.',
  });

  await createDetail({ ma: 'CCK-LK053', ten: 'Bộ lọc-điều áp-bôi trơn (FRL)', loai: 'LINH_KIEN', parentId: tb6.id, moTa: 'SMC AC40, lọc 5μm, điều áp 0-10 bar' });
  await createDetail({ ma: 'CCK-LK054', ten: 'Van solenoid 5/2 (nâng hạ giỏ)', loai: 'LINH_KIEN', parentId: tb6.id, moTa: 'SMC SY5120, 24VDC, điều khiển xylanh 2 chiều' });
  await createDetail({ ma: 'CCK-LK055', ten: 'Van solenoid 5/2 (khóa nắp)', loai: 'LINH_KIEN', parentId: tb6.id, moTa: 'SMC SY3120, 24VDC' });
  await createDetail({ ma: 'CCK-DKT24', ten: 'KT: Áp suất khí nén đầu vào', loai: 'DIEM_KIEM_TRA', parentId: tb6.id, moTa: 'Đọc đồng hồ FRL, yêu cầu ≥5.5 bar — hàng ngày' });
  await createDetail({ ma: 'CCK-DKT25', ten: 'KT: Xả nước bộ lọc FRL', loai: 'DIEM_KIEM_TRA', parentId: tb6.id, moTa: 'Xả nước ngưng cuối ca — hàng ngày' });

  // Tổng kết
  const count = await prisma.machineSystemDetail.count({ where: { machineSystemId: system.id } });
  console.log(`  ✅ ${count} chi tiết (thiết bị + cụm + linh kiện + điểm kiểm tra)`);
  console.log('\n🎉 Done! Hệ thống chiên chân không đã được seed đầy đủ.');
}

main()
  .catch((e) => {
    console.error('❌', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
