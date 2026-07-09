/**
 * Tests for evaluationCron.ts
 * Uses fake timers + mocked Prisma / service layer.
 * Tests the internal job functions indirectly by capturing the cron.schedule callbacks
 * registered during initEvaluationCron(), then invoking them directly.
 */

// ─── Mock all external dependencies BEFORE imports ───────────────────────────

const mockQueryRawUnsafe = jest.fn();
const mockEvaluationFindMany = jest.fn();
const mockUserFindUnique = jest.fn();

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    $queryRawUnsafe: mockQueryRawUnsafe,
    evaluation: { findMany: mockEvaluationFindMany },
    user: { findUnique: mockUserFindUnique },
  },
}));

const mockNotify = jest.fn();
jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: mockNotify },
}));

const mockExpirePendingInvites = jest.fn();
jest.mock('@services/evaluationPeerFeedbackService', () => ({
  __esModule: true,
  default: {
    expirePendingInvites: mockExpirePendingInvites,
    invitePeers: jest.fn(),
    submitPeerFeedback: jest.fn(),
    declineInvite: jest.fn(),
    getPeerAggregate: jest.fn(),
  },
}));

const mockSyncEvaluationDetails = jest.fn();
jest.mock('@services/employeeEvaluationService', () => ({
  __esModule: true,
  default: {
    syncEvaluationDetails: mockSyncEvaluationDetails,
    uploadEvidence: jest.fn(),
    deleteEvidence: jest.fn(),
    listEvidence: jest.fn(),
    toggleNotApplicable: jest.fn(),
    updateEvaluationComment: jest.fn(),
    submitAppeal: jest.fn(),
    replyAppeal: jest.fn(),
    getCalibrationHeatmap: jest.fn(),
    getPayrollImpactPreview: jest.fn(),
    copyFromPreviousMonth: jest.fn(),
    listGoals: jest.fn(),
    createGoal: jest.fn(),
    updateGoal: jest.fn(),
    deleteGoal: jest.fn(),
    listIdpItems: jest.fn(),
    createIdpItem: jest.fn(),
    updateIdpItem: jest.fn(),
    deleteIdpItem: jest.fn(),
    getEmployeeEvaluations: jest.fn(),
    getEvaluationDetails: jest.fn(),
    createOrUpdateEvaluation: jest.fn(),
    updateEvaluationDetail: jest.fn(),
    getEvaluationHistory: jest.fn(),
    createBulkEvaluations: jest.fn(),
    finalizeEvaluation: jest.fn(),
    getPendingEvaluationCount: jest.fn(),
    acknowledgeEvaluation: jest.fn(),
    getEvaluationCompletionStats: jest.fn(),
    getSubordinatesForEvaluation: jest.fn(),
  },
}));

const capturedCallbacks: Array<() => void | Promise<void>> = [];

jest.mock('node-cron', () => ({
  __esModule: true,
  default: {
    schedule: jest.fn((_expr: string, cb: () => void) => {
      capturedCallbacks.push(cb);
    }),
  },
}));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ─── Now import (after mocks are wired) ──────────────────────────────────────

import { initEvaluationCron } from '@cron/evaluationCron';

// ─── Register callbacks once ──────────────────────────────────────────────────

beforeAll(() => {
  initEvaluationCron();
  // Registered order: [0]=D-7, [1]=D-3, [2]=dailySync, [3]=peerExpiry
});

// ─── Helper: run a named callback ─────────────────────────────────────────────

async function runCallback(index: number): Promise<void> {
  const cb = capturedCallbacks[index];
  if (!cb) throw new Error(`No callback at index ${index}`);
  await (cb as () => Promise<void>)();
}

// ─── Helper: set current date so daysUntilEnd === target ──────────────────────

