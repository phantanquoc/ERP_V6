import { Router } from 'express';
import { authenticate } from '@middlewares/auth';
import pricingOverviewController from '@controllers/pricingOverviewController';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/pricing/overview:
 *   get:
 *     tags: [Pricing Overview]
 *     summary: Tổng quan phòng định giá (aggregated)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *         description: Tháng (1-12), phải đi cùng year
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *         description: Năm (YYYY), phải đi cùng month
 *     responses:
 *       200: { description: Thành công }
 *       400: { description: Tham số không hợp lệ }
 *       401: { description: Chưa xác thực }
 *       403: { description: Không có quyền }
 */

// Gate: must be a pricing member — ADMIN bypass, else GENERAL DEPT_GENERAL
// with DEPARTMENT_HEAD/TEAM_LEAD or GENERAL/pricing EMPLOYEE (mirrors
// isPricingApprover logic). Non-members see 403, matching frontend gating
// ProtectedSubRoute(department="general", subModule="pricing").
router.get(
  '/',
  async (req: any, res: any, next: any) => {
    const { isPricingApprover } = await import('@utils/isPricingApprover');
    if (await isPricingApprover(req.user)) return next();
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập phòng định giá' });
  },
  pricingOverviewController.getOverview
);

export default router;
