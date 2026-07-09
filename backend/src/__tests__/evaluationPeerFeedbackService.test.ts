/**
 * evaluationPeerFeedbackService.test.ts
 *
 * Unit tests for EvaluationPeerFeedbackService.
 * All Prisma and crypto calls are mocked.
 */

import { EvaluationPeerFeedbackService } from '@services/evaluationPeerFeedbackService';
import { NotFoundError, ValidationError, AuthorizationError } from '@utils/errors';

// ─── Mock prisma ─────────────────────────────────────────────────────────────

jest.mock('@config/database', () => {
  const mPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    evaluation: {
      findUnique: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
    },
    peerFeedbackInvite: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    evaluationPeerFeedback: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return { __esModule: true, default: mPrisma };
});

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('@services/evaluationAuditService', () => ({
  logChange: jest.fn().mockResolvedValue(undefined),
  logStatusTransition: jest.fn().mockResolvedValue(undefined),
  logScoreUpdate: jest.fn().mockResolvedValue(undefined),
  EvaluationAuditAction: {
    PEER_INVITE: 'PEER_INVITE',
    PEER_SUBMIT: 'PEER_SUBMIT',
  },
}));

import { logChange } from '@services/evaluationAuditService';
const mockLogChange = logChange as jest.Mock;

import prisma from '@config/database';
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeService() {
  return new EvaluationPeerFeedbackService();
}

// ─── invitePeers ─────────────────────────────────────────────────────────────

describe('invitePeers', () => {
  const service = makeService();

  beforeEach(() => jest.clearAllMocks());

  test('throws AuthorizationError for EMPLOYEE role', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE', subDepartmentId: 'sub-1' });
    await expect(
      service.invitePeers('eval-1', ['u1', 'u2'], 'caller-1')
    ).rejects.toThrow(AuthorizationError);
  });

  test('throws ValidationError when fewer than 2 invitees', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'TEAM_LEAD', subDepartmentId: 'sub-1' });
    await expect(
      service.invitePeers('eval-1', ['u1'], 'caller-1')
    ).rejects.toThrow(ValidationError);
  });

  test('throws ValidationError when more than 3 invitees', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'TEAM_LEAD', subDepartmentId: 'sub-1' });
    await expect(
      service.invitePeers('eval-1', ['u1', 'u2', 'u3', 'u4'], 'caller-1')
    ).rejects.toThrow(ValidationError);
  });

  test('throws NotFoundError when evaluation not found', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'TEAM_LEAD', subDepartmentId: 'sub-1' });
    (mockPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      service.invitePeers('eval-x', ['u1', 'u2'], 'caller-1')
    ).rejects.toThrow(NotFoundError);
  });

  test('throws ValidationError when invitee from different subDept', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'TEAM_LEAD', subDepartmentId: 'sub-1' });
    (mockPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue({
      id: 'eval-1',
      employeeId: 'emp-1',
      employee: { user: { id: 'user-sub', subDepartmentId: 'sub-1' } },
    });
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'u1', subDepartmentId: 'sub-1' },
      { id: 'u2', subDepartmentId: 'sub-DIFFERENT' },
    ]);
    (mockPrisma.peerFeedbackInvite.findMany as jest.Mock).mockResolvedValue([]);
    await expect(
      service.invitePeers('eval-1', ['u1', 'u2'], 'caller-1')
    ).rejects.toThrow(ValidationError);
  });

  test('throws ConflictError when duplicate invite exists', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'TEAM_LEAD', subDepartmentId: 'sub-1' });
    (mockPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue({
      id: 'eval-1',
      employeeId: 'emp-1',
      employee: { user: { id: 'user-sub', subDepartmentId: 'sub-1' } },
    });
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'u1', subDepartmentId: 'sub-1' },
      { id: 'u2', subDepartmentId: 'sub-1' },
    ]);
    (mockPrisma.peerFeedbackInvite.findMany as jest.Mock).mockResolvedValue([{ id: 'existing-1' }]);
    await expect(
      service.invitePeers('eval-1', ['u1', 'u2'], 'caller-1')
    ).rejects.toThrow(ValidationError);
  });

  test('creates invites with tokens and audit log when valid', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'TEAM_LEAD', subDepartmentId: 'sub-1' });
    (mockPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue({
      id: 'eval-1',
      employeeId: 'emp-1',
      employee: { user: { id: 'user-sub', subDepartmentId: 'sub-1' } },
    });
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'u1', subDepartmentId: 'sub-1' },
      { id: 'u2', subDepartmentId: 'sub-1' },
    ]);
    (mockPrisma.peerFeedbackInvite.findMany as jest.Mock).mockResolvedValue([]);

    const txInviteCreate = jest.fn()
      .mockResolvedValueOnce({ id: 'inv-1', token: 'token-a', status: 'PENDING' })
      .mockResolvedValueOnce({ id: 'inv-2', token: 'token-b', status: 'PENDING' });
    const txAuditCreate = jest.fn().mockResolvedValue({});
    (mockPrisma.$transaction as jest.Mock).mockImplementation((fn: any) =>
      fn({
        peerFeedbackInvite: { create: txInviteCreate },
        evaluationAuditLog: { create: txAuditCreate },
      })
    );

    const result = await service.invitePeers('eval-1', ['u1', 'u2'], 'caller-1');
    expect(result).toHaveLength(2);
    expect(txInviteCreate).toHaveBeenCalledTimes(2);
  });
});

