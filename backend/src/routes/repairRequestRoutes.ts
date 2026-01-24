import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import repairRequestController from '@controllers/repairRequestController';
import { authenticate } from '@middlewares/auth';

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

// Routes - All routes require authentication
router.get('/', authenticate, repairRequestController.getAllRepairRequests);
router.get('/generate-code', authenticate, repairRequestController.generateCode);
router.get('/:id', authenticate, repairRequestController.getRepairRequestById);
router.post('/', authenticate, upload.single('file'), repairRequestController.createRepairRequest);
router.put('/:id', authenticate, upload.single('file'), repairRequestController.updateRepairRequest);
router.delete('/:id', authenticate, repairRequestController.deleteRepairRequest);

export default router;

