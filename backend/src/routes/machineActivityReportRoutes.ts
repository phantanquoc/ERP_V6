import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    const uploadDir = 'uploads/machine-reports';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'report-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (_req, file, cb) {
    const allowedTypes = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG'));
    }
  }
});

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

// GET all reports
router.get('/', (_req: Request, res: Response) => {
  res.json(reports);
});

// Export to Excel
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

// GET single report
router.get('/:id', (req: Request, res: Response): void => {
  const report = reports.find(r => r.id === parseInt(req.params.id as string));
  if (!report) {
    res.status(404).json({ message: 'Không tìm thấy báo cáo' });
    return;
  }
  res.json(report);
});

// POST create new report
router.post('/', upload.single('file'), (req: Request, res: Response) => {
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
      fileDinhKem: req.file ? `/uploads/machine-reports/${req.file.filename}` : undefined,
      ngayTao: new Date().toISOString()
    };
    
    reports.push(newReport);
    res.status(201).json(newReport);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi tạo báo cáo', error: (error as Error).message });
  }
});

// PUT update report
router.put('/:id', upload.single('file'), (req: Request, res: Response): void => {
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
      fileDinhKem: req.file ? `/uploads/machine-reports/${req.file.filename}` : reports[reportIndex].fileDinhKem
    };

    reports[reportIndex] = updatedReport;
    res.json(updatedReport);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật báo cáo', error: (error as Error).message });
  }
});

// DELETE report
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