// ─── submitPeerFeedback ──────────────────────────────────────────────────────

describe('submitPeerFeedback', () => {
  const service = makeService();

  beforeEach(() => jest.clearAllMocks());

  test('throws NotFoundError for unknown token', async () => {
    (mockPrisma.peerFeedbackInvite.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      service.submitPeerFeedback('bad-token', { strength: 's', weakness: 'w', suggestion: 'sg' }, 'user-1')
    ).rejects.toThrow(NotFoundError);
  });

  test('throws ValidationError for already SUBMITTED invite', async () => {
    (mockPrisma.peerFeedbackInvite.findUnique as jest.Mock).mockResolvedValue({
      token: 'tok', status: 'SUBMITTED', createdAt: new Date(), evaluationId: 'eval-1',
    });
    await expect(
      service.submitPeerFeedback('tok', { strength: 's', weakness: 'w', suggestion: 'sg' }, 'user-1')
    ).rejects.toThrow(ValidationError);
  });

  test('throws ValidationError for EXPIRED invite', async () => {
    (mockPrisma.peerFeedbackInvite.findUnique as jest.Mock).mockResolvedValue({
      token: 'tok', status: 'EXPIRED', createdAt: new Date(), evaluationId: 'eval-1',
    });
    await expect(
      service.submitPeerFeedback('tok', { strength: 's', weakness: 'w', suggestion: 'sg' }, 'user-1')
    ).rejects.toThrow(ValidationError);
  });

  test('expires token that is past 21 days and throws ValidationError', async () => {
    const oldDate = new Date(Date.now() - 22 * 24 * 60 * 60 * 1000);
    (mockPrisma.peerFeedbackInvite.findUnique as jest.Mock).mockResolvedValue({
      token: 'tok', status: 'PENDING', createdAt: oldDate, evaluationId: 'eval-1',
    });
    (mockPrisma.peerFeedbackInvite.update as jest.Mock).mockResolvedValue({ status: 'EXPIRED' });
    await expect(
      service.submitPeerFeedback('tok', { strength: 's', weakness: 'w', suggestion: 'sg' }, 'user-1')
    ).rejects.toThrow(ValidationError);
    expect(mockPrisma.peerFeedbackInvite.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'EXPIRED' } })
    );
  });

  test('creates anonymous feedback and marks invite SUBMITTED', async () => {
    (mockPrisma.peerFeedbackInvite.findUnique as jest.Mock).mockResolvedValue({
      token: 'tok', status: 'PENDING', createdAt: new Date(), evaluationId: 'eval-1',
    });
    const txFbCreate = jest.fn().mockResolvedValue({ id: 'fb-1', strength: 's', weakness: 'w', suggestion: 'sg' });
    const txInvUpdate = jest.fn().mockResolvedValue({ status: 'SUBMITTED' });
    (mockPrisma.$transaction as jest.Mock).mockImplementation((fn: any) =>
      fn({
        evaluationPeerFeedback: { create: txFbCreate },
        peerFeedbackInvite: { update: txInvUpdate },
        evaluationAuditLog: { create: jest.fn().mockResolvedValue({}) },
      })
    );

    const result = await service.submitPeerFeedback(
      'tok', { strength: 's', weakness: 'w', suggestion: 'sg' }, 'anon-user'
    );
    expect(result).toMatchObject({ id: 'fb-1' });
    expect(txFbCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ evaluationId: 'eval-1', strength: 's' }),
      })
    );
    // Verify audit is called with null changedByUserId (anonymous)
    expect(mockLogChange).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ changedByUserId: null })
    );
  });
});

