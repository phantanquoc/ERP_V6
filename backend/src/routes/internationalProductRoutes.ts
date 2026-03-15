import { Router } from 'express';
import internationalProductController from '@controllers/internationalProductController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/international-products:
 *   get:
 *     tags: [International Products]
 *     summary: Danh sách sản phẩm quốc tế
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
 *     responses:
 *       200:
 *         description: Lấy danh sách sản phẩm quốc tế thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', internationalProductController.getAllProducts);

/**
 * @swagger
 * /api/international-products/generate-code:
 *   get:
 *     tags: [International Products]
 *     summary: Tạo mã sản phẩm quốc tế
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tạo mã sản phẩm thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/generate-code', internationalProductController.generateProductCode);

/**
 * @swagger
 * /api/international-products/export/excel:
 *   get:
 *     tags: [International Products]
 *     summary: Xuất Excel danh sách sản phẩm quốc tế
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xuất Excel thành công
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/export/excel', internationalProductController.exportToExcel);

/**
 * @swagger
 * /api/international-products/code/{code}:
 *   get:
 *     tags: [International Products]
 *     summary: Tìm sản phẩm theo mã
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã sản phẩm
 *     responses:
 *       200:
 *         description: Lấy sản phẩm theo mã thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy sản phẩm
 */
router.get('/code/:code', internationalProductController.getProductByCode);

router.get('/categories', internationalProductController.getCategories);

router.put(
  '/categories/rename',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  internationalProductController.renameCategory
);

router.post(
  '/categories/delete',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  internationalProductController.deleteCategory
);

/**
 * @swagger
 * /api/international-products/{id}:
 *   get:
 *     tags: [International Products]
 *     summary: Chi tiết sản phẩm quốc tế
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sản phẩm
 *     responses:
 *       200:
 *         description: Lấy chi tiết sản phẩm thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy sản phẩm
 */
router.get('/:id', internationalProductController.getProductById);

/**
 * @swagger
 * /api/international-products:
 *   post:
 *     tags: [International Products]
 *     summary: Tạo sản phẩm quốc tế
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
 *         description: Tạo sản phẩm thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  internationalProductController.createProduct
);

/**
 * @swagger
 * /api/international-products/{id}:
 *   patch:
 *     tags: [International Products]
 *     summary: Cập nhật sản phẩm quốc tế
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sản phẩm
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật sản phẩm thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy sản phẩm
 */
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  internationalProductController.updateProduct
);

/**
 * @swagger
 * /api/international-products/{id}:
 *   delete:
 *     tags: [International Products]
 *     summary: Xóa sản phẩm quốc tế
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sản phẩm
 *     responses:
 *       200:
 *         description: Xóa sản phẩm thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy sản phẩm
 */
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  internationalProductController.deleteProduct
);

export default router;

