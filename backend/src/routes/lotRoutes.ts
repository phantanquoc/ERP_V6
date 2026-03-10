import { Router } from 'express';
import { createLot, deleteLot } from '@controllers/lotController';
import { authenticate } from '@middlewares/auth';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/lots:
 *   post:
 *     summary: Tạo lô hàng mới
 *     tags: [Lots]
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
 *         description: Tạo lô hàng thành công
 */
router.post('/', createLot);

/**
 * @swagger
 * /api/lots/{id}:
 *   delete:
 *     summary: Xóa lô hàng
 *     tags: [Lots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của lô hàng
 *     responses:
 *       200:
 *         description: Xóa lô hàng thành công
 *       404:
 *         description: Không tìm thấy lô hàng
 */
router.delete('/:id', deleteLot);

export default router;