// ─── declineInvite ────────────────────────────────────────────────────────────

describe('declineInvite', () => {
  const service = makeService();

  beforeEach(() => jest.clearAllMocks());

  test('throws NotFoundError for unknown token', async () => {
    (mockPrisma.peerFeedbackInvite.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.declineInvite('bad', 'user-1')).rejects.toThrow(NotFoundError);
  });

  test('throws ValidationError for non-PENDING invite', async () => {
    (mockPrisma.peerFeedbackInvite.findUnique as jest.Mock).mockResolvedValue({
      token: 'tok', status: 'SUBMITTED',
    });
    await expect(service.declineInvite('tok', 'user-1')).rejects.toThrow(ValidationError);
  });

  test('updates status to DECLINED', async () => {
    (mockPrisma.peerFeedbackInvite.findUnique as jest.Mock).mockResolvedValue({
      token: 'tok', status: 'PENDING',
    });
    (mockPrisma.peerFeedbackInvite.update as jest.Mock).mockResolvedValue({ status: 'DECLINED' });
    const result = await service.declineInvite('tok', 'user-1');
    expect(result.status).toBe('DECLINED');
    expect(mockPrisma.peerFeedbackInvite.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DECLINED' }) })
    );
  });
});

// ─── expirePendingInvites ─────────────────────────────────────────────────────

describe('expirePendingInvites', () => {
  const service = makeService();

  beforeEach(() => jest.clearAllMocks());

  test('calls updateMany with cutoff date and returns expired count', async () => {
    (mockPrisma.peerFeedbackInvite.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
    const result = await service.expirePendingInvites();
    expect(result).toEqual({ expired: 3 });
    expect(mockPrisma.peerFeedbackInvite.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PENDING', createdAt: expect.objectContaining({ lt: expect.any(Date) }) }),
        data: { status: 'EXPIRED' },
      })
    );
  });

  test('returns 0 when nothing expired', async () => {
    (mockPrisma.peerFeedbackInvite.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    const result = await service.expirePendingInvites();
    expect(result).toEqual({ expired: 0 });
  });
});

// ─── getPeerAggregate ─────────────────────────────────────────────────────────

