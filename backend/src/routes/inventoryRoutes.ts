import { Router } from 'express';
import inventoryController from '@controllers/inventoryController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
import { zodValidateQuery } from '@middlewares/zodValidation';
import { inventoryOverviewQuerySchema } from '@schemas';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/inventory/overview:
 *   get:
 *     tags: [Inventory]
 *     summary: Tổng quan tồn kho
 *     description: Lấy danh sách hàng hóa với tồn kho tổng hợp và chi tiết theo kho
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo mã hoặc tên hàng hóa
 *       - in: query
 *         name: loaiSanPham
 *         schema:
 *           type: string
 *         description: Lọc theo loại hàng hóa
 *       - in: query
 *         name: warehouseId
 *         schema:
 *           type: string
 *         description: Lọc theo kho cụ thể
 *       - in: query
 *         name: donViTinh
 *         schema:
 *           type: string
 *         description: Lọc theo đơn vị tính
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
 *     responses:
 *       200:
 *         description: Lấy tổng quan tồn kho thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/overview', requireRule('inventory', 'READ'), zodValidateQuery(inventoryOverviewQuerySchema), inventoryController.getInventoryOverview);

export default router;
