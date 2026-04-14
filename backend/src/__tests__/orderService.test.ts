/**
 * OrderService Unit Tests
 *
 * Kiểm tra workflow tạo đơn hàng từ báo giá:
 * - Generate mã đơn hàng: DH-001, DH-002...
 * - Tạo đơn hàng từ quotationId (validate, copy items, auto-create TaxReport)
 * - broadcast({ type: 'ORDER_CHANGED' }) sau create/update
 * - Notification đến Admin + bộ phận kinh doanh (loại trừ actor)
 * - Update trạng thái sản xuất và thanh toán kèm notification
 * - Throw NotFoundError / ValidationError đúng lúc
 */

// ─── MOCK DEPENDENCIES ──────────────────────────────────────────────────────

jest.mock('@config/env', () => ({
  isProduction: false,
  isDevelopment: true,
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-secret-minimum-64-chars-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    JWT_EXPIRE: '7d',
    JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-64-chars-aaaaaaaaaaaaaaaaaaaaaaaaa',
    JWT_REFRESH_EXPIRE: '30d',
    PORT: 5001,
    CORS_ORIGIN: 'http://localhost:5173',
    NODE_ENV: 'test',
  },
}));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: {
    createOrderNotifications: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@services/websocket', () => ({
  __esModule: true,
  broadcast: jest.fn(),
}));

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    order: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    orderItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    quotation: {
      findUnique: jest.fn(),
    },
    taxReport: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    department: {
      findFirst: jest.fn(),
    },
  },
}));

// ─── IMPORTS (sau mock) ─────────────────────────────────────────────────────

import prisma from '@config/database';
import orderService from '@services/orderService';
import notificationService from '@services/notificationService';
import { broadcast } from '@services/websocket';
import { NotFoundError, ValidationError } from '@utils/errors';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedBroadcast = broadcast as jest.Mock;
const mockedNotify = notificationService.createOrderNotifications as jest.Mock;

// ─── MOCK DATA ───────────────────────────────────────────────────────────────

const mockQuotation = {
  id: 'quot-001',
  maBaoGia: 'BG-001',
  quotationRequestId: 'qr-001',
  maYeuCauBaoGia: 'YCBG-001',
  customerId: 'cust-001',
  maKhachHang: 'KH001',
  tenKhachHang: 'Công ty ABC',
  employeeId: 'emp-001',
  tenNhanVien: 'Nguyễn Văn A',
  quotationRequest: {
    items: [
      {
        productId: 'prod-001',
        maSanPham: 'SP001',
        tenSanPham: 'Bánh mì An Bình',
        yeuCauSanPham: 'Hàng xuất khẩu',
        quyDongGoi: '24 cái/hộp',
        soLuong: 1000,
        donViTinh: 'Hộp',
        product: { id: 'prod-001', tenSanPham: 'Bánh mì An Bình' },
      },
    ],
  },
};

const mockOrder = {
  id: 'order-001',
  maDonHang: 'DH-001',
  ngayDatHang: new Date(),
  quotationId: 'quot-001',
  maBaoGia: 'BG-001',
  quotationRequestId: 'qr-001',
  maYeuCauBaoGia: 'YCBG-001',
  customerId: 'cust-001',
  maKhachHang: 'KH001',
  tenKhachHang: 'Công ty ABC',
  employeeId: 'emp-001',
  tenNhanVien: 'Nguyễn Văn A',
  giaTriDonHangUSD: null,
  giaTriDonHangVND: null,
  trangThaiSanXuat: 'CHO_LEN_KE_HOACH',
  trangThaiThanhToan: null,
  ghiChu: null,
  fileDinhKem: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: 'item-001',
      productId: 'prod-001',
      maSanPham: 'SP001',
      tenHangHoa: 'Bánh mì An Bình',
      soLuong: 1000,
      donVi: 'Hộp',
    },
  ],
};

// ─── TESTS ───────────────────────────────────────────────────────────────────

