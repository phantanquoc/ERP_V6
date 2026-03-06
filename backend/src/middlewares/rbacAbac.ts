import { Response, NextFunction } from 'express';
import prisma from '@config/database';
import type { AuthenticatedRequest } from '@types';
import logger from '@config/logger';

/**
 * RBAC + ABAC Middleware
 * 
 * RBAC: Role-Based Access Control (kiểm tra role)
 * ABAC: Attribute-Based Access Control (kiểm tra department/subdepartment)
 */

export interface AccessControlOptions {
  allowedRoles?: string[];
  checkDepartment?: boolean;
  checkSubDepartment?: boolean;
}

/**
 * Middleware kiểm tra RBAC + ABAC
 * 
 * @param options - Tùy chọn kiểm tra quyền
 * @returns Middleware function
 */
export const checkAccess = (options: AccessControlOptions = {}) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Chưa xác thực' });
        return;
      }

      const { allowedRoles = [], checkDepartment = false, checkSubDepartment = false } = options;

      // Bước 1: RBAC - Kiểm tra role
      if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
        res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Không đủ quyền' });
        return;
      }

      // ADMIN có thể truy cập tất cả
      if (req.user.role === 'ADMIN') {
        next();
        return;
      }

      // Bước 2: ABAC - Kiểm tra department/subdepartment
      if (checkDepartment || checkSubDepartment) {
        // Ưu tiên đọc từ JWT (không tốn DB query)
        if (req.user.departmentId !== undefined) {
          req.userDepartmentId = req.user.departmentId;

          // subDepartmentId cần lấy từ employee nếu chưa có trong JWT
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
          // Fallback: query song song nếu JWT cũ chưa có department
          const [currentUser, currentUserEmployee] = await Promise.all([
            prisma.user.findUnique({
              where: { id: req.user.id },
              select: { departmentId: true },
            }),
            prisma.employee.findUnique({
              where: { userId: req.user.id },
              select: { subDepartmentId: true },
            }),
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
        }
      }

      next();
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
  };
};

/**
 * Helper function: Kiểm tra user có quyền truy cập employee không
 * 
 * @param userId - ID của user hiện tại
 * @param targetEmployeeId - ID của employee cần truy cập
 * @param checkLevel - Mức kiểm tra: 'department' | 'subdepartment'
 * @returns true nếu có quyền, false nếu không
 */
export const canAccessEmployee = async (
  userId: string,
  targetEmployeeId: string,
  checkLevel: 'department' | 'subdepartment' = 'department'
): Promise<boolean> => {
  try {
    // Gộp thành 1 query: lấy role, departmentId và subDepartmentId cùng lúc
    const [currentUser, currentEmployee, targetEmployee] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, departmentId: true },
      }),
      prisma.employee.findUnique({
        where: { userId },
        select: { subDepartmentId: true },
      }),
      prisma.employee.findUnique({
        where: { id: targetEmployeeId },
        select: {
          subDepartmentId: true,
          user: { select: { departmentId: true } },
        },
      }),
    ]);

    if (!currentUser || !targetEmployee) return false;

    // ADMIN có thể truy cập tất cả
    if (currentUser.role === 'ADMIN') return true;

    if (!currentEmployee) return false;

    if (checkLevel === 'department') {
      return currentUser.departmentId === targetEmployee.user?.departmentId;
    }

    if (checkLevel === 'subdepartment') {
      return currentEmployee.subDepartmentId === targetEmployee.subDepartmentId;
    }

    return false;
  } catch (error) {
    logger.error('Error in canAccessEmployee:', error);
    return false;
  }
};

/**
 * Helper function: Kiểm tra user có quyền truy cập department không
 * 
 * @param userId - ID của user hiện tại
 * @param departmentId - ID của department cần truy cập
 * @returns true nếu có quyền, false nếu không
 */
export const canAccessDepartment = async (
  userId: string,
  departmentId: string
): Promise<boolean> => {
  try {
    // Gộp thành 1 query: lấy role và departmentId cùng lúc
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, departmentId: true },
    });

    if (!currentUser) return false;

    if (currentUser.role === 'ADMIN') return true;

    return currentUser.departmentId === departmentId;
  } catch (error) {
    logger.error('Error in canAccessDepartment:', error);
    return false;
  }
};

/**
 * Helper function: Kiểm tra user có quyền truy cập subdepartment không
 * 
 * @param userId - ID của user hiện tại
 * @param subDepartmentId - ID của subdepartment cần truy cập
 * @returns true nếu có quyền, false nếu không
 */
export const canAccessSubDepartment = async (
  userId: string,
  subDepartmentId: string
): Promise<boolean> => {
  try {
    // Gộp thành 1 query: lấy role và subDepartmentId qua employee
    const [currentUser, currentEmployee] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      }),
      prisma.employee.findUnique({
        where: { userId },
        select: { subDepartmentId: true },
      }),
    ]);

    if (!currentUser) return false;

    if (currentUser.role === 'ADMIN') return true;

    if (!currentEmployee) return false;

    return currentEmployee.subDepartmentId === subDepartmentId;
  } catch (error) {
    logger.error('Error in canAccessSubDepartment:', error);
    return false;
  }
};

