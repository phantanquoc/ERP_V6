import express from 'express';
import { privateFeedbackController } from '../controllers/privateFeedbackController';
import { authenticate } from '@middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file upload
const uploadDir = 'uploads/feedbacks';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file: JPG, PNG, GIF, PDF, DOC, DOCX, XLS, XLSX, TXT'));
    }
  }
});

// Tất cả routes đều cần authentication
router.use(authenticate);

// GET /api/private-feedbacks/stats - Thống kê (phải đặt trước /:id)
router.get('/stats', privateFeedbackController.getStats);

// POST /api/private-feedbacks/generate-code - Tạo mã tự động
router.post('/generate-code', privateFeedbackController.generateCode);

// GET /api/private-feedbacks/code/:code - Lấy theo code
router.get('/code/:code', privateFeedbackController.getByCode);

// GET /api/private-feedbacks - Lấy tất cả
router.get('/', privateFeedbackController.getAll);

// GET /api/private-feedbacks/:id - Lấy theo ID
router.get('/:id', privateFeedbackController.getById);

// POST /api/private-feedbacks - Tạo mới (với upload files)
router.post('/', upload.array('files', 5), privateFeedbackController.create);

// PATCH /api/private-feedbacks/:id - Cập nhật
router.patch('/:id', privateFeedbackController.update);

// DELETE /api/private-feedbacks/:id - Xóa
router.delete('/:id', privateFeedbackController.delete);

export default router;

