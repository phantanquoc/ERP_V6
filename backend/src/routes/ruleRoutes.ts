import { Router } from 'express';
import { authenticate, authorize } from '@middlewares/auth';
import * as ruleController from '@controllers/ruleController';
import { z } from 'zod';
import { zodValidate } from '@middlewares/zodValidation';

const router = Router();

const createRuleSchema = z.object({
  resourceCode: z.string().min(1),
  action: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT', 'IMPORT']),
  scope: z.enum(['GLOBAL', 'DEPARTMENT', 'SUB_DEPARTMENT']),
  departmentId: z.string().nullable().optional(),
  subDepartmentId: z.string().nullable().optional(),
  positionId: z.string().nullable().optional(),
  role: z.enum(['ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'EMPLOYEE']).nullable().optional(),
  allow: z.boolean(),
  isActive: z.boolean().optional(),
  responsibilityId: z.string().nullable().optional(),
});

const updateRuleSchema = z.object({
  allow: z.boolean().optional(),
  isActive: z.boolean().optional(),
  responsibilityId: z.string().nullable().optional(),
});

const delegationSchema = z.object({
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
  resourceCode: z.string().min(1),
  action: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT', 'IMPORT']),
  departmentId: z.string().nullable().optional(),
  subDepartmentId: z.string().nullable().optional(),
  from: z.string().min(1),
  to: z.string().min(1),
});

// All routes require auth
router.use(authenticate);

// Resources catalog
router.get('/resources', ruleController.listResources);

// My permissions (any authenticated user)
router.get('/my-permissions', ruleController.getMyPermissions);

// Matrix
router.get('/matrix', authorize('ADMIN', 'DEPARTMENT_HEAD'), ruleController.getMatrix);

// Audit log
router.get('/audit-log', authorize('ADMIN'), ruleController.listRuleAuditLogs);

// Delegations
router.get('/delegations', authorize('ADMIN', 'DEPARTMENT_HEAD'), ruleController.listDelegations);
router.post('/delegations', authorize('ADMIN', 'DEPARTMENT_HEAD'), zodValidate(delegationSchema), ruleController.createDelegation);
router.patch('/delegations/:id/revoke', authorize('ADMIN', 'DEPARTMENT_HEAD'), ruleController.revokeDelegation);

// Rules CRUD — ADMIN only
router.get('/', authorize('ADMIN', 'DEPARTMENT_HEAD'), ruleController.listRules);
router.get('/:id', authorize('ADMIN', 'DEPARTMENT_HEAD'), ruleController.getRuleById);
router.post('/', authorize('ADMIN'), zodValidate(createRuleSchema), ruleController.createRule);
router.patch('/:id', authorize('ADMIN'), zodValidate(updateRuleSchema), ruleController.updateRule);
router.delete('/:id', authorize('ADMIN'), ruleController.deleteRule);

export default router;
