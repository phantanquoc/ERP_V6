import { Response } from 'express';
import type { AuthenticatedRequest } from '@types';
import * as ruleService from '@services/ruleService';

export const listRules = async (req: AuthenticatedRequest, res: Response) => {
  const { resourceCode, action, scope, departmentId, subDepartmentId, positionId, role, isActive } = req.query as Record<string, string>;
  const data = await ruleService.listRules({
    resourceCode, action, scope, departmentId, subDepartmentId, positionId, role,
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
  });
  res.json({ success: true, data });
};

export const getRuleById = async (req: AuthenticatedRequest, res: Response) => {
  const data = await ruleService.getRuleById(req.params.id);
  res.json({ success: true, data });
};

export const createRule = async (req: AuthenticatedRequest, res: Response) => {
  const data = await ruleService.createRule({ ...req.body, actorId: req.user?.id ?? null });
  res.status(201).json({ success: true, data, message: 'Tạo rule thành công' });
};

export const updateRule = async (req: AuthenticatedRequest, res: Response) => {
  const data = await ruleService.updateRule(req.params.id, { ...req.body, actorId: req.user?.id ?? null });
  res.json({ success: true, data, message: 'Cập nhật rule thành công' });
};

export const deleteRule = async (req: AuthenticatedRequest, res: Response) => {
  await ruleService.deleteRule(req.params.id, req.user?.id ?? null);
  res.json({ success: true, message: 'Xóa rule thành công' });
};

export const getMatrix = async (req: AuthenticatedRequest, res: Response) => {
  const { positionId, departmentId, subDepartmentId } = req.query as Record<string, string>;
  const data = await ruleService.getMatrix({ positionId, departmentId, subDepartmentId });
  res.json({ success: true, data });
};

export const getMyPermissions = async (req: AuthenticatedRequest, res: Response) => {
  const data = await ruleService.getMyPermissions(req.user!.id);
  res.json({ success: true, data });
};

export const listResources = async (_req: AuthenticatedRequest, res: Response) => {
  const data = await ruleService.listResources();
  res.json({ success: true, data });
};

export const listRuleAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  const { ruleId, page, limit } = req.query as Record<string, string>;
  const data = await ruleService.listRuleAuditLogs({ ruleId, page: page ? parseInt(page, 10) : undefined, limit: limit ? parseInt(limit, 10) : undefined });
  res.json({ success: true, ...data });
};

export const listDelegations = async (req: AuthenticatedRequest, res: Response) => {
  const { fromUserId, toUserId, isActive } = req.query as Record<string, string>;
  const data = await ruleService.listDelegations({
    fromUserId, toUserId,
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
  });
  res.json({ success: true, data });
};

export const createDelegation = async (req: AuthenticatedRequest, res: Response) => {
  const data = await ruleService.createDelegation({ ...req.body, createdBy: req.user?.id ?? null });
  res.status(201).json({ success: true, data, message: 'Tạo ủy quyền thành công' });
};

export const revokeDelegation = async (req: AuthenticatedRequest, res: Response) => {
  const data = await ruleService.revokeDelegation(req.params.id);
  res.json({ success: true, data, message: 'Đã thu hồi ủy quyền' });
};
