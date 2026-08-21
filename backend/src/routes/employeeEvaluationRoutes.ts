import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import employeeEvaluationController from '@controllers/employeeEvaluationController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
const router = Router();

// ─── Multer config for evidence uploads ─────────────────────────────────────

const uploadDir = path.resolve(process.cwd(), 'uploads', 'evaluation-evidence-tmp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const evidenceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const evidenceUpload = multer({
  storage: evidenceStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB — service also validates
});

// ─── Rate limiter for PDF exports (20 req/min per user) ─────────────────────

const pdfLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: any) => req.user?.id ?? req.ip ?? 'unknown',
  message: { success: false, message: 'Quá nhiều yêu cầu xuất PDF, vui lòng thử lại sau 1 phút' },
});

// Export route — must be registered before any parameterized routes
router.get(
  '/export.xlsx',
  authenticate,
  requireRule('employee-evaluations', 'READ'),
  employeeEvaluationController.exportXlsx
);

/**
 * @swagger
 * /api/employee-evaluations/evaluations:
 *   get:
 *     tags: [Employee Evaluations]
 *     summary: "Danh sách đánh giá (Admin, Dept Head)"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng mỗi trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Tháng đánh giá
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Năm đánh giá
 *     responses:
 *       200:
 *         description: Lấy danh sách đánh giá thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get(
  '/evaluations',
  authenticate,
  requireRule('employee-evaluations', 'READ'),
  employeeEvaluationController.getEmployeeEvaluations
);

router.get(
  '/pending-count',
  authenticate,
  employeeEvaluationController.getPendingCount
);

router.get(
  '/completion-stats',
  authenticate,
  requireRule('employee-evaluations', 'READ'),
  employeeEvaluationController.getCompletionStats
);

/**
 * @swagger
 * /api/employee-evaluations/my-evaluation/{evaluationId}:
 *   get:
 *     tags: [Employee Evaluations]
 *     summary: "Đánh giá của tôi (Employee)"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: evaluationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đánh giá
 *     responses:
 *       200:
 *         description: Lấy chi tiết đánh giá của nhân viên thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy đánh giá
 */
router.get(
  '/my-evaluation/:evaluationId',
  authenticate,
  requireRule('employee-evaluations', 'READ'),
  employeeEvaluationController.getEvaluationDetails
);

/**
 * @swagger
 * /api/employee-evaluations/evaluations/{evaluationId}/details:
 *   get:
 *     tags: [Employee Evaluations]
 *     summary: "Chi tiết đánh giá (HR/Manager)"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: evaluationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đánh giá
 *     responses:
 *       200:
 *         description: Lấy chi tiết đánh giá thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy đánh giá
 */
router.get(
  '/evaluations/:evaluationId/details',
  authenticate,
  requireRule('employee-evaluations', 'READ'),
  employeeEvaluationController.getEvaluationDetails
);

/**
 * @swagger
 * /api/employee-evaluations/evaluations/{evaluationId}/history:
 *   get:
 *     tags: [Employee Evaluations]
 *     summary: Lịch sử đánh giá
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: evaluationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đánh giá
 *     responses:
 *       200:
 *         description: Lấy lịch sử đánh giá thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy đánh giá
 */
router.get(
  '/evaluations/:evaluationId/history',
  authenticate,
  requireRule('employee-evaluations', 'READ'),
  employeeEvaluationController.getEvaluationHistory
);

