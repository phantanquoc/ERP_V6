import { Router } from 'express';
import internationalCustomerController from '@controllers/internationalCustomerController';
import { authenticate, authorize } from '@middlewares/auth';
import { zodValidate } from '@middlewares/zodValidation';
import { createCustomerSchema, updateCustomerSchema } from '@schemas';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/international-customers:
 *   get:
 *     tags: [International Customers]
 *     summary: Danh sách khách hàng quốc tế
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
 *         description: Lấy danh sách khách hàng quốc tế thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/',
  internationalCustomerController.getAllCustomers
);

/**
 * @swagger
 * /api/international-customers/generate-code:
 *   post:
 *     tags: [International Customers]
 *     summary: Tạo mã khách hàng (quốc tế hoặc nội địa)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [international, domestic]
 *                 default: international
 *                 description: Loại khách hàng (international → KH-INT, domestic → KH-ND)
 *     responses:
 *       200:
 *         description: Tạo mã khách hàng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.post('/generate-code',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  internationalCustomerController.generateCustomerCode
);

/**
 * @swagger
 * /api/international-customers/export/excel:
 *   get:
 *     tags: [International Customers]
 *     summary: Xuất Excel danh sách khách hàng quốc tế
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
router.get('/export/excel',
  internationalCustomerController.exportToExcel
);

/**
 * @swagger
 * /api/international-customers/code/{code}:
 *   get:
 *     tags: [International Customers]
 *     summary: Tìm khách hàng theo mã
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã khách hàng
 *     responses:
 *       200:
 *         description: Lấy khách hàng theo mã thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy khách hàng
 */
router.get('/code/:code',
  internationalCustomerController.getCustomerByCode
);

/**
 * @swagger
 * /api/international-customers/{id}:
 *   get:
 *     tags: [International Customers]
 *     summary: Chi tiết khách hàng quốc tế
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của khách hàng
 *     responses:
 *       200:
 *         description: Lấy chi tiết khách hàng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy khách hàng
 */
router.get('/:id',
  internationalCustomerController.getCustomerById
);

/**
 * @swagger
 * /api/international-customers:
 *   post:
 *     tags: [International Customers]
 *     summary: Tạo khách hàng quốc tế
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
 *         description: Tạo khách hàng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.post('/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  zodValidate(createCustomerSchema),
  internationalCustomerController.createCustomer
);

/**
 * @swagger
 * /api/international-customers/{id}:
 *   patch:
 *     tags: [International Customers]
 *     summary: Cập nhật khách hàng quốc tế
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của khách hàng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật khách hàng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy khách hàng
 */
router.patch('/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  zodValidate(updateCustomerSchema),
  internationalCustomerController.updateCustomer
);

/**
 * @swagger
 * /api/international-customers/{id}:
 *   delete:
 *     tags: [International Customers]
 *     summary: Xóa khách hàng quốc tế
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của khách hàng
 *     responses:
 *       200:
 *         description: Xóa khách hàng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy khách hàng
 */
router.delete('/:id',
  authorize(UserRole.ADMIN),
  internationalCustomerController.deleteCustomer
);

export default router;

