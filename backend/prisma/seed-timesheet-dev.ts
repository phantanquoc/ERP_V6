/**
 * Seed script: timesheet cells + OT hours + baseSalary for dev testing
 * CHẠY CHỈ TRÊN DEV DB: docker-compose.dev.yml
 *
 * Data từ CHAM-CONG.xlsx tháng 6/2026:
 * - NV0018: otWeekday=7h, otSunday=9.5h, total=16.5h
 * - NV0032: otWeekday=38.5h, otSunday=5.5h, total=44h (highest OT)
 * - NV0005, NV0007: các mã đa dạng (P, O, TS, KL, B...)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Salary data (giả lập - factory workers ~5-8M/tháng)
const EMPLOYEES_SALARY = [
  { code: 'NV0018', baseSalary: 6_500_000 }, // hourlyRate = 6.5M / 208h = 31_250đ
  { code: 'NV0032', baseSalary: 7_200_000 }, // hourlyRate = 34_615đ
  { code: 'NV0005', baseSalary: 5_800_000 },
  { code: 'NV0007', baseSalary: 6_000_000 },
  { code: 'NV0002', baseSalary: 7_500_000 },
  { code: 'NV0044', baseSalary: 6_200_000 },
];

// Timesheet cells (month 6/2026) - exact data từ Excel
const TIMESHEET_DATA = [
  // NV0018: OT weekday=7h, Sunday=9.5h
  { emp: 'NV0018', day: 5, code: 'X', ot: 0.5 },
  { emp: 'NV0018', day: 11, code: 'X', ot: 1 },
  { emp: 'NV0018', day: 12, code: 'X', ot: 3 },
  { emp: 'NV0018', day: 13, code: 'X', ot: 2.5 },  // Thứ Bảy = weekday
  { emp: 'NV0018', day: 14, code: 'O', ot: 9.5 },  // Chủ nhật = otSunday
  { emp: 'NV0018', day: 1, code: 'X', ot: 0 },
  { emp: 'NV0018', day: 2, code: 'X', ot: 0 },
  { emp: 'NV0018', day: 3, code: 'X', ot: 0 },
  { emp: 'NV0018', day: 4, code: 'X', ot: 0 },
  { emp: 'NV0018', day: 6, code: 'X', ot: 0 },
  { emp: 'NV0018', day: 7, code: 'O', ot: 0 },  // Chủ nhật nghỉ
  { emp: 'NV0018', day: 8, code: 'P', ot: 0 },  // Nghỉ phép
  { emp: 'NV0018', day: 9, code: 'X', ot: 0 },
  { emp: 'NV0018', day: 10, code: 'X', ot: 0 },

  // NV0032: OT weekday=38.5h, Sunday=5.5h (highest OT)
  { emp: 'NV0032', day: 2, code: 'X', ot: 3 },
  { emp: 'NV0032', day: 4, code: 'X', ot: 1.5 },
  { emp: 'NV0032', day: 5, code: 'X', ot: 2 },
  { emp: 'NV0032', day: 6, code: 'X', ot: 4 },    // Thứ Bảy
  { emp: 'NV0032', day: 8, code: 'X', ot: 2 },
  { emp: 'NV0032', day: 11, code: 'X', ot: 4 },
  { emp: 'NV0032', day: 12, code: 'X', ot: 4 },
  { emp: 'NV0032', day: 13, code: 'X', ot: 4 },   // Thứ Bảy
  { emp: 'NV0032', day: 14, code: 'O', ot: 5.5 }, // Chủ nhật = otSunday
  { emp: 'NV0032', day: 18, code: 'X', ot: 3 },
  { emp: 'NV0032', day: 19, code: 'X', ot: 4 },
  { emp: 'NV0032', day: 24, code: 'X', ot: 3 },
  { emp: 'NV0032', day: 25, code: 'X', ot: 4 },
  { emp: 'NV0032', day: 1, code: 'X', ot: 0 },
  { emp: 'NV0032', day: 3, code: 'X', ot: 0 },
  { emp: 'NV0032', day: 7, code: 'O', ot: 0 },
  { emp: 'NV0032', day: 9, code: 'X', ot: 0 },
  { emp: 'NV0032', day: 10, code: 'X', ot: 0 },

  // NV0005: diverse codes
  { emp: 'NV0005', day: 1, code: 'X', ot: 0 },
  { emp: 'NV0005', day: 2, code: 'X', ot: 0 },
  { emp: 'NV0005', day: 3, code: 'KL', ot: 0 },  // Không lương
  { emp: 'NV0005', day: 4, code: 'X', ot: 0 },
  { emp: 'NV0005', day: 5, code: 'X', ot: 1 },
  { emp: 'NV0005', day: 6, code: 'X', ot: 0 },
  { emp: 'NV0005', day: 7, code: 'O', ot: 0 },
  { emp: 'NV0005', day: 8, code: 'TS', ot: 0 },  // Thai sản
  { emp: 'NV0005', day: 9, code: 'TS', ot: 0 },
  { emp: 'NV0005', day: 10, code: 'P', ot: 0 },  // Phép

  // NV0007: P/2, X/2, B
  { emp: 'NV0007', day: 1, code: 'X', ot: 0 },
  { emp: 'NV0007', day: 2, code: 'X/2', ot: 0 }, // Nửa ngày
  { emp: 'NV0007', day: 3, code: 'X', ot: 0 },
  { emp: 'NV0007', day: 4, code: 'P/2', ot: 0 }, // Phép nửa ngày
  { emp: 'NV0007', day: 5, code: 'B', ot: 0 },   // Bệnh
  { emp: 'NV0007', day: 6, code: 'X', ot: 0.5 },
];

async function main() {
  console.log('🌱 Seeding timesheet dev data...\n');

  // 1. Update baseSalary cho employees
  console.log('📝 Step 1: Update baseSalary');
  for (const { code, baseSalary } of EMPLOYEES_SALARY) {
    const result = await prisma.employee.updateMany({
      where: { employeeCode: code, status: 'ACTIVE' },
      data: { baseSalary },
    });
    if (result.count > 0) {
      console.log(`  ✓ ${code}: ${baseSalary.toLocaleString()}đ`);
    } else {
      console.log(`  ⚠ ${code}: not found or inactive`);
    }
  }

  // 2. Resolve employee IDs
  console.log('\n📝 Step 2: Resolve employee IDs');
  const employeeCodes = [...new Set(TIMESHEET_DATA.map(d => d.emp))];
  const employees = await prisma.employee.findMany({
    where: { employeeCode: { in: employeeCodes }, status: 'ACTIVE' },
    select: { id: true, employeeCode: true },
  });
  const empMap = new Map(employees.map(e => [e.employeeCode, e.id]));
  console.log(`  Found ${empMap.size}/${employeeCodes.length} employees`);

  // 3. Delete existing timesheet cells for June 2026 (clean slate)
  console.log('\n📝 Step 3: Clean existing June 2026 cells');
  const deleted = await prisma.timesheetCell.deleteMany({
    where: {
      employeeId: { in: Array.from(empMap.values()) },
      date: {
        gte: new Date('2026-06-01'),
        lt: new Date('2026-07-01'),
      },
    },
  });
  console.log(`  Deleted ${deleted.count} existing cells`);

  // 4. Insert timesheet cells
  console.log('\n📝 Step 4: Insert timesheet cells');
  let inserted = 0;
  let skipped = 0;
  for (const { emp, day, code, ot } of TIMESHEET_DATA) {
    const empId = empMap.get(emp);
    if (!empId) {
      skipped++;
      continue;
    }
    const date = new Date(`2026-06-${day.toString().padStart(2, '0')}`);
    await prisma.timesheetCell.create({
      data: {
        employeeId: empId,
        date,
        code,
        workHours: code.toUpperCase() === 'X' ? 8 : (code === 'X/2' ? 4 : 0),
        overtimeHours: ot,
        note: ot > 0 ? `${ot}h OT` : null,
      },
    });
    inserted++;
  }
  console.log(`  ✓ Inserted ${inserted} cells, skipped ${skipped}`);

  console.log('\n✅ Seed completed!');
  console.log('\n📊 Verify with:');
  console.log('  GET /api/timesheet/monthly?month=6&year=2026');
  console.log('  Check NV0018: otWeekday=7h, otSunday=9.5h, otTotalIncome ≈ 656K');
  console.log('  Check NV0032: otWeekday=38.5h, otSunday=5.5h, otTotalIncome ≈ 2.4M');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
