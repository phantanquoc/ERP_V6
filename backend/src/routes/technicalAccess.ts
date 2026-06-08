import { Response, NextFunction } from 'express';
import prisma from '@config/database';
import type { AuthenticatedRequest, SecondaryDepartmentEntry } from '@types';
import { UserRole } from '@types';

const TECHNICAL_DEPARTMENT_CODE = 'DEPT_TECHNICAL';

export const TECHNICAL_SUB_DEPARTMENT_CODES = {
  QLHTM: 'SUBDEPT_TECHNICAL_QUALITY',
  MECHANICAL: 'SUBDEPT_TECHNICAL_MECHANICAL',
  PROJECTS: 'SUBDEPT_TECHNICAL_PROJECTS',
} as const;

const elevatedRoles = new Set<string>([UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD]);

async function getDepartmentCode(departmentId?: string | null): Promise<string | null> {
  if (!departmentId) return null;
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { code: true },
  });
  return department?.code ?? null;
}

async function getSubDepartmentCode(subDepartmentId?: string | null): Promise<string | null> {
  if (!subDepartmentId) return null;
  const subDepartment = await prisma.subDepartment.findUnique({
    where: { id: subDepartmentId },
    select: { code: true },
  });
  return subDepartment?.code ?? null;
}

async function canAccessViaEntry(
  entry: SecondaryDepartmentEntry | { departmentId?: string | null; subDepartmentId?: string | null; role: string },
  allowedSubDepartmentCodes: string[],
): Promise<boolean> {
  const departmentCode = await getDepartmentCode(entry.departmentId);
  if (departmentCode !== TECHNICAL_DEPARTMENT_CODE) return false;
  if (elevatedRoles.has(entry.role)) return true;

  const subDepartmentCode = await getSubDepartmentCode(entry.subDepartmentId);
  return !!subDepartmentCode && allowedSubDepartmentCodes.includes(subDepartmentCode);
}

export const requireTechnicalAccess = (...allowedSubDepartmentCodes: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Chưa xác thực' });
        return;
      }

      if (req.user.role === UserRole.ADMIN) {
        next();
        return;
      }

      const primaryAllowed = await canAccessViaEntry(
        {
          departmentId: req.user.departmentId,
          subDepartmentId: req.user.subDepartmentId,
          role: req.user.role,
        },
        allowedSubDepartmentCodes,
      );

      if (primaryAllowed) {
        next();
        return;
      }

      for (const entry of req.user.secondaryDepartments ?? []) {
        if (await canAccessViaEntry(entry, allowedSubDepartmentCodes)) {
          next();
          return;
        }
      }

      res.status(403).json({ success: false, message: 'Truy cập bị từ chối' });
    } catch (error) {
      next(error);
    }
  };
};
