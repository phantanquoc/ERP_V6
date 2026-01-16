import express from 'express';
import {
  getCalculatorByQuotationRequestId,
  upsertCalculator,
  deleteCalculator,
  createQuotationFromCalculator,
} from '../controllers/quotationCalculatorController';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get calculator by quotation request ID
router.get('/quotation-request/:quotationRequestId', getCalculatorByQuotationRequestId);

// Create or update calculator
router.post('/', upsertCalculator);

// Create quotation from calculator
router.post('/quotation-request/:quotationRequestId/create-quotation', createQuotationFromCalculator);

// Delete calculator
router.delete('/quotation-request/:quotationRequestId', deleteCalculator);

export default router;

