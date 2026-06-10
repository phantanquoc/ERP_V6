import prisma from '@config/database';

export async function getDepartmentCode(departmentId: string | undefined | null): Promise<string> {
  if (!departmentId) return '';
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { code: true },
  });
  return dept?.code ?? '';
}

export async function getDepartmentCodes(departmentIds: string[]): Promise<string[]> {
  if (departmentIds.length === 0) return [];
  const depts = await prisma.department.findMany({
    where: { id: { in: departmentIds } },
    select: { code: true },
  });
  return depts.map(d => d.code);
}

export async function getEmployeeByUserId(userId: string) {
  return prisma.employee.findUnique({ where: { userId } });
}
