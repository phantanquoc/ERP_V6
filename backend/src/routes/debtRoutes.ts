import express from 'express';
import {
  getAllDebts,
  getDebtById,
  createDebt,
  updateDebt,
  deleteDebt,
  getDebtSummary,
} from '../controllers/debtController';
import { createSingleUploadMiddleware } from '../middlewares/upload';

const router = express.Router();

// Upload middleware for debts
const uploadDebt = createSingleUploadMiddleware('debts');

// Get all debts
router.get('/', getAllDebts);

// Get debt summary
router.get('/summary', getDebtSummary);

// Get debt by ID
router.get('/:id', getDebtById);

// Create debt
router.post('/', uploadDebt, createDebt);

// Update debt
router.put('/:id', uploadDebt, updateDebt);

// Delete debt
router.delete('/:id', deleteDebt);

export default router;

