import type { Response, NextFunction } from 'express';
import prisma from '@config/database';
import logger from '@config/logger';
import type { AuthenticatedRequest } from '@types';

export const TECHNICAL_DEPARTMENT_CODE = 'DEPT_TECHNICAL';

/**
 * True when the user belongs to the Technical department as PRIMARY or SECONDARY department.
 * Read from the DB (not the JWT) so a newly assigned secondary department applies immediately.
 */
export async function isTechnicalMember(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { departmentId: true, secondaryDepartments: { select: { departmentId: true } } },
  });
  if (!user) return false;
  const deptIds = [user.departmentId, ...user.secondaryDepartments.map((s) => s.departmentId)].filter((v): v is string => !!v);
  if (deptIds.length === 0) return false;
  const match = await prisma.department.findFirst({
    where: { id: { in: deptIds }, code: TECHNICAL_DEPARTMENT_CODE },
    select: { id: true },
  });
  return !!match;
}

/**
 * Technician-only actions on YCKT/YCSC (tiếp nhận, kiểm tra, lập kế hoạch, sửa chữa, nghiệm thu, hoàn thành).
 * Any role (EMPLOYEE included) is allowed as long as the user is in Kỹ thuật — primary or secondary.
 * ADMIN bypasses. Place AFTER requireRule so baseline RBAC still applies.
 */
export const requireTechnical = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Chưa xác thực' });
      return;
    }
    if (req.user.role === 'ADMIN' || (await isTechnicalMember(req.user.id))) {
      next();
      return;
    }
    res.status(403).json({ success: false, message: 'Chỉ nhân viên bộ phận Kỹ thuật (chính hoặc phụ) mới được xử lý phiếu' });
  } catch (error) {
    logger.error('[requireTechnical] unexpected error', { error: String(error) });
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
  }
};

/**
 * Only the Kỹ thuật department head (DEPARTMENT_HEAD who is a Kỹ thuật member, primary or secondary)
 * or ADMIN may delete technical requests. EMPLOYEE/TEAM_LEAD can never delete — not even their own
 * (requireRule's owner-scope fallback would otherwise let a creator delete), and heads of other
 * departments are blocked too. Uses effectiveRole computed by requireRule.
 */
export const denyEmployeeDelete = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role === 'ADMIN') {
      next();
      return;
    }
    const role = req.effectiveRole ?? req.user?.role;
    if (!req.user || role !== 'DEPARTMENT_HEAD' || !(await isTechnicalMember(req.user.id))) {
      res.status(403).json({ success: false, message: 'Chỉ Trưởng bộ phận Kỹ thuật hoặc ADMIN mới được xóa phiếu' });
      return;
    }
    next();
  } catch (error) {
    logger.error('[denyEmployeeDelete] unexpected error', { error: String(error) });
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
  }
};
