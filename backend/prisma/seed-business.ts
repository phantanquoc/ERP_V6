/**
 * Seed dữ liệu business — Quy trình sản xuất mít sấy hoàn chỉnh
 * Chạy: npx ts-node --transpile-only prisma/seed-business.ts
 *
 * Quy trình đầy đủ:
 *   Khách hàng → YCBG → Báo giá → Đơn hàng
 *   → Yêu cầu cung ứng NVL → Mua hàng → Nhập kho NVL
 *   → Quy trình SX (định mức, flowchart, máy sấy)
 *   → Đánh giá NL → Vận hành máy → Thành phẩm → Đánh giá CL
 *   → Nhập kho TP → Xuất kho → Giao hàng → Hóa đơn → Công nợ
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding business data — Quy trình mít sấy chi tiết...\n');

  // ─── Lấy employee đã có ─────────────────────────────────────────────────
  const adminEmployee = await prisma.employee.findFirst({ where: { employeeCode: 'NV0000' } });
  const businessEmployee = await prisma.employee.findFirst({ where: { employeeCode: 'NV0003' } });
  const purchasingEmployee = await prisma.employee.findFirst({ where: { employeeCode: 'NV0005' } });
  const productionEmployee = await prisma.employee.findFirst({ where: { employeeCode: 'NV0002' } });

  if (!adminEmployee || !businessEmployee || !purchasingEmployee) {
    console.error('❌ Cần chạy seed chính trước (npx prisma db seed)');
    process.exit(1);
  }
  const prodEmp = productionEmployee || adminEmployee;

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DANH MỤC SẢN PHẨM
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('📦 1. Tạo danh mục & sản phẩm...');
  await prisma.productCategory.upsert({ where: { name: 'Trái cây sấy' }, update: {}, create: { name: 'Trái cây sấy' } });
  await prisma.productCategory.upsert({ where: { name: 'Rau củ sấy' }, update: {}, create: { name: 'Rau củ sấy' } });
  await prisma.productCategory.upsert({ where: { name: 'Hạt dinh dưỡng' }, update: {}, create: { name: 'Hạt dinh dưỡng' } });

  const mitSayDeo = await prisma.internationalProduct.upsert({
    where: { maSanPham: 'SP-001' }, update: {},
    create: { maSanPham: 'SP-001', tenSanPham: 'Mít sấy dẻo', moTaSanPham: 'Mít sấy dẻo tự nhiên, không đường, không phụ gia. Độ ẩm 16-18%.', loaiSanPham: 'Trái cây sấy', donViTinh: 'kg' },
  });
  const mitSayGion = await prisma.internationalProduct.upsert({
    where: { maSanPham: 'SP-002' }, update: {},
    create: { maSanPham: 'SP-002', tenSanPham: 'Mít sấy giòn', moTaSanPham: 'Mít sấy giòn vacuum, giữ nguyên hương vị. Độ ẩm < 5%.', loaiSanPham: 'Trái cây sấy', donViTinh: 'kg' },
  });
  await prisma.internationalProduct.upsert({
    where: { maSanPham: 'SP-003' }, update: {},
    create: { maSanPham: 'SP-003', tenSanPham: 'Chuối sấy dẻo', moTaSanPham: 'Chuối sấy dẻo tự nhiên', loaiSanPham: 'Trái cây sấy', donViTinh: 'kg' },
  });
  await prisma.internationalProduct.upsert({
    where: { maSanPham: 'SP-004' }, update: {},
    create: { maSanPham: 'SP-004', tenSanPham: 'Khoai lang sấy giòn', moTaSanPham: 'Khoai lang sấy giòn tự nhiên', loaiSanPham: 'Rau củ sấy', donViTinh: 'kg' },
  });
  await prisma.internationalProduct.upsert({
    where: { maSanPham: 'SP-005' }, update: {},
    create: { maSanPham: 'SP-005', tenSanPham: 'Đậu phộng rang muối', moTaSanPham: 'Đậu phộng rang muối Bình Phước', loaiSanPham: 'Hạt dinh dưỡng', donViTinh: 'kg' },
  });
  console.log('  ✅ 5 sản phẩm');

  // ─── Nguyên liệu thô (NL-001..NL-008) — dùng cho dropdown đánh giá NL ──────
  console.log('🌿 1b. Tạo nguyên liệu thô NL-001..NL-008...');
  await prisma.internationalProduct.upsert({
    where: { maSanPham: 'NL-001' }, update: {},
    create: { maSanPham: 'NL-001', tenSanPham: 'Mít tươi', loaiSanPham: 'Nguyên liệu thô', donViTinh: 'kg' },
  });
  await prisma.internationalProduct.upsert({
    where: { maSanPham: 'NL-002' }, update: {},
    create: { maSanPham: 'NL-002', tenSanPham: 'Chuối tươi', loaiSanPham: 'Nguyên liệu thô', donViTinh: 'kg' },
  });
  await prisma.internationalProduct.upsert({
    where: { maSanPham: 'NL-003' }, update: {},
    create: { maSanPham: 'NL-003', tenSanPham: 'Khoai lang tươi', loaiSanPham: 'Nguyên liệu thô', donViTinh: 'kg' },
  });
  await prisma.internationalProduct.upsert({
    where: { maSanPham: 'NL-004' }, update: {},
    create: { maSanPham: 'NL-004', tenSanPham: 'Xoài tươi', loaiSanPham: 'Nguyên liệu thô', donViTinh: 'kg' },
  });
  await prisma.internationalProduct.upsert({
    where: { maSanPham: 'NL-005' }, update: {},
    create: { maSanPham: 'NL-005', tenSanPham: 'Sầu riêng', loaiSanPham: 'Nguyên liệu thô', donViTinh: 'kg' },
  });
  await prisma.internationalProduct.upsert({
    where: { maSanPham: 'NL-006' }, update: {},
    create: { maSanPham: 'NL-006', tenSanPham: 'Đậu phộng sống', loaiSanPham: 'Nguyên liệu thô', donViTinh: 'kg' },
  });
  await prisma.internationalProduct.upsert({
    where: { maSanPham: 'NL-007' }, update: {},
    create: { maSanPham: 'NL-007', tenSanPham: 'Khoai môn', loaiSanPham: 'Nguyên liệu thô', donViTinh: 'kg' },
  });
  await prisma.internationalProduct.upsert({
    where: { maSanPham: 'NL-008' }, update: {},
    create: { maSanPham: 'NL-008', tenSanPham: 'Dứa tươi', loaiSanPham: 'Nguyên liệu thô', donViTinh: 'kg' },
  });
  console.log('  ✅ 8 nguyên liệu thô');

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. KHÁCH HÀNG
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('👥 2. Tạo khách hàng...');
  const customerJP = await prisma.internationalCustomer.upsert({
    where: { maKhachHang: 'KHQT-001' }, update: {},
    create: { maKhachHang: 'KHQT-001', tenCongTy: 'Tokyo Dried Fruits Co., Ltd', nguoiLienHe: 'Tanaka Yuki', loaiKhachHang: 'Nhà nhập khẩu', quocGia: 'Nhật Bản', thanhPho: 'Tokyo', diaChi: '1-2-3 Shibuya, Tokyo 150-0002', soDienThoai: '+81-3-1234-5678', email: 'tanaka@tokyodriedfruits.jp', website: 'https://tokyodriedfruits.jp', trangThai: 'Hoạt động', ngayHopTac: new Date('2024-03-15'), doanhThuNam: 250000, soLuongDonHang: 8, sanPhamChinh: 'Mít sấy, Chuối sấy' },
  });
  const customerKR = await prisma.internationalCustomer.upsert({
    where: { maKhachHang: 'KHQT-002' }, update: {},
    create: { maKhachHang: 'KHQT-002', tenCongTy: 'Seoul Snack Distribution', nguoiLienHe: 'Park Min-jun', loaiKhachHang: 'Nhà phân phối', quocGia: 'Hàn Quốc', thanhPho: 'Seoul', diaChi: '123 Gangnam-daero, Gangnam-gu, Seoul', soDienThoai: '+82-2-555-1234', email: 'park@seoulsnack.kr', trangThai: 'Hoạt động', ngayHopTac: new Date('2024-06-01'), doanhThuNam: 180000, soLuongDonHang: 5, sanPhamChinh: 'Mít sấy giòn, Khoai lang sấy' },
  });
  const customerUS = await prisma.internationalCustomer.upsert({
    where: { maKhachHang: 'KHQT-003' }, update: {},
    create: { maKhachHang: 'KHQT-003', tenCongTy: 'California Organic Imports LLC', nguoiLienHe: 'Michael Johnson', loaiKhachHang: 'Nhà nhập khẩu', quocGia: 'Mỹ', thanhPho: 'Los Angeles', diaChi: '456 Sunset Blvd, Los Angeles, CA 90028', soDienThoai: '+1-310-555-0199', email: 'michael@caorganic.com', website: 'https://caorganic.com', trangThai: 'Hoạt động', ngayHopTac: new Date('2025-01-10'), doanhThuNam: 320000, soLuongDonHang: 3, sanPhamChinh: 'Mít sấy dẻo, Đậu phộng' },
  });
  await prisma.internationalCustomer.upsert({
    where: { maKhachHang: 'KHND-001' }, update: {},
    create: { maKhachHang: 'KHND-001', tenCongTy: 'Công ty TNHH Thực phẩm Sài Gòn', nguoiLienHe: 'Nguyễn Minh Tuấn', loaiKhachHang: 'Đại lý', tinhThanh: 'TP. Hồ Chí Minh', quanHuyen: 'Quận 7', diaChi: '123 Nguyễn Thị Thập, Quận 7, TP.HCM', soDienThoai: '028-3775-1234', email: 'tuan@tpsg.vn', maSoThue: '0312345678', trangThai: 'Hoạt động', ngayHopTac: new Date('2023-08-20'), doanhThuNam: 500000000, soLuongDonHang: 12, sanPhamChinh: 'Mít sấy, Chuối sấy, Khoai lang sấy' },
  });
  console.log('  ✅ 4 khách hàng (JP, KR, US, VN)');

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. NHÀ CUNG CẤP
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('🏭 3. Tạo nhà cung cấp...');
  const nccMit = await prisma.supplier.upsert({
    where: { maNhaCungCap: 'NCC-001' }, update: {},
    create: { maNhaCungCap: 'NCC-001', tenNhaCungCap: 'HTX Mít Tiền Giang', loaiCungCap: 'Trái cây tươi', quocGia: 'Việt Nam', nguoiLienHe: 'Trần Văn Hùng', soDienThoai: '0918-123-456', emailLienHe: 'hung@htxmit.vn', diaChi: 'Xã Long Khánh, Cai Lậy, Tiền Giang', khaNang: '50 tấn/tháng', loaiHinh: 'Sản xuất', trangThai: 'Đang cung cấp', phanLoaiNCC: 'NVL', employeeId: purchasingEmployee.id },
  });
  const nccBaoBi = await prisma.supplier.upsert({
    where: { maNhaCungCap: 'NCC-002' }, update: {},
    create: { maNhaCungCap: 'NCC-002', tenNhaCungCap: 'Công ty Bao bì Đại Phát', loaiCungCap: 'Bao bì đóng gói', quocGia: 'Việt Nam', nguoiLienHe: 'Lê Thị Mai', soDienThoai: '0909-456-789', emailLienHe: 'mai@daiphat.vn', diaChi: 'KCN Tân Bình, TP.HCM', khaNang: '100.000 túi/tháng', loaiHinh: 'Sản xuất', trangThai: 'Đang cung cấp', phanLoaiNCC: 'NVL', employeeId: purchasingEmployee.id },
  });
  await prisma.supplier.upsert({
    where: { maNhaCungCap: 'NCC-003' }, update: {},
    create: { maNhaCungCap: 'NCC-003', tenNhaCungCap: 'Trang trại Chuối Đồng Nai', loaiCungCap: 'Trái cây tươi', quocGia: 'Việt Nam', nguoiLienHe: 'Phạm Quốc Bảo', soDienThoai: '0912-789-012', emailLienHe: 'bao@chuoidongnai.vn', diaChi: 'Xã Xuân Lộc, Đồng Nai', khaNang: '30 tấn/tháng', loaiHinh: 'Sản xuất', trangThai: 'Đang cung cấp', phanLoaiNCC: 'NVL', employeeId: purchasingEmployee.id },
  });
  console.log('  ✅ 3 nhà cung cấp');

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. KHO HÀNG
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('🏪 4. Tạo kho hàng...');
  await prisma.$executeRaw`
    INSERT INTO business.warehouses (id, "maKho", "tenKho", "loaiKho", "diaChi", "dienTich", "sucChua", "nguoiQuanLy", "trangThai", "createdAt", "updatedAt")
    VALUES ('wh-nvl-001', 'KHO-NVL', 'Kho nguyên vật liệu', 'Nguyên liệu', 'KCN An Bình, Bình Dương', 500, 200, 'Nguyễn Văn Kho', 'active', NOW(), NOW())
    ON CONFLICT ("maKho") DO NOTHING
  `;
  await prisma.$executeRaw`
    INSERT INTO business.warehouses (id, "maKho", "tenKho", "loaiKho", "diaChi", "dienTich", "sucChua", "nguoiQuanLy", "trangThai", "createdAt", "updatedAt")
    VALUES ('wh-tp-001', 'KHO-TP', 'Kho thành phẩm', 'Thành phẩm', 'KCN An Bình, Bình Dương', 800, 500, 'Trần Thị Kho', 'active', NOW(), NOW())
    ON CONFLICT ("maKho") DO NOTHING
  `;
  await prisma.$executeRaw`
    INSERT INTO business.warehouses (id, "maKho", "tenKho", "loaiKho", "diaChi", "dienTich", "sucChua", "nguoiQuanLy", "trangThai", "createdAt", "updatedAt")
    VALUES ('wh-xk-001', 'KHO-XK', 'Kho xuất khẩu', 'Xuất khẩu', 'Cảng Cát Lái, TP.HCM', 300, 150, 'Lê Văn Cảng', 'active', NOW(), NOW())
    ON CONFLICT ("maKho") DO NOTHING
  `;
  console.log('  ✅ 3 kho (NVL, Thành phẩm, Xuất khẩu)');

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. ĐỊNH MỨC NGUYÊN LIỆU (MaterialStandard)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('📐 5. Tạo định mức nguyên liệu...');
  // Định mức mít sấy dẻo: 100kg mít tươi → 35kg thành phẩm (tỉ lệ thu hồi 35%)
  const dmMitDeo = await prisma.materialStandard.upsert({
    where: { maDinhMuc: 'DM-MIT-DEO' }, update: {},
    create: {
      maDinhMuc: 'DM-MIT-DEO', tenDinhMuc: 'Định mức mít sấy dẻo',
      loaiDinhMuc: 'RAW_MATERIAL', tiLeThuHoi: 35,
      ghiChu: '100kg mít tươi → 35kg mít sấy dẻo. Hao hụt chủ yếu do bay hơi nước.',
    },
  });
  // Output items (thành phẩm đầu ra)
  await prisma.materialStandardItem.deleteMany({ where: { materialStandardId: dmMitDeo.id } });
  await prisma.materialStandardItem.create({ data: { materialStandardId: dmMitDeo.id, tenThanhPham: 'Mít sấy dẻo loại A', tiLe: 65 } });
  await prisma.materialStandardItem.create({ data: { materialStandardId: dmMitDeo.id, tenThanhPham: 'Mít sấy dẻo loại B', tiLe: 25 } });
  await prisma.materialStandardItem.create({ data: { materialStandardId: dmMitDeo.id, tenThanhPham: 'Phế phẩm (vụn, hao hụt)', tiLe: 10 } });
  // Input items (nguyên liệu đầu vào)
  await prisma.materialStandardInputItem.deleteMany({ where: { materialStandardId: dmMitDeo.id } });
  await prisma.materialStandardInputItem.create({ data: { materialStandardId: dmMitDeo.id, tenNguyenLieu: 'Mít tươi Thái (múi)', tiLe: 85 } });
  await prisma.materialStandardInputItem.create({ data: { materialStandardId: dmMitDeo.id, tenNguyenLieu: 'Đường phèn (ngâm)', tiLe: 10 } });
  await prisma.materialStandardInputItem.create({ data: { materialStandardId: dmMitDeo.id, tenNguyenLieu: 'Nước cốt chanh', tiLe: 5 } });

  // Định mức mít sấy giòn: 100kg mít tươi → 25kg thành phẩm (tỉ lệ thu hồi 25%)
  const dmMitGion = await prisma.materialStandard.upsert({
    where: { maDinhMuc: 'DM-MIT-GION' }, update: {},
    create: {
      maDinhMuc: 'DM-MIT-GION', tenDinhMuc: 'Định mức mít sấy giòn (vacuum)',
      loaiDinhMuc: 'RAW_MATERIAL', tiLeThuHoi: 25,
      ghiChu: '100kg mít tươi → 25kg mít sấy giòn. Sấy vacuum ở nhiệt độ thấp.',
    },
  });
  await prisma.materialStandardItem.deleteMany({ where: { materialStandardId: dmMitGion.id } });
  await prisma.materialStandardItem.create({ data: { materialStandardId: dmMitGion.id, tenThanhPham: 'Mít sấy giòn loại A', tiLe: 60 } });
  await prisma.materialStandardItem.create({ data: { materialStandardId: dmMitGion.id, tenThanhPham: 'Mít sấy giòn loại B', tiLe: 25 } });
  await prisma.materialStandardItem.create({ data: { materialStandardId: dmMitGion.id, tenThanhPham: 'Vụn mít (snack)', tiLe: 10 } });
  await prisma.materialStandardItem.create({ data: { materialStandardId: dmMitGion.id, tenThanhPham: 'Phế phẩm', tiLe: 5 } });
  await prisma.materialStandardInputItem.deleteMany({ where: { materialStandardId: dmMitGion.id } });
  await prisma.materialStandardInputItem.create({ data: { materialStandardId: dmMitGion.id, tenNguyenLieu: 'Mít tươi Thái (múi)', tiLe: 95 } });
  await prisma.materialStandardInputItem.create({ data: { materialStandardId: dmMitGion.id, tenNguyenLieu: 'Dầu cọ (chiên vacuum)', tiLe: 5 } });
  console.log('  ✅ Định mức mít sấy dẻo + giòn');

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. QUY TRÌNH SẢN XUẤT (Process + Flowchart)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('⚙️  6. Tạo quy trình sản xuất...');
  // Quy trình chung: Sấy mít
  const process1 = await prisma.process.upsert({
    where: { maQuyTrinh: 'QT-SAY-MIT' }, update: {},
    create: { maQuyTrinh: 'QT-SAY-MIT', msnv: prodEmp.employeeCode, tenNhanVien: prodEmp.fullName || 'NV Sản xuất', tenQuyTrinh: 'Quy trình sấy mít', loaiQuyTrinh: 'Sản xuất' },
  });
  // Flowchart cho quy trình
  const existingFlowchart = await prisma.processFlowchart.findUnique({ where: { processId: process1.id } });
  const flowchart1 = existingFlowchart || await prisma.processFlowchart.create({ data: { processId: process1.id } });
  await prisma.processFlowchartSection.deleteMany({ where: { flowchartId: flowchart1.id } });
  const sections = [
    { phanDoan: 'PD1', tenPhanDoan: 'Tiếp nhận nguyên liệu', noiDungCongViec: 'Kiểm tra mít tươi: độ chín, kích thước múi, không sâu bệnh. Cân khối lượng nhập.', stt: 1 },
    { phanDoan: 'PD2', tenPhanDoan: 'Sơ chế', noiDungCongViec: 'Tách múi, bỏ hạt, bỏ xơ. Rửa sạch, để ráo. Phân loại theo kích thước.', stt: 2 },
    { phanDoan: 'PD3', tenPhanDoan: 'Ngâm đường (mít dẻo)', noiDungCongViec: 'Ngâm múi mít trong dung dịch đường phèn 30 Brix, 4-6 tiếng. Vớt ra để ráo.', stt: 3 },
    { phanDoan: 'PD4', tenPhanDoan: 'Sấy', noiDungCongViec: 'Xếp khay, đưa vào máy sấy. Mít dẻo: 65-70°C / 18-24h. Mít giòn: vacuum 80-90°C / 2-3h.', stt: 4 },
    { phanDoan: 'PD5', tenPhanDoan: 'Phân loại thành phẩm', noiDungCongViec: 'Phân loại A/B/C theo màu sắc, hình dạng, độ ẩm. Loại bỏ phế phẩm.', stt: 5 },
    { phanDoan: 'PD6', tenPhanDoan: 'Đóng gói', noiDungCongViec: 'Cân định lượng, đóng túi hút chân không. Dán nhãn, in date. Đóng thùng carton.', stt: 6 },
    { phanDoan: 'PD7', tenPhanDoan: 'Kiểm tra chất lượng', noiDungCongViec: 'Kiểm tra độ ẩm, màu sắc, mùi vị, vi sinh. Lấy mẫu lưu. Cấp phiếu QC.', stt: 7 },
    { phanDoan: 'PD8', tenPhanDoan: 'Nhập kho thành phẩm', noiDungCongViec: 'Nhập kho thành phẩm, ghi nhận lô hàng, cập nhật tồn kho.', stt: 8 },
  ];
  for (const s of sections) {
    const section = await prisma.processFlowchartSection.create({ data: { flowchartId: flowchart1.id, ...s } });
    // Chi phí cho mỗi công đoạn
    if (s.stt === 1) {
      await prisma.processFlowchartCost.create({ data: { sectionId: section.id, loaiChiPhi: 'Nguyên liệu', tenChiPhi: 'Mít tươi Thái', donVi: 'kg', soLuongKeHoach: 14300, giaKeHoach: 25000, thanhTienKeHoach: 357500000 } });
    }
    if (s.stt === 4) {
      await prisma.processFlowchartCost.create({ data: { sectionId: section.id, loaiChiPhi: 'Năng lượng', tenChiPhi: 'Điện sấy', donVi: 'kWh', soLuongKeHoach: 2500, giaKeHoach: 3500, thanhTienKeHoach: 8750000 } });
      await prisma.processFlowchartCost.create({ data: { sectionId: section.id, loaiChiPhi: 'Nhân công', tenChiPhi: 'Công nhân vận hành', donVi: 'ngày', dinhMucLaoDong: 3, soLuongKeHoach: 15, giaKeHoach: 250000, thanhTienKeHoach: 3750000 } });
    }
    if (s.stt === 6) {
      await prisma.processFlowchartCost.create({ data: { sectionId: section.id, loaiChiPhi: 'Vật tư', tenChiPhi: 'Túi hút chân không 500g', donVi: 'túi', soLuongKeHoach: 10000, giaKeHoach: 2500, thanhTienKeHoach: 25000000 } });
      await prisma.processFlowchartCost.create({ data: { sectionId: section.id, loaiChiPhi: 'Vật tư', tenChiPhi: 'Thùng carton 20kg', donVi: 'thùng', soLuongKeHoach: 250, giaKeHoach: 35000, thanhTienKeHoach: 8750000 } });
    }
  }

  // ProductionProcess (quy trình sản xuất cụ thể cho đơn DH-2026-001)
  const prodProcess = await prisma.productionProcess.upsert({
    where: { maQuyTrinhSanXuat: 'QTSX-2026-001' }, update: {},
    create: {
      maQuyTrinhSanXuat: 'QTSX-2026-001', processId: process1.id,
      msnv: prodEmp.employeeCode, tenNhanVien: prodEmp.fullName || 'NV Sản xuất',
      tenQuyTrinh: 'Quy trình sấy mít', loaiQuyTrinh: 'Sản xuất',
      tenQuyTrinhSanXuat: 'SX Mít sấy dẻo - DH-2026-001 (Tokyo)',
      maNVSanXuat: prodEmp.employeeCode, tenNVSanXuat: prodEmp.fullName || 'NV Sản xuất',
      khoiLuong: 5000, thoiGian: 30,
      materialStandardId: dmMitDeo.id,
      sanPhamDauRa: 'Mít sấy dẻo loại A + B',
      tongNguyenLieuCanSanXuat: 14300, // 5000 / 0.35 ≈ 14286kg
      soGioLamTrong1Ngay: 8,
    },
  });
  console.log('  ✅ Quy trình + flowchart mít sấy');

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. MÁY MÓC
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('🔧 7. Tạo máy móc...');
  const machine1 = await prisma.machine.upsert({
    where: { tenMay: 'Máy sấy nhiệt MS-01' }, update: {},
    create: { maMay: 'MS-01', tenMay: 'Máy sấy nhiệt MS-01', moTa: 'Máy sấy nhiệt đối lưu 500kg/mẻ, nhiệt độ max 90°C', trangThai: 'HOAT_DONG' },
  });
  const machine2 = await prisma.machine.upsert({
    where: { tenMay: 'Máy sấy nhiệt MS-02' }, update: {},
    create: { maMay: 'MS-02', tenMay: 'Máy sấy nhiệt MS-02', moTa: 'Máy sấy nhiệt đối lưu 500kg/mẻ, nhiệt độ max 90°C', trangThai: 'HOAT_DONG' },
  });
  const machine3 = await prisma.machine.upsert({
    where: { tenMay: 'Máy sấy vacuum MV-01' }, update: {},
    create: { maMay: 'MV-01', tenMay: 'Máy sấy vacuum MV-01', moTa: 'Máy sấy chân không 200kg/mẻ, áp suất -0.09MPa', trangThai: 'HOAT_DONG' },
  });
  console.log('  ✅ 3 máy sấy');

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. YÊU CẦU BÁO GIÁ → BÁO GIÁ → ĐƠN HÀNG (3 đơn)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('📋 8. Tạo YCBG → Báo giá → Đơn hàng...');
  // --- Đơn 1: Nhật Bản - Mít sấy dẻo 5000kg (ĐANG SẢN XUẤT) ---
  const ycbg1 = await prisma.quotationRequest.upsert({
    where: { maYeuCauBaoGia: 'YCBG-2026-001' }, update: {},
    create: { maYeuCauBaoGia: 'YCBG-2026-001', ngayYeuCau: new Date('2026-04-01'), employeeId: businessEmployee.id, maNhanVien: 'NV0003', tenNhanVien: 'Lê Văn C', customerId: customerJP.id, maKhachHang: 'KHQT-001', tenKhachHang: 'Tokyo Dried Fruits Co., Ltd', hinhThucVanChuyen: 'Đường biển (FCL)', hinhThucThanhToan: 'T/T 30% trước, 70% sau khi giao hàng', quocGia: 'Nhật Bản', cangDen: 'Cảng Yokohama', ghiChu: 'Khách yêu cầu chứng nhận HACCP, JAS Organic' },
  });
  await prisma.quotationRequestItem.deleteMany({ where: { quotationRequestId: ycbg1.id } });
  await prisma.quotationRequestItem.create({ data: { quotationRequestId: ycbg1.id, productId: mitSayDeo.id, maSanPham: 'SP-001', tenSanPham: 'Mít sấy dẻo', moTaSanPham: 'Mít sấy dẻo tự nhiên, không đường', yeuCauSanPham: 'Độ ẩm < 18%, không phụ gia, chứng nhận HACCP', quyDongGoi: 'Túi 500g, thùng 20kg', soLuong: 5000, donViTinh: 'kg', giaDoiThuBan: 8.5, giaBanGanNhat: 7.8 } });
  await prisma.quotationRequestItem.create({ data: { quotationRequestId: ycbg1.id, productId: mitSayGion.id, maSanPham: 'SP-002', tenSanPham: 'Mít sấy giòn', moTaSanPham: 'Mít sấy giòn vacuum', yeuCauSanPham: 'Độ ẩm < 5%, giòn tan, không dầu', quyDongGoi: 'Túi 200g, thùng 10kg', soLuong: 3000, donViTinh: 'kg', giaDoiThuBan: 12.0, giaBanGanNhat: 11.2 } });

  const quotation1 = await prisma.quotation.upsert({
    where: { maBaoGia: 'BG-2026-001' }, update: {},
    create: { maBaoGia: 'BG-2026-001', ngayBaoGia: new Date('2026-04-05'), quotationRequestId: ycbg1.id, maYeuCauBaoGia: 'YCBG-2026-001', customerId: customerJP.id, maKhachHang: 'KHQT-001', tenKhachHang: 'Tokyo Dried Fruits Co., Ltd', productId: mitSayDeo.id, tenSanPham: 'Mít sấy dẻo', khoiLuong: 5000, donViTinh: 'kg', giaBaoKhach: 8.2, thoiGianGiaoHang: 45, hieuLucBaoGia: 30, employeeId: businessEmployee.id, tenNhanVien: 'Lê Văn C', tinhTrang: 'DA_DAT_HANG', materialStandardId: dmMitDeo.id, maDinhMuc: 'DM-MIT-DEO', tenDinhMuc: 'Định mức mít sấy dẻo', tiLeThuHoi: 35, sanPhamDauRa: 'Mít sấy dẻo loại A + B', tongNguyenLieuCanSanXuat: 14300, ghiChu: 'Giá FOB Cát Lái, bao gồm chứng nhận HACCP' },
  });
  await prisma.quotationItem.deleteMany({ where: { quotationId: quotation1.id } });
  await prisma.quotationItem.create({ data: { quotationId: quotation1.id, tenThanhPham: 'Mít sấy dẻo loại A', tiLe: 65, khoiLuongTuongUng: 3250 } });
  await prisma.quotationItem.create({ data: { quotationId: quotation1.id, tenThanhPham: 'Mít sấy dẻo loại B', tiLe: 25, khoiLuongTuongUng: 1250 } });
  await prisma.quotationItem.create({ data: { quotationId: quotation1.id, tenThanhPham: 'Phế phẩm (hao hụt)', tiLe: 10, khoiLuongTuongUng: 500 } });

  const order1 = await prisma.order.upsert({
    where: { maDonHang: 'DH-2026-001' }, update: {},
    create: { maDonHang: 'DH-2026-001', ngayDatHang: new Date('2026-04-10'), quotationId: quotation1.id, maBaoGia: 'BG-2026-001', quotationRequestId: ycbg1.id, maYeuCauBaoGia: 'YCBG-2026-001', customerId: customerJP.id, maKhachHang: 'KHQT-001', tenKhachHang: 'Tokyo Dried Fruits Co., Ltd', employeeId: businessEmployee.id, tenNhanVien: 'Lê Văn C', giaTriDonHangUSD: 41000, giaTriDonHangVND: 1025000000, xuatKhauDot1USD: 12300, ngayThanhToanDot1: new Date('2026-04-12'), trangThaiSanXuat: 'DANG_SAN_XUAT', trangThaiThanhToan: 'DA_THANH_TOAN_DOT_1', ngayBatDauSanXuatKeHoach: new Date('2026-04-15'), ngayHoanThanhSanXuatKeHoach: new Date('2026-05-20'), ngayGiaoHang: new Date('2026-05-25'), ghiChu: 'Container 20ft, giao tại cảng Cát Lái' },
  });
  await prisma.orderItem.deleteMany({ where: { orderId: order1.id } });
  await prisma.orderItem.create({ data: { orderId: order1.id, productId: mitSayDeo.id, maSanPham: 'SP-001', tenHangHoa: 'Mít sấy dẻo', yeuCauHangHoa: 'Độ ẩm < 18%, HACCP, JAS Organic', loaiHangHoa: 'Trái cây sấy', dongGoi: 'Túi 500g, thùng 20kg', soLuong: 5000, donVi: 'kg' } });
  await prisma.taxReport.upsert({ where: { orderId: order1.id }, update: {}, create: { orderId: order1.id, ngayDatHang: new Date('2026-04-10'), maDonHang: 'DH-2026-001', tenHangHoa: 'Mít sấy dẻo', soLuong: 5000, donVi: 'kg', giaTriDonHang: 41000, trangThai: 'DANG_CAP_NHAT_HO_SO', ghiChi: 'Đang chuẩn bị hồ sơ xuất khẩu' } });

  // --- Đơn 2: Hàn Quốc - Mít sấy giòn 2000kg (ĐÃ GIAO) ---
  const ycbg2 = await prisma.quotationRequest.upsert({
    where: { maYeuCauBaoGia: 'YCBG-2026-002' }, update: {},
    create: { maYeuCauBaoGia: 'YCBG-2026-002', ngayYeuCau: new Date('2026-02-15'), employeeId: businessEmployee.id, maNhanVien: 'NV0003', tenNhanVien: 'Lê Văn C', customerId: customerKR.id, maKhachHang: 'KHQT-002', tenKhachHang: 'Seoul Snack Distribution', hinhThucVanChuyen: 'Đường biển (LCL)', hinhThucThanhToan: 'L/C at sight', quocGia: 'Hàn Quốc', cangDen: 'Cảng Busan' },
  });
  await prisma.quotationRequestItem.deleteMany({ where: { quotationRequestId: ycbg2.id } });
  await prisma.quotationRequestItem.create({ data: { quotationRequestId: ycbg2.id, productId: mitSayGion.id, maSanPham: 'SP-002', tenSanPham: 'Mít sấy giòn', yeuCauSanPham: 'Vacuum fried, no oil residue', quyDongGoi: 'Túi 100g retail, thùng 5kg', soLuong: 2000, donViTinh: 'kg' } });

  const quotation2 = await prisma.quotation.upsert({
    where: { maBaoGia: 'BG-2026-002' }, update: {},
    create: { maBaoGia: 'BG-2026-002', ngayBaoGia: new Date('2026-02-18'), quotationRequestId: ycbg2.id, maYeuCauBaoGia: 'YCBG-2026-002', customerId: customerKR.id, maKhachHang: 'KHQT-002', tenKhachHang: 'Seoul Snack Distribution', productId: mitSayGion.id, tenSanPham: 'Mít sấy giòn', khoiLuong: 2000, donViTinh: 'kg', giaBaoKhach: 11.5, thoiGianGiaoHang: 30, hieuLucBaoGia: 15, employeeId: businessEmployee.id, tenNhanVien: 'Lê Văn C', tinhTrang: 'DA_DAT_HANG' },
  });
  const order2 = await prisma.order.upsert({
    where: { maDonHang: 'DH-2026-002' }, update: {},
    create: { maDonHang: 'DH-2026-002', ngayDatHang: new Date('2026-02-20'), quotationId: quotation2.id, maBaoGia: 'BG-2026-002', quotationRequestId: ycbg2.id, maYeuCauBaoGia: 'YCBG-2026-002', customerId: customerKR.id, maKhachHang: 'KHQT-002', tenKhachHang: 'Seoul Snack Distribution', employeeId: businessEmployee.id, tenNhanVien: 'Lê Văn C', giaTriDonHangUSD: 23000, giaTriDonHangVND: 575000000, xuatKhauDot1USD: 23000, ngayThanhToanDot1: new Date('2026-02-22'), trangThaiSanXuat: 'DA_GIAO_CHO_KHACH_HANG', trangThaiThanhToan: 'DA_THANH_TOAN_DU', ngayBatDauSanXuatKeHoach: new Date('2026-02-25'), ngayHoanThanhSanXuatKeHoach: new Date('2026-03-15'), ngayHoanThanhThucTe: new Date('2026-03-14'), ngayGiaoHang: new Date('2026-03-20'), ghiChu: 'Đã giao thành công, khách hài lòng' },
  });
  await prisma.orderItem.deleteMany({ where: { orderId: order2.id } });
  await prisma.orderItem.create({ data: { orderId: order2.id, productId: mitSayGion.id, maSanPham: 'SP-002', tenHangHoa: 'Mít sấy giòn', yeuCauHangHoa: 'Vacuum fried, no oil residue', loaiHangHoa: 'Trái cây sấy', dongGoi: 'Túi 100g retail, thùng 5kg', soLuong: 2000, donVi: 'kg' } });
  await prisma.taxReport.upsert({ where: { orderId: order2.id }, update: {}, create: { orderId: order2.id, ngayDatHang: new Date('2026-02-20'), maDonHang: 'DH-2026-002', tenHangHoa: 'Mít sấy giòn', soLuong: 2000, donVi: 'kg', giaTriDonHang: 23000, trangThai: 'DA_QUYET_TOAN' } });

  // --- Đơn 3: Mỹ - Mít sấy dẻo 10000kg (CHỜ SẢN XUẤT) ---
  const ycbg3 = await prisma.quotationRequest.upsert({
    where: { maYeuCauBaoGia: 'YCBG-2026-003' }, update: {},
    create: { maYeuCauBaoGia: 'YCBG-2026-003', ngayYeuCau: new Date('2026-05-01'), employeeId: businessEmployee.id, maNhanVien: 'NV0003', tenNhanVien: 'Lê Văn C', customerId: customerUS.id, maKhachHang: 'KHQT-003', tenKhachHang: 'California Organic Imports LLC', hinhThucVanChuyen: 'Đường biển (FCL)', hinhThucThanhToan: 'T/T 50% trước, 50% khi giao', quocGia: 'Mỹ', cangDen: 'Cảng Long Beach', ghiChu: 'Yêu cầu USDA Organic, FDA compliant' },
  });
  await prisma.quotationRequestItem.deleteMany({ where: { quotationRequestId: ycbg3.id } });
  await prisma.quotationRequestItem.create({ data: { quotationRequestId: ycbg3.id, productId: mitSayDeo.id, maSanPham: 'SP-001', tenSanPham: 'Mít sấy dẻo', yeuCauSanPham: 'USDA Organic certified, no additives', quyDongGoi: 'Túi 1kg, thùng 25kg', soLuong: 10000, donViTinh: 'kg', giaDoiThuBan: 9.0 } });

  const quotation3 = await prisma.quotation.upsert({
    where: { maBaoGia: 'BG-2026-003' }, update: {},
    create: { maBaoGia: 'BG-2026-003', ngayBaoGia: new Date('2026-05-05'), quotationRequestId: ycbg3.id, maYeuCauBaoGia: 'YCBG-2026-003', customerId: customerUS.id, maKhachHang: 'KHQT-003', tenKhachHang: 'California Organic Imports LLC', productId: mitSayDeo.id, tenSanPham: 'Mít sấy dẻo', khoiLuong: 10000, donViTinh: 'kg', giaBaoKhach: 8.8, thoiGianGiaoHang: 60, hieuLucBaoGia: 30, employeeId: businessEmployee.id, tenNhanVien: 'Lê Văn C', tinhTrang: 'DA_DAT_HANG' },
  });
  const order3 = await prisma.order.upsert({
    where: { maDonHang: 'DH-2026-003' }, update: {},
    create: { maDonHang: 'DH-2026-003', ngayDatHang: new Date('2026-05-10'), quotationId: quotation3.id, maBaoGia: 'BG-2026-003', quotationRequestId: ycbg3.id, maYeuCauBaoGia: 'YCBG-2026-003', customerId: customerUS.id, maKhachHang: 'KHQT-003', tenKhachHang: 'California Organic Imports LLC', employeeId: businessEmployee.id, tenNhanVien: 'Lê Văn C', giaTriDonHangUSD: 88000, giaTriDonHangVND: 2200000000, xuatKhauDot1USD: 44000, ngayThanhToanDot1: new Date('2026-05-12'), trangThaiSanXuat: 'CHO_SAN_XUAT', trangThaiThanhToan: 'DA_THANH_TOAN_DOT_1', ngayBatDauSanXuatKeHoach: new Date('2026-05-20'), ngayHoanThanhSanXuatKeHoach: new Date('2026-06-30'), ngayGiaoHang: new Date('2026-07-10'), ghiChu: 'Container 40ft, USDA Organic required' },
  });
  await prisma.orderItem.deleteMany({ where: { orderId: order3.id } });
  await prisma.orderItem.create({ data: { orderId: order3.id, productId: mitSayDeo.id, maSanPham: 'SP-001', tenHangHoa: 'Mít sấy dẻo', yeuCauHangHoa: 'USDA Organic, FDA compliant, no additives', loaiHangHoa: 'Trái cây sấy', dongGoi: 'Túi 1kg, thùng 25kg', soLuong: 10000, donVi: 'kg' } });
  await prisma.taxReport.upsert({ where: { orderId: order3.id }, update: {}, create: { orderId: order3.id, ngayDatHang: new Date('2026-05-10'), maDonHang: 'DH-2026-003', tenHangHoa: 'Mít sấy dẻo', soLuong: 10000, donVi: 'kg', giaTriDonHang: 88000, trangThai: 'CHUA_BAO_CAO' } });
  console.log('  ✅ 3 đơn hàng (JP đang SX, KR đã giao, US chờ SX)');

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. YÊU CẦU CUNG ỨNG + MUA HÀNG (cho đơn DH-2026-001)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('📝 9. Tạo yêu cầu cung ứng & mua hàng...');
  // Yêu cầu cung ứng NVL cho đơn DH-2026-001
  const supplyReq = await prisma.supplyRequest.upsert({
    where: { maYeuCau: 'YC-CC-2026-001' }, update: {},
    create: { maYeuCau: 'YC-CC-2026-001', ngayYeuCau: new Date('2026-04-11'), employeeId: prodEmp.id, maNhanVien: prodEmp.employeeCode, tenNhanVien: prodEmp.fullName || 'NV Sản xuất', boPhan: 'Sản xuất', mucDichYeuCau: 'Cung ứng NVL cho đơn DH-2026-001 (Tokyo Dried Fruits, 5000kg mít sấy dẻo)', mucDoUuTien: 'Cao', trangThai: 'Đã cung cấp', ghiChu: 'Cần nhập trước 15/04 để kịp tiến độ SX' },
  });
  await prisma.supplyRequestItem.deleteMany({ where: { supplyRequestId: supplyReq.id } });
  await prisma.supplyRequestItem.create({ data: { supplyRequestId: supplyReq.id, phanLoai: 'Nguyên liệu', tenGoi: 'Mít tươi Thái (múi đã tách)', soLuong: 14300, donViTinh: 'kg' } });
  await prisma.supplyRequestItem.create({ data: { supplyRequestId: supplyReq.id, phanLoai: 'Phụ liệu', tenGoi: 'Đường phèn', soLuong: 1500, donViTinh: 'kg' } });
  await prisma.supplyRequestItem.create({ data: { supplyRequestId: supplyReq.id, phanLoai: 'Bao bì', tenGoi: 'Túi hút chân không 500g', soLuong: 10000, donViTinh: 'túi' } });
  await prisma.supplyRequestItem.create({ data: { supplyRequestId: supplyReq.id, phanLoai: 'Bao bì', tenGoi: 'Thùng carton 20kg', soLuong: 250, donViTinh: 'thùng' } });

  // Yêu cầu mua hàng (từ yêu cầu cung ứng)
  const purchaseReq = await prisma.purchaseRequest.upsert({
    where: { maYeuCau: 'YC-MH-2026-001' }, update: {},
    create: { maYeuCau: 'YC-MH-2026-001', ngayYeuCau: new Date('2026-04-11'), employeeId: purchasingEmployee.id, maNhanVien: purchasingEmployee.employeeCode, tenNhanVien: purchasingEmployee.fullName || 'NV Thu mua', mucDichYeuCau: 'Mua NVL cho đơn DH-2026-001', mucDoUuTien: 'Cao', trangThai: 'Đã duyệt', nguoiDuyet: adminEmployee.fullName || 'Admin', ngayDuyet: new Date('2026-04-12'), supplyRequestId: supplyReq.id, nhaCungCapId: nccMit.id, giaDuKien: 357500000, ghiChuMuaHang: '14.3 tấn mít tươi từ HTX Tiền Giang, giao trong 3 ngày' },
  });
  await prisma.purchaseRequestItem.deleteMany({ where: { purchaseRequestId: purchaseReq.id } });
  await prisma.purchaseRequestItem.create({ data: { purchaseRequestId: purchaseReq.id, phanLoai: 'Nguyên liệu', tenHangHoa: 'Mít tươi Thái (múi)', soLuong: 14300, donViTinh: 'kg', nhaCungCapId: nccMit.id, giaDuKien: 25000 } });
  await prisma.purchaseRequestItem.create({ data: { purchaseRequestId: purchaseReq.id, phanLoai: 'Bao bì', tenHangHoa: 'Túi hút chân không 500g', soLuong: 10000, donViTinh: 'túi', nhaCungCapId: nccBaoBi.id, giaDuKien: 2500 } });
  await prisma.purchaseRequestItem.create({ data: { purchaseRequestId: purchaseReq.id, phanLoai: 'Bao bì', tenHangHoa: 'Thùng carton 20kg', soLuong: 250, donViTinh: 'thùng', nhaCungCapId: nccBaoBi.id, giaDuKien: 35000 } });
  console.log('  ✅ Yêu cầu cung ứng + mua hàng cho đơn JP');

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. ĐÁNH GIÁ NGUYÊN LIỆU + VẬN HÀNH MÁY + THÀNH PHẨM + CHẤT LƯỢNG
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('🔬 10. Tạo dữ liệu sản xuất (đánh giá NL, vận hành, thành phẩm, CL)...');
  // --- Mẻ sấy 1: MS-01, 500kg mít tươi → ~175kg mít sấy dẻo ---
  const matEval1 = await prisma.materialEvaluation.upsert({
    where: { maChien: 'MC-001' }, update: {},
    create: { maChien: 'MC-001', thoiGianChien: new Date('2026-04-16T06:00:00'), tenHangHoa: 'Mít tươi Thái (múi)', soLoKien: 'LO-NVL-001', khoiLuong: 500, soLanNgam: 2, nhietDoNuocTruocNgam: 25, nhietDoNuocSauVot: 28, thoiGianNgam: 360, brixNuocNgam: 30, danhGiaTruocNgam: 'Múi mít chín vàng đều, không sâu, kích thước đồng đều 5-7cm', danhGiaSauNgam: 'Múi mít thấm đường đều, mềm vừa, sẵn sàng sấy', nguoiThucHien: prodEmp.fullName || 'NV Sản xuất' },
  });

  // Vận hành máy sấy MS-01 cho mẻ 1
  await prisma.systemOperation.deleteMany({ where: { maChien: 'MC-001', machineId: machine1.id } });
  await prisma.systemOperation.create({ data: {
    maChien: 'MC-001', machineId: machine1.id, tenMay: 'Máy sấy nhiệt MS-01',
    thoiGianChien: new Date('2026-04-16T08:00:00'), khoiLuongDauVao: 500,
    giaiDoan1ThoiGian: 120, giaiDoan1NhietDo: 55, giaiDoan1ApSuat: 0,
    giaiDoan2ThoiGian: 360, giaiDoan2NhietDo: 65, giaiDoan2ApSuat: 0,
    giaiDoan3ThoiGian: 480, giaiDoan3NhietDo: 70, giaiDoan3ApSuat: 0,
    giaiDoan4ThoiGian: 120, giaiDoan4NhietDo: 60, giaiDoan4ApSuat: 0,
    tongThoiGianSay: 1080, // 18 tiếng
    trangThai: 'DANG_HOAT_DONG', nguoiThucHien: prodEmp.fullName || 'NV Sản xuất',
    materialEvaluationId: matEval1.id,
  } });

  // Thành phẩm mẻ 1
  await prisma.finishedProduct.deleteMany({ where: { maChien: 'MC-001', machineId: machine1.id } });
  await prisma.finishedProduct.create({ data: {
    maChien: 'MC-001', thoiGianChien: '2026-04-17 02:00', tenHangHoa: 'Mít sấy dẻo',
    khoiLuong: 500, machineId: machine1.id, tenMay: 'Máy sấy nhiệt MS-01',
    materialEvaluationId: matEval1.id,
    aKhoiLuong: 114, aTiLe: 65,   // Loại A: 65%
    bKhoiLuong: 44, bTiLe: 25,    // Loại B: 25%
    bDauKhoiLuong: 0, bDauTiLe: 0,
    cKhoiLuong: 0, cTiLe: 0,
    vunLonKhoiLuong: 9, vunLonTiLe: 5,
    vunNhoKhoiLuong: 5, vunNhoTiLe: 3,
    phePhamKhoiLuong: 3, phePhamTiLe: 2,
    uotKhoiLuong: 0, uotTiLe: 0,
    tongKhoiLuong: 175, // 500 * 35% = 175kg
    nguoiThucHien: prodEmp.fullName || 'NV Sản xuất',
  } });

  // Đánh giá chất lượng mẻ 1
  await prisma.qualityEvaluation.deleteMany({ where: { maChien: 'MC-001', machineId: machine1.id } });
  await prisma.qualityEvaluation.create({ data: {
    maChien: 'MC-001', thoiGianChien: '2026-04-17 02:00', tenHangHoa: 'Mít sấy dẻo',
    machineId: machine1.id, tenMay: 'Máy sấy nhiệt MS-01',
    materialEvaluationId: matEval1.id,
    mauSac: 'Vàng đậm đều, không cháy',
    aTiLe: 65, bTiLe: 25, bDauTiLe: 0, cTiLe: 0, vunLonTiLe: 5, vunNhoTiLe: 3, phePhamTiLe: 2, uotTiLe: 0,
    muiHuong: 'Thơm mít tự nhiên, không có mùi lạ',
    huongVi: 'Ngọt tự nhiên, vị mít đậm đà',
    doNgot: 'Vừa phải (Brix 45-50)',
    doGion: 'Dẻo dai, không cứng',
    danhGiaTongQuan: 'Đạt tiêu chuẩn xuất khẩu Nhật Bản. Độ ẩm 16.5%, đạt yêu cầu < 18%.',
    deXuatDieuChinh: 'Giữ nguyên thông số. Có thể tăng thời gian giai đoạn 2 thêm 30 phút để giảm độ ẩm xuống 15%.',
    nguoiThucHien: prodEmp.fullName || 'NV Sản xuất',
  } });

  // --- Mẻ sấy 2: MS-02, 500kg mít tươi ---
  const matEval2 = await prisma.materialEvaluation.upsert({
    where: { maChien: 'MC-002' }, update: {},
    create: { maChien: 'MC-002', thoiGianChien: new Date('2026-04-17T06:00:00'), tenHangHoa: 'Mít tươi Thái (múi)', soLoKien: 'LO-NVL-001', khoiLuong: 500, soLanNgam: 2, nhietDoNuocTruocNgam: 26, nhietDoNuocSauVot: 29, thoiGianNgam: 360, brixNuocNgam: 30, danhGiaTruocNgam: 'Múi mít chín đều, 1 số múi hơi nhỏ (4cm)', danhGiaSauNgam: 'Đạt yêu cầu, sẵn sàng sấy', nguoiThucHien: prodEmp.fullName || 'NV Sản xuất' },
  });

  await prisma.systemOperation.deleteMany({ where: { maChien: 'MC-002', machineId: machine2.id } });
  await prisma.systemOperation.create({ data: {
    maChien: 'MC-002', machineId: machine2.id, tenMay: 'Máy sấy nhiệt MS-02',
    thoiGianChien: new Date('2026-04-17T08:00:00'), khoiLuongDauVao: 500,
    giaiDoan1ThoiGian: 120, giaiDoan1NhietDo: 55, giaiDoan1ApSuat: 0,
    giaiDoan2ThoiGian: 390, giaiDoan2NhietDo: 65, giaiDoan2ApSuat: 0,
    giaiDoan3ThoiGian: 480, giaiDoan3NhietDo: 70, giaiDoan3ApSuat: 0,
    giaiDoan4ThoiGian: 120, giaiDoan4NhietDo: 60, giaiDoan4ApSuat: 0,
    tongThoiGianSay: 1110,
    trangThai: 'DANG_HOAT_DONG', nguoiThucHien: prodEmp.fullName || 'NV Sản xuất',
    materialEvaluationId: matEval2.id,
  } });

  await prisma.finishedProduct.deleteMany({ where: { maChien: 'MC-002', machineId: machine2.id } });
  await prisma.finishedProduct.create({ data: {
    maChien: 'MC-002', thoiGianChien: '2026-04-18 02:30', tenHangHoa: 'Mít sấy dẻo',
    khoiLuong: 500, machineId: machine2.id, tenMay: 'Máy sấy nhiệt MS-02',
    materialEvaluationId: matEval2.id,
    aKhoiLuong: 110, aTiLe: 63, bKhoiLuong: 47, bTiLe: 27,
    bDauKhoiLuong: 0, bDauTiLe: 0, cKhoiLuong: 0, cTiLe: 0,
    vunLonKhoiLuong: 8, vunLonTiLe: 4, vunNhoKhoiLuong: 5, vunNhoTiLe: 3,
    phePhamKhoiLuong: 5, phePhamTiLe: 3, uotKhoiLuong: 0, uotTiLe: 0,
    tongKhoiLuong: 175,
    nguoiThucHien: prodEmp.fullName || 'NV Sản xuất',
  } });

  await prisma.qualityEvaluation.deleteMany({ where: { maChien: 'MC-002', machineId: machine2.id } });
  await prisma.qualityEvaluation.create({ data: {
    maChien: 'MC-002', thoiGianChien: '2026-04-18 02:30', tenHangHoa: 'Mít sấy dẻo',
    machineId: machine2.id, tenMay: 'Máy sấy nhiệt MS-02',
    materialEvaluationId: matEval2.id,
    mauSac: 'Vàng nhạt hơn mẻ 1, đều màu',
    aTiLe: 63, bTiLe: 27, bDauTiLe: 0, cTiLe: 0, vunLonTiLe: 4, vunNhoTiLe: 3, phePhamTiLe: 3, uotTiLe: 0,
    muiHuong: 'Thơm mít tự nhiên',
    huongVi: 'Ngọt vừa, hơi nhạt hơn mẻ 1',
    doNgot: 'Trung bình (Brix 42-45)',
    doGion: 'Dẻo tốt',
    danhGiaTongQuan: 'Đạt. Độ ẩm 15.8%. Tỉ lệ loại A thấp hơn do múi nhỏ.',
    deXuatDieuChinh: 'Lần sau chọn múi > 5cm để tăng tỉ lệ loại A.',
    nguoiThucHien: prodEmp.fullName || 'NV Sản xuất',
  } });
  console.log('  ✅ 2 mẻ sấy hoàn chỉnh');

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. KHO: LÔ HÀNG + PHIẾU NHẬP/XUẤT
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('📦 11. Tạo lô hàng & phiếu nhập/xuất kho...');
  // Lô hàng NVL (mít tươi nhập kho)
  const lotNVL = await prisma.lot.upsert({
    where: { id: 'lot-nvl-mit-001' }, update: {},
    create: { id: 'lot-nvl-mit-001', tenLo: 'Lô mít tươi 04/2026', warehouseId: 'wh-nvl-001' },
  });
  const lotProductNVL = await prisma.lotProduct.upsert({
    where: { id: 'lp-nvl-mit-001' }, update: {},
    create: { id: 'lp-nvl-mit-001', lotId: lotNVL.id, internationalProductId: mitSayDeo.id, soLuong: 13300, donViTinh: 'kg', giaThanh: 25000 },
  });

  // Lô thành phẩm (mít sấy dẻo nhập kho TP)
  const lotTP = await prisma.lot.upsert({
    where: { id: 'lot-tp-mit-001' }, update: {},
    create: { id: 'lot-tp-mit-001', tenLo: 'Lô mít sấy dẻo 04/2026', warehouseId: 'wh-tp-001' },
  });
  const lotProductTP = await prisma.lotProduct.upsert({
    where: { id: 'lp-tp-mit-001' }, update: {},
    create: { id: 'lp-tp-mit-001', lotId: lotTP.id, internationalProductId: mitSayDeo.id, soLuong: 350, donViTinh: 'kg', giaThanh: 180000 },
  });

  // Phiếu nhập kho NVL
  await prisma.warehouseReceipt.upsert({
    where: { maPhieuNhap: 'PN-2026-001' }, update: {},
    create: { maPhieuNhap: 'PN-2026-001', ngayNhap: new Date('2026-04-13'), employeeId: purchasingEmployee.id, maNhanVien: purchasingEmployee.employeeCode, tenNhanVien: purchasingEmployee.fullName || 'NV Thu mua', warehouseId: 'wh-nvl-001', tenKho: 'Kho nguyên vật liệu', lotId: lotNVL.id, tenLo: 'Lô mít tươi 04/2026', lotProductId: lotProductNVL.id, tenSanPham: 'Mít tươi Thái (múi)', soLuongTruoc: 0, soLuongNhap: 14300, soLuongSau: 14300, donViTinh: 'kg', ghiChu: 'Nhập từ HTX Mít Tiền Giang, đơn YC-MH-2026-001', supplyRequestId: supplyReq.id },
  });

  // Phiếu nhập kho thành phẩm (sau 2 mẻ sấy)
  await prisma.warehouseReceipt.upsert({
    where: { maPhieuNhap: 'PN-2026-002' }, update: {},
    create: { maPhieuNhap: 'PN-2026-002', ngayNhap: new Date('2026-04-18'), employeeId: prodEmp.id, maNhanVien: prodEmp.employeeCode, tenNhanVien: prodEmp.fullName || 'NV Sản xuất', warehouseId: 'wh-tp-001', tenKho: 'Kho thành phẩm', lotId: lotTP.id, tenLo: 'Lô mít sấy dẻo 04/2026', lotProductId: lotProductTP.id, tenSanPham: 'Mít sấy dẻo', soLuongTruoc: 0, soLuongNhap: 350, soLuongSau: 350, donViTinh: 'kg', ghiChu: 'Thành phẩm từ mẻ MC-001 + MC-002 (loại A+B)' },
  });

  // Phiếu xuất kho (cho đơn KR đã giao)
  const lotTPKR = await prisma.lot.upsert({
    where: { id: 'lot-tp-gion-001' }, update: {},
    create: { id: 'lot-tp-gion-001', tenLo: 'Lô mít sấy giòn 03/2026', warehouseId: 'wh-tp-001' },
  });
  const lotProductTPKR = await prisma.lotProduct.upsert({
    where: { id: 'lp-tp-gion-001' }, update: {},
    create: { id: 'lp-tp-gion-001', lotId: lotTPKR.id, internationalProductId: mitSayGion.id, soLuong: 0, donViTinh: 'kg', giaThanh: 250000 },
  });
  await prisma.warehouseIssue.upsert({
    where: { maPhieuXuat: 'PX-2026-001' }, update: {},
    create: { maPhieuXuat: 'PX-2026-001', ngayXuat: new Date('2026-03-18'), employeeId: businessEmployee.id, maNhanVien: businessEmployee.employeeCode, tenNhanVien: businessEmployee.fullName || 'NV Kinh doanh', warehouseId: 'wh-tp-001', tenKho: 'Kho thành phẩm', lotId: lotTPKR.id, tenLo: 'Lô mít sấy giòn 03/2026', lotProductId: lotProductTPKR.id, tenSanPham: 'Mít sấy giòn', soLuongTruoc: 2000, soLuongXuat: 2000, soLuongSau: 0, donViTinh: 'kg', ghiChu: 'Xuất cho đơn DH-2026-002 (Seoul Snack), giao cảng Cát Lái' },
  });
  console.log('  ✅ Nhập NVL + Nhập TP + Xuất kho giao hàng');

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. CHI PHÍ + HÓA ĐƠN + CÔNG NỢ + PHẢN HỒI
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('💰 12. Tạo chi phí, hóa đơn, công nợ, phản hồi...');
  // Chi phí chung
  const generalCosts = [
    { maChiPhi: 'CP-C01', tenChiPhi: 'Chi phí điện sản xuất', loaiChiPhi: 'Sản xuất', donViTinh: 'kWh', giaThanhNgay: 3500 },
    { maChiPhi: 'CP-C02', tenChiPhi: 'Chi phí nước', loaiChiPhi: 'Sản xuất', donViTinh: 'm3', giaThanhNgay: 12000 },
    { maChiPhi: 'CP-C03', tenChiPhi: 'Chi phí nhân công sản xuất', loaiChiPhi: 'Nhân sự', donViTinh: 'ngày', giaThanhNgay: 250000 },
    { maChiPhi: 'CP-C04', tenChiPhi: 'Chi phí bao bì đóng gói', loaiChiPhi: 'Vật tư', donViTinh: 'túi', giaThanhNgay: 2500 },
    { maChiPhi: 'CP-C05', tenChiPhi: 'Chi phí khấu hao máy sấy', loaiChiPhi: 'Khấu hao', donViTinh: 'ngày', giaThanhNgay: 500000 },
  ];
  for (const gc of generalCosts) { await prisma.generalCost.upsert({ where: { maChiPhi: gc.maChiPhi }, update: {}, create: gc }); }

  // Chi phí xuất khẩu
  const exportCosts = [
    { maChiPhi: 'CP-XK01', tenChiPhi: 'Phí vận chuyển nội địa (nhà máy → cảng)', loaiChiPhi: 'Vận chuyển', donViTinh: 'chuyến', giaThanhNgay: 5000000 },
    { maChiPhi: 'CP-XK02', tenChiPhi: 'Phí xông trùng', loaiChiPhi: 'Kiểm dịch', donViTinh: 'container', giaThanhNgay: 3500000 },
    { maChiPhi: 'CP-XK03', tenChiPhi: 'Phí chứng nhận C/O', loaiChiPhi: 'Chứng từ', donViTinh: 'bộ', giaThanhNgay: 500000 },
    { maChiPhi: 'CP-XK04', tenChiPhi: 'Phí cước biển (Cát Lái → Yokohama)', loaiChiPhi: 'Vận chuyển', donViTinh: 'container', giaThanhNgay: 45000000 },
    { maChiPhi: 'CP-XK05', tenChiPhi: 'Phí bảo hiểm hàng hóa', loaiChiPhi: 'Bảo hiểm', donViTinh: 'lô', giaThanhNgay: 8000000 },
  ];
  for (const ec of exportCosts) { await prisma.exportCost.upsert({ where: { maChiPhi: ec.maChiPhi }, update: {}, create: ec }); }

  // Hóa đơn
  await prisma.invoice.upsert({ where: { soHoaDon: 'HD-2026-001' }, update: {}, create: { soHoaDon: 'HD-2026-001', ngayLap: new Date('2026-03-20'), khachHang: 'Seoul Snack Distribution', loaiHoaDon: 'Bán hàng', tongTien: 23000, thue: 0, thanhTien: 23000, trangThai: 'Đã thanh toán', nhanVienLap: 'Lê Văn C', phuongThucThanhToan: 'Chuyển khoản', ngayThanhToan: new Date('2026-03-22'), ghiChu: 'Đơn DH-2026-002, L/C at sight, đã giao đủ' } });
  await prisma.invoice.upsert({ where: { soHoaDon: 'HD-2026-002' }, update: {}, create: { soHoaDon: 'HD-2026-002', ngayLap: new Date('2026-04-12'), khachHang: 'Tokyo Dried Fruits Co., Ltd', loaiHoaDon: 'Bán hàng', tongTien: 12300, thue: 0, thanhTien: 12300, trangThai: 'Chưa thanh toán', nhanVienLap: 'Lê Văn C', phuongThucThanhToan: 'Chuyển khoản', ghiChu: 'Đơn DH-2026-001, thanh toán đợt 1 (30%). Còn lại $28,700 sau khi giao.' } });
  await prisma.invoice.upsert({ where: { soHoaDon: 'HD-2026-003' }, update: {}, create: { soHoaDon: 'HD-2026-003', ngayLap: new Date('2026-05-12'), khachHang: 'California Organic Imports LLC', loaiHoaDon: 'Bán hàng', tongTien: 44000, thue: 0, thanhTien: 44000, trangThai: 'Chưa thanh toán', nhanVienLap: 'Lê Văn C', phuongThucThanhToan: 'Chuyển khoản', ghiChu: 'Đơn DH-2026-003, thanh toán đợt 1 (50%). Còn lại $44,000 khi giao.' } });

  // Công nợ nhà cung cấp
  await prisma.debt.upsert({
    where: { id: 'debt-ncc001-apr' }, update: {},
    create: { id: 'debt-ncc001-apr', ngayPhatSinh: new Date('2026-04-13'), loaiChiPhi: 'Nguyên liệu', maNhaCungCap: 'NCC-001', tenNhaCungCap: 'HTX Mít Tiền Giang', loaiCungCap: 'Trái cây tươi', cungCap: 'Mít tươi Thái 14.3 tấn', noiDungChiCho: 'Thanh toán tiền mít tươi đợt 1', loaiHinh: 'Mua NVL', soTienPhaiTra: 357500000, soTienDaThanhToan: 200000000, ngayDenHan: new Date('2026-05-13'), soTaiKhoan: '0918123456 - Vietcombank', ghiChu: 'Còn nợ 157.5tr, hẹn thanh toán khi giao đơn JP' },
  });
  await prisma.debt.upsert({
    where: { id: 'debt-ncc002-apr' }, update: {},
    create: { id: 'debt-ncc002-apr', ngayPhatSinh: new Date('2026-04-14'), loaiChiPhi: 'Bao bì', maNhaCungCap: 'NCC-002', tenNhaCungCap: 'Công ty Bao bì Đại Phát', loaiCungCap: 'Bao bì đóng gói', cungCap: 'Túi hút chân không + thùng carton', noiDungChiCho: 'Thanh toán bao bì đợt 04/2026', loaiHinh: 'Mua NVL', soTienPhaiTra: 33750000, soTienDaThanhToan: 33750000, ngayHoachToan: new Date('2026-04-20'), ghiChu: 'Đã thanh toán đủ' },
  });

  // Phản hồi khách hàng (đơn KR đã giao)
  await prisma.customerFeedback.upsert({
    where: { id: 'fb-kr-001' }, update: {},
    create: { id: 'fb-kr-001', customerId: customerKR.id, ngayPhanHoi: new Date('2026-03-25'), loaiPhanHoi: 'Khen ngợi', mucDoNghiemTrong: 'Thấp', noiDungPhanHoi: 'Sản phẩm mít sấy giòn rất ngon, đóng gói đẹp. Khách hàng cuối rất hài lòng. Muốn đặt thêm đơn mới.', sanPhamLienQuan: 'Mít sấy giòn (SP002)', donHangLienQuan: 'DH-2026-002', nguoiTiepNhan: 'Lê Văn C', trangThaiXuLy: 'Đã xử lý', bienPhapXuLy: 'Gửi thư cảm ơn, đề xuất báo giá đơn mới', ketQuaXuLy: 'Khách đã gửi YCBG mới cho Q3/2026', ngayXuLyXong: new Date('2026-03-28'), mucDoHaiLong: 'Rất hài lòng' },
  });
  await prisma.customerFeedback.upsert({
    where: { id: 'fb-jp-001' }, update: {},
    create: { id: 'fb-jp-001', customerId: customerJP.id, ngayPhanHoi: new Date('2026-04-20'), loaiPhanHoi: 'Yêu cầu', mucDoNghiemTrong: 'Trung bình', noiDungPhanHoi: 'Yêu cầu gửi mẫu thử (sample) 5kg trước khi giao lô lớn. Cần kèm COA (Certificate of Analysis).', sanPhamLienQuan: 'Mít sấy dẻo (SP001)', donHangLienQuan: 'DH-2026-001', nguoiTiepNhan: 'Lê Văn C', trangThaiXuLy: 'Đang xử lý', bienPhapXuLy: 'Chuẩn bị mẫu 5kg từ mẻ MC-001, gửi DHL Express', ghiChu: 'Gửi mẫu kèm COA trước 25/04' },
  });
  console.log('  ✅ Chi phí + hóa đơn + công nợ + phản hồi KH');

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. BÁO CÁO SẢN LƯỢNG
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('📊 13. Tạo báo cáo sản lượng...');
  // Báo cáo sản lượng 3 ngày sản xuất
  await prisma.productionReport.upsert({
    where: { id: 'pr-20260416' }, update: {},
    create: { id: 'pr-20260416', ngayThang: '16/04/2026', tongSoTuaSanXuat: 2, soMeTua: 1, tongSoMeKeHoach: 2, soMeThucTe: 1, maDinhMuc: 'DM-MIT-DEO', tongKhoiLuongNguyenLieu: 500, tongKhoiLuongThanhPhamDinhMuc: 175, khoiLuongThanhPhamThucTe: 175, chenhLechKhoiLuong: 0, danhGiaChenhLech: 'Đạt định mức', nguyenNhanChenhLech: 'Không có chênh lệch', deXuatDieuChinh: 'Giữ nguyên thông số', nguoiThucHien: prodEmp.fullName || 'NV Sản xuất' },
  });
  await prisma.productionReport.upsert({
    where: { id: 'pr-20260417' }, update: {},
    create: { id: 'pr-20260417', ngayThang: '17/04/2026', tongSoTuaSanXuat: 2, soMeTua: 1, tongSoMeKeHoach: 2, soMeThucTe: 1, maDinhMuc: 'DM-MIT-DEO', tongKhoiLuongNguyenLieu: 500, tongKhoiLuongThanhPhamDinhMuc: 175, khoiLuongThanhPhamThucTe: 175, chenhLechKhoiLuong: 0, danhGiaChenhLech: 'Đạt định mức', nguyenNhanChenhLech: 'Múi nhỏ hơn → tỉ lệ A giảm nhẹ nhưng tổng KL đạt', deXuatDieuChinh: 'Chọn múi > 5cm cho mẻ tiếp theo', nguoiThucHien: prodEmp.fullName || 'NV Sản xuất' },
  });
  await prisma.productionReport.upsert({
    where: { id: 'pr-20260418' }, update: {},
    create: { id: 'pr-20260418', ngayThang: '18/04/2026', tongSoTuaSanXuat: 2, soMeTua: 2, tongSoMeKeHoach: 4, soMeThucTe: 2, maDinhMuc: 'DM-MIT-DEO', tongKhoiLuongNguyenLieu: 1000, tongKhoiLuongThanhPhamDinhMuc: 350, khoiLuongThanhPhamThucTe: 350, chenhLechKhoiLuong: 0, danhGiaChenhLech: 'Đạt kế hoạch 2 mẻ/ngày', nguyenNhanChenhLech: 'Không', deXuatDieuChinh: 'Tăng lên 3 mẻ/ngày nếu có thêm nhân công', nguoiThucHien: prodEmp.fullName || 'NV Sản xuất' },
  });
  console.log('  ✅ Báo cáo sản lượng 3 ngày');

  console.log('\n✨ Seed hoàn tất!');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('📊 Tổng kết quy trình mít sấy:');
  console.log('   • 5 sản phẩm | 4 khách hàng | 3 nhà cung cấp | 3 kho');
  console.log('   • 2 định mức NL (mít dẻo 35%, mít giòn 25%)');
  console.log('   • 1 quy trình SX + flowchart 8 công đoạn + chi phí');
  console.log('   • 3 máy sấy (2 nhiệt + 1 vacuum)');
  console.log('   • 3 đơn hàng: JP đang SX | KR đã giao | US chờ SX');
  console.log('   • 1 yêu cầu cung ứng + 1 yêu cầu mua hàng');
  console.log('   • 2 mẻ sấy (đánh giá NL → vận hành → thành phẩm → QC)');
  console.log('   • Nhập kho NVL + Nhập kho TP + Xuất kho giao hàng');
  console.log('   • 5 chi phí chung + 5 chi phí XK + 3 hóa đơn');
  console.log('   • 2 công nợ NCC + 2 phản hồi khách hàng');
  console.log('   • 3 báo cáo sản lượng');
  console.log('─────────────────────────────────────────────────────────────');
}

main()
  .catch((e) => { console.error('❌ Seeding error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
