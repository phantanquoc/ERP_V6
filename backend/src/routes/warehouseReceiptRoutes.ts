import express from 'express';
import {
  generateReceiptCode,
  createWarehouseReceipt,
  getAllWarehouseReceipts,
} from '../controllers/warehouseReceiptController';
import { authenticate } from '@middlewares/auth';

const router = express.Router();

router.get('/generate-code', authenticate, generateReceiptCode);
router.post('/', authenticate, createWarehouseReceipt);
router.get('/', authenticate, getAllWarehouseReceipts);

export default router;

