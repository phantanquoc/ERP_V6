import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearPositions() {
  try {
    console.log('🔍 Checking for employees using positions...');
    
    // Check if any employees are using positions
    const employeeCount = await prisma.employee.count();
    
    if (employeeCount > 0) {
      console.log(`❌ Cannot delete positions! There are ${employeeCount} employees in the system.`);
      console.log('⚠️  Deleting positions would break employee records.');
      console.log('💡 Options:');
      console.log('   1. Delete all employees first (use clearEmployees script)');
      console.log('   2. Update employees to use different positions');
      process.exit(1);
    }

    console.log('✅ No employees found. Safe to delete positions.');
    
    // Count positions before deletion
    const positionCount = await prisma.position.count();
    const positionLevelCount = await prisma.positionLevel.count();
    const positionResponsibilityCount = await prisma.positionResponsibility.count();
    
    console.log(`\n📊 Current data:`);
    console.log(`   - Positions: ${positionCount}`);
    console.log(`   - Position Levels: ${positionLevelCount}`);
    console.log(`   - Position Responsibilities: ${positionResponsibilityCount}`);
    
    if (positionCount === 0) {
      console.log('\n✅ No positions to delete.');
      return;
    }

    console.log('\n🗑️  Deleting all positions...');
    
    // Delete all positions (PositionLevel and PositionResponsibility will be cascade deleted)
    const result = await prisma.position.deleteMany({});
    
    console.log(`\n✅ Successfully deleted ${result.count} positions!`);
    console.log('✅ Position levels and responsibilities were automatically deleted (cascade).');
    
    // Verify deletion
    const remainingPositions = await prisma.position.count();
    const remainingLevels = await prisma.positionLevel.count();
    const remainingResponsibilities = await prisma.positionResponsibility.count();
    
    console.log(`\n📊 Remaining data:`);
    console.log(`   - Positions: ${remainingPositions}`);
    console.log(`   - Position Levels: ${remainingLevels}`);
    console.log(`   - Position Responsibilities: ${remainingResponsibilities}`);
    
  } catch (error) {
    console.error('❌ Error clearing positions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearPositions()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

