/**
 * Unit tests for positionResponsibilityService — weight sum invariant (tasks 4.1-4.4).
 */

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    position: {
      findUnique: jest.fn(),
    },
    positionResponsibility: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import prisma from '@config/database';
import { PositionResponsibilityService } from '@services/positionResponsibilityService';
import { ValidationError, NotFoundError } from '@utils/errors';

const service = new PositionResponsibilityService();
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

// Helper: build a mock tx that simulates the post-write state
function buildTx(positionId: string, responsibilities: Array<{ weight: number }>) {
  return {
    positionResponsibility: {
      create: jest.fn().mockImplementation(async (args: any) => ({
        id: 'new-id',
        positionId,
        ...args.data,
      })),
      update: jest.fn().mockImplementation(async (args: any) => ({
        id: args.where.id,
        positionId,
        ...args.data,
      })),
      delete: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue(responsibilities),
      count: jest.fn().mockResolvedValue(responsibilities.length),
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: $transaction executes the callback with a mock tx
  (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (_cb: Function) => {
    throw new Error('$transaction not configured in this test — provide a specific mock');
  });
});

// ─── createResponsibility ─────────────────────────────────────────────────────

describe('createResponsibility', () => {
  const POSITION_ID = 'pos1';
  const fakePosition = { id: POSITION_ID, code: 'P01', name: 'Test' };

  it('allows create when post-write sum equals 100', async () => {
    (mockedPrisma.position.findUnique as jest.Mock).mockResolvedValue(fakePosition);

    // After create, the 2 responsibilities sum to 100
    const postWriteState = [{ weight: 60 }, { weight: 40 }];
    const tx = buildTx(POSITION_ID, postWriteState);
    (mockedPrisma.$transaction as jest.Mock).mockImplementation((cb: Function) => cb(tx));

    const result = await service.createResponsibility(POSITION_ID, { title: 'T', description: 'D', weight: 40 });
    expect(result).toBeDefined();
  });

  it('throws ValidationError when post-write sum > 100', async () => {
    (mockedPrisma.position.findUnique as jest.Mock).mockResolvedValue(fakePosition);

    // After create, sum = 110 — exceeds 100
    const postWriteState = [{ weight: 60 }, { weight: 50 }];
    const tx = buildTx(POSITION_ID, postWriteState);
    (mockedPrisma.$transaction as jest.Mock).mockImplementation((cb: Function) => cb(tx));

    await expect(
      service.createResponsibility(POSITION_ID, { title: 'T', description: 'D', weight: 50 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when post-write sum < 100', async () => {
    (mockedPrisma.position.findUnique as jest.Mock).mockResolvedValue(fakePosition);

    // After create, sum = 80
    const postWriteState = [{ weight: 50 }, { weight: 30 }];
    const tx = buildTx(POSITION_ID, postWriteState);
    (mockedPrisma.$transaction as jest.Mock).mockImplementation((cb: Function) => cb(tx));

    await expect(
      service.createResponsibility(POSITION_ID, { title: 'T', description: 'D', weight: 30 })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws NotFoundError when position not found', async () => {
    (mockedPrisma.position.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      service.createResponsibility('bad-id', { title: 'T', description: 'D', weight: 50 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ─── updateResponsibility ─────────────────────────────────────────────────────

describe('updateResponsibility', () => {
  const EXISTING = { id: 'resp1', positionId: 'pos1', weight: 50, title: 'Old', description: 'Desc' };

  it('allows update when post-write sum equals 100', async () => {
    (mockedPrisma.positionResponsibility.findUnique as jest.Mock).mockResolvedValue(EXISTING);

    const postWriteState = [{ weight: 60 }, { weight: 40 }];
    const tx = buildTx('pos1', postWriteState);
    (mockedPrisma.$transaction as jest.Mock).mockImplementation((cb: Function) => cb(tx));

    const result = await service.updateResponsibility('resp1', { weight: 60 });
    expect(result).toBeDefined();
  });

  it('throws ValidationError when update makes sum != 100', async () => {
    (mockedPrisma.positionResponsibility.findUnique as jest.Mock).mockResolvedValue(EXISTING);

    // After update, remaining + updated = 120
    const postWriteState = [{ weight: 70 }, { weight: 50 }];
    const tx = buildTx('pos1', postWriteState);
    (mockedPrisma.$transaction as jest.Mock).mockImplementation((cb: Function) => cb(tx));

    await expect(
      service.updateResponsibility('resp1', { weight: 70 })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

// ─── deleteResponsibility ─────────────────────────────────────────────────────

describe('deleteResponsibility', () => {
  const EXISTING = { id: 'resp1', positionId: 'pos1', weight: 50, title: 'Old', description: 'Desc' };

  it('allows delete when remaining sum equals 100', async () => {
    (mockedPrisma.positionResponsibility.findUnique as jest.Mock).mockResolvedValue(EXISTING);

    // After delete, 2 remain summing to 100
    const txInstance = {
      positionResponsibility: {
        delete: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(2), // remaining count > 0
        findMany: jest.fn().mockResolvedValue([{ weight: 60 }, { weight: 40 }]),
      },
    };
    (mockedPrisma.$transaction as jest.Mock).mockImplementation((cb: Function) => cb(txInstance));

    await expect(service.deleteResponsibility('resp1')).resolves.toBeUndefined();
  });

  it('throws ValidationError when delete leaves sum != 100 and other items remain', async () => {
    (mockedPrisma.positionResponsibility.findUnique as jest.Mock).mockResolvedValue(EXISTING);

    // After delete, remaining sum = 90 (not 100)
    const txInstance = {
      positionResponsibility: {
        delete: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([{ weight: 50 }, { weight: 40 }]),
      },
    };
    (mockedPrisma.$transaction as jest.Mock).mockImplementation((cb: Function) => cb(txInstance));

    await expect(
      service.deleteResponsibility('resp1')
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('does not enforce sum when deleting the last responsibility', async () => {
    (mockedPrisma.positionResponsibility.findUnique as jest.Mock).mockResolvedValue(EXISTING);

    // After delete, count = 0 — no sum check needed
    const txInstance = {
      positionResponsibility: {
        delete: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn(),
      },
    };
    (mockedPrisma.$transaction as jest.Mock).mockImplementation((cb: Function) => cb(txInstance));

    await expect(service.deleteResponsibility('resp1')).resolves.toBeUndefined();
  });
});

// ─── copyResponsibilitiesFrom ─────────────────────────────────────────────────

describe('copyResponsibilitiesFrom', () => {
  const TARGET_ID = 'target-pos';
  const SOURCE_ID = 'source-pos';
  const fakeTarget = { id: TARGET_ID, code: 'T01', name: 'Target Position' };
  const fakeSource = { id: SOURCE_ID, code: 'S01', name: 'Source Position' };
  const sourceItems = [
    { id: 's1', positionId: SOURCE_ID, title: 'Resp A', description: 'Desc A', weight: 60, createdAt: new Date() },
    { id: 's2', positionId: SOURCE_ID, title: 'Resp B', description: 'Desc B', weight: 40, createdAt: new Date() },
  ];

  it('copies responsibilities and returns created items', async () => {
    (mockedPrisma.position.findUnique as jest.Mock)
      .mockResolvedValueOnce(fakeTarget)
      .mockResolvedValueOnce(fakeSource);

    const createdItems = sourceItems.map((item, i) => ({
      id: `new-${i}`,
      positionId: TARGET_ID,
      title: item.title,
      description: item.description,
      weight: item.weight,
    }));

    const txInstance = {
      positionResponsibility: {
        count: jest.fn().mockResolvedValue(0), // target is empty
        findMany: jest.fn()
          .mockResolvedValueOnce(sourceItems) // source items fetch
          .mockResolvedValueOnce(createdItems), // post-copy validation fetch
        create: jest.fn()
          .mockResolvedValueOnce(createdItems[0])
          .mockResolvedValueOnce(createdItems[1]),
      },
    };
    (mockedPrisma.$transaction as jest.Mock).mockImplementation((cb: Function) => cb(txInstance));

    const result = await service.copyResponsibilitiesFrom(TARGET_ID, SOURCE_ID);
    expect(result).toHaveLength(2);
    expect(txInstance.positionResponsibility.create).toHaveBeenCalledTimes(2);
  });

  it('throws ConflictError when target already has responsibilities', async () => {
    (mockedPrisma.position.findUnique as jest.Mock)
      .mockResolvedValueOnce(fakeTarget)
      .mockResolvedValueOnce(fakeSource);

    const txInstance = {
      positionResponsibility: {
        count: jest.fn().mockResolvedValue(3), // target has 3 existing items
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };
    (mockedPrisma.$transaction as jest.Mock).mockImplementation((cb: Function) => cb(txInstance));

    const { ConflictError } = await import('@utils/errors');
    await expect(
      service.copyResponsibilitiesFrom(TARGET_ID, SOURCE_ID)
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws NotFoundError when target position not found', async () => {
    (mockedPrisma.position.findUnique as jest.Mock)
      .mockResolvedValueOnce(null)   // target not found
      .mockResolvedValueOnce(fakeSource);

    await expect(
      service.copyResponsibilitiesFrom('bad-target', SOURCE_ID)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when source position not found', async () => {
    (mockedPrisma.position.findUnique as jest.Mock)
      .mockResolvedValueOnce(fakeTarget)
      .mockResolvedValueOnce(null);  // source not found

    await expect(
      service.copyResponsibilitiesFrom(TARGET_ID, 'bad-source')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns empty array when source has no responsibilities', async () => {
    (mockedPrisma.position.findUnique as jest.Mock)
      .mockResolvedValueOnce(fakeTarget)
      .mockResolvedValueOnce(fakeSource);

    const txInstance = {
      positionResponsibility: {
        count: jest.fn().mockResolvedValue(0), // target empty
        findMany: jest.fn().mockResolvedValue([]), // source has no items
        create: jest.fn(),
      },
    };
    (mockedPrisma.$transaction as jest.Mock).mockImplementation((cb: Function) => cb(txInstance));

    const result = await service.copyResponsibilitiesFrom(TARGET_ID, SOURCE_ID);
    expect(result).toEqual([]);
    expect(txInstance.positionResponsibility.create).not.toHaveBeenCalled();
  });
});
