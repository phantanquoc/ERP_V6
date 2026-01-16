import express from 'express';
import {
  getAllDebts,
  getDebtById,
  createDebt,
  updateDebt,
  deleteDebt,
  getDebtSummary,
} from '../controllers/debtController';

const router = express.Router();

// Get all debts
router.get('/', getAllDebts);

// Get debt summary
router.get('/summary', getDebtSummary);

// Get debt by ID
router.get('/:id', getDebtById);

// Create debt
router.post('/', createDebt);

// Update debt
router.put('/:id', updateDebt);

// Delete debt
router.delete('/:id', deleteDebt);

export default router;

