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
import { zodValidate } from '@middlewares/zodValidation';
import { createIssueSchema, updateIssueSchema } from '@schemas';
const router = express.Router();

router.use(authenticate);

router.get('/generate-code', generateIssueCode);

router.post('/', requireRule('warehouse-issues', 'CREATE'), zodValidate(createIssueSchema), createWarehouseIssue);

router.get('/', getAllWarehouseIssues);
router.get('/:id', getWarehouseIssueById);
router.get('/:id/export-xlsx', exportIssueXlsxHandler);
router.post('/:id/mark-printed', requireRule('warehouse-issues', 'CREATE'), markIssuePrinted);

router.put('/:id', requireRule('warehouse-issues', 'UPDATE'), zodValidate(updateIssueSchema), updateWarehouseIssue);
router.delete('/:id', requireRule('warehouse-issues', 'DELETE'), deleteWarehouseIssue);

export default router;

