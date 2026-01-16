import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLeaveRequests() {
  try {
    console.log('Testing LeaveRequest queries...\n');

    // Test 1: Count all leave requests
    const count = await prisma.leaveRequest.count();
    console.log(`✅ Total leave requests: ${count}`);

    // Test 2: Get all leave requests
    const leaveRequests = await prisma.leaveRequest.findMany({
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            position: true,
            subDepartment: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\n✅ Found ${leaveRequests.length} leave requests:\n`);
    
    leaveRequests.forEach((lr, index) => {
      console.log(`${index + 1}. ${lr.code} - ${lr.employee?.user?.firstName} ${lr.employee?.user?.lastName}`);
      console.log(`   Type: ${lr.leaveType}, Status: ${lr.status}`);
      console.log(`   Period: ${lr.startDate.toISOString().split('T')[0]} to ${lr.endDate.toISOString().split('T')[0]}`);
      console.log(`   Reason: ${lr.reason.substring(0, 50)}...`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLeaveRequests();

