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
  voidWarehouseIssue,
  unvoidWarehouseIssue,
} from '../controllers/warehouseIssueController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
import { zodValidate, zodValidateQuery } from '@middlewares/zodValidation';
import { createIssueSchema, updateIssueSchema, voidIssueSchema, warehouseIssueListQuerySchema } from '@schemas';
const router = express.Router();

router.use(authenticate);

router.get('/generate-code', generateIssueCode);

router.post('/', requireRule('warehouse-issues', 'CREATE'), zodValidate(createIssueSchema), createWarehouseIssue);

router.get('/', zodValidateQuery(warehouseIssueListQuerySchema), getAllWarehouseIssues);
router.get('/:id', getWarehouseIssueById);
router.get('/:id/export-xlsx', exportIssueXlsxHandler);
router.post('/:id/mark-printed', requireRule('warehouse-issues', 'CREATE'), markIssuePrinted);

router.put('/:id', requireRule('warehouse-issues', 'UPDATE'), zodValidate(updateIssueSchema), updateWarehouseIssue);
router.delete('/:id', requireRule('warehouse-issues', 'DELETE'), deleteWarehouseIssue);
router.post('/:id/void', requireRule('warehouse-issues', 'DELETE'), zodValidate(voidIssueSchema), voidWarehouseIssue);
router.post('/:id/unvoid', requireRule('warehouse-issues', 'DELETE'), unvoidWarehouseIssue);

export default router;

