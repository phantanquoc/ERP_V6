import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    const uploadDir = 'uploads/machine-systems';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'system-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
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

interface MachineSystem {
  id: number;
  khuVuc: string;
  viTri: string;
  maHeThong: string;
  tenHeThong: string;
  chucNang: string;
  maThietBi: string;
  tenThietBi: string;
  nhiemVu: string;
  maNguoiThucHien: string;
  nguoiThucHien: string;
  fileDinhKem?: string;
  ngayTao: string;
}

let machineSystems: MachineSystem[] = [];
let nextId = 1;

// GET all machine systems
router.get('/', (_req: Request, res: Response) => {
  res.json(machineSystems);
});

// Export to Excel
router.get('/export/excel', async (_req: Request, res: Response) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách hệ thống máy');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Khu vực', key: 'khuVuc', width: 15 },
      { header: 'Vị trí', key: 'viTri', width: 15 },
      { header: 'Mã hệ thống', key: 'maHeThong', width: 15 },
      { header: 'Tên hệ thống', key: 'tenHeThong', width: 20 },
      { header: 'Chức năng', key: 'chucNang', width: 20 },
      { header: 'Mã thiết bị', key: 'maThietBi', width: 15 },
      { header: 'Tên thiết bị', key: 'tenThietBi', width: 20 },
      { header: 'Nhiệm vụ', key: 'nhiemVu', width: 20 },
      { header: 'Mã NTH', key: 'maNguoiThucHien', width: 15 },
      { header: 'Người thực hiện', key: 'nguoiThucHien', width: 20 },
      { header: 'Ngày tạo', key: 'ngayTao', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    machineSystems.forEach((item, index) => {
      worksheet.addRow({
        stt: index + 1,
        khuVuc: item.khuVuc,
        viTri: item.viTri,
        maHeThong: item.maHeThong,
        tenHeThong: item.tenHeThong,
        chucNang: item.chucNang,
        maThietBi: item.maThietBi,
        tenThietBi: item.tenThietBi,
        nhiemVu: item.nhiemVu,
        maNguoiThucHien: item.maNguoiThucHien,
        nguoiThucHien: item.nguoiThucHien,
        ngayTao: item.ngayTao ? new Date(item.ngayTao).toLocaleDateString('vi-VN') : '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=danh-sach-he-thong-may-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xuất Excel', error: (error as Error).message });
  }
});

// GET single machine system
router.get('/:id', (req: Request, res: Response): void => {
  const system = machineSystems.find(s => s.id === parseInt(req.params.id as string));
  if (!system) {
    res.status(404).json({ message: 'Không tìm thấy hệ thống' });
    return;
  }
  res.json(system);
});

// POST create new machine system
router.post('/', upload.single('file'), (req: Request, res: Response) => {
  const newSystem: MachineSystem = {
    id: nextId++,
    khuVuc: req.body.khuVuc || '',
    viTri: req.body.viTri || '',
    maHeThong: req.body.maHeThong || '',
    tenHeThong: req.body.tenHeThong || '',
    chucNang: req.body.chucNang || '',
    maThietBi: req.body.maThietBi || '',
    tenThietBi: req.body.tenThietBi || '',
    nhiemVu: req.body.nhiemVu || '',
    maNguoiThucHien: req.body.maNguoiThucHien || '',
    nguoiThucHien: req.body.nguoiThucHien || '',
    fileDinhKem: req.file ? `/uploads/machine-systems/${req.file.filename}` : undefined,
    ngayTao: new Date().toISOString()
  };
  machineSystems.push(newSystem);
  res.status(201).json(newSystem);
});

// PUT update machine system
router.put('/:id', upload.single('file'), (req: Request, res: Response): void => {
  const index = machineSystems.findIndex(s => s.id === parseInt(req.params.id as string));
  if (index === -1) {
    res.status(404).json({ message: 'Không tìm thấy hệ thống' });
    return;
  }

  const existingSystem = machineSystems[index];
  machineSystems[index] = {
    ...existingSystem,
    khuVuc: req.body.khuVuc || existingSystem.khuVuc,
    viTri: req.body.viTri || existingSystem.viTri,
    maHeThong: req.body.maHeThong || existingSystem.maHeThong,
    tenHeThong: req.body.tenHeThong || existingSystem.tenHeThong,
    chucNang: req.body.chucNang || existingSystem.chucNang,
    maThietBi: req.body.maThietBi || existingSystem.maThietBi,
    tenThietBi: req.body.tenThietBi || existingSystem.tenThietBi,
    nhiemVu: req.body.nhiemVu || existingSystem.nhiemVu,
    maNguoiThucHien: req.body.maNguoiThucHien || existingSystem.maNguoiThucHien,
    nguoiThucHien: req.body.nguoiThucHien || existingSystem.nguoiThucHien,
    fileDinhKem: req.file ? `/uploads/machine-systems/${req.file.filename}` : existingSystem.fileDinhKem
  };
  res.json(machineSystems[index]);
});

// DELETE machine system
router.delete('/:id', (req: Request, res: Response): void => {
  const index = machineSystems.findIndex(s => s.id === parseInt(req.params.id as string));
  if (index === -1) {
    res.status(404).json({ message: 'Không tìm thấy hệ thống' });
    return;
  }

  const deleted = machineSystems.splice(index, 1)[0];
  if (deleted.fileDinhKem) {
    const filePath = path.join(process.cwd(), deleted.fileDinhKem.replace('/uploads/', 'uploads/'));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  res.json({ message: 'Đã xóa thành công' });
});

export default router;

