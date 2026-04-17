import prisma from '@config/database';
import { EmployeeStatus, UserRole } from '@prisma/client';

export interface NotificationRecipientQuery {
  employeeIds?: string[];
  userIds?: string[];
  roles?: UserRole[];
  departmentIds?: string[];
  departmentCodes?: string[];
  subDepartmentIds?: string[];
  subDepartmentCodes?: string[];
  excludeEmployeeIds?: string[];
  excludeUserIds?: string[];
  includeInactive?: boolean;
}

class NotificationRecipientService {
  private async resolveDepartmentIds(query: NotificationRecipientQuery): Promise<string[]> {
    const ids = new Set(query.departmentIds || []);

    if (query.departmentCodes?.length) {
      const departments = await prisma.department.findMany({
        where: {
          code: { in: query.departmentCodes },
        },
        select: { id: true },
      });

      departments.forEach((department) => ids.add(department.id));
    }

    return Array.from(ids);
  }

  private async resolveSubDepartmentIds(query: NotificationRecipientQuery): Promise<string[]> {
    const ids = new Set(query.subDepartmentIds || []);

    if (query.subDepartmentCodes?.length) {
      const subDepartments = await prisma.subDepartment.findMany({
        where: {
          code: { in: query.subDepartmentCodes },
        },
        select: { id: true },
      });

      subDepartments.forEach((subDepartment) => ids.add(subDepartment.id));
    }

    return Array.from(ids);
  }

  async resolveEmployeeIds(query: NotificationRecipientQuery): Promise<string[]> {
    const roles = query.roles || [];
    const departmentIds = await this.resolveDepartmentIds(query);
    const subDepartmentIds = await this.resolveSubDepartmentIds(query);
    const directEmployeeIds = query.employeeIds || [];
    const userIds = query.userIds || [];

    if (
      directEmployeeIds.length === 0 &&
      userIds.length === 0 &&
      roles.length === 0 &&
      departmentIds.length === 0 &&
      subDepartmentIds.length === 0
    ) {
      return [];
    }

    const recipients = await prisma.employee.findMany({
      where: {
        ...(query.includeInactive ? {} : { status: EmployeeStatus.ACTIVE }),
        user: query.includeInactive
          ? undefined
          : {
              isActive: true,
            },
        OR: [
          ...(directEmployeeIds.length > 0 ? [{ id: { in: directEmployeeIds } }] : []),
          ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : []),
          ...(roles.length > 0
            ? [
                { user: { role: { in: roles } } },
                { user: { secondaryRole: { in: roles } } },
              ]
            : []),
          ...(departmentIds.length > 0
            ? [
                { user: { departmentId: { in: departmentIds } } },
                { user: { secondaryDepartmentId: { in: departmentIds } } },
              ]
            : []),
          ...(subDepartmentIds.length > 0
            ? [
                { subDepartmentId: { in: subDepartmentIds } },
                { secondarySubDepartmentId: { in: subDepartmentIds } },
                { user: { subDepartmentId: { in: subDepartmentIds } } },
                { user: { secondarySubDepartmentId: { in: subDepartmentIds } } },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        userId: true,
      },
    });

    const excludedEmployeeIds = new Set(query.excludeEmployeeIds || []);
    const excludedUserIds = new Set(query.excludeUserIds || []);

    return Array.from(
      new Set(
        recipients
          .filter((recipient) => !excludedEmployeeIds.has(recipient.id) && !excludedUserIds.has(recipient.userId))
          .map((recipient) => recipient.id)
      )
    );
  }
}

export default new NotificationRecipientService();