/**
 * @swagger
 * /api/employee-evaluations/evaluations/bulk:
 *   post:
 *     tags: [Employee Evaluations]
 *     summary: Tạo đánh giá hàng loạt cho tất cả nhân viên
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               month:
 *                 type: integer
 *                 description: Tháng đánh giá
 *               year:
 *                 type: integer
 *                 description: Năm đánh giá
 *     responses:
 *       200:
 *         description: Tạo đánh giá hàng loạt thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post(
  '/evaluations/bulk',
  authenticate,
  requireRule('employee-evaluations', 'CREATE'),
  employeeEvaluationController.createBulkEvaluations
);

/**
 * @swagger
 * /api/employee-evaluations/evaluations:
 *   post:
 *     tags: [Employee Evaluations]
 *     summary: Tạo đánh giá
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeId:
 *                 type: string
 *                 description: ID nhân viên
 *               month:
 *                 type: integer
 *                 description: Tháng đánh giá
 *               year:
 *                 type: integer
 *                 description: Năm đánh giá
 *     responses:
 *       201:
 *         description: Tạo đánh giá thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post(
  '/evaluations',
  authenticate,
  requireRule('employee-evaluations', 'CREATE'),
  employeeEvaluationController.createOrUpdateEvaluation
);

/**
 * @swagger
 * /api/employee-evaluations/my-evaluation/details/{detailId}:
 *   patch:
 *     tags: [Employee Evaluations]
 *     summary: Nhân viên tự đánh giá
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: detailId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID chi tiết đánh giá
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               selfScore:
 *                 type: number
 *                 description: Điểm tự đánh giá
 *     responses:
 *       200:
 *         description: Cập nhật tự đánh giá thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy chi tiết đánh giá
 */
router.patch(
  '/my-evaluation/details/:detailId',
  authenticate,
  requireRule('employee-evaluations', 'UPDATE'),
  employeeEvaluationController.updateEvaluationDetail
);

/**
 * @swagger
 * /api/employee-evaluations/evaluations/details/{detailId}:
 *   patch:
 *     tags: [Employee Evaluations]
 *     summary: "Quản lý đánh giá (HR/Manager)"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: detailId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID chi tiết đánh giá
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               managerScore:
 *                 type: number
 *                 description: Điểm quản lý đánh giá
 *     responses:
 *       200:
 *         description: Cập nhật đánh giá thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy chi tiết đánh giá
 */
router.patch(
  '/evaluations/details/:detailId',
  authenticate,
  requireRule('employee-evaluations', 'UPDATE'),
  employeeEvaluationController.updateEvaluationDetail
);

/**
 * @swagger
 * /api/employee-evaluations/evaluations/{evaluationId}/acknowledge:
 *   post:
 *     tags: [Employee Evaluations]
 *     summary: Nhân viên xác nhận đã xem kết quả đánh giá
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: evaluationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đánh giá
 *     responses:
 *       200:
 *         description: Xác nhận thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy đánh giá
 */
router.post(
  '/evaluations/:evaluationId/acknowledge',
  authenticate,
  requireRule('employee-evaluations', 'CREATE'),
  employeeEvaluationController.acknowledgeEvaluation
);

/**
 * @swagger
 * /api/employee-evaluations/evaluations/{evaluationId}/finalize:
 *   post:
 *     tags: [Employee Evaluations]
 *     summary: Hoàn thành đánh giá
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: evaluationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đánh giá
 *     responses:
 *       200:
 *         description: Hoàn thành đánh giá thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy đánh giá
 */
router.post(
  '/evaluations/:evaluationId/finalize',
  authenticate,
  requireRule('employee-evaluations', 'CREATE'),
  employeeEvaluationController.finalizeEvaluation
);

/**
 * @swagger
 * /api/employee-evaluations/sync-details:
 *   post:
 *     tags: [Employee Evaluations]
 *     summary: Đồng bộ tiêu chí đánh giá cho tháng/năm
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               month:
 *                 type: integer
 *               year:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Đồng bộ thành công
 */
router.post(
  '/sync-details',
  authenticate,
  requireRule('employee-evaluations', 'CREATE'),
  employeeEvaluationController.syncEvaluationDetails
);

