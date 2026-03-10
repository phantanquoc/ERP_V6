import express from 'express';
import customerFeedbackService from '../services/customerFeedbackService';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

/**
 * @swagger
 * /api/customer-feedbacks:
 *   get:
 *     tags: [Customer Feedbacks]
 *     summary: Danh sách phản hồi khách hàng
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
 *         description: Lấy danh sách phản hồi thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const filters = {
      trangThaiXuLy: req.query.trangThaiXuLy as string,
      loaiPhanHoi: req.query.loaiPhanHoi as string,
      mucDoNghiemTrong: req.query.mucDoNghiemTrong as string,
      search: req.query.search as string,
      customerType: req.query.customerType as string,
    };

    const feedbacks = await customerFeedbackService.getAllFeedbacks(filters);
    res.json({
      success: true,
      data: feedbacks,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/customer-feedbacks/statistics/summary:
 *   get:
 *     tags: [Customer Feedbacks]
 *     summary: Thống kê phản hồi khách hàng
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thống kê phản hồi thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/statistics/summary', authenticate, async (_req, res) => {
  try {
    const stats = await customerFeedbackService.getStatistics();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/customer-feedbacks/export/excel:
 *   get:
 *     tags: [Customer Feedbacks]
 *     summary: Xuất danh sách phản hồi khách hàng ra Excel
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
router.get('/export/excel', authenticate, async (req, res) => {
  try {
    const filters = {
      trangThaiXuLy: req.query.trangThaiXuLy as string,
      loaiPhanHoi: req.query.loaiPhanHoi as string,
      mucDoNghiemTrong: req.query.mucDoNghiemTrong as string,
      search: req.query.search as string,
      customerType: req.query.customerType as string,
    };

    const buffer = await customerFeedbackService.exportToExcel(filters);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=danh-sach-phan-hoi-khach-hang-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/customer-feedbacks/{id}:
 *   get:
 *     tags: [Customer Feedbacks]
 *     summary: Chi tiết phản hồi khách hàng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID phản hồi
 *     responses:
 *       200:
 *         description: Lấy chi tiết phản hồi thành công
 *       404:
 *         description: Không tìm thấy phản hồi
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const feedback = await customerFeedbackService.getFeedbackById(req.params.id as string);
    res.json({
      success: true,
      data: feedback,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/customer-feedbacks:
 *   post:
 *     tags: [Customer Feedbacks]
 *     summary: Tạo phản hồi khách hàng mới
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
 *         description: Tạo phản hồi thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const feedback = await customerFeedbackService.createFeedback(req.body);
    res.status(201).json({
      success: true,
      data: feedback,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/customer-feedbacks/{id}:
 *   put:
 *     tags: [Customer Feedbacks]
 *     summary: Cập nhật phản hồi khách hàng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID phản hồi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật phản hồi thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy phản hồi
 *       401:
 *         description: Không có quyền truy cập
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const feedback = await customerFeedbackService.updateFeedback(req.params.id as string, req.body);
    res.json({
      success: true,
      data: feedback,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/customer-feedbacks/{id}:
 *   delete:
 *     tags: [Customer Feedbacks]
 *     summary: Xóa phản hồi khách hàng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID phản hồi
 *     responses:
 *       200:
 *         description: Xóa phản hồi thành công
 *       404:
 *         description: Không tìm thấy phản hồi
 *       401:
 *         description: Không có quyền truy cập
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await customerFeedbackService.deleteFeedback(req.params.id as string);
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
});

export default router;

