jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    employee: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    evaluation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    evaluationDetail: {
      create: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    positionResponsibility: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn() },
}));

jest.mock('../services/notificationService', () => ({
  __esModule: true,
  default: {
    notify: jest.fn().mockResolvedValue(undefined),
    createNotification: jest.fn().mockResolvedValue(undefined),
    createEvaluationNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

import prisma from '@config/database';
import notificationService from '../services/notificationService';
import { EmployeeEvaluationService } from '@services/employeeEvaluationService';
import { NotFoundError, ValidationError } from '@utils/errors';
import { EvaluationStatus } from '@types';

const service = new EmployeeEvaluationService();
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── createOrUpdateEvaluation ─────────────────────────────────────────────────

describe('createOrUpdateEvaluation', () => {
  const mockEmployee = {
    id: 'emp-1',
    positionId: 'pos-1',
    user: { role: 'EMPLOYEE', id: 'user-1' },
    position: { id: 'pos-1', name: 'Developer' },
  };

  it('returns existing evaluation without creating a new one', async () => {
    const existing = { id: 'eval-1', employeeId: 'emp-1', period: '2026-05', score: 0 };
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
    (mockedPrisma.evaluation.findFirst as jest.Mock).mockResolvedValue(existing);
    (mockedPrisma.positionResponsibility.findMany as jest.Mock).mockResolvedValue([]);
    (mockedPrisma.evaluationDetail.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.createOrUpdateEvaluation('emp-1', 5, 2026);

    expect(result).toEqual(existing);
    expect(mockedPrisma.evaluation.create).not.toHaveBeenCalled();
  });

  it('creates evaluation with details when none exists', async () => {
    const responsibilities = [
      { id: 'resp-1', title: 'R1', weight: 60 },
      { id: 'resp-2', title: 'R2', weight: 40 },
    ];
    const newEval = { id: 'eval-new', employeeId: 'emp-1', period: '2026-05', score: 0 };

    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
    (mockedPrisma.evaluation.findFirst as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.evaluation.create as jest.Mock).mockResolvedValue(newEval);
    (mockedPrisma.positionResponsibility.findMany as jest.Mock).mockResolvedValue(responsibilities);
    (mockedPrisma.evaluationDetail.create as jest.Mock).mockResolvedValue({});

    const result = await service.createOrUpdateEvaluation('emp-1', 5, 2026);

    expect(result).toEqual(newEval);
    expect(mockedPrisma.evaluationDetail.create).toHaveBeenCalledTimes(2);
    expect(notificationService.notify).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundError when employee does not exist', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.createOrUpdateEvaluation('bad-id', 5, 2026)).rejects.toThrow(NotFoundError);
  });

  it('skips notification for ADMIN employees', async () => {
    const adminEmployee = { ...mockEmployee, user: { role: 'ADMIN', id: 'admin-1' } };
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(adminEmployee);
    (mockedPrisma.evaluation.findFirst as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.evaluation.create as jest.Mock).mockResolvedValue({ id: 'eval-1' });
    (mockedPrisma.positionResponsibility.findMany as jest.Mock).mockResolvedValue([]);

    await service.createOrUpdateEvaluation('emp-1', 5, 2026);

    expect(notificationService.notify).not.toHaveBeenCalled();
  });
});

// ─── updateEvaluationDetail — status validation ───────────────────────────────

describe('updateEvaluationDetail — status validation', () => {
  const makeDetail = (status: string) => ({
    id: 'detail-1',
    evaluation: {
      id: 'eval-1',
      employeeId: 'emp-1',
      status,
      period: '2026-05',
      employee: { userId: 'user-1' },
    },
  });

  beforeEach(() => {
    (mockedPrisma.evaluationDetail.update as jest.Mock).mockResolvedValue({ id: 'detail-1' });
    (mockedPrisma.$transaction as jest.Mock).mockImplementation((fn: any) => fn(mockedPrisma));
    (mockedPrisma.evaluationDetail.count as jest.Mock).mockResolvedValue(0);
    (mockedPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue({ status: EvaluationStatus.SELF_PENDING });
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE' });
  });

  it('rejects selfScore update when status is not SELF_PENDING', async () => {
    (mockedPrisma.evaluationDetail.findUnique as jest.Mock).mockResolvedValue(
      makeDetail(EvaluationStatus.SUPERVISOR1_PENDING)
    );

    await expect(
      service.updateEvaluationDetail('detail-1', { selfScore: 80 }, 'user-1')
    ).rejects.toThrow(ValidationError);
  });

  it('rejects supervisorScore1 update when status is not SUPERVISOR1_PENDING', async () => {
    (mockedPrisma.evaluationDetail.findUnique as jest.Mock).mockResolvedValue(
      makeDetail(EvaluationStatus.SELF_PENDING)
    );

    await expect(
      service.updateEvaluationDetail('detail-1', { supervisorScore1: 80 }, 'user-1')
    ).rejects.toThrow(ValidationError);
  });

  it('rejects supervisorScore2 update when status is not SUPERVISOR2_PENDING', async () => {
    (mockedPrisma.evaluationDetail.findUnique as jest.Mock).mockResolvedValue(
      makeDetail(EvaluationStatus.SUPERVISOR1_PENDING)
    );

    await expect(
      service.updateEvaluationDetail('detail-1', { supervisorScore2: 80 }, 'user-1')
    ).rejects.toThrow(ValidationError);
  });

  it('rejects score outside 0-100 range', async () => {
    (mockedPrisma.evaluationDetail.findUnique as jest.Mock).mockResolvedValue(
      makeDetail(EvaluationStatus.SELF_PENDING)
    );

    await expect(
      service.updateEvaluationDetail('detail-1', { selfScore: 150 }, 'user-1')
    ).rejects.toThrow(ValidationError);

    await expect(
      service.updateEvaluationDetail('detail-1', { selfScore: -1 }, 'user-1')
    ).rejects.toThrow(ValidationError);
  });

  it('rejects non-manager trying to update supervisorScore', async () => {
    (mockedPrisma.evaluationDetail.findUnique as jest.Mock).mockResolvedValue(
      makeDetail(EvaluationStatus.SUPERVISOR1_PENDING)
    );
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE' });

    await expect(
      service.updateEvaluationDetail('detail-1', { supervisorScore1: 80 }, 'user-1')
    ).rejects.toThrow(ValidationError);
  });

  it('throws NotFoundError when detail does not exist', async () => {
    (mockedPrisma.evaluationDetail.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.updateEvaluationDetail('bad-id', { selfScore: 80 })
    ).rejects.toThrow(NotFoundError);
  });
});

// ─── updateEvaluationDetail — race condition guard ────────────────────────────

describe('updateEvaluationDetail — race condition guard', () => {
  const detail = {
    id: 'detail-1',
    evaluation: {
      id: 'eval-1',
      employeeId: 'emp-1',
      status: EvaluationStatus.SELF_PENDING,
      period: '2026-05',
      employee: { userId: 'user-1' },
    },
  };

  beforeEach(() => {
    (mockedPrisma.evaluationDetail.findUnique as jest.Mock).mockResolvedValue(detail);
    (mockedPrisma.evaluationDetail.update as jest.Mock).mockResolvedValue({ id: 'detail-1' });
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE' });
  });

  it('does not transition status when transaction sees stale status', async () => {
    // Simulate: by the time transaction runs, status has already changed (race lost)
    (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const txPrisma = {
        ...mockedPrisma,
        evaluation: {
          ...mockedPrisma.evaluation,
          findUnique: jest.fn().mockResolvedValue({ status: EvaluationStatus.SUPERVISOR1_PENDING }),
          update: jest.fn(),
          count: jest.fn(),
        },
        evaluationDetail: {
          ...mockedPrisma.evaluationDetail,
          count: jest.fn().mockResolvedValue(1),
        },
        employee: {
          ...mockedPrisma.employee,
          findUnique: jest.fn(),
        },
      };
      await fn(txPrisma);
      return undefined;
    });

    await service.updateEvaluationDetail('detail-1', { selfScore: 80 }, 'user-1');

    // Status update should NOT have been called since guard detected stale status
    const txCall = (mockedPrisma.$transaction as jest.Mock).mock.calls[0];
    expect(txCall).toBeDefined();
    expect(notificationService.notify).not.toHaveBeenCalled();
  });

  it('does not transition status when not all details are filled', async () => {
    (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const txPrisma = {
        ...mockedPrisma,
        evaluation: {
          ...mockedPrisma.evaluation,
          findUnique: jest.fn().mockResolvedValue({ status: EvaluationStatus.SELF_PENDING }),
          update: jest.fn(),
        },
        evaluationDetail: {
          ...mockedPrisma.evaluationDetail,
          // filled=1, total=3 → not all done
          count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(3),
        },
        employee: {
          ...mockedPrisma.employee,
          findUnique: jest.fn(),
        },
      };
      await fn(txPrisma);
      return undefined;
    });

    await service.updateEvaluationDetail('detail-1', { selfScore: 80 }, 'user-1');

    expect(notificationService.notify).not.toHaveBeenCalled();
  });
});

// ─── finalizeEvaluation ───────────────────────────────────────────────────────

describe('finalizeEvaluation', () => {
  const makeEvaluation = (status: string, details: any[]) => ({
    id: 'eval-1',
    status,
    details,
  });

  const detailsWithAllScores = [
    {
      selfScore: 80,
      supervisorScore1: 85,
      supervisorScore2: 90,
      positionResponsibility: { weight: 60 },
    },
    {
      selfScore: 70,
      supervisorScore1: 75,
      supervisorScore2: 80,
      positionResponsibility: { weight: 40 },
    },
  ];

  it('throws ValidationError when status is SELF_PENDING', async () => {
    (mockedPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(
      makeEvaluation(EvaluationStatus.SELF_PENDING, detailsWithAllScores)
    );

    await expect(service.finalizeEvaluation('eval-1')).rejects.toThrow(ValidationError);
    await expect(service.finalizeEvaluation('eval-1')).rejects.toThrow(
      'chưa hoàn tất tất cả bước đánh giá'
    );
  });

  it('throws ValidationError when status is SUPERVISOR1_PENDING', async () => {
    (mockedPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(
      makeEvaluation(EvaluationStatus.SUPERVISOR1_PENDING, detailsWithAllScores)
    );

    await expect(service.finalizeEvaluation('eval-1')).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when no scores have been entered', async () => {
    const emptyDetails = [
      { selfScore: null, supervisorScore1: null, supervisorScore2: null, positionResponsibility: { weight: 100 } },
    ];
    (mockedPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(
      makeEvaluation(EvaluationStatus.COMPLETED, emptyDetails)
    );

    await expect(service.finalizeEvaluation('eval-1')).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when status is SUPERVISOR2_PENDING', async () => {
    (mockedPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(
      makeEvaluation(EvaluationStatus.SUPERVISOR2_PENDING, detailsWithAllScores)
    );

    await expect(service.finalizeEvaluation('eval-1')).rejects.toThrow(ValidationError);
    await expect(service.finalizeEvaluation('eval-1')).rejects.toThrow(
      'chưa hoàn tất tất cả bước đánh giá'
    );
  });

  it('calculates weighted average score correctly when all score types present', async () => {
    (mockedPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(
      makeEvaluation(EvaluationStatus.COMPLETED, detailsWithAllScores)
    );
    (mockedPrisma.evaluation.update as jest.Mock).mockResolvedValue({ id: 'eval-1', score: 0 });

    await service.finalizeEvaluation('eval-1');

    const updateCall = (mockedPrisma.evaluation.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.status).toBe(EvaluationStatus.COMPLETED);

    // selfScore weighted: (80*60 + 70*40)/100 = (4800+2800)/100 = 76
    // supervisorScore1 weighted: (85*60 + 75*40)/100 = (5100+3000)/100 = 81
    // supervisorScore2 weighted: (90*60 + 80*40)/100 = (5400+3200)/100 = 86
    // average = (76 + 81 + 86) / 3 = 81
    expect(updateCall.data.score).toBeCloseTo(81, 0);
  });

  it('calculates score using only filled score types (partial supervisor)', async () => {
    const partialDetails = [
      {
        selfScore: 80,
        supervisorScore1: null,
        supervisorScore2: null,
        positionResponsibility: { weight: 100 },
      },
    ];
    (mockedPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(
      makeEvaluation(EvaluationStatus.COMPLETED, partialDetails)
    );
    (mockedPrisma.evaluation.update as jest.Mock).mockResolvedValue({ id: 'eval-1', score: 0 });

    await service.finalizeEvaluation('eval-1');

    const updateCall = (mockedPrisma.evaluation.update as jest.Mock).mock.calls[0][0];
    // Only selfScore filled: (80*100)/100 = 80, average of [80] = 80
    expect(updateCall.data.score).toBeCloseTo(80, 1);
  });

  it('allows finalize when status is already COMPLETED (recalculate)', async () => {
    (mockedPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(
      makeEvaluation(EvaluationStatus.COMPLETED, detailsWithAllScores)
    );
    (mockedPrisma.evaluation.update as jest.Mock).mockResolvedValue({ id: 'eval-1', score: 81 });

    await expect(service.finalizeEvaluation('eval-1')).resolves.not.toThrow();
  });

  it('throws NotFoundError when evaluation does not exist', async () => {
    (mockedPrisma.evaluation.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.finalizeEvaluation('bad-id')).rejects.toThrow(NotFoundError);
  });
});

// ─── updateEvaluationDetail — supervisor authorization ───────────────────────

describe('updateEvaluationDetail — supervisor authorization', () => {
  const detail = {
    id: 'detail-1',
    evaluation: {
      id: 'eval-1',
      employeeId: 'emp-1',
      status: EvaluationStatus.SUPERVISOR1_PENDING,
      period: '2026-05',
      employee: { userId: 'user-employee' },
    },
  };

  beforeEach(() => {
    (mockedPrisma.evaluationDetail.findUnique as jest.Mock).mockResolvedValue(detail);
    (mockedPrisma.evaluationDetail.update as jest.Mock).mockResolvedValue({ id: 'detail-1' });
    (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const txPrisma = {
        ...mockedPrisma,
        evaluation: {
          ...mockedPrisma.evaluation,
          findUnique: jest.fn().mockResolvedValue({ status: EvaluationStatus.SUPERVISOR1_PENDING }),
          update: jest.fn(),
        },
        evaluationDetail: {
          ...mockedPrisma.evaluationDetail,
          count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(3),
        },
        employee: {
          ...mockedPrisma.employee,
          findUnique: jest.fn().mockResolvedValue({ user: { supervisor1Id: 'user-sup1', supervisor2Id: null } }),
        },
        user: {
          ...mockedPrisma.user,
          findUnique: jest.fn().mockResolvedValue({ employees: { id: 'emp-sup1' } }),
        },
      };
      await fn(txPrisma);
      return undefined;
    });
  });

  it('rejects non-assigned supervisor1 from submitting supervisorScore1', async () => {
    // currentUser is DEPARTMENT_HEAD but NOT the assigned supervisor1
    (mockedPrisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce({ role: 'DEPARTMENT_HEAD' })    // currentUser check
      .mockResolvedValueOnce({ supervisor1Id: 'user-other-sup' }); // evalUser — does NOT match userId

    await expect(
      service.updateEvaluationDetail('detail-1', { supervisorScore1: 80 }, 'user-wrong-sup')
    ).rejects.toThrow(ValidationError);

    (mockedPrisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce({ role: 'DEPARTMENT_HEAD' })
      .mockResolvedValueOnce({ supervisor1Id: 'user-other-sup' });
    const err = await service.updateEvaluationDetail('detail-1', { supervisorScore1: 80 }, 'user-wrong-sup').catch(e => e);
    expect(err.message).toMatch('cấp trên 1');
  });

  it('rejects non-assigned supervisor2 from submitting supervisorScore2', async () => {
    const detailSup2 = {
      ...detail,
      evaluation: { ...detail.evaluation, status: EvaluationStatus.SUPERVISOR2_PENDING },
    };
    (mockedPrisma.evaluationDetail.findUnique as jest.Mock).mockResolvedValue(detailSup2);
    (mockedPrisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce({ role: 'TEAM_LEAD' })          // currentUser check
      .mockResolvedValueOnce({ supervisor2Id: 'user-other-sup2' }); // evalUser check

    await expect(
      service.updateEvaluationDetail('detail-1', { supervisorScore2: 80 }, 'user-wrong-sup2')
    ).rejects.toThrow(ValidationError);
  });

  it('allows ADMIN to submit supervisorScore1 regardless of assignment', async () => {
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'ADMIN' });

    // ADMIN should not trigger the supervisor1Id check — should reach score update
    await expect(
      service.updateEvaluationDetail('detail-1', { supervisorScore1: 85 }, 'user-admin')
    ).resolves.toBeDefined();

    // The supervisor1Id lookup should NOT have been called
    // (ADMIN bypasses the check entirely)
    const userFindCalls = (mockedPrisma.user.findUnique as jest.Mock).mock.calls;
    // Only one call: the currentUser fetch
    expect(userFindCalls.length).toBe(1);
  });

  it('allows the correctly assigned supervisor1 to submit supervisorScore1', async () => {
    (mockedPrisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce({ role: 'TEAM_LEAD' })          // currentUser check
      .mockResolvedValueOnce({ supervisor1Id: 'user-sup1' }); // evalUser — matches userId

    await expect(
      service.updateEvaluationDetail('detail-1', { supervisorScore1: 85 }, 'user-sup1')
    ).resolves.toBeDefined();
  });
});

// ─── updateEvaluationDetail — auto-finalize score calculation ────────────────

describe('updateEvaluationDetail — auto-finalize score calculation', () => {
  const baseDetail = {
    id: 'detail-1',
    evaluation: {
      id: 'eval-1',
      employeeId: 'emp-1',
      status: EvaluationStatus.SELF_PENDING,
      period: '2026-05',
      employee: { userId: 'user-1' },
    },
  };

  it('calculates and saves weighted score when auto-finalizing (no supervisors)', async () => {
    (mockedPrisma.evaluationDetail.findUnique as jest.Mock).mockResolvedValue(baseDetail);
    (mockedPrisma.evaluationDetail.update as jest.Mock).mockResolvedValue({ id: 'detail-1' });
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE' });

    let capturedUpdateData: any = null;

    (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const txEvalUpdate = jest.fn().mockImplementation((args: any) => {
        capturedUpdateData = args.data;
        return Promise.resolve({});
      });
      const txPrisma = {
        evaluation: {
          findUnique: jest.fn().mockResolvedValue({ status: EvaluationStatus.SELF_PENDING }),
          update: txEvalUpdate,
        },
        evaluationDetail: {
          count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(2), // filled=2, total=2 → all done
          findMany: jest.fn().mockResolvedValue([
            { selfScore: 80, supervisorScore1: null, supervisorScore2: null, positionResponsibility: { weight: 60 } },
            { selfScore: 70, supervisorScore1: null, supervisorScore2: null, positionResponsibility: { weight: 40 } },
          ]),
        },
        employee: {
          findUnique: jest.fn().mockResolvedValue({
            user: { firstName: 'Test', lastName: 'User', supervisor1Id: null, supervisor2Id: null },
          }),
        },
        user: {
          findUnique: jest.fn(),
        },
      };
      await fn(txPrisma);
      return undefined;
    });

    await service.updateEvaluationDetail('detail-1', { selfScore: 80 }, 'user-1');

    // selfScore weighted: (80*60 + 70*40)/100 = 76, average of [76] = 76
    expect(capturedUpdateData).not.toBeNull();
    expect(capturedUpdateData.status).toBe(EvaluationStatus.COMPLETED);
    expect(capturedUpdateData.score).toBeCloseTo(76, 1);
  });

  it('sends EVALUATION_COMPLETED notify (not createNotification) on auto-finalize', async () => {
    (mockedPrisma.evaluationDetail.findUnique as jest.Mock).mockResolvedValue(baseDetail);
    (mockedPrisma.evaluationDetail.update as jest.Mock).mockResolvedValue({ id: 'detail-1' });
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE' });

    (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const txPrisma = {
        evaluation: {
          findUnique: jest.fn().mockResolvedValue({ status: EvaluationStatus.SELF_PENDING }),
          update: jest.fn().mockResolvedValue({}),
        },
        evaluationDetail: {
          count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(1),
          findMany: jest.fn().mockResolvedValue([
            { selfScore: 90, supervisorScore1: null, supervisorScore2: null, positionResponsibility: { weight: 100 } },
          ]),
        },
        employee: {
          findUnique: jest.fn().mockResolvedValue({
            user: { firstName: 'A', lastName: 'B', supervisor1Id: null, supervisor2Id: null },
          }),
        },
        user: { findUnique: jest.fn() },
      };
      await fn(txPrisma);
      return undefined;
    });

    await service.updateEvaluationDetail('detail-1', { selfScore: 90 }, 'user-1');

    expect(notificationService.notify).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ targetEmployeeIds: ['emp-1'] })
    );
    expect((notificationService as any).createNotification).not.toHaveBeenCalled();
  });
});

// ─── createBulkEvaluations ────────────────────────────────────────────────────

describe('createBulkEvaluations', () => {
  const employees = [
    {
      id: 'emp-1',
      user: { role: 'EMPLOYEE' },
      position: { responsibilities: [{ id: 'resp-1' }, { id: 'resp-2' }] },
    },
    {
      id: 'emp-2',
      user: { role: 'DEPARTMENT_HEAD' },
      position: { responsibilities: [{ id: 'resp-3' }] },
    },
  ];

  it('creates evaluations for all employees without existing ones', async () => {
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
    (mockedPrisma.evaluation.findMany as jest.Mock).mockResolvedValue([]);

    let evalIdCounter = 0;
    (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      evalIdCounter++;
      const txPrisma = {
        evaluation: {
          create: jest.fn().mockResolvedValue({ id: `eval-${evalIdCounter}` }),
        },
        evaluationDetail: {
          createMany: jest.fn().mockResolvedValue({}),
        },
      };
      await fn(txPrisma);
    });

    const result = await service.createBulkEvaluations(5, 2026);

    expect(result.created).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.total).toBe(2);
    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('skips employees that already have evaluations for the period', async () => {
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
    (mockedPrisma.evaluation.findMany as jest.Mock).mockResolvedValue([
      { employeeId: 'emp-1' },
    ]);

    (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const txPrisma = {
        evaluation: { create: jest.fn().mockResolvedValue({ id: 'eval-new' }) },
        evaluationDetail: { createMany: jest.fn().mockResolvedValue({}) },
      };
      await fn(txPrisma);
    });

    const result = await service.createBulkEvaluations(5, 2026);

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('returns zero counts when no employees have positions', async () => {
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.createBulkEvaluations(5, 2026);

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.total).toBe(0);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('continues creating other evaluations when one employee fails', async () => {
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
    (mockedPrisma.evaluation.findMany as jest.Mock).mockResolvedValue([]);

    let callCount = 0;
    (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      callCount++;
      if (callCount === 1) throw new Error('DB error for emp-1');
      const txPrisma = {
        evaluation: { create: jest.fn().mockResolvedValue({ id: 'eval-2' }) },
        evaluationDetail: { createMany: jest.fn().mockResolvedValue({}) },
      };
      await fn(txPrisma);
    });

    const result = await service.createBulkEvaluations(5, 2026);

    // emp-1 failed, emp-2 succeeded
    expect(result.created).toBe(1);
  });

  it('does not send notification for ADMIN employees', async () => {
    const adminEmployee = {
      id: 'emp-admin',
      user: { role: 'ADMIN' },
      position: { responsibilities: [{ id: 'resp-1' }] },
    };
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([adminEmployee]);
    (mockedPrisma.evaluation.findMany as jest.Mock).mockResolvedValue([]);

    (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const txPrisma = {
        evaluation: { create: jest.fn().mockResolvedValue({ id: 'eval-admin' }) },
        evaluationDetail: { createMany: jest.fn().mockResolvedValue({}) },
      };
      await fn(txPrisma);
    });

    await service.createBulkEvaluations(5, 2026);

    expect(notificationService.createEvaluationNotification).not.toHaveBeenCalled();
  });
});

// ─── syncEvaluationDetails ────────────────────────────────────────────────────

describe('syncEvaluationDetails', () => {
  const makeEval = (id: string, existingRespIds: string[], allResps: any[]) => ({
    id,
    details: existingRespIds.map(rid => ({ positionResponsibilityId: rid })),
    employee: {
      position: { responsibilities: allResps },
    },
  });

  it('returns synced=0 skipped=0 when no evaluations exist for period', async () => {
    (mockedPrisma.evaluation.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.syncEvaluationDetails(5, 2026);

    expect(result).toEqual({ synced: 0, skipped: 0 });
    expect(mockedPrisma.evaluationDetail.createMany).not.toHaveBeenCalled();
  });

  it('skips evaluation when all responsibilities already have details', async () => {
    const eval1 = makeEval('eval-1', ['resp-1', 'resp-2'], [
      { id: 'resp-1' },
      { id: 'resp-2' },
    ]);
    (mockedPrisma.evaluation.findMany as jest.Mock).mockResolvedValue([eval1]);

    const result = await service.syncEvaluationDetails(5, 2026);

    expect(result).toEqual({ synced: 0, skipped: 1 });
    expect(mockedPrisma.evaluationDetail.createMany).not.toHaveBeenCalled();
  });

  it('creates missing details and returns synced=1 when one responsibility is missing', async () => {
    const eval1 = makeEval('eval-1', ['resp-1'], [
      { id: 'resp-1' },
      { id: 'resp-2' },
    ]);
    (mockedPrisma.evaluation.findMany as jest.Mock).mockResolvedValue([eval1]);
    (mockedPrisma.evaluationDetail.createMany as jest.Mock).mockResolvedValue({ count: 1 });

    const result = await service.syncEvaluationDetails(5, 2026);

    expect(result).toEqual({ synced: 1, skipped: 0 });
    expect(mockedPrisma.evaluationDetail.createMany).toHaveBeenCalledWith({
      data: [{ evaluationId: 'eval-1', positionResponsibilityId: 'resp-2' }],
    });
  });

  it('handles employee with no position (skips without crashing)', async () => {
    const evalNoPos = {
      id: 'eval-2',
      details: [],
      employee: { position: null },
    };
    (mockedPrisma.evaluation.findMany as jest.Mock).mockResolvedValue([evalNoPos]);

    const result = await service.syncEvaluationDetails(5, 2026);

    expect(result).toEqual({ synced: 0, skipped: 1 });
    expect(mockedPrisma.evaluationDetail.createMany).not.toHaveBeenCalled();
  });

  it('handles multiple evaluations — some needing sync, some skipped', async () => {
    const eval1 = makeEval('eval-1', ['resp-1'], [{ id: 'resp-1' }, { id: 'resp-2' }]); // missing resp-2
    const eval2 = makeEval('eval-2', ['resp-3'], [{ id: 'resp-3' }]);                    // already complete
    (mockedPrisma.evaluation.findMany as jest.Mock).mockResolvedValue([eval1, eval2]);
    (mockedPrisma.evaluationDetail.createMany as jest.Mock).mockResolvedValue({ count: 1 });

    const result = await service.syncEvaluationDetails(5, 2026);

    expect(result).toEqual({ synced: 1, skipped: 1 });
    expect(mockedPrisma.evaluationDetail.createMany).toHaveBeenCalledTimes(1);
  });

  it('queries with correct period format (YYYY-MM)', async () => {
    (mockedPrisma.evaluation.findMany as jest.Mock).mockResolvedValue([]);

    await service.syncEvaluationDetails(3, 2026);

    expect(mockedPrisma.evaluation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { period: '2026-03' } })
    );
  });
});

// ─── getPendingEvaluationCount ────────────────────────────────────────────────

describe('getPendingEvaluationCount', () => {
  it('returns 0 when user has no subordinates', async () => {
    (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([]);

    const count = await service.getPendingEvaluationCount('user-1', 5, 2026);

    expect(count).toBe(0);
    expect(mockedPrisma.evaluation.count).not.toHaveBeenCalled();
  });

  it('counts non-completed evaluations for subordinates', async () => {
    (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { employees: { id: 'emp-1' } },
      { employees: { id: 'emp-2' } },
    ]);
    (mockedPrisma.evaluation.count as jest.Mock).mockResolvedValue(2);

    const count = await service.getPendingEvaluationCount('user-1', 5, 2026);

    expect(count).toBe(2);
    expect(mockedPrisma.evaluation.count).toHaveBeenCalledWith({
      where: {
        employeeId: { in: ['emp-1', 'emp-2'] },
        period: '2026-05',
        status: { not: 'COMPLETED' },
      },
    });
  });
});
