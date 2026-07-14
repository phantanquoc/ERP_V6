/**
 * mergeTechnicalSubDepts.ts
 *
 * Backfill script for merging SUBDEPT_TECHNICAL_MECHANICAL into
 * SUBDEPT_TECHNICAL_QUALITY (rebranded as "Phòng đảm bảo và cải tiến").
 *
 * Steps:
 *   1) Reassign every Employee whose primary subDepartmentId points to MECHANICAL → QUALITY.
 *   2) Reassign Employee.secondarySubDepartmentId from MECHANICAL → QUALITY.
 *   3) Reassign UserSecondaryDepartment.subDepartmentId from MECHANICAL → QUALITY.
 *   4) Reassign User.subDepartmentId (primary) from MECHANICAL → QUALITY.
 *   5) Delete the MECHANICAL sub-department row.
 *
 * Idempotent: if MECHANICAL is already gone, the script logs and exits successfully.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register backend/prisma/scripts/mergeTechnicalSubDepts.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== mergeTechnicalSubDepts ===\n');

  const mechanical = await prisma.subDepartment.findUnique({
    where: { code: 'SUBDEPT_TECHNICAL_MECHANICAL' },
  });
  const quality = await prisma.subDepartment.findUnique({
    where: { code: 'SUBDEPT_TECHNICAL_QUALITY' },
  });

  if (!mechanical) {
    console.log('[SKIP] SUBDEPT_TECHNICAL_MECHANICAL not found — nothing to merge. Idempotent exit.');
    await prisma.$disconnect();
    return;
  }
  if (!quality) {
    console.error('[ERROR] SUBDEPT_TECHNICAL_QUALITY not found — cannot merge without target. Aborting.');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`Found MECHANICAL: id=${mechanical.id}`);
  console.log(`Found QUALITY (target): id=${quality.id}\n`);

  const result = await prisma.$transaction(async (tx) => {
    // Primary Employee assignment
    const empPrimary = await tx.employee.updateMany({
      where: { subDepartmentId: mechanical.id },
      data: { subDepartmentId: quality.id },
    });

    // Secondary field on Employee
    const empSecondary = await tx.employee.updateMany({
      where: { secondarySubDepartmentId: mechanical.id },
      data: { secondarySubDepartmentId: quality.id },
    });

    // UserSecondaryDepartment rows
    const userSecondary = await tx.userSecondaryDepartment.updateMany({
      where: { subDepartmentId: mechanical.id },
      data: { subDepartmentId: quality.id },
    });

    // Primary User assignment
    const userPrimary = await tx.user.updateMany({
      where: { subDepartmentId: mechanical.id },
      data: { subDepartmentId: quality.id },
    });

    // Delete the MECHANICAL sub-department
    await tx.subDepartment.delete({
      where: { code: 'SUBDEPT_TECHNICAL_MECHANICAL' },
    });

    return {
      empPrimary: empPrimary.count,
      empSecondary: empSecondary.count,
      userSecondary: userSecondary.count,
      userPrimary: userPrimary.count,
    };
  });

  console.log('=== Summary ===');
  console.log(`Employees (primary)          reassigned: ${result.empPrimary}`);
  console.log(`Employees (secondary)        reassigned: ${result.empSecondary}`);
  console.log(`UserSecondaryDepartment rows reassigned: ${result.userSecondary}`);
  console.log(`Users (primary)              reassigned: ${result.userPrimary}`);
  console.log(`Migrated ${result.empPrimary} employees, ${result.userSecondary} secondary assignments, deleted MECHANICAL sub-dept.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
