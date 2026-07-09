/**
 * Tests for the PDF export controller method.
 * Mocks: employeeEvaluationService.getEvaluationPdfData, pdfkit.
 */

// Mock pdfkit so we don't need the real native module.
// The controller uses require('pdfkit') dynamically, so we mock the module.
const mockPdfEnd = jest.fn();
const mockPdfText = jest.fn().mockReturnThis();
const mockPdfMoveDown = jest.fn().mockReturnThis();
const mockPdfFontSize = jest.fn().mockReturnThis();
const mockPdfFont = jest.fn().mockReturnThis();
const mockPdfAddPage = jest.fn().mockReturnThis();
const mockPdfPipe = jest.fn().mockReturnThis();

const MockPDFDocument = jest.fn().mockImplementation(() => ({
  pipe: mockPdfPipe,
  fontSize: mockPdfFontSize,
  font: mockPdfFont,
  text: mockPdfText,
  moveDown: mockPdfMoveDown,
  addPage: mockPdfAddPage,
  end: mockPdfEnd,
}));

jest.mock('pdfkit', () => MockPDFDocument);

const mockGetEvaluationPdfData = jest.fn();

jest.mock('@services/employeeEvaluationService', () => ({
  __esModule: true,
  default: {
    uploadEvidence: jest.fn(), deleteEvidence: jest.fn(), listEvidence: jest.fn(),
    toggleNotApplicable: jest.fn(), updateEvaluationComment: jest.fn(),
    submitAppeal: jest.fn(), replyAppeal: jest.fn(), getCalibrationHeatmap: jest.fn(),
    getPayrollImpactPreview: jest.fn(), copyFromPreviousMonth: jest.fn(),
    listGoals: jest.fn(), createGoal: jest.fn(), updateGoal: jest.fn(), deleteGoal: jest.fn(),
    listIdpItems: jest.fn(), createIdpItem: jest.fn(), updateIdpItem: jest.fn(),
    deleteIdpItem: jest.fn(), getEmployeeEvaluations: jest.fn(), getEvaluationDetails: jest.fn(),
    createOrUpdateEvaluation: jest.fn(), updateEvaluationDetail: jest.fn(),
    getEvaluationHistory: jest.fn(), createBulkEvaluations: jest.fn(),
    finalizeEvaluation: jest.fn(), getPendingEvaluationCount: jest.fn(),
    syncEvaluationDetails: jest.fn(), acknowledgeEvaluation: jest.fn(),
    getEvaluationCompletionStats: jest.fn(), getSubordinatesForEvaluation: jest.fn(),
    getEvaluationPdfData: mockGetEvaluationPdfData,
  },
}));

jest.mock('@services/evaluationPeerFeedbackService', () => ({
  __esModule: true,
  default: {
    invitePeers: jest.fn(), submitPeerFeedback: jest.fn(),
    declineInvite: jest.fn(), getPeerAggregate: jest.fn(),
  },
}));

jest.mock('@services/evaluationAuditService', () => ({
  __esModule: true,
  getAuditLog: jest.fn(),
}));

import employeeEvaluationController from '@controllers/employeeEvaluationController';
const next = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  MockPDFDocument.mockClear();
  mockPdfPipe.mockClear();
  mockPdfText.mockClear();
  mockPdfEnd.mockClear();
  // Default: ADMIN caller with full access
  mockGetEvaluationPdfData.mockResolvedValue({
    evaluation: makeEvaluation(),
    currentUserRole: 'ADMIN',
    isOwn: false,
    isSup: false,
  });
});


// ─── Minimal evaluation fixture ───────────────────────────────────────────────
// Matches the include structure in the controller:
//   employee.user { firstName, lastName, email }
//   employee.position { name }
//   details[].positionResponsibility { title, weight }
//   details[].evidences
//   goals, idpItems

const USER_ID = 'admin-001';

const makeEvaluation = (overrides: Record<string, any> = {}) => ({
  id: 'ev00000001',
  period: '2026-07',
  status: 'COMPLETED',
  totalScore: 82.5,
  commentEmployee: 'Tôi đã hoàn thành tốt',
  commentSup1: 'Nhân viên chăm chỉ',
  commentSup2: null,
  appealComment: null,
  appealResponse: null,
  employee: {
    userId: 'emp-user-001',
    user: {
      firstName: 'Văn A',
      lastName: 'Nguyễn',
      email: 'nva@company.com',
      supervisor1Id: null,
      supervisor2Id: null,
    },
    position: { name: 'Nhân viên sản xuất' },
    department: { name: 'Sản xuất' },
  },
  details: [
    {
      id: 'det-001',
      notApplicable: false,
      selfScore: 85,
      supervisorScore1: 80,
      supervisorScore2: 88,
      commentEmployee: null,
      commentSup1: null,
      commentSup2: null,
      positionResponsibility: { title: 'Tuân thủ quy trình', weight: 30 },
      evidences: [],
    },
    {
      id: 'det-002',
      notApplicable: true,
      selfScore: null,
      supervisorScore1: null,
      supervisorScore2: null,
      commentEmployee: null,
      commentSup1: null,
      commentSup2: null,
      positionResponsibility: { title: 'Kỹ năng lãnh đạo', weight: 20 },
      evidences: [],
    },
  ],
  goals: [],
  idpItems: [],
  ...overrides,
});