describe('getPeerAggregate', () => {
  const service = makeService();

  beforeEach(() => jest.clearAllMocks());

  const makeEval = (invites: any[], feedbacks: any[]) => ({
    id: 'eval-1',
    employeeId: 'emp-1',
    employee: {
      userId: 'user-sub',
      user: { id: 'user-sub', supervisor2Id: 'sup2-id' },
    },
    peerInvites: invites,
    peerFeedbacks: feedbacks,
  });

  test('throws NotFoundError when evaluation not found', async () => {
    (mockPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'ADMIN' });
    await expect(service.getPeerAggregate('eval-x', 'admin-1')).rejects.toThrow(NotFoundError);
  });

  test('throws AuthorizationError for non-admin/non-sup2/non-subject user', async () => {
    (mockPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(
      makeEval([], [])
    );
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE' });
    await expect(service.getPeerAggregate('eval-1', 'other-user')).rejects.toThrow(AuthorizationError);
  });

  test('allows supervisor2 access', async () => {
    (mockPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(
      makeEval(
        [{ status: 'SUBMITTED' }, { status: 'SUBMITTED' }],
        [
          { id: 'fb-1', strength: 's1', weakness: 'w1', suggestion: 'sg1', createdAt: new Date() },
          { id: 'fb-2', strength: 's2', weakness: 'w2', suggestion: 'sg2', createdAt: new Date() },
        ]
      )
    );
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE' });
    const result = await service.getPeerAggregate('eval-1', 'sup2-id');
    expect(result.feedbacks).toHaveLength(2);
  });

  test('allows subject employee to see their own peer aggregate', async () => {
    (mockPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(
      makeEval(
        [{ status: 'SUBMITTED' }, { status: 'SUBMITTED' }],
        [
          { id: 'fb-1', strength: 's1', weakness: 'w1', suggestion: 'sg1', createdAt: new Date() },
          { id: 'fb-2', strength: 's2', weakness: 'w2', suggestion: 'sg2', createdAt: new Date() },
        ]
      )
    );
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE' });
    // 'user-sub' is the subject employee's userId per makeEval
    const result = await service.getPeerAggregate('eval-1', 'user-sub');
    expect(result.feedbacks).toHaveLength(2);
  });

  test('supervisor1 (not sup2) still gets AuthorizationError', async () => {
    (mockPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(
      makeEval([], [])
    );
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'TEAM_LEAD' });
    // 'sup1-id' is not supervisor2Id (which is 'sup2-id') and not the subject employee
    await expect(service.getPeerAggregate('eval-1', 'sup1-id')).rejects.toThrow(AuthorizationError);
  });

  test('returns pending shape when pending invites exist', async () => {
    (mockPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(
      makeEval(
        [{ status: 'PENDING' }, { status: 'SUBMITTED' }],
        []
      )
    );
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'ADMIN' });
    const result = await service.getPeerAggregate('eval-1', 'admin-1');
    expect(result.pending).toBe(true);
    expect(result.respondentCount).toBe(1);
    expect(result.expectedMinimum).toBe(2);
  });

  test('returns pending shape when fewer than 2 submitted', async () => {
    (mockPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(
      makeEval(
        [{ status: 'SUBMITTED' }, { status: 'DECLINED' }],
        [{ id: 'fb-1', strength: 's1', weakness: 'w1', suggestion: 'sg1', createdAt: new Date() }]
      )
    );
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'ADMIN' });
    const result = await service.getPeerAggregate('eval-1', 'admin-1');
    expect(result.pending).toBe(true);
    expect(result.respondentCount).toBe(1);
    expect(result.expectedMinimum).toBe(2);
  });

  test('returns aggregate with feedbacks when all resolved and ≥2 submitted', async () => {
    const fbs = [
      { id: 'fb-1', strength: 's1', weakness: 'w1', suggestion: 'sg1', createdAt: new Date() },
      { id: 'fb-2', strength: 's2', weakness: 'w2', suggestion: 'sg2', createdAt: new Date() },
      { id: 'fb-3', strength: 's3', weakness: 'w3', suggestion: 'sg3', createdAt: new Date() },
    ];
    (mockPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(
      makeEval(
        [{ status: 'SUBMITTED' }, { status: 'SUBMITTED' }, { status: 'SUBMITTED' }],
        fbs
      )
    );
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'ADMIN' });
    const result = await service.getPeerAggregate('eval-1', 'admin-1');
    expect(result.feedbacks).toHaveLength(3);
    // Fields present in each feedback
    expect(result.feedbacks[0]).toHaveProperty('strength');
    expect(result.feedbacks[0]).toHaveProperty('weakness');
    expect(result.feedbacks[0]).toHaveProperty('suggestion');
  });
});
