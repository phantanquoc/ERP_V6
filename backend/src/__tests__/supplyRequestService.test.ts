process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    employee: {
      findUnique: jest.fn(),
    },
    supplyRequest: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
    },
    supplyRequestItem: {
      createMany: jest.fn(),
    },
  },
}));

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: {
    getConfiguredRecipientEmployeeIds: jest.fn(),
    createSupplyRequestNotification: jest.fn(),
    createSupplyRequestNotifications: jest.fn(),
  },
}));

import prisma from '@config/database';
import supplyRequestService from '@services/supplyRequestService';
import notificationService from '@services/notificationService';
import { NotificationRoutingEvent } from '@types';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedNotificationService = notificationService as jest.Mocked<typeof notificationService>;

beforeEach(() => {
  jest.clearAllMocks();
  (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (callback: (tx: typeof mockedPrisma) => Promise<unknown>) => callback(mockedPrisma));
});

describe('supplyRequestService.createSupplyRequest routing', () => {
  it('routes new supply requests through configured recipients and sends the item summary notification', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1' });
    (mockedPrisma.supplyRequest.findFirst as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.supplyRequest.create as jest.Mock).mockResolvedValue({ id: 'supply-1' });
    (mockedPrisma.supplyRequestItem.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (mockedPrisma.supplyRequest.findUnique as jest.Mock).mockResolvedValue({
      id: 'supply-1',
      maYeuCau: 'YC-CC001',
      items: [{ tenGoi: 'Bao bì' }],
    });
    (mockedNotificationService.getConfiguredRecipientEmployeeIds as jest.Mock).mockResolvedValue(['warehouse-1']);

    await supplyRequestService.createSupplyRequest({
      employeeId: 'emp-1',
      maNhanVien: 'NV001',
      tenNhanVien: 'Nguyễn An',
      boPhan: 'Sản xuất',
      items: [{ phanLoai: 'Vật tư', tenGoi: 'Bao bì', soLuong: 10, donViTinh: 'kg' }],
      mucDichYeuCau: 'Bổ sung vật tư',
      mucDoUuTien: 'CAO',
    });

    expect(mockedNotificationService.getConfiguredRecipientEmployeeIds).toHaveBeenCalledWith(
      NotificationRoutingEvent.SUPPLY_REQUEST_CREATED,
      {
        subDepartmentCodes: ['SUBDEPT_PRODUCTION_WAREHOUSE'],
      }
    );
    expect(mockedNotificationService.createSupplyRequestNotifications).toHaveBeenCalledWith(
      ['warehouse-1'],
      'SUPPLY_REQUEST',
      'Yêu cầu cung cấp mới',
      expect.stringContaining('Bao bì'),
      'supply-1'
    );
  });
});

describe('supplyRequestService.onPurchaseRequestCreated', () => {
  it('advances status to processing and notifies the requester', async () => {
    (mockedPrisma.supplyRequest.findUnique as jest.Mock)
      .mockResolvedValueOnce({ trangThai: 'Chưa cung cấp' })
      .mockResolvedValueOnce({ employeeId: 'requester-1', maYeuCau: 'YC-CC001' });
    (mockedPrisma.supplyRequest.update as jest.Mock).mockResolvedValue({});

    await supplyRequestService.onPurchaseRequestCreated('supply-1');

    expect(mockedPrisma.supplyRequest.update).toHaveBeenCalledWith({
      where: { id: 'supply-1' },
      data: { trangThai: 'Đang xử lý' },
    });
    expect(mockedNotificationService.createSupplyRequestNotification).toHaveBeenCalledWith(
      'requester-1',
      'SUPPLY_REQUEST_PROCESSING',
      'Yêu cầu cung cấp đang xử lý',
      expect.stringContaining('YC-CC001'),
      'supply-1'
    );
  });
});

