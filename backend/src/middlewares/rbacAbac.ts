import { Response, NextFunction } from 'express';
import prisma from '@config/database';
import type { AuthenticatedRequest } from '@types';
import logger from '@config/logger';

export interface AccessControlOptions {
  allowedRoles?: string[];
  checkDepartment?: boolean;
  checkSubDepartment?: boolean;
}

export const checkAccess = (options: AccessControlOptions = {}) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Chưa xác thực' });
        return;
      }

      const { allowedRoles = [], checkDepartment = false, checkSubDepartment = false } = options;

      if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
        res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Không đủ quyền' });
        return;
      }

      if (req.user.role === 'ADMIN') {
        next();
        return;
      }

      if (checkDepartment || checkSubDepartment) {
        if (req.user.departmentId !== undefined) {
          req.userDepartmentId = req.user.departmentId;
          // Build array of all department IDs (primary + secondary)
          req.userDepartmentIds = [
            req.user.departmentId,
            ...(req.user.secondaryDepartments?.map(s => s.departmentId) ?? []),
          ].filter(Boolean) as string[];
          if (req.user.subDepartmentId !== undefined) {
            req.userSubDepartmentId = req.user.subDepartmentId;
          } else {
            const emp = await prisma.employee.findUnique({
              where: { userId: req.user.id },
              select: { subDepartmentId: true },
            });
            if (!emp) {
              res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Không tìm thấy nhân viên' });
              return;
            }
            req.userSubDepartmentId = emp.subDepartmentId;
          }
        } else {
          const [currentUser, currentUserEmployee] = await Promise.all([
            prisma.user.findUnique({ where: { id: req.user.id }, select: { departmentId: true } }),
            prisma.employee.findUnique({ where: { userId: req.user.id }, select: { subDepartmentId: true } }),
          ]);
          if (!currentUser) {
            res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Không tìm thấy người dùng' });
            return;
          }
          if (!currentUserEmployee) {
            res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Không tìm thấy nhân viên' });
            return;
          }
          req.userDepartmentId = currentUser.departmentId;
          req.userSubDepartmentId = currentUserEmployee.subDepartmentId;
          // Build array of all department IDs (primary + secondary)
          req.userDepartmentIds = [
            currentUser.departmentId,
            ...(req.user.secondaryDepartments?.map(s => s.departmentId) ?? []),
          ].filter(Boolean) as string[];
        }
      }

      next();
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  };
};

// ─── Helper: get all secondary department IDs for a user ─────────────────────
async function getSecondaryDeptIds(userId: string): Promise<{ departmentIds: string[]; subDepartmentIds: string[] }> {
  const rows = await prisma.userSecondaryDepartment.findMany({
    where: { userId },
    select: { departmentId: true, subDepartmentId: true },
  });
  return {
    departmentIds: rows.map(r => r.departmentId),
    subDepartmentIds: rows.map(r => r.subDepartmentId).filter((id): id is string => id !== null),
  };
}

export const canAccessEmployee = async (
  userId: string,
  targetEmployeeId: string,
  checkLevel: 'department' | 'subdepartment' = 'department',
  jwtPayload?: { secondaryDepartments?: Array<{ departmentId: string; subDepartmentId?: string | null }> }
): Promise<boolean> => {
  try {
    const [currentUser, currentEmployee, targetEmployee] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { role: true, departmentId: true } }),
      prisma.employee.findUnique({ where: { userId }, select: { subDepartmentId: true } }),
      prisma.employee.findUnique({
        where: { id: targetEmployeeId },
        select: { subDepartmentId: true, user: { select: { departmentId: true } } },
      }),
    ]);

    if (!currentUser || !targetEmployee) return false;
    if (currentUser.role === 'ADMIN') return true;
    if (!currentEmployee) return false;

    if (checkLevel === 'department') {
      if (currentUser.departmentId === targetEmployee.user?.departmentId) return true;
      // Check secondary departments
      const secondaryDeptIds = jwtPayload?.secondaryDepartments?.map(s => s.departmentId)
        ?? (await getSecondaryDeptIds(userId)).departmentIds;
      return secondaryDeptIds.includes(targetEmployee.user?.departmentId ?? '');
    }

    if (checkLevel === 'subdepartment') {
      if (currentEmployee.subDepartmentId === targetEmployee.subDepartmentId) return true;
      const secondarySubDeptIds = jwtPayload?.secondaryDepartments
        ?.map(s => s.subDepartmentId).filter((id): id is string => !!id)
        ?? (await getSecondaryDeptIds(userId)).subDepartmentIds;
      return secondarySubDeptIds.includes(targetEmployee.subDepartmentId ?? '');
    }

    return false;
  } catch (error) {
    logger.error('Error in canAccessEmployee:', error);
    return false;
  }
};

export const canAccessDepartment = async (
  userId: string,
  departmentId: string,
  jwtPayload?: { secondaryDepartments?: Array<{ departmentId: string }> }
): Promise<boolean> => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, departmentId: true },
    });

    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.departmentId === departmentId) return true;

    // Check secondary departments — prefer JWT to avoid DB query
    const secondaryDeptIds = jwtPayload?.secondaryDepartments?.map(s => s.departmentId)
      ?? (await getSecondaryDeptIds(userId)).departmentIds;
    return secondaryDeptIds.includes(departmentId);
  } catch (error) {
    logger.error('Error in canAccessDepartment:', error);
    return false;
  }
};

export const canAccessSubDepartment = async (
  userId: string,
  subDepartmentId: string,
  jwtPayload?: { secondaryDepartments?: Array<{ subDepartmentId?: string | null }> }
): Promise<boolean> => {
  try {
    const [currentUser, currentEmployee] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
      prisma.employee.findUnique({ where: { userId }, select: { subDepartmentId: true } }),
    ]);

    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    if (!currentEmployee) return false;
    if (currentEmployee.subDepartmentId === subDepartmentId) return true;

    // Check secondary departments
    const secondarySubDeptIds = jwtPayload?.secondaryDepartments
      ?.map(s => s.subDepartmentId).filter((id): id is string => !!id)
      ?? (await getSecondaryDeptIds(userId)).subDepartmentIds;
    return secondarySubDeptIds.includes(subDepartmentId);
  } catch (error) {
    logger.error('Error in canAccessSubDepartment:', error);
    return false;
  }
};
