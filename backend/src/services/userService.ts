import prisma from '@config/database';
import { NotFoundError, AuthenticationError, ValidationError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages, hashPassword, comparePassword } from '@utils/helpers';
import type { PaginatedResponse } from '@types';
import { UserRole } from '@types';
import { Gender } from '@prisma/client';
import bcrypt from 'bcryptjs';

export class UserService {
  async getAllUsers(page: number = 1, limit: number = 10): Promise<PaginatedResponse<any>> {
    const { skip } = getPaginationParams(page, limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          departmentId: true,
          subDepartmentId: true,
          supervisor1Id: true,
          supervisor2Id: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    // Transform data to include department and subdepartment names
    const transformedUsers = await Promise.all(
      users.map(async (user: any) => {
        let departmentName = null;
        let subDepartmentName = null;
        let supervisor1 = null;
        let supervisor2 = null;

        if (user.departmentId) {
          const dept = await prisma.department.findUnique({
            where: { id: user.departmentId },
            select: { name: true },
          });
          departmentName = dept?.name;
        }

        if (user.subDepartmentId) {
          const subDept = await prisma.subDepartment.findUnique({
            where: { id: user.subDepartmentId },
            select: { name: true },
          });
          subDepartmentName = subDept?.name;
        }

        if (user.supervisor1Id) {
          const sup1 = await prisma.user.findUnique({
            where: { id: user.supervisor1Id },
            select: { id: true, firstName: true, lastName: true, email: true },
          });
          supervisor1 = sup1;
        }

        if (user.supervisor2Id) {
          const sup2 = await prisma.user.findUnique({
            where: { id: user.supervisor2Id },
            select: { id: true, firstName: true, lastName: true, email: true },
          });
          supervisor2 = sup2;
        }

        return {
          ...user,
          departmentName,
          subDepartmentName,
          supervisor1,
          supervisor2,
        };
      })
    );

    return {
      data: transformedUsers,
      total,
      page,
      limit,
      totalPages: calculateTotalPages(total, limit),
    };
  }

  async getUserById(id: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        departmentId: true,
        subDepartmentId: true,
        supervisor1Id: true,
        supervisor2Id: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get department and subdepartment names
    let departmentName = null;
    let subDepartmentName = null;
    let supervisor1 = null;
    let supervisor2 = null;

    if (user.departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: user.departmentId },
        select: { name: true },
      });
      departmentName = dept?.name;
    }

    if (user.subDepartmentId) {
      const subDept = await prisma.subDepartment.findUnique({
        where: { id: user.subDepartmentId },
        select: { name: true },
      });
      subDepartmentName = subDept?.name;
    }

    if (user.supervisor1Id) {
      const sup1 = await prisma.user.findUnique({
        where: { id: user.supervisor1Id },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      supervisor1 = sup1;
    }

    if (user.supervisor2Id) {
      const sup2 = await prisma.user.findUnique({
        where: { id: user.supervisor2Id },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      supervisor2 = sup2;
    }

    return {
      ...user,
      departmentName,
      subDepartmentName,
      supervisor1,
      supervisor2,
    };
  }

  async updateUser(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      role?: string;
      isActive?: boolean;
      departmentId?: string | null;
      subDepartmentId?: string | null;
      supervisor1Id?: string | null;
      supervisor2Id?: string | null;
    }
  ): Promise<any> {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Validate role if provided
    if (data.role) {
      const validRoles = Object.values(UserRole);
      if (!validRoles.includes(data.role as any)) {
        throw new Error(`Invalid role: ${data.role}`);
      }
    }

    // Check if role, department, or subDepartment is being changed
    const roleChanged = data.role !== undefined && data.role !== user.role;
    const deptChanged = data.departmentId !== undefined && data.departmentId !== user.departmentId;
    const subDeptChanged = data.subDepartmentId !== undefined && data.subDepartmentId !== user.subDepartmentId;

    // If role, department, or subDepartment changed, recalculate supervisors
    let supervisor1Id = data.supervisor1Id;
    let supervisor2Id = data.supervisor2Id;

    if ((roleChanged || deptChanged || subDeptChanged) && (supervisor1Id === undefined || supervisor2Id === undefined)) {
      const role = data.role || user.role;
      const departmentId = data.departmentId !== undefined ? data.departmentId : user.departmentId;
      const subDepartmentId = data.subDepartmentId !== undefined ? data.subDepartmentId : user.subDepartmentId;

      const { supervisor1Id: calcSup1, supervisor2Id: calcSup2 } = await calculateSupervisors(
        role,
        departmentId,
        subDepartmentId
      );

      supervisor1Id = supervisor1Id !== undefined ? supervisor1Id : calcSup1;
      supervisor2Id = supervisor2Id !== undefined ? supervisor2Id : calcSup2;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.role && { role: data.role as any }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
        ...(data.subDepartmentId !== undefined && { subDepartmentId: data.subDepartmentId }),
        ...(supervisor1Id !== undefined && { supervisor1Id: supervisor1Id }),
        ...(supervisor2Id !== undefined && { supervisor2Id: supervisor2Id }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        departmentId: true,
        subDepartmentId: true,
        supervisor1Id: true,
        supervisor2Id: true,
        updatedAt: true,
      },
    });

    // Employee code is NOT changed when department changes
    // Employee code format: NV001, NV002, NV003... (assigned once, never changes)

    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.user.delete({ where: { id } });
  }

  async getUserByEmail(email: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    departmentId?: string | null;
    subDepartmentId?: string | null;
    supervisor1Id?: string | null;
    supervisor2Id?: string | null;
  }): Promise<any> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Người dùng với email này đã tồn tại');
    }

    // Validate role
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(data.role as any)) {
      throw new Error(`Invalid role: ${data.role}`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Calculate supervisors if not provided
    let supervisor1Id = data.supervisor1Id || null;
    let supervisor2Id = data.supervisor2Id || null;

    if (!supervisor1Id || !supervisor2Id) {
      const { supervisor1Id: calcSup1, supervisor2Id: calcSup2 } = await calculateSupervisors(
        data.role,
        data.departmentId,
        data.subDepartmentId
      );
      supervisor1Id = supervisor1Id || calcSup1;
      supervisor2Id = supervisor2Id || calcSup2;
    }

    // Create user with employee in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role as any,
          isActive: true,
          departmentId: data.departmentId || null,
          subDepartmentId: data.subDepartmentId || null,
          supervisor1Id: supervisor1Id,
          supervisor2Id: supervisor2Id,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          departmentId: true,
          subDepartmentId: true,
          supervisor1Id: true,
          supervisor2Id: true,
          createdAt: true,
        },
      });

      // Auto-create employee for all users (including ADMIN)
      try {
        // Get default position (first position in database)
        const defaultPosition = await tx.position.findFirst({
          orderBy: { createdAt: 'asc' },
        });

        if (defaultPosition) {
          // Get default position level (first level for this position)
          const defaultPositionLevel = await tx.positionLevel.findFirst({
            where: { positionId: defaultPosition.id },
            orderBy: { baseSalary: 'asc' },
          });

          // Generate employee code: NV001, NV002, NV003, ...
          // Get the last employee code to avoid duplicates
          const lastEmployee = await tx.employee.findFirst({
            where: {
              employeeCode: {
                startsWith: 'NV',
              },
            },
            orderBy: {
              employeeCode: 'desc',
            },
          });

          let employeeCode: string;
          if (lastEmployee && lastEmployee.employeeCode) {
            const lastNumber = parseInt(lastEmployee.employeeCode.replace('NV', ''));
            employeeCode = `NV${String(lastNumber + 1).padStart(3, '0')}`;
          } else {
            employeeCode = 'NV001';
          }

          // Create employee
          await tx.employee.create({
            data: {
              employeeCode: employeeCode,
              userId: newUser.id,
              positionId: defaultPosition.id,
              positionLevelId: defaultPositionLevel?.id,
              subDepartmentId: data.subDepartmentId || null,
              status: 'ACTIVE',
              hireDate: new Date(),
              contractType: 'PERMANENT',
              baseSalary: defaultPositionLevel?.baseSalary || 0,
              gender: 'MALE', // Default value, can be updated later
              dateOfBirth: new Date('1990-01-01'), // Default value
              phoneNumber: '', // Can be updated later
              address: '', // Can be updated later
            },
          });

          console.log(`✅ Auto-created employee ${employeeCode} for user ${newUser.email} (role: ${data.role})`);
        } else {
          console.warn('⚠️ No default position found, skipping employee creation');
        }
      } catch (employeeError) {
        console.warn('⚠️ Failed to auto-create employee:', employeeError);
        // Don't fail the transaction if employee creation fails
        // User will be created, employee can be created manually later
      }

      return newUser;
    });

    // If the new user is TEAM_LEAD or DEPARTMENT_HEAD, recalculate supervisors for affected users
    if (data.role === 'TEAM_LEAD' && data.subDepartmentId) {
      // Recalculate supervisors for all EMPLOYEE in the same subDepartment
      const employees = await prisma.user.findMany({
        where: {
          role: 'EMPLOYEE',
          subDepartmentId: data.subDepartmentId,
          isActive: true,
        },
        select: { id: true },
      });

      for (const emp of employees) {
        const { supervisor1Id: newSup1, supervisor2Id: newSup2 } = await calculateSupervisors(
          'EMPLOYEE',
          data.departmentId,
          data.subDepartmentId
        );
        await prisma.user.update({
          where: { id: emp.id },
          data: {
            supervisor1Id: newSup1,
            supervisor2Id: newSup2,
          },
        });
      }
    } else if (data.role === 'DEPARTMENT_HEAD' && data.departmentId) {
      // Recalculate supervisors for all EMPLOYEE and TEAM_LEAD in the same department
      const affectedUsers = await prisma.user.findMany({
        where: {
          role: { in: ['EMPLOYEE', 'TEAM_LEAD'] },
          departmentId: data.departmentId,
          isActive: true,
        },
        select: { id: true, role: true, subDepartmentId: true },
      });

      for (const affectedUser of affectedUsers) {
        const { supervisor1Id: newSup1, supervisor2Id: newSup2 } = await calculateSupervisors(
          affectedUser.role,
          data.departmentId,
          affectedUser.subDepartmentId
        );
        await prisma.user.update({
          where: { id: affectedUser.id },
          data: {
            supervisor1Id: newSup1,
            supervisor2Id: newSup2,
          },
        });
      }
    }

    return user;
  }

  /**
   * Recalculate supervisors for all users
   */
  async recalculateSupervisorsForAllUsers(): Promise<any> {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          role: true,
          departmentId: true,
          subDepartmentId: true,
        },
      });

      let updatedCount = 0;

      for (const user of users) {
        const { supervisor1Id, supervisor2Id } = await calculateSupervisors(
          user.role,
          user.departmentId,
          user.subDepartmentId
        );

        await prisma.user.update({
          where: { id: user.id },
          data: {
            supervisor1Id,
            supervisor2Id,
          },
        });

        updatedCount++;
      }

      return {
        message: `Supervisors recalculated for ${updatedCount} users`,
        updatedCount,
      };
    } catch (error) {
      console.error('Error recalculating supervisors:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Mật khẩu hiện tại không đúng');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new ValidationError('Mật khẩu mới phải có ít nhất 8 ký tự');
    }

    if (!/[A-Z]/.test(newPassword)) {
      throw new ValidationError('Mật khẩu mới phải có ít nhất 1 chữ hoa');
    }

    if (!/[a-z]/.test(newPassword)) {
      throw new ValidationError('Mật khẩu mới phải có ít nhất 1 chữ thường');
    }

    if (!/[0-9]/.test(newPassword)) {
      throw new ValidationError('Mật khẩu mới phải có ít nhất 1 chữ số');
    }

    // Check if new password is same as current
    const isSamePassword = await comparePassword(newPassword, user.password);
    if (isSamePassword) {
      throw new ValidationError('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  /**
   * Update user profile (personal information)
   */
  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phoneNumber?: string;
      bankAccount?: string;
      lockerNumber?: string;
      gender?: string;
      weight?: number;
      height?: number;
      shirtSize?: string;
      pantSize?: string;
      shoeSize?: string;
    }
  ): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        employees: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // If email is being updated, check if it's already taken
    if (data.email && data.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new ValidationError('Email đã được sử dụng');
      }
    }

    // Update user table (firstName, lastName, email)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.email && { email: data.email }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        departmentId: true,
        subDepartmentId: true,
      },
    });

    // Update employee table (phoneNumber, bankAccount, lockerNumber, physical info)
    let updatedEmployee = null;
    if (user.employees) {
      const employeeId = user.employees.id;
      updatedEmployee = await prisma.employee.update({
        where: { id: employeeId },
        data: {
          ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
          ...(data.bankAccount !== undefined && { bankAccount: data.bankAccount }),
          ...(data.lockerNumber !== undefined && { lockerNumber: data.lockerNumber }),
          ...(data.gender !== undefined && { gender: data.gender as Gender }),
          ...(data.weight !== undefined && { weight: data.weight }),
          ...(data.height !== undefined && { height: data.height }),
          ...(data.shirtSize !== undefined && { shirtSize: data.shirtSize }),
          ...(data.pantSize !== undefined && { pantSize: data.pantSize }),
          ...(data.shoeSize !== undefined && { shoeSize: data.shoeSize }),
        },
        select: {
          phoneNumber: true,
          bankAccount: true,
          lockerNumber: true,
          gender: true,
          weight: true,
          height: true,
          shirtSize: true,
          pantSize: true,
          shoeSize: true,
        },
      });
    }

    // Return combined data
    return {
      ...updatedUser,
      phoneNumber: updatedEmployee?.phoneNumber || null,
      bankAccount: updatedEmployee?.bankAccount || null,
      lockerNumber: updatedEmployee?.lockerNumber || null,
      gender: updatedEmployee?.gender || null,
      weight: updatedEmployee?.weight || null,
      height: updatedEmployee?.height || null,
      shirtSize: updatedEmployee?.shirtSize || null,
      pantSize: updatedEmployee?.pantSize || null,
      shoeSize: updatedEmployee?.shoeSize || null,
    };
  }
}

