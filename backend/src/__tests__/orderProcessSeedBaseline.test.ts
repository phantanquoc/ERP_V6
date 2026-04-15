import { execSync } from 'child_process';
import path from 'path';
import prisma from '@config/database';

jest.setTimeout(180000);

describe('dried jackfruit order process seed baseline', () => {
  beforeAll(async () => {
    const backendRoot = path.resolve(__dirname, '../..');
    const env = {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ||
        'postgresql://erp_user:erp_password_change_me@localhost:5432/erp_database?schema=public&connection_limit=30',
      JWT_SECRET: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_me',
    };

    execSync('npm run prisma:seed', { cwd: backendRoot, env, stdio: 'pipe' });
    execSync('npm run prisma:seed', { cwd: backendRoot, env, stdio: 'pipe' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('seeds the commercial chain from quotation request to paid invoice', async () => {
    const customer = await prisma.internationalCustomer.findUnique({
      where: { maKhachHang: 'KHND-MIT-001' },
    });
    const quotationRequest = await prisma.quotationRequest.findUnique({
      where: { maYeuCauBaoGia: 'YCBG-201' },
      include: { items: true },
    });
    const quotation = await prisma.quotation.findUnique({
      where: { maBaoGia: 'BG-YCBG-201' },
      include: { items: true },
    });
    const order = await prisma.order.findUnique({
      where: { maDonHang: 'DH-201' },
      include: { items: true, taxReport: true },
    });
    const invoice = await prisma.invoice.findUnique({
      where: { soHoaDon: 'HD201' },
    });
    const feedback = await prisma.customerFeedback.findFirst({
      where: { donHangLienQuan: 'DH-201' },
    });

    expect(customer?.tenCongTy).toBe('Công ty TNHH Thực Phẩm An Phú');
    expect(quotationRequest?.tenNhanVien).toBe('Nguyễn Hoàng Nam');
    expect(quotationRequest?.items).toHaveLength(1);
    expect(quotationRequest?.items[0]).toMatchObject({
      maSanPham: 'SP-202',
      tenSanPham: 'Mít sấy loại 1',
      soLuong: 180,
      donViTinh: 'Kg',
    });

    expect(quotation).toMatchObject({
      maYeuCauBaoGia: 'YCBG-201',
      giaBaoKhach: 248000,
      tinhTrang: 'DA_DAT_HANG',
    });
    expect(quotation?.items.map((item) => item.tenThanhPham)).toEqual([
      'Mít sấy loại 1',
      'Mít sấy loại 2',
      'Vụn mít sấy',
    ]);

    expect(order).toMatchObject({
      maBaoGia: 'BG-YCBG-201',
      tenKhachHang: 'Công ty TNHH Thực Phẩm An Phú',
      giaTriDonHangVND: 44640000,
      trangThaiSanXuat: 'DA_GIAO_CHO_KHACH_HANG',
      trangThaiThanhToan: 'DA_THANH_TOAN_DU',
    });
    expect(order?.items).toHaveLength(1);
    expect(order?.items[0]).toMatchObject({
      maSanPham: 'SP-202',
      soLuong: 180,
      donVi: 'Kg',
    });

    expect(order?.taxReport).toMatchObject({
      maDonHang: 'DH-201',
      trangThai: 'DA_QUYET_TOAN',
      soTienDongThue: 3571200,
    });
    expect(invoice).toMatchObject({
      khachHang: 'Công ty TNHH Thực Phẩm An Phú',
      tongTien: 44640000,
      thanhTien: 48211200,
      trangThai: 'Đã thanh toán',
    });
    expect(feedback?.trangThaiXuLy).toBe('Đã xử lý');
  });

  it('seeds production, quality, and costing context for the jackfruit batch', async () => {
    const materialStandard = await prisma.materialStandard.findUnique({
      where: { maDinhMuc: 'DM-201' },
      include: { inputItems: true, items: true },
    });
    const process = await prisma.process.findUnique({
      where: { maQuyTrinh: 'QT-201' },
      include: {
        flowchart: {
          include: {
            sections: {
              include: { costs: true },
              orderBy: { stt: 'asc' },
            },
          },
        },
      },
    });
    const productionProcess = await prisma.productionProcess.findUnique({
      where: { maQuyTrinhSanXuat: 'QTSX-MIT-20260415-01' },
      include: {
        flowchart: {
          include: {
            sections: {
              include: { costs: true },
              orderBy: { stt: 'asc' },
            },
          },
        },
        materialStandard: true,
      },
    });
    const calculator = await prisma.quotationCalculator.findUnique({
      where: { quotationRequestId: (await prisma.quotationRequest.findUniqueOrThrow({ where: { maYeuCauBaoGia: 'YCBG-201' } })).id },
      include: {
        products: {
          include: { byProducts: true },
        },
        generalCosts: true,
      },
    });
    const machine = await prisma.machine.findUnique({
      where: { maMay: 'MAY-VC-01' },
    });
    const materialEvaluation = await prisma.materialEvaluation.findUnique({
      where: { maChien: 'MIT-20260415-01' },
    });
    const finishedProduct = await prisma.finishedProduct.findFirst({
      where: { maChien: 'MIT-20260415-01' },
    });
    const qualityEvaluation = await prisma.qualityEvaluation.findFirst({
      where: { maChien: 'MIT-20260415-01' },
    });
    const productionReport = await prisma.productionReport.findFirst({
      where: { maDinhMuc: 'DM-201' },
    });

    expect(materialStandard?.tenDinhMuc).toBe('Định mức Mít sấy loại 1 từ mít tách hạt');
    expect(materialStandard?.inputItems.map((item) => item.tenNguyenLieu)).toEqual([
      'Mít tách hạt loại 1',
      'Dịch đường 38 Brix',
      'Phụ gia chống oxy hóa',
    ]);
    expect(materialStandard?.items.map((item) => item.tenThanhPham)).toEqual([
      'Mít sấy loại 1',
      'Mít sấy loại 2',
      'Vụn mít sấy',
    ]);

    expect(process?.flowchart?.sections).toHaveLength(5);
    expect(productionProcess).toMatchObject({
      tenQuyTrinhSanXuat: 'Lệnh sản xuất DH-201 - Mít sấy loại 1',
      sanPhamDauRa: 'Mít sấy loại 1',
      tongNguyenLieuCanSanXuat: 675,
    });
    expect(productionProcess?.flowchart?.sections).toHaveLength(5);

    expect(calculator?.products).toHaveLength(1);
    expect(calculator?.products[0]).toMatchObject({
      tenSanPham: 'Mít sấy loại 1',
      tongThanhPhamCanSxThem: 168,
      tongNguyenLieuCanSanXuat: 675,
      giaHoaVon: 198000,
      loiNhuanCongThem: 50000,
    });
    expect(calculator?.products[0].byProducts.map((item) => item.tenSanPham)).toEqual([
      'Mít sấy loại 2',
      'Vụn mít sấy',
    ]);
    expect(calculator?.generalCosts).toHaveLength(3);

    expect(machine?.tenMay).toBe('Máy sấy chân không VC-01');
    expect(materialEvaluation?.khoiLuong).toBe(780);
    expect(finishedProduct).toMatchObject({
      tenHangHoa: 'Mít sấy loại 1 - Lô TP-MIT-150426-A',
      tongKhoiLuong: 257,
      aKhoiLuong: 205,
    });
    expect(qualityEvaluation?.danhGiaTongQuan).toBe('Đạt chuẩn xuất kho cho đơn hàng nội địa loại 1');
    expect(productionReport).toMatchObject({
      tongKhoiLuongNguyenLieu: 780,
      khoiLuongThanhPhamThucTe: 257,
      chenhLechKhoiLuong: 37.6,
    });
  });

  it('seeds warehouse movements that match the dried jackfruit order flow', async () => {
    const [rawReceipt, packagingIssue, deliveryIssue, finishedWarehouse] = await Promise.all([
      prisma.warehouseReceipt.findUnique({
        where: { maPhieuNhap: 'PN202604160101' },
      }),
      prisma.warehouseIssue.findUnique({
        where: { maPhieuXuat: 'PX-20260416-0102' },
      }),
      prisma.warehouseIssue.findUnique({
        where: { maPhieuXuat: 'PX-20260416-0104' },
      }),
      prisma.warehouses.findUnique({
        where: { maKho: 'KHO005' },
        include: {
          lots: {
            include: {
              lotProducts: {
                include: {
                  internationalProduct: true,
                },
              },
            },
          },
        },
      }),
    ]);

    expect(rawReceipt).toMatchObject({
      tenSanPham: 'Mít tách hạt loại 1',
      soLuongNhap: 850,
      soLuongSau: 850,
    });
    expect(packagingIssue).toMatchObject({
      tenSanPham: 'Túi zipper nhôm 500g',
      soLuongXuat: 360,
      soLuongSau: 140,
    });
    expect(deliveryIssue).toMatchObject({
      tenSanPham: 'Mít sấy loại 1',
      soLuongXuat: 180,
      soLuongSau: 25,
    });

    const finishedProducts =
      finishedWarehouse?.lots
        .flatMap((lot) => lot.lotProducts)
        .map((item) => `${item.internationalProduct.maSanPham}:${item.soLuong}`)
        .sort() || [];

    expect(finishedProducts).toEqual(['SP-202:25', 'SP-203:30', 'SP-204:11']);
  });
});