// ─── getPdf — 404 when evaluation not found ───────────────────────────────────

describe('getPdf — not found', () => {
  it('returns 404 json when evaluation does not exist', async () => {
    mockGetEvaluationPdfData.mockResolvedValue({
      evaluation: null,
      currentUserRole: null,
      isOwn: false,
      isSup: false,
    });

    const req: any = {
      params: { id: 'ev-missing' },
      query: {},
      user: { id: USER_ID },
    };
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await employeeEvaluationController.getPdf(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

// ─── getPdf — access denied ────────────────────────────────────────────────────

describe('getPdf — access denied', () => {
  it('returns 403 when requester has no access to evaluation', async () => {
    mockGetEvaluationPdfData.mockResolvedValue({
      evaluation: makeEvaluation(),
      currentUserRole: 'EMPLOYEE',
      isOwn: false,
      isSup: false,
    });

    const req: any = {
      params: { id: 'ev00000001' },
      query: {},
      user: { id: 'stranger-001' },
    };
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await employeeEvaluationController.getPdf(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

// ─── getPdf — successful stream ───────────────────────────────────────────────

describe('getPdf — successful stream', () => {
  it('sets PDF headers and pipes document to response', async () => {
    const req: any = {
      params: { id: 'ev00000001' },
      query: {},
      user: { id: USER_ID },
    };
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await employeeEvaluationController.getPdf(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('attachment')
    );
    expect(mockPdfPipe).toHaveBeenCalledWith(res);
    expect(mockPdfEnd).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('includes employee last name and period in PDF text output', async () => {
    mockGetEvaluationPdfData.mockResolvedValue({
      evaluation: makeEvaluation({ period: '2026-07' }),
      currentUserRole: 'ADMIN',
      isOwn: false,
      isSup: false,
    });

    const req: any = {
      params: { id: 'ev00000001' },
      query: {},
      user: { id: USER_ID },
    };
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await employeeEvaluationController.getPdf(req, res, next);

    const allTextCalls = mockPdfText.mock.calls.map((call: any[]) => String(call[0]));
    const combinedText = allTextCalls.join(' ');
    expect(combinedText).toContain('Nguy');
    expect(combinedText).toMatch(/2026[-/\s]?07|07[-/\s]?2026/);
  });

  it('includes responsibility title in PDF text output', async () => {
    const req: any = {
      params: { id: 'ev00000001' },
      query: {},
      user: { id: USER_ID },
    };
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await employeeEvaluationController.getPdf(req, res, next);

    const allTextCalls = mockPdfText.mock.calls.map((call: any[]) => String(call[0]));
    const combinedText = allTextCalls.join(' ');
    expect(combinedText).toContain('Tu');
  });

  it('includes the employee period in the PDF content', async () => {
    mockGetEvaluationPdfData.mockResolvedValue({
      evaluation: makeEvaluation({ period: '2026-07' }),
      currentUserRole: 'ADMIN',
      isOwn: false,
      isSup: false,
    });

    const req: any = {
      params: { id: 'ev00000001' },
      query: {},
      user: { id: USER_ID },
    };
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await employeeEvaluationController.getPdf(req, res, next);

    const allTextCalls = mockPdfText.mock.calls.map((call: any[]) => String(call[0]));
    const combinedText = allTextCalls.join(' ');
    expect(combinedText).toContain('2026-07');
  });

  it('uses employeeCode in PDF filename', async () => {
    mockGetEvaluationPdfData.mockResolvedValue({
      evaluation: { ...makeEvaluation({ period: '2026-07' }), employee: { ...makeEvaluation().employee, employeeCode: 'NV001' } },
      currentUserRole: 'ADMIN',
      isOwn: false,
      isSup: false,
    });

    const req: any = {
      params: { id: 'ev00000001' },
      query: {},
      user: { id: USER_ID },
    };
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await employeeEvaluationController.getPdf(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="danh-gia-NV001-2026-07.pdf"'
    );
  });
});

// ─── getPdf — Quick vs Full mode ─────────────────────────────────────────────

describe('getPdf — mode query parameter', () => {
  it('generates output with quick=true query param without throwing', async () => {
    const req: any = {
      params: { id: 'ev00000001' },
      query: { quick: 'true' },
      user: { id: USER_ID },
    };
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await employeeEvaluationController.getPdf(req, res, next);

    expect(mockPdfPipe).toHaveBeenCalled();
    expect(mockPdfEnd).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
