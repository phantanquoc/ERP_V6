import { Router } from 'express';
import acceptanceHandoverController from '@controllers/acceptanceHandoverController';
import { authenticate } from '@middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads/acceptance-handovers');

// Create upload directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
  fileFilter: (_req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh, PDF, Word, Excel, Text, ZIP, RAR'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

// GET routes
router.get('/', acceptanceHandoverController.getAllAcceptanceHandovers);
router.get('/generate-code', acceptanceHandoverController.generateAcceptanceHandoverCode);
router.get('/:id', acceptanceHandoverController.getAcceptanceHandoverById);

// POST routes
router.post('/', upload.single('file'), acceptanceHandoverController.createAcceptanceHandover);

// PUT routes
router.put('/:id', upload.single('file'), acceptanceHandoverController.updateAcceptanceHandover);

// DELETE routes
router.delete('/:id', acceptanceHandoverController.deleteAcceptanceHandover);

export default router;