/**
 * @swagger
 * /api/employee-evaluations/subordinates/{month}/{year}:
 *   get:
 *     tags: [Employee Evaluations]
 *     summary: Danh sách cấp dưới theo tháng/năm
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tháng
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: Năm
 *     responses:
 *       200:
 *         description: Lấy danh sách cấp dưới thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get(
  '/subordinates/:month/:year',
  authenticate,
  requireRule('employee-evaluations', 'READ'),
  employeeEvaluationController.getSubordinatesForEvaluation
);

// ─── Comment update (eval-level) ──────────────────────────────────────────
router.patch(
  '/evaluations/:id/comment',
  authenticate,
  employeeEvaluationController.updateEvaluationComment
);

// ─── N/A toggle ───────────────────────────────────────────────────────────
router.patch(
  '/evaluations/details/:detailId/na',
  authenticate,
  employeeEvaluationController.toggleNotApplicable
);

// ─── Evidence ──────────────────────────────────────────────────────────────
router.post(
  '/evaluations/details/:detailId/evidence',
  authenticate,
  evidenceUpload.single('file'),
  employeeEvaluationController.uploadEvidence
);

router.delete(
  '/evaluations/evidence/:evidenceId',
  authenticate,
  employeeEvaluationController.deleteEvidence
);

router.get(
  '/evaluations/details/:detailId/evidence',
  authenticate,
  employeeEvaluationController.listEvidence
);

// ─── Appeal ────────────────────────────────────────────────────────────────
router.post(
  '/evaluations/:id/appeal',
  authenticate,
  requireRule('employee-evaluations', 'CREATE'),
  employeeEvaluationController.submitAppeal
);

router.post(
  '/evaluations/:id/appeal/reply',
  authenticate,
  requireRule('employee-evaluations', 'CREATE'),
  employeeEvaluationController.replyAppeal
);

// ─── Audit log ─────────────────────────────────────────────────────────────
router.get(
  '/evaluations/:id/audit-log',
  authenticate,
  requireRule('employee-evaluations', 'READ'),
  employeeEvaluationController.getAuditLog
);

// ─── Payroll preview ───────────────────────────────────────────────────────
router.get(
  '/evaluations/:id/payroll-preview',
  authenticate,
  employeeEvaluationController.getPayrollPreview
);

// ─── PDF export ────────────────────────────────────────────────────────────
router.get(
  '/evaluations/:id/pdf',
  authenticate,
  pdfLimiter,
  employeeEvaluationController.getPdf
);

// ─── Calibration heatmap ───────────────────────────────────────────────────
router.get(
  '/calibration/heatmap',
  authenticate,
  requireRule('employee-evaluations', 'READ'),
  employeeEvaluationController.getCalibrationHeatmap
);

// ─── Copy from previous month ─────────────────────────────────────────────
router.post(
  '/evaluations/:id/copy-previous-month',
  authenticate,
  requireRule('employee-evaluations', 'CREATE'),
  employeeEvaluationController.copyFromPreviousMonth
);

// ─── Goals CRUD ────────────────────────────────────────────────────────────
router.get('/evaluations/:id/goals', authenticate, employeeEvaluationController.listGoals);
router.post('/evaluations/:id/goals', authenticate, employeeEvaluationController.createGoal);
router.patch('/evaluations/:id/goals/:goalId', authenticate, employeeEvaluationController.updateGoal);
router.delete('/evaluations/:id/goals/:goalId', authenticate, employeeEvaluationController.deleteGoal);

// ─── IDP CRUD ──────────────────────────────────────────────────────────────
router.get('/evaluations/:id/idp-items', authenticate, employeeEvaluationController.listIdpItems);
router.post('/evaluations/:id/idp-items', authenticate, employeeEvaluationController.createIdpItem);
router.patch('/evaluations/:id/idp-items/:idpItemId', authenticate, employeeEvaluationController.updateIdpItem);
router.delete('/evaluations/:id/idp-items/:idpItemId', authenticate, employeeEvaluationController.deleteIdpItem);

// ─── Peer feedback ─────────────────────────────────────────────────────────
router.post(
  '/evaluations/:id/peer-feedback/invite',
  authenticate,
  requireRule('employee-evaluations', 'CREATE'),
  employeeEvaluationController.invitePeers
);

router.post(
  '/peer-feedback/submit/:token',
  authenticate,
  employeeEvaluationController.submitPeerFeedback
);

router.post(
  '/peer-feedback/decline/:token',
  authenticate,
  employeeEvaluationController.declinePeerFeedback
);

router.get(
  '/evaluations/:id/peer-feedback/aggregate',
  authenticate,
  employeeEvaluationController.getPeerFeedbackAggregate
);

export default router;

