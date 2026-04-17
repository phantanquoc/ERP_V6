process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    purchaseRequest: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    purchaseRequestItem: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: {
    getConfiguredRecipientEmployeeIds: jest.fn(),
    createSupplyRequestNotifications: jest.fn(),
  },
}));

jest.mock('@services/supplyRequestService', () => ({
  __esModule: true,
  default: {
    onPurchaseRequestCreated: jest.fn(),
    onPurchaseRequestCompleted: jest.fn(),
    onPurchaseRequestApproved: jest.fn(),
  },
}));

import prisma from '@config/database';
import purchaseRequestService from '@services/purchaseRequestService';
import notificationService from '@services/notificationService';
import supplyRequestService from '@services/supplyRequestService';
import { NotificationRoutingEvent } from '@types';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedNotificationService = notificationService as jest.Mocked<typeof notificationService>;
const mockedSupplyRequestService = supplyRequestService as jest.Mocked<typeof supplyRequestService>;

beforeEach(() => {
  jest.clearAllMocks();
  (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (callback: (tx: typeof mockedPrisma) => Promise<unknown>) => callback(mockedPrisma));
});

describe('purchaseRequestService notification routing', () => {
  it('emits purchase-request-created notifications with purchase semantics', async () => {
    (mockedPrisma.purchaseRequest.findFirst as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.purchaseRequest.create as jest.Mock).mockResolvedValue({ id: 'purchase-1' });
    (mockedPrisma.purchaseRequestItem.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (mockedPrisma.purchaseRequest.findUnique as jest.Mock).mockResolvedValue({
      id: 'purchase-1',
      maYeuCau: 'YC-MH0001',
      items: [{ tenHangHoa: 'Màng co' }],
    });
    (mockedNotificationService.getConfiguredRecipientEmployeeIds as jest.Mock).mockResolvedValue(['purchasing-1']);

    await purchaseRequestService.createPurchaseRequest({
      employeeId: 'emp-1',
      maNhanVien: 'NV001',
      tenNhanVien: 'Nguyễn An',
      items: [{ phanLoai: 'Vật tư', tenHangHoa: 'Màng co', soLuong: 5, donViTinh: 'kg' }],
      mucDichYeuCau: 'Mua vật tư',
      mucDoUuTien: 'CAO',
      supplyRequestId: 'supply-1',
    });

    expect(mockedNotificationService.getConfiguredRecipientEmployeeIds).toHaveBeenCalledWith(
      NotificationRoutingEvent.PURCHASE_REQUEST_CREATED,
      {
        roles: ['ADMIN'],
        departmentCodes: ['DEPT_PURCHASING'],
      }
    );
    expect(mockedNotificationService.createSupplyRequestNotifications).toHaveBeenCalledWith(
      ['purchasing-1'],
      'PURCHASE_REQUEST',
      'Yêu cầu mua hàng mới',
      expect.stringContaining('YC-MH0001'),
      'supply-1'
    );
    expect(mockedSupplyRequestService.onPurchaseRequestCreated).toHaveBeenCalledWith('supply-1');
  });

  it('emits purchase-request-completed notifications with purchase semantics', async () => {
    (mockedPrisma.purchaseRequest.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'purchase-1',
        supplyRequestId: 'supply-1',
        trangThai: 'Đã duyệt',
      })
      .mockResolvedValueOnce({
        id: 'purchase-1',
        maYeuCau: 'YC-MH0001',
        items: [{ tenHangHoa: 'Màng co' }],
      });
    (mockedPrisma.purchaseRequest.update as jest.Mock).mockResolvedValue({
      id: 'purchase-1',
      trangThai: 'Hoàn thành',
    });
    (mockedNotificationService.getConfiguredRecipientEmployeeIds as jest.Mock).mockResolvedValue(['warehouse-1']);

    await purchaseRequestService.updatePurchaseRequest('purchase-1', {
      trangThai: 'Hoàn thành',
    });

    expect(mockedNotificationService.getConfiguredRecipientEmployeeIds).toHaveBeenCalledWith(
      NotificationRoutingEvent.PURCHASE_REQUEST_COMPLETED,
      {
        subDepartmentCodes: ['SUBDEPT_PRODUCTION_WAREHOUSE'],
      }
    );
    expect(mockedNotificationService.createSupplyRequestNotifications).toHaveBeenCalledWith(
      ['warehouse-1'],
      'PURCHASE_REQUEST_COMPLETED',
      'Hàng hóa đã mua về - Chuẩn bị nhập kho',
      expect.stringContaining('YC-MH0001'),
      'supply-1'
    );
    expect(mockedSupplyRequestService.onPurchaseRequestCompleted).toHaveBeenCalledWith('supply-1');
  });
});
