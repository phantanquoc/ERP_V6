import { Router } from 'express';
import employeeEvaluationController from '@controllers/employeeEvaluationController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

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
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  employeeEvaluationController.getEmployeeEvaluations
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
  authorize('EMPLOYEE'),
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
  authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'),
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
  authorize('EMPLOYEE', 'ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'),
  employeeEvaluationController.getEvaluationHistory
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
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
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
  authorize('EMPLOYEE'),
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
  authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'),
  employeeEvaluationController.updateEvaluationDetail
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
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  employeeEvaluationController.finalizeEvaluation
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
  authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'),
  employeeEvaluationController.getSubordinatesForEvaluation
);

export default router;

