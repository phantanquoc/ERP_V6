import prisma from '@config/database';

class DocsService {
  async getUserWithDepartments(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        departmentId: true,
        secondaryDepartments: { select: { departmentId: true } },
      },
    });
  }

  async getDepartmentCodes(deptIds: string[]): Promise<Record<string, string>> {
    const departments = await prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, code: true },
    });
    const map: Record<string, string> = {};
    for (const d of departments) map[d.id] = d.code;
    return map;
  }

  async isAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === 'ADMIN';
  }
}

export default new DocsService();
