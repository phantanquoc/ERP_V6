import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    const uploadDir = 'uploads/repair-requests';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'request-' + uniqueSuffix + path.extname(file.originalname));
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

interface RepairRequest {
  id: number;
  ngayThang: string;
  maYeuCau: string;
  tenHeThong: string;
  tinhTrangThietBi: string;
  loaiLoi: string;
  mucDoUuTien: string;
  noiDungLoi: string;
  ghiChu: string;
  trangThai: string;
  fileDinhKem?: string;
  ngayTao: string;
}

// In-memory storage (replace with database in production)
let requests: RepairRequest[] = [];
let nextId = 1;

// GET all requests
router.get('/', (_req: Request, res: Response): void => {
  res.json(requests);
});

// GET single request
router.get('/:id', (req: Request, res: Response): void => {
  const request = requests.find(r => r.id === parseInt(req.params.id));
  if (!request) {
    res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
    return;
  }
  res.json(request);
});

// POST create new request
router.post('/', upload.single('file'), (req: Request, res: Response): void => {
  try {
    const { ngayThang, maYeuCau, tenHeThong, tinhTrangThietBi, loaiLoi, mucDoUuTien, noiDungLoi, ghiChu, trangThai } = req.body;

    const newRequest: RepairRequest = {
      id: nextId++,
      ngayThang,
      maYeuCau,
      tenHeThong,
      tinhTrangThietBi,
      loaiLoi,
      mucDoUuTien,
      noiDungLoi,
      ghiChu,
      trangThai,
      fileDinhKem: req.file ? `/uploads/repair-requests/${req.file.filename}` : undefined,
      ngayTao: new Date().toISOString()
    };

    requests.push(newRequest);
    res.status(201).json(newRequest);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi tạo yêu cầu', error: (error as Error).message });
  }
});

// PUT update request
router.put('/:id', upload.single('file'), (req: Request, res: Response): void => {
  try {
    const requestIndex = requests.findIndex(r => r.id === parseInt(req.params.id));
    if (requestIndex === -1) {
      res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
      return;
    }
    
    const { ngayThang, maYeuCau, tenHeThong, tinhTrangThietBi, loaiLoi, mucDoUuTien, noiDungLoi, ghiChu, trangThai } = req.body;

    const updatedRequest: RepairRequest = {
      ...requests[requestIndex],
      ngayThang,
      maYeuCau,
      tenHeThong,
      tinhTrangThietBi,
      loaiLoi,
      mucDoUuTien,
      noiDungLoi,
      ghiChu,
      trangThai,
      fileDinhKem: req.file ? `/uploads/repair-requests/${req.file.filename}` : requests[requestIndex].fileDinhKem
    };
    
    requests[requestIndex] = updatedRequest;
    res.json(updatedRequest);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật yêu cầu', error: (error as Error).message });
  }
});

// DELETE request
router.delete('/:id', (req: Request, res: Response): void => {
  try {
    const requestIndex = requests.findIndex(r => r.id === parseInt(req.params.id));
    if (requestIndex === -1) {
      res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
      return;
    }
    
    // Delete file if exists
    const request = requests[requestIndex];
    if (request.fileDinhKem) {
      const filePath = path.join(__dirname, '../..', request.fileDinhKem);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    requests.splice(requestIndex, 1);
    res.json({ message: 'Xóa yêu cầu thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa yêu cầu', error: (error as Error).message });
  }
});

export default router;