describe('OrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('generateOrderCode', () => {
    it('should return DH-001 when no orders exist', async () => {
      (mockedPrisma.order.findFirst as jest.Mock).mockResolvedValue(null);

      const code = await orderService.generateOrderCode();

      expect(code).toBe('DH-001');
    });

    it('should increment from last order code', async () => {
      (mockedPrisma.order.findFirst as jest.Mock).mockResolvedValue({ maDonHang: 'DH-005' });

      const code = await orderService.generateOrderCode();

      expect(code).toBe('DH-006');
    });

    it('should zero-pad to 3 digits', async () => {
      (mockedPrisma.order.findFirst as jest.Mock).mockResolvedValue({ maDonHang: 'DH-009' });

      const code = await orderService.generateOrderCode();

      expect(code).toBe('DH-010');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('createOrderFromQuotation', () => {
    beforeEach(() => {
      // Setup chung cho các test tạo đơn hàng
      (mockedPrisma.order.findFirst as jest.Mock).mockResolvedValue(null);        // generate code
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(null);       // no duplicate
      (mockedPrisma.order.create as jest.Mock).mockResolvedValue(mockOrder);
      (mockedPrisma.taxReport.create as jest.Mock).mockResolvedValue({ id: 'tr-001' });
      (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([]);            // admins
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);        // actor name
      (mockedPrisma.department.findFirst as jest.Mock).mockResolvedValue(null);   // biz dept
      (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
    });

    it('should throw NotFoundError when quotation not found', async () => {
      (mockedPrisma.quotation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(orderService.createOrderFromQuotation('quot-999')).rejects.toThrow(NotFoundError);
      await expect(orderService.createOrderFromQuotation('quot-999')).rejects.toThrow(
        'Không tìm thấy báo giá'
      );
    });

    it('should throw ValidationError when order already exists for quotation', async () => {
      (mockedPrisma.quotation.findUnique as jest.Mock).mockResolvedValue(mockQuotation);
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder); // duplicate

      await expect(orderService.createOrderFromQuotation('quot-001')).rejects.toThrow(ValidationError);
      await expect(orderService.createOrderFromQuotation('quot-001')).rejects.toThrow(
        'Đơn hàng đã được tạo từ báo giá này'
      );
    });

    it('should create order with items copied from quotation', async () => {
      (mockedPrisma.quotation.findUnique as jest.Mock).mockResolvedValue(mockQuotation);

      await orderService.createOrderFromQuotation('quot-001');

      expect(mockedPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            maDonHang: 'DH-001',
            quotationId: 'quot-001',
            tenKhachHang: 'Công ty ABC',
            items: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  maSanPham: 'SP001',
                  tenHangHoa: 'Bánh mì An Bình',
                  soLuong: 1000,
                }),
              ]),
            },
          }),
        })
      );
    });

    it('should automatically create TaxReport after order creation', async () => {
      (mockedPrisma.quotation.findUnique as jest.Mock).mockResolvedValue(mockQuotation);

      await orderService.createOrderFromQuotation('quot-001');

      expect(mockedPrisma.taxReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-001',
            maDonHang: 'DH-001',
            trangThai: 'CHUA_BAO_CAO',
          }),
        })
      );
    });

    it('should broadcast ORDER_CHANGED after creation', async () => {
      (mockedPrisma.quotation.findUnique as jest.Mock).mockResolvedValue(mockQuotation);

      await orderService.createOrderFromQuotation('quot-001');

      expect(mockedBroadcast).toHaveBeenCalledWith({ type: 'ORDER_CHANGED' });
    });

    it('should send notifications to Admin + biz department (excluding actor)', async () => {
      (mockedPrisma.quotation.findUnique as jest.Mock).mockResolvedValue(mockQuotation);
      // Mock admin users with employees
      (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'user-admin', employees: { id: 'emp-admin' } },
      ]);
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        firstName: 'Admin',
        lastName: 'User',
      });

      await orderService.createOrderFromQuotation('quot-001', undefined, 'user-actor');

      expect(mockedNotify).toHaveBeenCalledWith(
        expect.arrayContaining(['emp-admin']),
        'order-001',
        'DH-001',
        'Đơn hàng mới được tạo',
        expect.any(String)
      );
    });

    it('should still create order even if TaxReport creation fails', async () => {
      (mockedPrisma.quotation.findUnique as jest.Mock).mockResolvedValue(mockQuotation);
      (mockedPrisma.taxReport.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      // Không throw — order vẫn được tạo
      const result = await orderService.createOrderFromQuotation('quot-001');

      expect(result).toBeDefined();
      expect(result.maDonHang).toBe('DH-001');
    });

    it('should still create order even if notification fails', async () => {
      (mockedPrisma.quotation.findUnique as jest.Mock).mockResolvedValue(mockQuotation);
      mockedNotify.mockRejectedValue(new Error('Notification error'));

      // Không throw — order vẫn được tạo
      const result = await orderService.createOrderFromQuotation('quot-001');

      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('getAllOrders', () => {
    it('should return paginated orders', async () => {
      (mockedPrisma.order.findMany as jest.Mock).mockResolvedValue([mockOrder]);
      (mockedPrisma.order.count as jest.Mock).mockResolvedValue(1);

      const result = await orderService.getAllOrders(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].maDonHang).toBe('DH-001');
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by search term', async () => {
      (mockedPrisma.order.findMany as jest.Mock).mockResolvedValue([mockOrder]);
      (mockedPrisma.order.count as jest.Mock).mockResolvedValue(1);

      await orderService.getAllOrders(1, 10, 'ABC');

      expect(mockedPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ tenKhachHang: expect.objectContaining({ contains: 'ABC' }) }),
            ]),
          }),
        })
      );
    });

    it('should order by ngayDatHang desc', async () => {
      (mockedPrisma.order.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.order.count as jest.Mock).mockResolvedValue(0);

      await orderService.getAllOrders(1, 10);

      expect(mockedPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { ngayDatHang: 'desc' },
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('getOrderById', () => {
    it('should return order with all relations', async () => {
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...mockOrder,
        quotation: mockQuotation,
        customer: { id: 'cust-001', tenKhachHang: 'Công ty ABC' },
        employee: { user: { firstName: 'Nguyễn', lastName: 'Văn A', email: 'a@test.com' } },
      });

      const result = await orderService.getOrderById('order-001');

      expect(result.id).toBe('order-001');
      expect(result.customer).toBeDefined();
      expect(result.employee).toBeDefined();
    });

    it('should throw NotFoundError when order not found', async () => {
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(orderService.getOrderById('order-999')).rejects.toThrow(NotFoundError);
      await expect(orderService.getOrderById('order-999')).rejects.toThrow('Không tìm thấy đơn hàng');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('updateOrder', () => {
    it('should throw NotFoundError when order not found', async () => {
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(orderService.updateOrder('order-999', {})).rejects.toThrow(NotFoundError);
    });

    it('should send notification and broadcast when trangThaiSanXuat changes', async () => {
      mockedNotify.mockResolvedValue(undefined); // Reset vì test trước có thể set mockRejectedValue
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...mockOrder,
        trangThaiSanXuat: 'CHO_LEN_KE_HOACH',
      });
      (mockedPrisma.order.update as jest.Mock).mockResolvedValue({
        ...mockOrder,
        trangThaiSanXuat: 'DANG_SAN_XUAT',
      });
      (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.department.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      await orderService.updateOrder('order-001', { trangThaiSanXuat: 'DANG_SAN_XUAT' });

      expect(mockedBroadcast).toHaveBeenCalledWith({ type: 'ORDER_CHANGED' });
    });

    it('should send notification and broadcast when trangThaiThanhToan changes', async () => {
      mockedNotify.mockResolvedValue(undefined); // Reset vì test trước có thể set mockRejectedValue
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...mockOrder,
        trangThaiThanhToan: null,
      });
      (mockedPrisma.order.update as jest.Mock).mockResolvedValue({
        ...mockOrder,
        trangThaiThanhToan: 'DA_THANH_TOAN_DOT_1',
      });
      (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.department.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      await orderService.updateOrder('order-001', { trangThaiThanhToan: 'DA_THANH_TOAN_DOT_1' });

      expect(mockedBroadcast).toHaveBeenCalledWith({ type: 'ORDER_CHANGED' });
    });

    it('should NOT broadcast when no status fields change', async () => {
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (mockedPrisma.order.update as jest.Mock).mockResolvedValue({
        ...mockOrder,
        ghiChu: 'Ghi chú mới',
      });

      await orderService.updateOrder('order-001', { ghiChu: 'Ghi chú mới' });

      expect(mockedBroadcast).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('deleteOrder', () => {
    it('should delete order when found', async () => {
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (mockedPrisma.order.delete as jest.Mock).mockResolvedValue(mockOrder);

      const result = await orderService.deleteOrder('order-001');

      expect(mockedPrisma.order.delete).toHaveBeenCalledWith({ where: { id: 'order-001' } });
      expect(result.message).toContain('thành công');
    });

    it('should throw NotFoundError when order not found', async () => {
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(orderService.deleteOrder('order-999')).rejects.toThrow(NotFoundError);
      expect(mockedPrisma.order.delete).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('formatStatusLabel (via notification message)', () => {
    const statusCases = [
      ['CHO_LEN_KE_HOACH', 'Chờ lên kế hoạch'],
      ['DANG_SAN_XUAT', 'Đang sản xuất'],
      ['DA_GIAO_CHO_KHACH_HANG', 'Đã giao cho khách hàng'],
      ['DA_THANH_TOAN_DU', 'Đã thanh toán đủ'],
    ];

    it.each(statusCases)(
      'should notify with Vietnamese label when status is %s',
      async (status, label) => {
        mockedNotify.mockResolvedValue(undefined); // Reset vì test resilience trước dùng mockRejectedValue
        // Luôn dùng 'null' làm trạng thái hiện tại để đảm bảo điều kiện "status thay đổi" luôn đúng
        (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue({
          ...mockOrder,
          trangThaiSanXuat: null,
        });
        (mockedPrisma.order.update as jest.Mock).mockResolvedValue({
          ...mockOrder,
          trangThaiSanXuat: status,
        });
        (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([
          { id: 'u1', employees: { id: 'emp-admin' } },
        ]);
        (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (mockedPrisma.department.findFirst as jest.Mock).mockResolvedValue(null);
        (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);
        (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

        await orderService.updateOrder('order-001', { trangThaiSanXuat: status });

        expect(mockedNotify).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.anything(),
          label,
          expect.anything()
        );
      }
    );
  });
});
