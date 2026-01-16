import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting machine migration...');

  // Get all machines
  const machines = await prisma.machine.findMany({
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${machines.length} machines`);

  // Update each machine with a unique maMay
  for (let i = 0; i < machines.length; i++) {
    const machine = machines[i];
    const maMay = `MAY${String(i + 1).padStart(3, '0')}`;
    
    console.log(`Updating machine ${machine.tenMay} with maMay: ${maMay}`);
    
    await prisma.machine.update({
      where: { id: machine.id },
      data: { maMay },
    });
  }

  // Now update system_operations to link to machines
  const operations = await prisma.systemOperation.findMany();
  
  console.log(`Found ${operations.length} system operations`);

  for (const operation of operations) {
    // Find machine by tenMay
    const machine = await prisma.machine.findUnique({
      where: { tenMay: operation.tenMay },
    });

    if (machine) {
      console.log(`Linking operation ${operation.id} to machine ${machine.tenMay}`);
      await prisma.systemOperation.update({
        where: { id: operation.id },
        data: { machineId: machine.id },
      });
    } else {
      console.log(`Warning: No machine found for operation ${operation.id} with tenMay: ${operation.tenMay}`);
    }
  }

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

