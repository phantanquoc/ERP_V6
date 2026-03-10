import { Router } from 'express';
import {
  getAllWarehouses,
  generateWarehouseCode,
  createWarehouse,
  deleteWarehouse,
} from '@controllers/warehouseController';
import { getLotsByWarehouse } from '@controllers/lotController';
import { authenticate } from '@middlewares/auth';

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
router.post('/', createWarehouse);

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
router.delete('/:id', deleteWarehouse);

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

export default router;

