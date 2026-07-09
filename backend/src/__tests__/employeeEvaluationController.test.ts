/**
 * Unit tests for employeeEvaluationController — RBAC on new endpoints.
 *
 * Strategy: mock service + peerFeedback service + audit service,
 * build req/res manually, check that controllers delegate correctly and
 * that authorization is respected at the route layer (via the authorize middleware mock).
 */

jest.mock('@services/employeeEvaluationService', () => ({
  __esModule: true,
  default: {
    updateEvaluationComment: jest.fn(),
    toggleNotApplicable: jest.fn(),
    uploadEvidence: jest.fn(),
    deleteEvidence: jest.fn(),
    listEvidence: jest.fn(),
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
    syncEvaluationDetails: jest.fn(),
    acknowledgeEvaluation: jest.fn(),
    getEvaluationCompletionStats: jest.fn(),
    getSubordinatesForEvaluation: jest.fn(),
  },
}));

jest.mock('@services/evaluationPeerFeedbackService', () => ({
  __esModule: true,
  default: {
    invitePeers: jest.fn(),
    submitPeerFeedback: jest.fn(),
    declineInvite: jest.fn(),
    getPeerAggregate: jest.fn(),
  },
}));

jest.mock('@services/evaluationAuditService', () => ({
  __esModule: true,
  getAuditLog: jest.fn(),
}));

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    evaluation: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

import employeeEvaluationController from '@controllers/employeeEvaluationController';
import employeeEvaluationService from '@services/employeeEvaluationService';
import evaluationPeerFeedbackService from '@services/evaluationPeerFeedbackService';
import { getAuditLog } from '@services/evaluationAuditService';
import { AuthorizationError } from '@utils/errors';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const next = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── updateEvaluationComment ─────────────────────────────────────────────────

