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
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = express.Router();

router.use(authenticate);

router.get('/generate-code', generateIssueCode);

router.post('/', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), createWarehouseIssue);

router.get('/', getAllWarehouseIssues);
router.get('/:id', getWarehouseIssueById);
router.get('/:id/export-xlsx', exportIssueXlsxHandler);
router.post('/:id/mark-printed', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), markIssuePrinted);

router.put('/:id', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), updateWarehouseIssue);
router.delete('/:id', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), deleteWarehouseIssue);

export default router;

