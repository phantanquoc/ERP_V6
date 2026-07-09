/**
 * Unit tests for evaluationAuditService.
 *
 * Covers:
 *   - logChange writes inside the supplied transaction client
 *   - Rollback scenario: if tx throws, audit row is not persisted (transactional)
 *   - getAuditLog RBAC: ADMIN all, DEPT_HEAD scope enforcement, TEAM_LEAD denied
 */

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    evaluation: {
      findUnique: jest.fn(),
    },
    evaluationAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import prisma from '@config/database';
import {
  logChange,
  logStatusTransition,
  logScoreUpdate,
  getAuditLog,
  EvaluationAuditAction,
} from '@services/evaluationAuditService';
import { AuthorizationError } from '@utils/errors';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => jest.clearAllMocks());

// ─── logChange ────────────────────────────────────────────────────────────────

describe('logChange', () => {
  it('creates an audit row using the provided transaction client', async () => {
    const tx = { evaluationAuditLog: { create: jest.fn().mockResolvedValue({}) } };

    await logChange(tx, {
      evaluationId: 'ev1',
      evaluationDetailId: 'det1',
      changedByUserId: 'user1',
      action: EvaluationAuditAction.SCORE_UPDATE,
      field: 'selfScore',
      oldValue: null,
      newValue: '80',
    });

    expect(tx.evaluationAuditLog.create).toHaveBeenCalledTimes(1);
    const callArg = tx.evaluationAuditLog.create.mock.calls[0][0];
    expect(callArg.data).toMatchObject({
      evaluationId: 'ev1',
      evaluationDetailId: 'det1',
      changedByUserId: 'user1',
      action: 'SCORE_UPDATE',
      field: 'selfScore',
      oldValue: null,
      newValue: '80',
    });
  });

  it('uses the tx client, not prisma — so rollback rolls back audit row too', async () => {
    // Simulate a tx that throws after calling logChange
    const txAudit = { evaluationAuditLog: { create: jest.fn().mockResolvedValue({}) } };

    let threw = false;
    try {
      await (async () => {
        await logChange(txAudit, {
          evaluationId: 'ev1',
          changedByUserId: 'user1',
          action: EvaluationAuditAction.STATUS_TRANSITION,
          field: 'status',
          oldValue: 'SELF_PENDING',
          newValue: 'SUPERVISOR1_PENDING',
        });
        throw new Error('Simulated mid-transaction failure');
      })();
    } catch {
      threw = true;
    }

    expect(threw).toBe(true);
    // The create was called on the tx mock — in a real tx, this would be rolled back
    // We assert the create was invoked ON the tx (not global prisma)
    expect(txAudit.evaluationAuditLog.create).toHaveBeenCalledTimes(1);
    expect((mockedPrisma as any).evaluationAuditLog?.create ?? jest.fn()).not.toHaveBeenCalled();
  });

  it('truncates long values to 4000 chars', async () => {
    const longStr = 'x'.repeat(5000);
    const tx = { evaluationAuditLog: { create: jest.fn().mockResolvedValue({}) } };

    await logChange(tx, {
      evaluationId: 'ev1',
      changedByUserId: 'user1',
      action: EvaluationAuditAction.COMMENT_UPDATE,
      field: 'commentEmployee',
      oldValue: longStr,
      newValue: longStr,
    });

    const data = tx.evaluationAuditLog.create.mock.calls[0][0].data;
    expect(data.oldValue.length).toBe(4000);
    expect(data.newValue.length).toBe(4000);
  });
});

// ─── logStatusTransition ──────────────────────────────────────────────────────

describe('logStatusTransition', () => {
  it('calls logChange with correct STATUS_TRANSITION action', async () => {
    const tx = { evaluationAuditLog: { create: jest.fn().mockResolvedValue({}) } };
    await logStatusTransition(tx, 'ev1', 'SELF_PENDING', 'SUPERVISOR1_PENDING', 'user1');

    const data = tx.evaluationAuditLog.create.mock.calls[0][0].data;
    expect(data.action).toBe('STATUS_TRANSITION');
    expect(data.field).toBe('status');
    expect(data.oldValue).toBe('SELF_PENDING');
    expect(data.newValue).toBe('SUPERVISOR1_PENDING');
  });
});

// ─── logScoreUpdate ───────────────────────────────────────────────────────────

describe('logScoreUpdate', () => {
  it('serializes numeric scores as strings', async () => {
    const tx = { evaluationAuditLog: { create: jest.fn().mockResolvedValue({}) } };
    await logScoreUpdate(tx, { id: 'det1', evaluationId: 'ev1' }, 'supervisorScore1', null, 85, 'user2');

    const data = tx.evaluationAuditLog.create.mock.calls[0][0].data;
    expect(data.action).toBe('SCORE_UPDATE');
    expect(data.oldValue).toBeNull();
    expect(data.newValue).toBe('85');
    expect(data.evaluationDetailId).toBe('det1');
  });
});

// ─── getAuditLog RBAC ─────────────────────────────────────────────────────────

describe('getAuditLog', () => {
  const fakeLogs = [{ id: 'log1', evaluationId: 'ev1', action: 'SCORE_UPDATE' }];

  it('ADMIN can read any evaluation audit log', async () => {
    (mockedPrisma as any).evaluationAuditLog = {
      findMany: jest.fn().mockResolvedValue(fakeLogs),
    };

    const result = await getAuditLog(mockedPrisma, 'ev1', 'admin-user', 'ADMIN', null);
    expect(result).toEqual(fakeLogs);
  });

  it('TEAM_LEAD is denied with AuthorizationError', async () => {
    await expect(
      getAuditLog(mockedPrisma, 'ev1', 'team-lead-user', 'TEAM_LEAD', null)
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('EMPLOYEE is denied with AuthorizationError', async () => {
    await expect(
      getAuditLog(mockedPrisma, 'ev1', 'emp-user', 'EMPLOYEE', null)
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('DEPARTMENT_HEAD sees logs for own department', async () => {
    const fakePrisma = {
      evaluation: {
        findUnique: jest.fn().mockResolvedValue({
          employee: {
            subDepartment: {
              departmentId: 'dept1',
              department: { id: 'dept1' },
            },
          },
        }),
      },
      evaluationAuditLog: {
        findMany: jest.fn().mockResolvedValue(fakeLogs),
      },
    };

    const result = await getAuditLog(fakePrisma, 'ev1', 'dh-user', 'DEPARTMENT_HEAD', 'dept1');
    expect(result).toEqual(fakeLogs);
  });

  it('DEPARTMENT_HEAD denied when employee is in different department', async () => {
    const fakePrisma = {
      evaluation: {
        findUnique: jest.fn().mockResolvedValue({
          employee: {
            subDepartment: {
              departmentId: 'dept2',
              department: { id: 'dept2' },
            },
          },
        }),
      },
      evaluationAuditLog: {
        findMany: jest.fn(),
      },
    };

    await expect(
      getAuditLog(fakePrisma, 'ev1', 'dh-user', 'DEPARTMENT_HEAD', 'dept1')
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
