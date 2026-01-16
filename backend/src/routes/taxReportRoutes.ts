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

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all tax reports
router.get('/', getAllTaxReports);

// Get tax report by ID
router.get('/:id', getTaxReportById);

// Get tax report by order ID
router.get('/order/:orderId', getTaxReportByOrderId);

// Create tax report from order
router.post('/order/:orderId', createTaxReportFromOrder);

// Update tax report
router.put('/:id', updateTaxReport);

// Delete tax report
router.delete('/:id', deleteTaxReport);

export default router;

