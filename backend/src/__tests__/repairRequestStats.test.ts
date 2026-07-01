/**
 * Jest tests for repairRequestService.getStats()
 *
 * Covers: default 90-day window, explicit date range, machineSystemId filter,
 * avgCompletionHours null when no completed rows, recurring threshold >2,
 * monthly trend 12 buckets.
 */

const mockPrisma: any = {
  repairRequest: {
    groupBy: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  repairRequestStatusLog: {
    findMany: jest.fn(),
  },
  repairRequestItem: {
    groupBy: jest.fn(),
  },
  machineSystem: {
    findMany: jest.fn(),
  },
  machineSystemDetail: {
    findMany: jest.fn(),
  },
};

jest.mock('@config/database', () => ({ __esModule: true, default: mockPrisma }));
jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: jest.fn().mockResolvedValue(undefined) },
}));

import repairRequestService from '@services/repairRequestService';

// ── Default stub setup ──────────────────────────────────────────────────────

function setupDefaultMocks(overrides: Partial<typeof mockPrisma> = {}) {
  // byStatus groupBy
  mockPrisma.repairRequest.groupBy.mockResolvedValue([
    { trangThai: 'CHO_XU_LY', _count: { _all: 5 } },
    { trangThai: 'DANG_SUA_CHUA', _count: { _all: 2 } },
    { trangThai: 'HOAN_THANH', _count: { _all: 3 } },
    { trangThai: 'DA_HUY', _count: { _all: 1 } },
  ]);
  // total count for current window and prev window
  mockPrisma.repairRequest.count.mockResolvedValue(11);
  // avgCompletionHours — 2 completed logs
  mockPrisma.repairRequestStatusLog.findMany.mockResolvedValue([
    {
      repairRequestId: 1,
      createdAt: new Date('2026-04-10T12:00:00Z'),
      repairRequest: { createdAt: new Date('2026-04-09T12:00:00Z') },
    },
    {
      repairRequestId: 2,
      createdAt: new Date('2026-04-12T12:00:00Z'),
      repairRequest: { createdAt: new Date('2026-04-10T12:00:00Z') },
    },
  ]);
  // topMachines
  mockPrisma.repairRequestItem.groupBy.mockResolvedValue([
    { machineSystemId: 'ms-1', _count: { _all: 4 } },
    { machineSystemId: 'ms-2', _count: { _all: 2 } },
  ]);
  mockPrisma.machineSystem.findMany.mockResolvedValue([
    { id: 'ms-1', tenHeThong: 'Hệ thống bơm' },
    { id: 'ms-2', tenHeThong: 'Hệ thống điện' },
  ]);
  // recurringItems groupBy — none qualifying by default
  // (overridden in the recurring test)
  mockPrisma.machineSystemDetail.findMany.mockResolvedValue([]);
  // recentlyCreated
  mockPrisma.repairRequest.findMany.mockResolvedValue([
    {
      id: 1,
      maYeuCau: 'YC-SC-2026-001',
      tenHeThong: 'Hệ thống bơm',
      trangThai: 'CHO_XU_LY',
      createdAt: new Date('2026-06-01T08:00:00Z'),
      _count: { items: 2 },
    },
  ]);
  mockPrisma.repairRequest.findFirst.mockResolvedValue(null);

  // Apply overrides
  Object.assign(mockPrisma.repairRequest, overrides.repairRequest ?? {});
}

// ── Scenario 1: Default 90-day window with no filters ─────────────────────────

describe('getStats: default 90-day window', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  it('returns the expected shape with total, byStatus, avgCompletionHours, delta, monthlyTrend, recentlyCreated', async () => {
    const result = await repairRequestService.getStats();

    expect(result).toMatchObject({
      total: expect.any(Number),
      byStatus: expect.objectContaining({
        CHO_XU_LY: expect.any(Number),
        DANG_SUA_CHUA: expect.any(Number),
        HOAN_THANH: expect.any(Number),
        DA_HUY: expect.any(Number),
      }),
      delta: expect.objectContaining({
        total: expect.any(Number),
        byStatus: expect.any(Object),
      }),
      topMachines: expect.any(Array),
      recurringItems: expect.any(Array),
      monthlyTrend: expect.any(Array),
      recentlyCreated: expect.any(Array),
    });
  });

  it('returns 12 monthly buckets', async () => {
    const result = await repairRequestService.getStats();
    expect(result.monthlyTrend).toHaveLength(12);
  });

  it('monthly trend buckets are oldest-first (ascending month strings)', async () => {
    const result = await repairRequestService.getStats();
    const months = result.monthlyTrend.map((b) => b.month);
    const sorted = [...months].sort();
    expect(months).toEqual(sorted);
  });

  it('each monthly bucket has total and hoanThanh fields', async () => {
    const result = await repairRequestService.getStats();
    for (const bucket of result.monthlyTrend) {
      expect(bucket).toHaveProperty('month');
      expect(bucket).toHaveProperty('total');
      expect(bucket).toHaveProperty('hoanThanh');
    }
  });
});

// ── Scenario 2: Explicit date range ──────────────────────────────────────────

