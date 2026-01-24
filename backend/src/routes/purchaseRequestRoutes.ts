import { Router } from 'express';
import purchaseRequestController from '@controllers/purchaseRequestController';
import { authenticate } from '@middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads/purchase-requests');

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
      cb(new Error('Chỉ cho phép upload file: jpeg, jpg, png, gif, pdf, doc, docx, xls, xlsx, txt, zip, rar'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

// Get all purchase requests
router.get('/', purchaseRequestController.getAllPurchaseRequests);

// Generate purchase request code
router.get('/generate-code', purchaseRequestController.generatePurchaseRequestCode);

// Get purchase request by ID
router.get('/:id', purchaseRequestController.getPurchaseRequestById);

// Create purchase request with file upload
router.post('/', upload.single('file'), purchaseRequestController.createPurchaseRequest);

// Update purchase request with file upload
router.put('/:id', upload.single('file'), purchaseRequestController.updatePurchaseRequest);

// Delete purchase request
router.delete('/:id', purchaseRequestController.deletePurchaseRequest);

export default router;

