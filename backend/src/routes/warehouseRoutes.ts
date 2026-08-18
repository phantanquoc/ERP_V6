import { Router } from 'express';
import {
  getAllWarehouses,
  generateWarehouseCode,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  syncLayouts,
} from '@controllers/warehouseController';
import lotController from '@controllers/lotController';

const { getLotsByWarehouse } = lotController;
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/warehouses:
 *   get:
 *     summary: Lấy danh sách kho
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách kho
 */
router.get('/', getAllWarehouses);

/**
 * @swagger
 * /api/warehouses/generate-code:
 *   get:
 *     summary: Tạo mã kho tự động
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mã kho được tạo tự động
 */
router.get('/generate-code', generateWarehouseCode);

/**
 * @swagger
 * /api/warehouses:
 *   post:
 *     summary: Tạo kho mới
 *     tags: [Warehouses]
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
 *         description: Tạo kho thành công
 */
router.post('/', authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'), createWarehouse);

/**
 * @swagger
 * /api/warehouses/{id}:
 *   put:
 *     summary: Cập nhật thông tin kho
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của kho
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật kho thành công
 *       404:
 *         description: Không tìm thấy kho
 */
router.put('/:id', authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'), updateWarehouse);

/**
 * @swagger
 * /api/warehouses/{id}:
 *   delete:
 *     summary: Xóa kho
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của kho
 *     responses:
 *       200:
 *         description: Xóa kho thành công
 *       404:
 *         description: Không tìm thấy kho
 */
router.delete('/:id', authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'), deleteWarehouse);

/**
 * @swagger
 * /api/warehouses/{warehouseId}/lots:
 *   get:
 *     summary: Lấy danh sách lô hàng theo kho
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: warehouseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của kho
 *     responses:
 *       200:
 *         description: Danh sách lô hàng trong kho
 *       404:
 *         description: Không tìm thấy kho
 */
router.get('/:warehouseId/lots', getLotsByWarehouse);

/**
 * @swagger
 * /api/warehouses/sync-layouts:
 *   post:
 *     summary: Đồng bộ lô + vị trí kiện mặc định theo sơ đồ CAD (admin)
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê số lô/vị trí được tạo
 */
router.post('/sync-layouts', authorize('ADMIN'), syncLayouts);

export default router;
