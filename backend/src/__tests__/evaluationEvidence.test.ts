/**
 * Tests for evaluation evidence upload — MIME/size validation, immutability post-COMPLETED.
 * Mocks the service layer; tests controller behavior.
 */

jest.mock('@services/employeeEvaluationService', () => ({
  __esModule: true,
  default: {
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
    evaluationEvidence: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

import employeeEvaluationController from '@controllers/employeeEvaluationController';
import employeeEvaluationService from '@services/employeeEvaluationService';
import { ValidationError, ConflictError } from '@utils/errors';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const next = jest.fn();

beforeEach(() => jest.clearAllMocks());

// ─── uploadEvidence — no file ─────────────────────────────────────────────────

describe('uploadEvidence — no file attached', () => {
  it('returns 400 with success:false when req.file is undefined', async () => {
    const req: any = {
      params: { detailId: 'det-001' },
      user: { id: 'emp-001' },
      file: undefined,
    };
    const res = mockRes();

    await employeeEvaluationController.uploadEvidence(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(employeeEvaluationService.uploadEvidence).not.toHaveBeenCalled();
  });
});

// ─── uploadEvidence — MIME type validation ────────────────────────────────────

describe('uploadEvidence — MIME validation via service', () => {
  it('passes ValidationError from service to next when MIME is disallowed', async () => {
    const req: any = {
      params: { detailId: 'det-001' },
      user: { id: 'emp-001' },
      file: {
        originalname: 'script.sh',
        path: '/tmp/ev/script.sh',
        mimetype: 'application/x-shellscript',
        size: 1024,
      },
    };
    const res = mockRes();
    const err = new ValidationError('Định dạng file không được phép');
    (employeeEvaluationService.uploadEvidence as jest.Mock).mockRejectedValue(err);

    await employeeEvaluationController.uploadEvidence(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('passes ValidationError to next when file exceeds size limit', async () => {
    const req: any = {
      params: { detailId: 'det-001' },
      user: { id: 'emp-001' },
      file: {
        originalname: 'huge.pdf',
        path: '/tmp/ev/huge.pdf',
        mimetype: 'application/pdf',
        size: 25 * 1024 * 1024, // 25 MB — over 20 MB limit
      },
    };
    const res = mockRes();
    const err = new ValidationError('File vượt quá kích thước cho phép');
    (employeeEvaluationService.uploadEvidence as jest.Mock).mockRejectedValue(err);

    await employeeEvaluationController.uploadEvidence(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

// ─── uploadEvidence — successful upload ───────────────────────────────────────

describe('uploadEvidence — successful upload', () => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  it.each(allowedMimeTypes)('accepts MIME type %s and returns 201', async (mimetype) => {
    const req: any = {
      params: { detailId: 'det-001' },
      user: { id: 'emp-001' },
      file: {
        originalname: 'evidence.file',
        path: `/tmp/ev/evidence.${mimetype.split('/')[1]}`,
        mimetype,
        size: 500 * 1024, // 500 KB
      },
    };
    const res = mockRes();
    (employeeEvaluationService.uploadEvidence as jest.Mock).mockResolvedValue({
      id: 'evid-001',
      fileName: 'evidence.file',
      mimeType: mimetype,
    });

    await employeeEvaluationController.uploadEvidence(req, res, next);

    expect(employeeEvaluationService.uploadEvidence).toHaveBeenCalledWith(
      'det-001',
      expect.objectContaining({ mimetype }),
      'emp-001'
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ─── deleteEvidence — immutability post-COMPLETED ─────────────────────────────

describe('deleteEvidence — immutability after evaluation is COMPLETED', () => {
  it('passes ConflictError to next when evaluation status is COMPLETED', async () => {
    const req: any = {
      params: { evidenceId: 'evid-001' },
      user: { id: 'emp-001' },
    };
    const res = mockRes();
    const err = new ConflictError('Không thể xóa minh chứng sau khi đánh giá đã hoàn thành');
    (employeeEvaluationService.deleteEvidence as jest.Mock).mockRejectedValue(err);

    await employeeEvaluationController.deleteEvidence(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('successfully deletes when evaluation is still editable', async () => {
    const req: any = {
      params: { evidenceId: 'evid-002' },
      user: { id: 'emp-001' },
    };
    const res = mockRes();
    (employeeEvaluationService.deleteEvidence as jest.Mock).mockResolvedValue(undefined);

    await employeeEvaluationController.deleteEvidence(req, res, next);

    expect(employeeEvaluationService.deleteEvidence).toHaveBeenCalledWith('evid-002', 'emp-001');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ─── listEvidence ─────────────────────────────────────────────────────────────

describe('listEvidence', () => {
  it('returns evidence list from service', async () => {
    const evidence = [
      { id: 'e1', fileName: 'report.pdf', mimeType: 'application/pdf', fileSize: 120000 },
      { id: 'e2', fileName: 'photo.jpg', mimeType: 'image/jpeg', fileSize: 450000 },
    ];
    const req: any = {
      params: { detailId: 'det-001' },
      user: { id: 'user1' },
    };
    const res = mockRes();
    (employeeEvaluationService.listEvidence as jest.Mock).mockResolvedValue(evidence);

    await employeeEvaluationController.listEvidence(req, res, next);

    expect(employeeEvaluationService.listEvidence).toHaveBeenCalledWith('det-001', 'user1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: evidence }));
  });

  it('returns empty array when no evidence exists', async () => {
    const req: any = {
      params: { detailId: 'det-empty' },
      user: { id: 'user1' },
    };
    const res = mockRes();
    (employeeEvaluationService.listEvidence as jest.Mock).mockResolvedValue([]);

    await employeeEvaluationController.listEvidence(req, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: [] }));
  });
});
