import { Router } from 'express';
import internationalProductController from '@controllers/internationalProductController';
import { authenticate, deviceOrJwtAuth } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
const router = Router();

// Kiosk-accessible endpoint — accept device key OR JWT (must be before router.use(authenticate))
router.get('/raw-materials', deviceOrJwtAuth('DATA_ENTRY'), internationalProductController.getRawMaterials);

// All remaining routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/international-products:
 *   get:
 *     tags: [International Products]
 *     summary: Danh sách hàng hóa quốc tế
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
 *         description: Lấy danh sách hàng hóa quốc tế thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', requireRule('international-products', 'READ'), internationalProductController.getAllProducts);

/**
 * @swagger
 * /api/international-products/generate-code:
 *   get:
 *     tags: [International Products]
 *     summary: Tạo mã hàng hóa quốc tế
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tạo mã hàng hóa thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/generate-code', requireRule('international-products', 'READ'), internationalProductController.generateProductCode);

/**
 * @swagger
 * /api/international-products/export/excel:
 *   get:
 *     tags: [International Products]
 *     summary: Xuất Excel danh sách hàng hóa quốc tế
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
router.get('/export/excel', requireRule('international-products', 'EXPORT'), internationalProductController.exportToExcel);

/**
 * @swagger
 * /api/international-products/code/{code}:
 *   get:
 *     tags: [International Products]
 *     summary: Tìm hàng hóa theo mã
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã hàng hóa
 *     responses:
 *       200:
 *         description: Lấy hàng hóa theo mã thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy hàng hóa
 */
router.get('/code/:code', requireRule('international-products', 'READ'), internationalProductController.getProductByCode);

router.get('/categories', requireRule('international-products', 'READ'), internationalProductController.getCategories);

router.post(
  '/categories',
  requireRule('international-products', 'READ'),
  internationalProductController.addCategory
);

// Read-only preview of the code rewrites a rename would perform. POST because it takes
// a body, not because it mutates anything.
router.post(
  '/categories/rename-preview',
  requireRule('international-products', 'CREATE'),
  internationalProductController.previewRenameCategory
);

router.put(
  '/categories/rename',
  requireRule('international-products', 'UPDATE'),
  internationalProductController.renameCategory
);

router.post(
  '/categories/delete',
  requireRule('international-products', 'CREATE'),
  internationalProductController.deleteCategory
);

/**
 * @swagger
 * /api/international-products/{id}:
 *   get:
 *     tags: [International Products]
 *     summary: Chi tiết hàng hóa quốc tế
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của hàng hóa
 *     responses:
 *       200:
 *         description: Lấy chi tiết hàng hóa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy hàng hóa
 */
router.get('/:id/stock', requireRule('international-products', 'READ'), internationalProductController.getStockSummary);

router.get('/:id', requireRule('international-products', 'READ'), internationalProductController.getProductById);

/**
 * @swagger
 * /api/international-products:
 *   post:
 *     tags: [International Products]
 *     summary: Tạo hàng hóa quốc tế
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
 *         description: Tạo hàng hóa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.post(
  '/',
  requireRule('international-products', 'CREATE'),
  internationalProductController.createProduct
);

/**
 * @swagger
 * /api/international-products/{id}:
 *   patch:
 *     tags: [International Products]
 *     summary: Cập nhật hàng hóa quốc tế
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của hàng hóa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật hàng hóa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy hàng hóa
 */
router.patch(
  '/:id',
  requireRule('international-products', 'UPDATE'),
  internationalProductController.updateProduct
);

/**
 * @swagger
 * /api/international-products/{id}:
 *   delete:
 *     tags: [International Products]
 *     summary: Xóa hàng hóa quốc tế
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của hàng hóa
 *     responses:
 *       200:
 *         description: Xóa hàng hóa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy hàng hóa
 */
router.delete(
  '/:id',
  requireRule('international-products', 'DELETE'),
  internationalProductController.deleteProduct
);

export default router;

