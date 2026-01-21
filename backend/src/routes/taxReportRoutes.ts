import express from 'express';
import {
  getAllTaxReports,
  getTaxReportById,
  getTaxReportByOrderId,
  createTaxReportFromOrder,
  updateTaxReport,
  deleteTaxReport,
} from '../controllers/taxReportController';
import { authenticate } from '../middlewares/auth';
import { createSingleUploadMiddleware } from '../middlewares/upload';

const router = express.Router();

// Upload middleware for tax reports
const uploadTaxReport = createSingleUploadMiddleware('tax-reports');

// All routes require authentication
router.use(authenticate);

// Get all tax reports
router.get('/', getAllTaxReports);

// Get tax report by ID
router.get('/:id', getTaxReportById);

// Get tax report by order ID
router.get('/order/:orderId', getTaxReportByOrderId);

// Create tax report from order
router.post('/order/:orderId', uploadTaxReport, createTaxReportFromOrder);

// Update tax report
router.put('/:id', uploadTaxReport, updateTaxReport);

// Delete tax report
router.delete('/:id', deleteTaxReport);

export default router;

