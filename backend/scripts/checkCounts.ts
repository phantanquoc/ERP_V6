import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCounts() {
  try {
    console.log('📊 Checking database counts...\n');
    
    const counts = {
      users: await prisma.user.count(),
      employees: await prisma.employee.count(),
      positions: await prisma.position.count(),
      positionLevels: await prisma.positionLevel.count(),
      positionResponsibilities: await prisma.positionResponsibility.count(),
      evaluations: await prisma.evaluation.count(),
      payrolls: await prisma.payroll.count(),
      attendances: await prisma.attendance.count(),
      leaveRequests: await prisma.leaveRequest.count(),
    };
    
    console.log('Database Record Counts:');
    console.log('─────────────────────────────────');
    console.log(`Users:                      ${counts.users}`);
    console.log(`Employees:                  ${counts.employees}`);
    console.log(`Positions:                  ${counts.positions}`);
    console.log(`Position Levels:            ${counts.positionLevels}`);
    console.log(`Position Responsibilities:  ${counts.positionResponsibilities}`);
    console.log(`Evaluations:                ${counts.evaluations}`);
    console.log(`Payrolls:                   ${counts.payrolls}`);
    console.log(`Attendances:                ${counts.attendances}`);
    console.log(`Leave Requests:             ${counts.leaveRequests}`);
    console.log('─────────────────────────────────');
    
  } catch (error) {
    console.error('❌ Error checking counts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkCounts()
  .then(() => {
    console.log('\n✅ Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

