import { Router } from 'express';
import { supplierController } from '../controllers/supplierController';

const router = Router();

/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     summary: Lấy danh sách nhà cung cấp
 *     description: Lấy tất cả nhà cung cấp có phân trang
 *     tags: [Suppliers]
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
 *     responses:
 *       200:
 *         description: Lấy danh sách nhà cung cấp thành công
 */
router.get('/', supplierController.getAllSuppliers);

/**
 * @swagger
 * /api/suppliers/generate-code:
 *   get:
 *     summary: Tạo mã nhà cung cấp
 *     description: Tự động tạo mã nhà cung cấp tiếp theo
 *     tags: [Suppliers]
 *     responses:
 *       200:
 *         description: Tạo mã thành công
 */
router.get('/generate-code', supplierController.generateCode);

/**
 * @swagger
 * /api/suppliers/export/excel:
 *   get:
 *     summary: Xuất nhà cung cấp ra Excel
 *     description: Xuất danh sách nhà cung cấp ra file Excel
 *     tags: [Suppliers]
 *     responses:
 *       200:
 *         description: Xuất file Excel thành công
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/excel', supplierController.exportToExcel);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   get:
 *     summary: Lấy nhà cung cấp theo ID
 *     description: Lấy chi tiết một nhà cung cấp theo ID
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của nhà cung cấp
 *     responses:
 *       200:
 *         description: Lấy nhà cung cấp thành công
 *       404:
 *         description: Không tìm thấy nhà cung cấp
 */
router.get('/:id', supplierController.getSupplierById);

/**
 * @swagger
 * /api/suppliers:
 *   post:
 *     summary: Tạo nhà cung cấp mới
 *     description: Tạo một nhà cung cấp mới
 *     tags: [Suppliers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Tạo nhà cung cấp thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/', supplierController.createSupplier);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   put:
 *     summary: Cập nhật nhà cung cấp
 *     description: Cập nhật thông tin nhà cung cấp theo ID
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của nhà cung cấp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật nhà cung cấp thành công
 *       404:
 *         description: Không tìm thấy nhà cung cấp
 */
router.put('/:id', supplierController.updateSupplier);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   delete:
 *     summary: Xóa nhà cung cấp
 *     description: Xóa một nhà cung cấp theo ID
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của nhà cung cấp
 *     responses:
 *       200:
 *         description: Xóa nhà cung cấp thành công
 *       404:
 *         description: Không tìm thấy nhà cung cấp
 */
router.delete('/:id', supplierController.deleteSupplier);

export default router;

