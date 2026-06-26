import { Router } from 'express';
import lotProductController from '@controllers/lotProductController';

const {
  getAllLotProducts,
  addProductToLot,
  removeProductFromLot,
  moveProductBetweenLots,
  updateProductQuantity,
  getLotsByProduct,
  getKienByProductAndLot,
} = lotProductController;
import { authenticate } from '@middlewares/auth';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/lot-products:
 *   get:
 *     tags: [Lot Products]
 *     summary: Lấy danh sách sản phẩm trong lô
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách sản phẩm trong lô thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', getAllLotProducts);

// New cascading-dropdown endpoints — must come BEFORE /:id to avoid shadowing
/**
 * @swagger
 * /api/lot-products/lots:
 *   get:
 *     tags: [Lot Products]
 *     summary: Lấy danh sách lô chứa sản phẩm (có tồn kho > 0)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: internationalProductId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/lots', getLotsByProduct);

/**
 * @swagger
 * /api/lot-products/kien:
 *   get:
 *     tags: [Lot Products]
 *     summary: Lấy danh sách kiện trong lô cho sản phẩm (có tồn kho > 0)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: internationalProductId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: lotId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/kien', getKienByProductAndLot);

/**
 * @swagger
 * /api/lot-products:
 *   post:
 *     tags: [Lot Products]
 *     summary: Thêm sản phẩm vào lô
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
 *         description: Thêm sản phẩm vào lô thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/', addProductToLot);

/**
 * @swagger
 * /api/lot-products/move:
 *   put:
 *     tags: [Lot Products]
 *     summary: Di chuyển sản phẩm giữa các lô
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Di chuyển sản phẩm giữa các lô thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.put('/move', moveProductBetweenLots);

/**
 * @swagger
 * /api/lot-products/{id}:
 *   put:
 *     tags: [Lot Products]
 *     summary: Cập nhật số lượng sản phẩm trong lô
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sản phẩm trong lô
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật số lượng sản phẩm thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy sản phẩm trong lô
 */
router.put('/:id', updateProductQuantity);

/**
 * @swagger
 * /api/lot-products/{id}:
 *   delete:
 *     tags: [Lot Products]
 *     summary: Xóa sản phẩm khỏi lô
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sản phẩm trong lô
 *     responses:
 *       200:
 *         description: Xóa sản phẩm khỏi lô thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy sản phẩm trong lô
 */
router.delete('/:id', removeProductFromLot);

export default router;

