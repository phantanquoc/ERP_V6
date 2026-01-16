import express from 'express';
import {
  generateIssueCode,
  createWarehouseIssue,
  getAllWarehouseIssues,
} from '../controllers/warehouseIssueController';
import { authenticate } from '@middlewares/auth';

const router = express.Router();

router.get('/generate-code', authenticate, generateIssueCode);
router.post('/', authenticate, createWarehouseIssue);
router.get('/', authenticate, getAllWarehouseIssues);

export default router;

