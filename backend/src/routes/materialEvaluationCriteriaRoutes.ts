import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';
import materialEvaluationCriteriaService from '../services/materialEvaluationCriteriaService';

const router = Router();

// All material evaluation criteria routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/material-evaluation-criteria:
 *   get:
 *     tags: [Material Evaluation Criteria]
 *     summary: "Danh sách tiêu chí đánh giá vật liệu"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Lấy danh sách tiêu chí thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 */
router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const criteria = await materialEvaluationCriteriaService.getAllCriteria();
      res.json({ success: true, data: criteria });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/material-evaluation-criteria/{id}:
 *   get:
 *     tags: [Material Evaluation Criteria]
 *     summary: "Chi tiết tiêu chí đánh giá vật liệu"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID của tiêu chí"
 *     responses:
 *       200:
 *         description: "Lấy chi tiết tiêu chí thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       404:
 *         description: "Không tìm thấy tiêu chí"
 */
router.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const criterion = await materialEvaluationCriteriaService.getCriteriaById(req.params.id as string);
      res.json({ success: true, data: criterion });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/material-evaluation-criteria:
 *   post:
 *     tags: [Material Evaluation Criteria]
 *     summary: "Tạo tiêu chí đánh giá vật liệu"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD"
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: "Tạo tiêu chí thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 */
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const criterion = await materialEvaluationCriteriaService.createCriteria(req.body);
      res.status(201).json({ success: true, data: criterion });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/material-evaluation-criteria/{id}:
 *   put:
 *     tags: [Material Evaluation Criteria]
 *     summary: "Cập nhật tiêu chí đánh giá vật liệu"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID của tiêu chí"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: "Cập nhật tiêu chí thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 *       404:
 *         description: "Không tìm thấy tiêu chí"
 */
router.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const criterion = await materialEvaluationCriteriaService.updateCriteria(req.params.id as string, req.body);
      res.json({ success: true, data: criterion });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/material-evaluation-criteria/{id}:
 *   delete:
 *     tags: [Material Evaluation Criteria]
 *     summary: "Xóa tiêu chí đánh giá vật liệu"
 *     description: "Roles cho phép: ADMIN"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID của tiêu chí"
 *     responses:
 *       200:
 *         description: "Xóa tiêu chí thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 *       404:
 *         description: "Không tìm thấy tiêu chí"
 */
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await materialEvaluationCriteriaService.deleteCriteria(req.params.id as string);
      res.json({ success: true, message: 'Criterion deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/material-evaluation-criteria/seed:
 *   post:
 *     tags: [Material Evaluation Criteria]
 *     summary: "Seed dữ liệu mẫu tiêu chí đánh giá"
 *     description: "Roles cho phép: ADMIN"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Seed dữ liệu mẫu thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 */
router.post(
  '/seed',
  authorize(UserRole.ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await materialEvaluationCriteriaService.seedDefaultCriteria();
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

