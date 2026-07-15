import express from 'express';
import {
  generateIssueCode,
  createWarehouseIssue,
  getAllWarehouseIssues,
  getWarehouseIssueById,
  updateWarehouseIssue,
  deleteWarehouseIssue,
} from '../controllers/warehouseIssueController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = express.Router();

router.use(authenticate);

router.get('/generate-code', generateIssueCode);

router.post('/', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), createWarehouseIssue);

router.get('/', getAllWarehouseIssues);
router.get('/:id', getWarehouseIssueById);

router.put('/:id', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), updateWarehouseIssue);
router.delete('/:id', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), deleteWarehouseIssue);

export default router;

