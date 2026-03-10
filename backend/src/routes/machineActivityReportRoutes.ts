import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { createSingleUploadMiddleware, getFileUrl } from '@middlewares/upload';

const router = Router();

// Upload middleware for machine activity reports (single file)
const uploadMachineReport = createSingleUploadMiddleware('machine-reports');

interface MachineActivityReport {
  id: number;
  viTri: string;
  tenHeThong: string;
  tongSoLuong: number;
  soLuongHoatDong: number;
  soLuongNgung: number;
  nguyenNhan: string;
  nguoiBaoCao: string;
  fileDinhKem?: string;
  ngayTao: string;
}

// In-memory storage (replace with database in production)
let reports: MachineActivityReport[] = [];
let nextId = 1;

/**
 * @swagger
 * /api/machine-activity-reports:
 *   get:
 *     tags: [Machine Activity Reports]
 *     summary: Lấy danh sách báo cáo hoạt động máy
 *     responses:
 *       200:
 *         description: Lấy danh sách báo cáo hoạt động máy thành công
 */
router.get('/', (_req: Request, res: Response) => {
  res.json(reports);
});

/**
 * @swagger
 * /api/machine-activity-reports/export/excel:
 *   get:
 *     tags: [Machine Activity Reports]
 *     summary: Xuất báo cáo hoạt động máy ra Excel
 *     responses:
 *       200:
 *         description: Xuất Excel thành công
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Lỗi khi xuất Excel
 */
router.get('/export/excel', async (_req: Request, res: Response) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo hoạt động máy');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Vị trí', key: 'viTri', width: 15 },
      { header: 'Tên hệ thống/thiết bị', key: 'tenHeThong', width: 25 },
      { header: 'Tổng số lượng', key: 'tongSoLuong', width: 15 },
      { header: 'SL hoạt động', key: 'soLuongHoatDong', width: 15 },
      { header: 'SL ngưng', key: 'soLuongNgung', width: 15 },
      { header: 'Nguyên nhân', key: 'nguyenNhan', width: 30 },
      { header: 'Người báo cáo', key: 'nguoiBaoCao', width: 20 },
      { header: 'Ngày tạo', key: 'ngayTao', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    reports.forEach((item, index) => {
      worksheet.addRow({
        stt: index + 1,
        viTri: item.viTri,
        tenHeThong: item.tenHeThong,
        tongSoLuong: item.tongSoLuong,
        soLuongHoatDong: item.soLuongHoatDong,
        soLuongNgung: item.soLuongNgung,
        nguyenNhan: item.nguyenNhan,
        nguoiBaoCao: item.nguoiBaoCao,
        ngayTao: item.ngayTao ? new Date(item.ngayTao).toLocaleDateString('vi-VN') : '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=bao-cao-hoat-dong-may-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xuất Excel', error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/machine-activity-reports/{id}:
 *   get:
 *     tags: [Machine Activity Reports]
 *     summary: Lấy chi tiết báo cáo hoạt động máy theo ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của báo cáo
 *     responses:
 *       200:
 *         description: Lấy chi tiết báo cáo thành công
 *       404:
 *         description: Không tìm thấy báo cáo
 */
router.get('/:id', (req: Request, res: Response): void => {
  const report = reports.find(r => r.id === parseInt(req.params.id as string));
  if (!report) {
    res.status(404).json({ message: 'Không tìm thấy báo cáo' });
    return;
  }
  res.json(report);
});

/**
 * @swagger
 * /api/machine-activity-reports:
 *   post:
 *     tags: [Machine Activity Reports]
 *     summary: Tạo báo cáo hoạt động máy mới
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File đính kèm
 *     responses:
 *       201:
 *         description: Tạo báo cáo thành công
 *       500:
 *         description: Lỗi khi tạo báo cáo
 */
router.post('/', uploadMachineReport, (req: Request, res: Response) => {
  try {
    const { viTri, tenHeThong, tongSoLuong, soLuongHoatDong, soLuongNgung, nguyenNhan, nguoiBaoCao } = req.body;
    
    const newReport: MachineActivityReport = {
      id: nextId++,
      viTri,
      tenHeThong,
      tongSoLuong: parseInt(tongSoLuong),
      soLuongHoatDong: parseInt(soLuongHoatDong),
      soLuongNgung: parseInt(soLuongNgung),
      nguyenNhan,
      nguoiBaoCao,
      fileDinhKem: req.file ? getFileUrl('machine-reports', req.file.filename) : undefined,
      ngayTao: new Date().toISOString()
    };
    
    reports.push(newReport);
    res.status(201).json(newReport);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi tạo báo cáo', error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/machine-activity-reports/{id}:
 *   put:
 *     tags: [Machine Activity Reports]
 *     summary: Cập nhật báo cáo hoạt động máy
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của báo cáo
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File đính kèm
 *     responses:
 *       200:
 *         description: Cập nhật báo cáo thành công
 *       404:
 *         description: Không tìm thấy báo cáo
 *       500:
 *         description: Lỗi khi cập nhật báo cáo
 */
router.put('/:id', uploadMachineReport, (req: Request, res: Response): void => {
  try {
    const reportIndex = reports.findIndex(r => r.id === parseInt(req.params.id as string));
    if (reportIndex === -1) {
      res.status(404).json({ message: 'Không tìm thấy báo cáo' });
      return;
    }

    const { viTri, tenHeThong, tongSoLuong, soLuongHoatDong, soLuongNgung, nguyenNhan, nguoiBaoCao } = req.body;

    const updatedReport: MachineActivityReport = {
      ...reports[reportIndex],
      viTri,
      tenHeThong,
      tongSoLuong: parseInt(tongSoLuong),
      soLuongHoatDong: parseInt(soLuongHoatDong),
      soLuongNgung: parseInt(soLuongNgung),
      nguyenNhan,
      nguoiBaoCao,
      fileDinhKem: req.file ? getFileUrl('machine-reports', req.file.filename) : reports[reportIndex].fileDinhKem
    };

    reports[reportIndex] = updatedReport;
    res.json(updatedReport);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật báo cáo', error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/machine-activity-reports/{id}:
 *   delete:
 *     tags: [Machine Activity Reports]
 *     summary: Xóa báo cáo hoạt động máy
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của báo cáo
 *     responses:
 *       200:
 *         description: Xóa báo cáo thành công
 *       404:
 *         description: Không tìm thấy báo cáo
 *       500:
 *         description: Lỗi khi xóa báo cáo
 */
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const reportIndex = reports.findIndex(r => r.id === parseInt(req.params.id as string));
    if (reportIndex === -1) {
      res.status(404).json({ message: 'Không tìm thấy báo cáo' });
      return;
    }

    // Delete file if exists
    const report = reports[reportIndex];
    if (report.fileDinhKem) {
      const filePath = path.join(__dirname, '../..', report.fileDinhKem);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    reports.splice(reportIndex, 1);
    res.json({ message: 'Xóa báo cáo thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa báo cáo', error: (error as Error).message });
  }
});

export default router;

