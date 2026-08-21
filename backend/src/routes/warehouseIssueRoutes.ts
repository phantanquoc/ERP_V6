import express from 'express';
import {
  generateIssueCode,
  createWarehouseIssue,
  getAllWarehouseIssues,
  getWarehouseIssueById,
  updateWarehouseIssue,
  deleteWarehouseIssue,
  markIssuePrinted,
  exportIssueXlsxHandler,
} from '../controllers/warehouseIssueController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
const router = express.Router();

router.use(authenticate);

router.get('/generate-code', generateIssueCode);

router.post('/', requireRule('warehouse-issues', 'READ'), createWarehouseIssue);

router.get('/', getAllWarehouseIssues);
router.get('/:id', getWarehouseIssueById);
router.get('/:id/export-xlsx', exportIssueXlsxHandler);
router.post('/:id/mark-printed', requireRule('warehouse-issues', 'CREATE'), markIssuePrinted);

router.put('/:id', requireRule('warehouse-issues', 'READ'), updateWarehouseIssue);
router.delete('/:id', requireRule('warehouse-issues', 'READ'), deleteWarehouseIssue);

export default router;

