import { Router } from 'express';
import invoiceController from '@controllers/invoiceController';
import { authenticate } from '@middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     tags: [Invoices]
 *     summary: Danh sách hóa đơn
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
 *         description: Lấy danh sách hóa đơn thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', invoiceController.getAllInvoices);

/**
 * @swagger
 * /api/invoices/export/excel:
 *   get:
 *     tags: [Invoices]
 *     summary: Xuất danh sách hóa đơn ra Excel
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
router.get('/export/excel', invoiceController.exportToExcel);

/**
 * @swagger
 * /api/invoices/generate-code:
 *   post:
 *     tags: [Invoices]
 *     summary: Tạo số hóa đơn
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tạo số hóa đơn thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/generate-code', invoiceController.generateInvoiceNumber);

/**
 * @swagger
 * /api/invoices/{id}:
 *   get:
 *     tags: [Invoices]
 *     summary: Chi tiết hóa đơn
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID hóa đơn
 *     responses:
 *       200:
 *         description: Lấy chi tiết hóa đơn thành công
 *       404:
 *         description: Không tìm thấy hóa đơn
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/:id', invoiceController.getInvoiceById);

/**
 * @swagger
 * /api/invoices:
 *   post:
 *     tags: [Invoices]
 *     summary: Tạo hóa đơn mới
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
 *         description: Tạo hóa đơn thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/', invoiceController.createInvoice);

/**
 * @swagger
 * /api/invoices/{id}:
 *   put:
 *     tags: [Invoices]
 *     summary: Cập nhật hóa đơn
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID hóa đơn
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật hóa đơn thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy hóa đơn
 *       401:
 *         description: Không có quyền truy cập
 */
router.put('/:id', invoiceController.updateInvoice);

/**
 * @swagger
 * /api/invoices/{id}:
 *   delete:
 *     tags: [Invoices]
 *     summary: Xóa hóa đơn
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID hóa đơn
 *     responses:
 *       200:
 *         description: Xóa hóa đơn thành công
 *       404:
 *         description: Không tìm thấy hóa đơn
 *       401:
 *         description: Không có quyền truy cập
 */
router.delete('/:id', invoiceController.deleteInvoice);

export default router;