describe('supplyRequestService.onPurchaseRequestApproved', () => {
  it('includes the original requester alongside routed recipients', async () => {
    (mockedPrisma.supplyRequest.findUnique as jest.Mock)
      .mockResolvedValueOnce({ trangThai: 'Đang xử lý' })
      .mockResolvedValueOnce({ employeeId: 'requester-1', maYeuCau: 'YC-CC001' });
    (mockedPrisma.supplyRequest.update as jest.Mock).mockResolvedValue({});
    (mockedNotificationService.getConfiguredRecipientEmployeeIds as jest.Mock).mockResolvedValue(['warehouse-1', 'requester-1']);

    await supplyRequestService.onPurchaseRequestApproved('supply-1');

    expect(mockedNotificationService.getConfiguredRecipientEmployeeIds).toHaveBeenCalledWith(
      NotificationRoutingEvent.SUPPLY_REQUEST_APPROVED,
      {
        subDepartmentCodes: ['SUBDEPT_PRODUCTION_WAREHOUSE'],
        departmentCodes: ['DEPT_PURCHASING'],
      }
    );
    expect(mockedNotificationService.createSupplyRequestNotifications).toHaveBeenCalledWith(
      ['requester-1', 'warehouse-1'],
      'SUPPLY_REQUEST_APPROVED',
      'Yêu cầu mua hàng đã được duyệt',
      expect.stringContaining('YC-CC001'),
      'supply-1'
    );
  });
});

describe('supplyRequestService.onWarehouseDocumentCreated', () => {
  it('advances status to fulfilled and notifies the requester', async () => {
    (mockedPrisma.supplyRequest.findUnique as jest.Mock)
      .mockResolvedValueOnce({ trangThai: 'Đã duyệt mua' })
      .mockResolvedValueOnce({ employeeId: 'requester-1', maYeuCau: 'YC-CC001' });
    (mockedPrisma.supplyRequest.update as jest.Mock).mockResolvedValue({});

    await supplyRequestService.onWarehouseDocumentCreated('supply-1');

    expect(mockedPrisma.supplyRequest.update).toHaveBeenCalledWith({
      where: { id: 'supply-1' },
      data: { trangThai: 'Đã cung cấp' },
    });
    expect(mockedNotificationService.createSupplyRequestNotification).toHaveBeenCalledWith(
      'requester-1',
      'SUPPLY_REQUEST_FULFILLED',
      'Yêu cầu cung cấp đã được thực hiện',
      expect.stringContaining('YC-CC001'),
      'supply-1'
    );
  });
});

describe('supplyRequestService notification failures', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('logs and swallows notification errors after processing transition', async () => {
    (mockedPrisma.supplyRequest.findUnique as jest.Mock)
      .mockResolvedValueOnce({ trangThai: 'Chưa cung cấp' })
      .mockResolvedValueOnce({ employeeId: 'requester-1', maYeuCau: 'YC-CC001' });
    (mockedPrisma.supplyRequest.update as jest.Mock).mockResolvedValue({});
    (mockedNotificationService.createSupplyRequestNotification as jest.Mock).mockRejectedValueOnce(new Error('push failed'));

    await expect(supplyRequestService.onPurchaseRequestCreated('supply-1')).resolves.toBeUndefined();
    expect(mockedPrisma.supplyRequest.update).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('logs and swallows notification errors after approval transition', async () => {
    (mockedPrisma.supplyRequest.findUnique as jest.Mock)
      .mockResolvedValueOnce({ trangThai: 'Đang xử lý' })
      .mockResolvedValueOnce({ employeeId: 'requester-1', maYeuCau: 'YC-CC001' });
    (mockedPrisma.supplyRequest.update as jest.Mock).mockResolvedValue({});
    (mockedNotificationService.getConfiguredRecipientEmployeeIds as jest.Mock).mockResolvedValue(['warehouse-1']);
    (mockedNotificationService.createSupplyRequestNotifications as jest.Mock).mockRejectedValueOnce(new Error('write failed'));

    await expect(supplyRequestService.onPurchaseRequestApproved('supply-1')).resolves.toBeUndefined();
    expect(mockedPrisma.supplyRequest.update).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('logs and swallows notification errors after fulfillment transition', async () => {
    (mockedPrisma.supplyRequest.findUnique as jest.Mock)
      .mockResolvedValueOnce({ trangThai: 'Đã duyệt mua' })
      .mockResolvedValueOnce({ employeeId: 'requester-1', maYeuCau: 'YC-CC001' });
    (mockedPrisma.supplyRequest.update as jest.Mock).mockResolvedValue({});
    (mockedNotificationService.createSupplyRequestNotification as jest.Mock).mockRejectedValueOnce(new Error('write failed'));

    await expect(supplyRequestService.onWarehouseDocumentCreated('supply-1')).resolves.toBeUndefined();
    expect(mockedPrisma.supplyRequest.update).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
