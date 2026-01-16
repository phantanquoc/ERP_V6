import { Response, NextFunction } from 'express';
import prisma from '@config/database';
import type { AuthenticatedRequest } from '@types';

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
        // Lấy thông tin user hiện tại (departmentId từ user)
        const currentUser = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: {
            departmentId: true,
          },
        });

        if (!currentUser) {
          res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Không tìm thấy người dùng' });
          return;
        }

        // Lấy thông tin employee của user hiện tại (subDepartmentId từ employee)
        const currentUserEmployee = await prisma.employee.findUnique({
          where: { userId: req.user.id },
          select: {
            subDepartmentId: true,
          },
        });

        if (!currentUserEmployee) {
          res.status(403).json({ success: false, message: 'Truy cập bị từ chối: Không tìm thấy nhân viên' });
          return;
        }

        // Lưu thông tin vào request để sử dụng sau
        req.userDepartmentId = currentUser.departmentId;
        req.userSubDepartmentId = currentUserEmployee.subDepartmentId;
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
    // Lấy thông tin user hiện tại
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!currentUser) return false;

    // ADMIN có thể truy cập tất cả
    if (currentUser.role === 'ADMIN') return true;

    // Lấy thông tin user hiện tại (departmentId từ user)
    const currentUserData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        departmentId: true,
      },
    });

    if (!currentUserData) return false;

    // Lấy thông tin employee của user hiện tại (subDepartmentId từ employee)
    const currentUserEmployee = await prisma.employee.findUnique({
      where: { userId },
      select: {
        subDepartmentId: true,
      },
    });

    if (!currentUserEmployee) return false;

    // Lấy thông tin employee cần truy cập
    const targetEmployee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      include: {
        user: {
          select: {
            departmentId: true,
          },
        },
      },
    });

    if (!targetEmployee) return false;

    // Kiểm tra department
    if (checkLevel === 'department') {
      return currentUserData.departmentId === targetEmployee.user?.departmentId;
    }

    // Kiểm tra subdepartment
    if (checkLevel === 'subdepartment') {
      return currentUserEmployee.subDepartmentId === targetEmployee.subDepartmentId;
    }

    return false;
  } catch (error) {
    console.error('Error in canAccessEmployee:', error);
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
    // Lấy thông tin user hiện tại
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!currentUser) return false;

    // ADMIN có thể truy cập tất cả
    if (currentUser.role === 'ADMIN') return true;

    // Lấy thông tin user hiện tại (departmentId từ user)
    const currentUserData = await prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });

    if (!currentUserData) return false;

    return currentUserData.departmentId === departmentId;
  } catch (error) {
    console.error('Error in canAccessDepartment:', error);
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
    // Lấy thông tin user hiện tại
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!currentUser) return false;

    // ADMIN có thể truy cập tất cả
    if (currentUser.role === 'ADMIN') return true;

    // Lấy thông tin employee của user hiện tại
    const currentUserEmployee = await prisma.employee.findUnique({
      where: { userId },
      select: { subDepartmentId: true },
    });

    if (!currentUserEmployee) return false;

    return currentUserEmployee.subDepartmentId === subDepartmentId;
  } catch (error) {
    console.error('Error in canAccessSubDepartment:', error);
    return false;
  }
};