function pinDateToDaysBeforeMonthEnd(daysLeft: number): Date {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-based
  const lastDay = new Date(year, month, 0); // day=0 of next month = last day
  const pinned = new Date(lastDay);
  pinned.setDate(lastDay.getDate() - daysLeft);
  pinned.setHours(9, 0, 0, 0);
  return pinned;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Default: lock acquired successfully, release succeeds
  mockQueryRawUnsafe
    .mockResolvedValueOnce([{ pg_try_advisory_lock: true }]) // try lock
    .mockResolvedValue(undefined); // unlock
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Advisory lock — duplicate prevention ────────────────────────────────────

describe('Advisory lock', () => {
  it('skips D-7 job when advisory lock is not acquired', async () => {
    jest.useFakeTimers().setSystemTime(pinDateToDaysBeforeMonthEnd(7));
    mockQueryRawUnsafe.mockReset();
    mockQueryRawUnsafe.mockResolvedValue([{ pg_try_advisory_lock: false }]);

    await runCallback(0);

    expect(mockEvaluationFindMany).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('skips D-3 job when advisory lock is not acquired', async () => {
    jest.useFakeTimers().setSystemTime(pinDateToDaysBeforeMonthEnd(3));
    mockQueryRawUnsafe.mockReset();
    mockQueryRawUnsafe.mockResolvedValue([{ pg_try_advisory_lock: false }]);

    await runCallback(1);

    expect(mockEvaluationFindMany).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('skips daily sync when lock is not acquired', async () => {
    mockQueryRawUnsafe.mockReset();
    mockQueryRawUnsafe.mockResolvedValue([{ pg_try_advisory_lock: false }]);

    await runCallback(2);

    expect(mockEvaluationFindMany).not.toHaveBeenCalled();
    expect(mockSyncEvaluationDetails).not.toHaveBeenCalled();
  });

  it('skips peer expiry when lock is not acquired', async () => {
    mockQueryRawUnsafe.mockReset();
    mockQueryRawUnsafe.mockResolvedValue([{ pg_try_advisory_lock: false }]);

    await runCallback(3);

    expect(mockExpirePendingInvites).not.toHaveBeenCalled();
  });

  it('calls pg_try_advisory_lock and pg_advisory_unlock when lock is acquired', async () => {
    jest.useFakeTimers().setSystemTime(pinDateToDaysBeforeMonthEnd(7));
    mockQueryRawUnsafe.mockReset();
    mockQueryRawUnsafe
      .mockResolvedValueOnce([{ pg_try_advisory_lock: true }])
      .mockResolvedValue(undefined);
    mockEvaluationFindMany.mockResolvedValue([]);

    await runCallback(0);

    const allSql = mockQueryRawUnsafe.mock.calls.map((c: any[]) => String(c[0]));
    expect(allSql.some((q) => q.includes('pg_try_advisory_lock'))).toBe(true);
    expect(allSql.some((q) => q.includes('pg_advisory_unlock'))).toBe(true);
  });
});

// ─── D-7 reminder ────────────────────────────────────────────────────────────

describe('evaluationReminderD7', () => {
  beforeEach(() => {
    mockQueryRawUnsafe.mockReset();
    mockQueryRawUnsafe
      .mockResolvedValueOnce([{ pg_try_advisory_lock: true }])
      .mockResolvedValue(undefined);
  });

  it('skips notification when not 7 days before month end', async () => {
    jest.useFakeTimers().setSystemTime(pinDateToDaysBeforeMonthEnd(10));

    await runCallback(0);

    expect(mockEvaluationFindMany).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('notifies each SELF_PENDING employee when exactly 7 days before month end', async () => {
    jest.useFakeTimers().setSystemTime(pinDateToDaysBeforeMonthEnd(7));
    mockEvaluationFindMany.mockResolvedValue([
      { id: 'ev-1', employeeId: 'emp-1', period: '2026-07' },
      { id: 'ev-2', employeeId: 'emp-2', period: '2026-07' },
    ]);
    mockNotify.mockResolvedValue(undefined);

    await runCallback(0);

    expect(mockEvaluationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'SELF_PENDING' }),
      })
    );
    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(mockNotify).toHaveBeenCalledWith(
      'EVALUATION_REMINDER_SELF_PENDING',
      expect.objectContaining({ targetEmployeeIds: ['emp-1'] })
    );
    expect(mockNotify).toHaveBeenCalledWith(
      'EVALUATION_REMINDER_SELF_PENDING',
      expect.objectContaining({ targetEmployeeIds: ['emp-2'] })
    );
  });

  it('continues notifying other employees when one notification fails', async () => {
    jest.useFakeTimers().setSystemTime(pinDateToDaysBeforeMonthEnd(7));
    mockEvaluationFindMany.mockResolvedValue([
      { id: 'ev-1', employeeId: 'emp-1', period: '2026-07' },
      { id: 'ev-2', employeeId: 'emp-2', period: '2026-07' },
    ]);
    mockNotify
      .mockRejectedValueOnce(new Error('notification failed'))
      .mockResolvedValue(undefined);

    await runCallback(0);

    expect(mockNotify).toHaveBeenCalledTimes(2);
  });

  it('does nothing when no SELF_PENDING evaluations exist', async () => {
    jest.useFakeTimers().setSystemTime(pinDateToDaysBeforeMonthEnd(7));
    mockEvaluationFindMany.mockResolvedValue([]);

    await runCallback(0);

    expect(mockNotify).not.toHaveBeenCalled();
  });
});

// ─── D-3 reminder ────────────────────────────────────────────────────────────

describe('evaluationReminderD3', () => {
  beforeEach(() => {
    mockQueryRawUnsafe.mockReset();
    mockQueryRawUnsafe
      .mockResolvedValueOnce([{ pg_try_advisory_lock: true }])
      .mockResolvedValue(undefined);
  });

  it('skips when not 3 days before month end', async () => {
    jest.useFakeTimers().setSystemTime(pinDateToDaysBeforeMonthEnd(5));

    await runCallback(1);

    expect(mockEvaluationFindMany).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('queries SUPERVISOR1_PENDING and SUPERVISOR2_PENDING at D-3', async () => {
    jest.useFakeTimers().setSystemTime(pinDateToDaysBeforeMonthEnd(3));
    mockEvaluationFindMany.mockResolvedValue([]);

    await runCallback(1);

    expect(mockEvaluationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: expect.objectContaining({
            in: expect.arrayContaining(['SUPERVISOR1_PENDING', 'SUPERVISOR2_PENDING']),
          }),
        }),
      })
    );
  });
});

// ─── Daily sync ───────────────────────────────────────────────────────────────

describe('evaluationDailySync', () => {
  beforeEach(() => {
    mockQueryRawUnsafe.mockReset();
    mockQueryRawUnsafe
      .mockResolvedValueOnce([{ pg_try_advisory_lock: true }])
      .mockResolvedValue(undefined);
  });

  it('calls syncEvaluationDetails for each evaluation in current period', async () => {
    mockEvaluationFindMany.mockResolvedValue([
      { id: 'ev-1' },
      { id: 'ev-2' },
      { id: 'ev-3' },
    ]);
    mockSyncEvaluationDetails.mockResolvedValue(undefined);

    await runCallback(2);

    expect(mockSyncEvaluationDetails).toHaveBeenCalledTimes(3);
    expect(mockSyncEvaluationDetails).toHaveBeenCalledWith('ev-1');
    expect(mockSyncEvaluationDetails).toHaveBeenCalledWith('ev-2');
    expect(mockSyncEvaluationDetails).toHaveBeenCalledWith('ev-3');
  });

  it('continues syncing remaining evaluations when one fails', async () => {
    mockEvaluationFindMany.mockResolvedValue([{ id: 'ev-1' }, { id: 'ev-2' }]);
    mockSyncEvaluationDetails
      .mockRejectedValueOnce(new Error('sync failed'))
      .mockResolvedValue(undefined);

    await runCallback(2);

    expect(mockSyncEvaluationDetails).toHaveBeenCalledTimes(2);
  });

  it('queries evaluations by current month period string', async () => {
    mockEvaluationFindMany.mockResolvedValue([]);

    const now = new Date();
    const expectedPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await runCallback(2);

    expect(mockEvaluationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ period: expectedPeriod }),
      })
    );
  });
});

// ─── Peer invite expiry ───────────────────────────────────────────────────────

describe('evaluationPeerInviteExpiry', () => {
  beforeEach(() => {
    mockQueryRawUnsafe.mockReset();
    mockQueryRawUnsafe
      .mockResolvedValueOnce([{ pg_try_advisory_lock: true }])
      .mockResolvedValue(undefined);
  });

  it('calls expirePendingInvites when lock is acquired', async () => {
    mockExpirePendingInvites.mockResolvedValue(undefined);

    await runCallback(3);

    expect(mockExpirePendingInvites).toHaveBeenCalledTimes(1);
  });

  it('does not propagate errors from expirePendingInvites', async () => {
    mockExpirePendingInvites.mockRejectedValue(new Error('DB error'));

    await expect(runCallback(3)).resolves.not.toThrow();
  });
});
