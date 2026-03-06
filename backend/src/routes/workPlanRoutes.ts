import { Router } from 'express';
import workPlanController from '@controllers/workPlanController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads/work-plans');

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
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
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

// GET routes
router.get('/', workPlanController.getAllWorkPlans);
router.get('/:id', workPlanController.getWorkPlanById);

// POST routes - create work plan with multiple file uploads
router.post(
  '/',
  upload.array('files', 10),
  workPlanController.createWorkPlan
);

// PUT routes - update work plan with multiple file uploads
router.put(
  '/:id',
  upload.array('files', 10),
  workPlanController.updateWorkPlan
);

// DELETE routes - only ADMIN and DEPARTMENT_HEAD
router.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  workPlanController.deleteWorkPlan
);

export default router;