describe('getStats: explicit date range', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  it('passes the provided dateFrom and dateTo through to Prisma queries', async () => {
    const dateFrom = new Date('2026-01-01T00:00:00Z');
    const dateTo = new Date('2026-03-31T23:59:59Z');

    await repairRequestService.getStats({ dateFrom, dateTo });

    // count calls should include the explicit date range
    const countCalls = mockPrisma.repairRequest.count.mock.calls;
    const hasExplicitRange = countCalls.some((call: any[]) => {
      const where = call[0]?.where?.createdAt;
      return where?.gte?.getTime() === dateFrom.getTime() && where?.lte?.getTime() === dateTo.getTime();
    });
    expect(hasExplicitRange).toBe(true);
  });
});

// ── Scenario 3: machineSystemId filter ───────────────────────────────────────

describe('getStats: machineSystemId filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
    // topMachines returns only the filtered machine
    mockPrisma.repairRequestItem.groupBy.mockResolvedValue([
      { machineSystemId: 'M1', _count: { _all: 7 } },
    ]);
    mockPrisma.machineSystem.findMany.mockResolvedValue([
      { id: 'M1', tenHeThong: 'Máy bơm chính' },
    ]);
  });

  it('includes machineSystemId filter in the items join when provided', async () => {
    await repairRequestService.getStats({ machineSystemId: 'M1' });

    const countCalls = mockPrisma.repairRequest.count.mock.calls;
    const hasFilter = countCalls.some((call: any[]) => {
      const where = call[0]?.where;
      return where?.items?.some?.machineSystemId === 'M1';
    });
    expect(hasFilter).toBe(true);
  });

  it('topMachines contains the single filtered machine', async () => {
    const result = await repairRequestService.getStats({ machineSystemId: 'M1' });
    expect(result.topMachines).toHaveLength(1);
    expect(result.topMachines[0].machineSystemId).toBe('M1');
  });
});

// ── Scenario 4: avgCompletionHours is null when no completed rows ─────────────

describe('getStats: avgCompletionHours null with no HOAN_THANH rows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
    // Override: no completed status logs
    mockPrisma.repairRequestStatusLog.findMany.mockResolvedValue([]);
  });

  it('returns avgCompletionHours as null', async () => {
    const result = await repairRequestService.getStats();
    expect(result.avgCompletionHours).toBeNull();
  });

  it('returns delta.avgCompletionHours as null when both sides have no data', async () => {
    const result = await repairRequestService.getStats();
    expect(result.delta.avgCompletionHours).toBeNull();
  });
});

// ── Scenario 5: Recurring items require > 2 distinct RepairRequests ───────────

describe('getStats: recurring items threshold > 2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  it('includes machineSystemDetailId with count 3 in recurringItems', async () => {
    // groupBy returns a detail with count 3 (having: count > 2)
    mockPrisma.repairRequestItem.groupBy
      .mockResolvedValueOnce([
        { machineSystemId: 'ms-1', _count: { _all: 4 } },
      ]) // topMachines call
      .mockResolvedValueOnce([
        { machineSystemDetailId: 'msd-1', _count: { repairRequestId: 3 } },
      ]); // recurringItems call

    mockPrisma.machineSystemDetail.findMany.mockResolvedValue([
      { id: 'msd-1', tenChiTiet: 'Chi tiết bơm A' },
    ]);
    mockPrisma.repairRequest.findFirst.mockResolvedValue({ maYeuCau: 'YC-SC-2026-005' });

    const result = await repairRequestService.getStats();
    expect(result.recurringItems).toHaveLength(1);
    expect(result.recurringItems[0].machineSystemDetailId).toBe('msd-1');
    expect(result.recurringItems[0].count).toBe(3);
  });

  it('does NOT include machineSystemDetailId with count exactly 2 (Prisma `having` filters it)', async () => {
    // The Prisma groupBy having clause filters out count <= 2 at the DB level.
    // Mock returns empty array (DB applied the filter).
    mockPrisma.repairRequestItem.groupBy
      .mockResolvedValueOnce([{ machineSystemId: 'ms-1', _count: { _all: 2 } }]) // topMachines
      .mockResolvedValueOnce([]); // recurringItems: empty because having count > 2 excluded count=2

    const result = await repairRequestService.getStats();
    expect(result.recurringItems).toHaveLength(0);
  });
});

// ── Scenario 6: Monthly trend returns 12 buckets ending at dateTo ─────────────

describe('getStats: monthly trend 12 buckets ending at dateTo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  it('first bucket is 11 months before dateTo month', async () => {
    const dateTo = new Date('2026-06-15T12:00:00Z');
    const result = await repairRequestService.getStats({ dateTo });

    expect(result.monthlyTrend[0].month).toBe('2025-07');
    expect(result.monthlyTrend[11].month).toBe('2026-06');
  });

  it('returns exactly 12 buckets regardless of window size', async () => {
    const result = await repairRequestService.getStats({
      dateFrom: new Date('2026-01-01'),
      dateTo: new Date('2026-03-31'),
    });
    expect(result.monthlyTrend).toHaveLength(12);
  });
});