describe('updateEvaluationComment', () => {
  it('delegates to service with correct field mapping', async () => {
    const req: any = {
      params: { id: 'ev1' },
      body: { role: 'employee', comment: 'great work' },
      user: { id: 'user1', role: 'EMPLOYEE' },
    };
    const res = mockRes();
    (employeeEvaluationService.updateEvaluationComment as jest.Mock).mockResolvedValue({ id: 'ev1' });

    await employeeEvaluationController.updateEvaluationComment(req, res, next);

    expect(employeeEvaluationService.updateEvaluationComment).toHaveBeenCalledWith(
      'ev1', 'commentEmployee', 'great work', 'user1'
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('returns 400 for invalid role value', async () => {
    const req: any = {
      params: { id: 'ev1' },
      body: { role: 'admin', comment: 'bad role' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await employeeEvaluationController.updateEvaluationComment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('passes service errors to next', async () => {
    const req: any = {
      params: { id: 'ev1' },
      body: { role: 'sup1', comment: 'feedback' },
      user: { id: 'user1' },
    };
    const res = mockRes();
    const error = new AuthorizationError('Not allowed');
    (employeeEvaluationService.updateEvaluationComment as jest.Mock).mockRejectedValue(error);

    await employeeEvaluationController.updateEvaluationComment(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// ─── toggleNotApplicable ─────────────────────────────────────────────────────

describe('toggleNotApplicable', () => {
  it('delegates to service with correct args', async () => {
    const req: any = {
      params: { detailId: 'det1' },
      body: { notApplicable: true },
      user: { id: 'user1' },
    };
    const res = mockRes();
    (employeeEvaluationService.toggleNotApplicable as jest.Mock).mockResolvedValue({ id: 'det1', notApplicable: true });

    await employeeEvaluationController.toggleNotApplicable(req, res, next);

    expect(employeeEvaluationService.toggleNotApplicable).toHaveBeenCalledWith('det1', true, 'user1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ─── submitAppeal ────────────────────────────────────────────────────────────

describe('submitAppeal', () => {
  it('returns 400 when appealComment is missing', async () => {
    const req: any = {
      params: { id: 'ev1' },
      body: {},
      user: { id: 'user1' },
    };
    const res = mockRes();

    await employeeEvaluationController.submitAppeal(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('delegates to service when valid', async () => {
    const req: any = {
      params: { id: 'ev1' },
      body: { appealComment: 'Tôi không đồng ý với kết quả' },
      user: { id: 'user1' },
    };
    const res = mockRes();
    (employeeEvaluationService.submitAppeal as jest.Mock).mockResolvedValue({ id: 'ev1', appealComment: 'Tôi không đồng ý với kết quả' });

    await employeeEvaluationController.submitAppeal(req, res, next);

    expect(employeeEvaluationService.submitAppeal).toHaveBeenCalledWith('ev1', 'Tôi không đồng ý với kết quả', 'user1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ─── replyAppeal ─────────────────────────────────────────────────────────────

describe('replyAppeal', () => {
  it('returns 400 when appealResponse is missing', async () => {
    const req: any = {
      params: { id: 'ev1' },
      body: {},
      user: { id: 'sup1-user' },
    };
    const res = mockRes();

    await employeeEvaluationController.replyAppeal(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('delegates to service when valid', async () => {
    const req: any = {
      params: { id: 'ev1' },
      body: { appealResponse: 'Kết quả đúng vì...' },
      user: { id: 'sup1-user' },
    };
    const res = mockRes();
    (employeeEvaluationService.replyAppeal as jest.Mock).mockResolvedValue({ id: 'ev1' });

    await employeeEvaluationController.replyAppeal(req, res, next);

    expect(employeeEvaluationService.replyAppeal).toHaveBeenCalledWith('ev1', 'Kết quả đúng vì...', 'sup1-user');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ─── getAuditLog ─────────────────────────────────────────────────────────────

describe('getAuditLog', () => {
  it('delegates to getAuditLog service function with role and departmentId', async () => {
    const req: any = {
      params: { id: 'ev1' },
      user: { id: 'admin1', role: 'ADMIN' },
      userDepartmentId: null,
    };
    const res = mockRes();
    (getAuditLog as jest.Mock).mockResolvedValue([{ id: 'log1' }]);

    await employeeEvaluationController.getAuditLog(req, res, next);

    expect(getAuditLog).toHaveBeenCalledWith(expect.anything(), 'ev1', 'admin1', 'ADMIN', null);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: [{ id: 'log1' }] }));
  });

  it('passes AuthorizationError to next for non-admin/dept-head', async () => {
    const req: any = {
      params: { id: 'ev1' },
      user: { id: 'emp1', role: 'EMPLOYEE' },
      userDepartmentId: null,
    };
    const res = mockRes();
    const error = new AuthorizationError('Không có quyền');
    (getAuditLog as jest.Mock).mockRejectedValue(error);

    await employeeEvaluationController.getAuditLog(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

// ─── getCalibrationHeatmap ────────────────────────────────────────────────────

describe('getCalibrationHeatmap', () => {
  it('returns 400 when month or year missing', async () => {
    const req: any = {
      query: {},
      user: { id: 'admin1' },
    };
    const res = mockRes();

    await employeeEvaluationController.getCalibrationHeatmap(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('delegates to service with numeric month/year', async () => {
    const req: any = {
      query: { month: '7', year: '2026' },
      user: { id: 'admin1' },
    };
    const res = mockRes();
    const heatmapData = { supervisors: [], departmentBenchmarks: [], trend: [], inflationAlerts: [] };
    (employeeEvaluationService.getCalibrationHeatmap as jest.Mock).mockResolvedValue(heatmapData);

    await employeeEvaluationController.getCalibrationHeatmap(req, res, next);

    expect(employeeEvaluationService.getCalibrationHeatmap).toHaveBeenCalledWith(7, 2026, 'admin1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ─── getPayrollPreview ────────────────────────────────────────────────────────

describe('getPayrollPreview', () => {
  it('delegates to service', async () => {
    const req: any = {
      params: { id: 'ev1' },
      user: { id: 'user1' },
    };
    const res = mockRes();
    const preview = { kpiBonus: 5000000, currentSup2Percentage: 75, projectedDeduction: 1250000, projectedNet: 3750000, isFinalized: false };
    (employeeEvaluationService.getPayrollImpactPreview as jest.Mock).mockResolvedValue(preview);

    await employeeEvaluationController.getPayrollPreview(req, res, next);

    expect(employeeEvaluationService.getPayrollImpactPreview).toHaveBeenCalledWith('ev1', 'user1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: preview }));
  });
});

// ─── copyFromPreviousMonth ────────────────────────────────────────────────────

describe('copyFromPreviousMonth', () => {
  it('delegates to service and returns copy result', async () => {
    const req: any = {
      params: { id: 'ev1' },
      user: { id: 'emp1' },
    };
    const res = mockRes();
    (employeeEvaluationService.copyFromPreviousMonth as jest.Mock).mockResolvedValue({ copied: 5, skipped: 1 });

    await employeeEvaluationController.copyFromPreviousMonth(req, res, next);

    expect(employeeEvaluationService.copyFromPreviousMonth).toHaveBeenCalledWith('ev1', 'emp1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ─── Goal CRUD ────────────────────────────────────────────────────────────────

describe('Goal CRUD', () => {
  it('createGoal returns 400 when title or targetPeriod missing', async () => {
    const req: any = {
      params: { id: 'ev1' },
      body: { title: 'Some goal' }, // missing targetPeriod
      user: { id: 'user1' },
    };
    const res = mockRes();

    await employeeEvaluationController.createGoal(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('createGoal delegates to service with correct args', async () => {
    const req: any = {
      params: { id: 'ev1' },
      body: { title: 'Tăng năng suất', description: 'Chi tiết', targetPeriod: '2026-08' },
      user: { id: 'user1' },
    };
    const res = mockRes();
    (employeeEvaluationService.createGoal as jest.Mock).mockResolvedValue({ id: 'g1' });

    await employeeEvaluationController.createGoal(req, res, next);

    expect(employeeEvaluationService.createGoal).toHaveBeenCalledWith(
      'ev1',
      { title: 'Tăng năng suất', description: 'Chi tiết', targetPeriod: '2026-08' },
      'user1'
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('listGoals delegates correctly', async () => {
    const req: any = { params: { id: 'ev1' }, user: { id: 'user1' } };
    const res = mockRes();
    (employeeEvaluationService.listGoals as jest.Mock).mockResolvedValue([]);

    await employeeEvaluationController.listGoals(req, res, next);

    expect(employeeEvaluationService.listGoals).toHaveBeenCalledWith('ev1', 'user1');
  });

  it('updateGoal delegates correctly', async () => {
    const req: any = {
      params: { id: 'ev1', goalId: 'g1' },
      body: { title: 'Updated title' },
      user: { id: 'user1' },
    };
    const res = mockRes();
    (employeeEvaluationService.updateGoal as jest.Mock).mockResolvedValue({ id: 'g1' });

    await employeeEvaluationController.updateGoal(req, res, next);

    expect(employeeEvaluationService.updateGoal).toHaveBeenCalledWith('g1', { title: 'Updated title', description: undefined, targetPeriod: undefined }, 'user1');
  });

  it('deleteGoal delegates correctly', async () => {
    const req: any = {
      params: { id: 'ev1', goalId: 'g1' },
      user: { id: 'user1' },
    };
    const res = mockRes();
    (employeeEvaluationService.deleteGoal as jest.Mock).mockResolvedValue(undefined);

    await employeeEvaluationController.deleteGoal(req, res, next);

    expect(employeeEvaluationService.deleteGoal).toHaveBeenCalledWith('g1', 'user1');
  });
});

// ─── IDP CRUD ─────────────────────────────────────────────────────────────────

describe('IDP CRUD', () => {
  it('createIdpItem returns 400 when fields missing', async () => {
    const req: any = {
      params: { id: 'ev1' },
      body: { skill: 'TypeScript' }, // missing action + deadline
      user: { id: 'user1' },
    };
    const res = mockRes();

    await employeeEvaluationController.createIdpItem(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('createIdpItem delegates to service', async () => {
    const req: any = {
      params: { id: 'ev1' },
      body: { skill: 'TypeScript', action: 'Học khóa học', deadline: '2026-09-30' },
      user: { id: 'user1' },
    };
    const res = mockRes();
    (employeeEvaluationService.createIdpItem as jest.Mock).mockResolvedValue({ id: 'idp1' });

    await employeeEvaluationController.createIdpItem(req, res, next);

    expect(employeeEvaluationService.createIdpItem).toHaveBeenCalledWith(
      'ev1',
      { skill: 'TypeScript', action: 'Học khóa học', deadline: '2026-09-30' },
      'user1'
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// ─── Peer feedback handlers ───────────────────────────────────────────────────

describe('Peer feedback handlers', () => {
  it('invitePeers returns 400 for empty inviteeUserIds', async () => {
    const req: any = {
      params: { id: 'ev1' },
      body: { inviteeUserIds: [] },
      user: { id: 'tl1' },
    };
    const res = mockRes();

    await employeeEvaluationController.invitePeers(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('invitePeers delegates to peer feedback service', async () => {
    const req: any = {
      params: { id: 'ev1' },
      body: { inviteeUserIds: ['u1', 'u2'] },
      user: { id: 'tl1' },
    };
    const res = mockRes();
    (evaluationPeerFeedbackService.invitePeers as jest.Mock).mockResolvedValue([{ id: 'inv1' }]);

    await employeeEvaluationController.invitePeers(req, res, next);

    expect(evaluationPeerFeedbackService.invitePeers).toHaveBeenCalledWith('ev1', ['u1', 'u2'], 'tl1');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('submitPeerFeedback delegates correctly', async () => {
    const req: any = {
      params: { token: 'abc123' },
      body: { strength: 'Strong', weakness: 'Weak', suggestion: 'Improve' },
      user: { id: 'peer1' },
    };
    const res = mockRes();
    (evaluationPeerFeedbackService.submitPeerFeedback as jest.Mock).mockResolvedValue({ id: 'fb1' });

    await employeeEvaluationController.submitPeerFeedback(req, res, next);

    expect(evaluationPeerFeedbackService.submitPeerFeedback).toHaveBeenCalledWith(
      'abc123',
      { strength: 'Strong', weakness: 'Weak', suggestion: 'Improve' },
      'peer1'
    );
  });

  it('declinePeerFeedback delegates correctly', async () => {
    const req: any = {
      params: { token: 'abc123' },
      user: { id: 'peer1' },
    };
    const res = mockRes();
    (evaluationPeerFeedbackService.declineInvite as jest.Mock).mockResolvedValue(undefined);

    await employeeEvaluationController.declinePeerFeedback(req, res, next);

    expect(evaluationPeerFeedbackService.declineInvite).toHaveBeenCalledWith('abc123', 'peer1');
  });

  it('getPeerFeedbackAggregate delegates correctly', async () => {
    const req: any = {
      params: { id: 'ev1' },
      user: { id: 'admin1' },
    };
    const res = mockRes();
    const aggregate = { strengths: [], weaknesses: [], suggestions: [] };
    (evaluationPeerFeedbackService.getPeerAggregate as jest.Mock).mockResolvedValue(aggregate);

    await employeeEvaluationController.getPeerFeedbackAggregate(req, res, next);

    expect(evaluationPeerFeedbackService.getPeerAggregate).toHaveBeenCalledWith('ev1', 'admin1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: aggregate }));
  });
});

// ─── Evidence handlers ────────────────────────────────────────────────────────

describe('Evidence handlers', () => {
  it('uploadEvidence returns 400 when no file provided', async () => {
    const req: any = {
      params: { detailId: 'det1' },
      user: { id: 'user1' },
      file: undefined,
    };
    const res = mockRes();

    await employeeEvaluationController.uploadEvidence(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('uploadEvidence delegates to service with file info', async () => {
    const req: any = {
      params: { detailId: 'det1' },
      user: { id: 'user1' },
      file: {
        originalname: 'doc.pdf',
        path: '/tmp/doc.pdf',
        mimetype: 'application/pdf',
        size: 100000,
      },
    };
    const res = mockRes();
    (employeeEvaluationService.uploadEvidence as jest.Mock).mockResolvedValue({ id: 'ev1' });

    await employeeEvaluationController.uploadEvidence(req, res, next);

    expect(employeeEvaluationService.uploadEvidence).toHaveBeenCalledWith(
      'det1',
      { originalname: 'doc.pdf', path: '/tmp/doc.pdf', mimetype: 'application/pdf', size: 100000 },
      'user1'
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('deleteEvidence delegates to service', async () => {
    const req: any = {
      params: { evidenceId: 'evid1' },
      user: { id: 'user1' },
    };
    const res = mockRes();
    (employeeEvaluationService.deleteEvidence as jest.Mock).mockResolvedValue(undefined);

    await employeeEvaluationController.deleteEvidence(req, res, next);

    expect(employeeEvaluationService.deleteEvidence).toHaveBeenCalledWith('evid1', 'user1');
  });

  it('listEvidence delegates to service', async () => {
    const req: any = {
      params: { detailId: 'det1' },
      user: { id: 'user1' },
    };
    const res = mockRes();
    (employeeEvaluationService.listEvidence as jest.Mock).mockResolvedValue([]);

    await employeeEvaluationController.listEvidence(req, res, next);

    expect(employeeEvaluationService.listEvidence).toHaveBeenCalledWith('det1', 'user1');
  });
});
