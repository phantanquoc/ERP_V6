/**
 * Batch E 7.1 — requireRule ownership mapping
 * Verifies RESOURCE_TO_MODEL for supply-requests/purchase-requests and
 * loadRecordOwner's employee→userId join.
 */

const mockPrisma: any = {
  supplyRequest: { findUnique: jest.fn() },
  purchaseRequest: { findUnique: jest.fn() },
  employee: { findUnique: jest.fn() },
  rule: { findMany: jest.fn() },
  resource: { findUnique: jest.fn(), findMany: jest.fn() },
  delegation: { findMany: jest.fn() },
  position: { findUnique: jest.fn() },
  userSecondaryDepartment: { findMany: jest.fn() },
  customerFeedback: { findUnique: jest.fn() },
  invoice: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
};

jest.mock('@config/database', () => ({ __esModule: true, default: mockPrisma }));
jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));
jest.mock('@utils/cache', () => ({
  __esModule: true,
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDel: jest.fn().mockResolvedValue(undefined),
  cacheDelPattern: jest.fn().mockResolvedValue(undefined),
  CACHE_KEYS: { DEPARTMENTS: 'cache:departments', SYSTEM_SETTINGS: 'cache:system-settings' },
}));

import { RESOURCE_TO_MODEL, loadRecordOwner } from '@middlewares/requireRule';

describe('RESOURCE_TO_MODEL ownership mapping', () => {
  it('maps supply-requests ownerField to employeeId', () => {
    expect(RESOURCE_TO_MODEL['supply-requests']).toBeDefined();
    expect(RESOURCE_TO_MODEL['supply-requests'].ownerField).toBe('employeeId');
    expect(RESOURCE_TO_MODEL['supply-requests'].delegate).toBe('supplyRequest');
  });

  it('maps purchase-requests ownerField to employeeId', () => {
    expect(RESOURCE_TO_MODEL['purchase-requests']).toBeDefined();
    expect(RESOURCE_TO_MODEL['purchase-requests'].ownerField).toBe('employeeId');
    expect(RESOURCE_TO_MODEL['purchase-requests'].delegate).toBe('purchaseRequest');
  });

  it('maps leave-requests and daily-work-reports to employeeId as well', () => {
    expect(RESOURCE_TO_MODEL['leave-requests'].ownerField).toBe('employeeId');
    expect(RESOURCE_TO_MODEL['daily-work-reports'].ownerField).toBe('employeeId');
  });
});

describe('loadRecordOwner — employee→userId join', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves supply-request to the linked employee userId', async () => {
    mockPrisma.supplyRequest.findUnique.mockResolvedValue({ employeeId: 'emp-1' });
    mockPrisma.employee.findUnique.mockResolvedValue({ userId: 'user-1' });
    const owner = await loadRecordOwner('supply-requests', 'sr-1');
    expect(owner).toBe('user-1');
    expect(mockPrisma.supplyRequest.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sr-1' } })
    );
    expect(mockPrisma.employee.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'emp-1' } })
    );
  });

  it('resolves purchase-request to the linked employee userId', async () => {
    mockPrisma.purchaseRequest.findUnique.mockResolvedValue({ employeeId: 'emp-2' });
    mockPrisma.employee.findUnique.mockResolvedValue({ userId: 'user-2' });
    const owner = await loadRecordOwner('purchase-requests', 'pr-1');
    expect(owner).toBe('user-2');
  });

  it('returns null when the record does not exist', async () => {
    mockPrisma.supplyRequest.findUnique.mockResolvedValue(null);
    const owner = await loadRecordOwner('supply-requests', 'missing');
    expect(owner).toBeNull();
  });

  it('returns null when employeeId is nullish', async () => {
    mockPrisma.supplyRequest.findUnique.mockResolvedValue({ employeeId: null });
    const owner = await loadRecordOwner('supply-requests', 'sr-1');
    expect(owner).toBeNull();
    expect(mockPrisma.employee.findUnique).not.toHaveBeenCalled();
  });

  it('returns null when employee row is missing (orphan)', async () => {
    mockPrisma.supplyRequest.findUnique.mockResolvedValue({ employeeId: 'emp-stale' });
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    const owner = await loadRecordOwner('supply-requests', 'sr-1');
    expect(owner).toBeNull();
  });

  it('returns undefined for unknown resource', async () => {
    const owner = await loadRecordOwner('unknown-resource', 'id-1');
    expect(owner).toBeUndefined();
  });

  it('employee→userId join is only used for the four employee-owned resources', async () => {
    // non-employee resource uses direct ownerField comparison
    mockPrisma.customerFeedback.findUnique.mockResolvedValue({ createdById: 'user-direct' });
    const owner = await loadRecordOwner('customer-feedbacks', 'cf-1');
    expect(owner).toBe('user-direct');
    expect(mockPrisma.employee.findUnique).not.toHaveBeenCalled();
  });
});