/**
 * Calculate supervisor1 and supervisor2 based on role, department, and subDepartment
 */
export async function calculateSupervisors(
  role: string,
  departmentId: string | null | undefined,
  subDepartmentId: string | null | undefined
): Promise<{ supervisor1Id: string | null; supervisor2Id: string | null }> {
  let supervisor1Id: string | null = null;
  let supervisor2Id: string | null = null;

  try {
    // Calculate supervisor1
    if (role === 'EMPLOYEE' && subDepartmentId) {
      // EMPLOYEE's supervisor1 is TEAM_LEAD in the same subDepartment
      const teamLead = await prisma.user.findFirst({
        where: {
          role: 'TEAM_LEAD',
          subDepartmentId: subDepartmentId,
          isActive: true,
        },
        select: { id: true },
      });
      supervisor1Id = teamLead?.id || null;
    } else if (role === 'TEAM_LEAD' && departmentId) {
      // TEAM_LEAD's supervisor1 is DEPARTMENT_HEAD in the same department
      const deptHead = await prisma.user.findFirst({
        where: {
          role: 'DEPARTMENT_HEAD',
          departmentId: departmentId,
          isActive: true,
        },
        select: { id: true },
      });
      supervisor1Id = deptHead?.id || null;
    }
    // DEPARTMENT_HEAD and ADMIN have no supervisor1

    // Calculate supervisor2
    if (role === 'EMPLOYEE' && departmentId) {
      // EMPLOYEE's supervisor2 is DEPARTMENT_HEAD in the same department
      const deptHead = await prisma.user.findFirst({
        where: {
          role: 'DEPARTMENT_HEAD',
          departmentId: departmentId,
          isActive: true,
        },
        select: { id: true },
      });
      supervisor2Id = deptHead?.id || null;
    } else if (role === 'TEAM_LEAD') {
      // TEAM_LEAD's supervisor2 is ADMIN
      const admin = await prisma.user.findFirst({
        where: {
          role: 'ADMIN',
          isActive: true,
        },
        select: { id: true },
      });
      supervisor2Id = admin?.id || null;
    } else if (role === 'DEPARTMENT_HEAD') {
      // DEPARTMENT_HEAD's supervisor2 is ADMIN
      const admin = await prisma.user.findFirst({
        where: {
          role: 'ADMIN',
          isActive: true,
        },
        select: { id: true },
      });
      supervisor2Id = admin?.id || null;
    }
    // ADMIN has no supervisor2
  } catch (error) {
    console.error('Error calculating supervisors:', error);
  }

  return { supervisor1Id, supervisor2Id };
}

export default new UserService();
