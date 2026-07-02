import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);

  // Create Departments (7 departments)
  console.log('\n📋 Creating departments...');
  const generalDept = await prisma.department.upsert({
    where: { code: 'DEPT_GENERAL' },
    update: {},
    create: {
      code: 'DEPT_GENERAL',
      name: 'Bộ phận tổng hợp',
      description: 'Bộ phận tổng hợp',
    },
  });

  const qualityDept = await prisma.department.upsert({
    where: { code: 'DEPT_QUALITY' },
    update: {},
    create: {
      code: 'DEPT_QUALITY',
      name: 'Bộ phận chất lượng',
      description: 'Bộ phận chất lượng',
    },
  });

  const businessDept = await prisma.department.upsert({
    where: { code: 'DEPT_BUSINESS' },
    update: {},
    create: {
      code: 'DEPT_BUSINESS',
      name: 'Bộ phận kinh doanh',
      description: 'Bộ phận kinh doanh',
    },
  });

  const accountingDept = await prisma.department.upsert({
    where: { code: 'DEPT_ACCOUNTING' },
    update: {},
    create: {
      code: 'DEPT_ACCOUNTING',
      name: 'Bộ phận kế toán',
      description: 'Bộ phận kế toán',
    },
  });

  const purchasingDept = await prisma.department.upsert({
    where: { code: 'DEPT_PURCHASING' },
    update: {},
    create: {
      code: 'DEPT_PURCHASING',
      name: 'Bộ phận thu mua',
      description: 'Bộ phận thu mua',
    },
  });

  const productionDept = await prisma.department.upsert({
    where: { code: 'DEPT_PRODUCTION' },
    update: {},
    create: {
      code: 'DEPT_PRODUCTION',
      name: 'Bộ phận sản xuất',
      description: 'Bộ phận sản xuất',
    },
  });

  const technicalDept = await prisma.department.upsert({
    where: { code: 'DEPT_TECHNICAL' },
    update: {},
    create: {
      code: 'DEPT_TECHNICAL',
      name: 'Bộ phận kỹ thuật',
      description: 'Bộ phận kỹ thuật',
    },
  });

  console.log('✅ Departments created');

  // Create SubDepartments
  console.log('\n📋 Creating sub-departments...');

  // General sub-departments
  await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_GENERAL_PRICING' },
    update: {},
    create: {
      code: 'SUBDEPT_GENERAL_PRICING',
      name: 'Phòng giá thành',
      description: 'Phòng giá thành',
      departmentId: generalDept.id,
    },
  });

  await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_GENERAL_PARTNERS' },
    update: {},
    create: {
      code: 'SUBDEPT_GENERAL_PARTNERS',
      name: 'Phòng chăm sóc',
      description: 'Phòng chăm sóc',
      departmentId: generalDept.id,
    },
  });

  // Quality sub-departments
  await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_QUALITY_PERSONNEL' },
    update: {},
    create: {
      code: 'SUBDEPT_QUALITY_PERSONNEL',
      name: 'Phòng chất lượng nhân sự',
      description: 'Phòng chất lượng nhân sự',
      departmentId: qualityDept.id,
    },
  });

  await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_QUALITY_PROCESS' },
    update: {},
    create: {
      code: 'SUBDEPT_QUALITY_PROCESS',
      name: 'Phòng chất lượng quy trình',
      description: 'Phòng chất lượng quy trình',
      departmentId: qualityDept.id,
    },
  });

  // Business sub-departments
  await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_BUSINESS_INTERNATIONAL' },
    update: {},
    create: {
      code: 'SUBDEPT_BUSINESS_INTERNATIONAL',
      name: 'Phòng KD Quốc Tế',
      description: 'Phòng KD Quốc Tế',
      departmentId: businessDept.id,
    },
  });

  await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_BUSINESS_DOMESTIC' },
    update: {},
    create: {
      code: 'SUBDEPT_BUSINESS_DOMESTIC',
      name: 'Phòng KD Nội Địa',
      description: 'Phòng KD Nội Địa',
      departmentId: businessDept.id,
    },
  });

  // Accounting sub-departments
  await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_ACCOUNTING_ADMIN' },
    update: {},
    create: {
      code: 'SUBDEPT_ACCOUNTING_ADMIN',
      name: 'Phòng KT Hành chính',
      description: 'Phòng KT Hành chính',
      departmentId: accountingDept.id,
    },
  });

  await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_ACCOUNTING_TAX' },
    update: {},
    create: {
      code: 'SUBDEPT_ACCOUNTING_TAX',
      name: 'Phòng KT thuế',
      description: 'Phòng KT thuế',
      departmentId: accountingDept.id,
    },
  });

  // Purchasing sub-departments
  await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_PURCHASING_MATERIALS' },
    update: {},
    create: {
      code: 'SUBDEPT_PURCHASING_MATERIALS',
      name: 'Phòng thu mua NVL',
      description: 'Phòng thu mua NVL',
      departmentId: purchasingDept.id,
    },
  });

  await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_PURCHASING_EQUIPMENT' },
    update: {},
    create: {
      code: 'SUBDEPT_PURCHASING_EQUIPMENT',
      name: 'Phòng mua Thiết bị',
      description: 'Phòng mua Thiết bị',
      departmentId: purchasingDept.id,
    },
  });

  // Production sub-departments
  await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_PRODUCTION_MANAGEMENT' },
    update: {},
    create: {
      code: 'SUBDEPT_PRODUCTION_MANAGEMENT',
      name: 'Phòng QLSX',
      description: 'Phòng QLSX',
      departmentId: productionDept.id,
    },
  });

  await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_PRODUCTION_WAREHOUSE' },
    update: {},
    create: {
      code: 'SUBDEPT_PRODUCTION_WAREHOUSE',
      name: 'Quản lý kho',
      description: 'Quản lý kho',
      departmentId: productionDept.id,
    },
  });

  await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_PRODUCTION_DATA' },
    update: {},
    create: {
      code: 'SUBDEPT_PRODUCTION_DATA',
      name: 'Dữ liệu sản xuất',
      description: 'Dữ liệu sản xuất',
      departmentId: productionDept.id,
    },
  });

  // Technical sub-departments
  await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_TECHNICAL_QUALITY' },
    update: {},
    create: {
      code: 'SUBDEPT_TECHNICAL_QUALITY',
      name: 'Phòng QLHTM',
      description: 'Phòng QLHTM',
      departmentId: technicalDept.id,
    },
  });

  await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_TECHNICAL_MECHANICAL' },
    update: {},
    create: {
      code: 'SUBDEPT_TECHNICAL_MECHANICAL',
      name: 'Phòng cơ- điện',
      description: 'Phòng cơ- điện',
      departmentId: technicalDept.id,
    },
  });

  console.log('✅ Sub-departments created');

  // Create Positions
  console.log('\n📋 Creating positions...');
  const qcStaffPos = await prisma.position.upsert({
    where: { code: 'POS_QC_STAFF' },
    update: {},
    create: {
      code: 'POS_QC_STAFF',
      name: 'Nhân viên QC',
      description: 'Nhân viên kiểm tra chất lượng',
    },
  });

  await prisma.position.upsert({
    where: { code: 'POS_QC_LEAD' },
    update: {},
    create: {
      code: 'POS_QC_LEAD',
      name: 'Trưởng nhóm QC',
      description: 'Trưởng nhóm kiểm tra chất lượng',
    },
  });

  await prisma.position.upsert({
    where: { code: 'POS_PROD_WORKER' },
    update: {},
    create: {
      code: 'POS_PROD_WORKER',
      name: 'Nhân viên sản xuất',
      description: 'Nhân viên vận hành dây chuyền',
    },
  });

  // Create 50 positions
  const positions = [
    { code: 'POS_001', name: 'Giám đốc' },
    { code: 'POS_002', name: 'Phó Giám đốc' },
    { code: 'POS_003', name: 'Trưởng phòng' },
    { code: 'POS_004', name: 'Phó Trưởng phòng' },
    { code: 'POS_005', name: 'Nhân viên chính thức' },
    { code: 'POS_006', name: 'Nhân viên thử việc' },
    { code: 'POS_007', name: 'Kỹ sư chất lượng' },
    { code: 'POS_008', name: 'Kỹ sư sản xuất' },
    { code: 'POS_009', name: 'Kỹ sư cơ khí' },
    { code: 'POS_010', name: 'Kỹ sư điện' },
    { code: 'POS_011', name: 'Kỹ sư phần mềm' },
    { code: 'POS_012', name: 'Lập trình viên' },
    { code: 'POS_013', name: 'Nhân viên IT' },
    { code: 'POS_014', name: 'Quản lý dự án' },
    { code: 'POS_015', name: 'Nhân viên kinh doanh' },
    { code: 'POS_016', name: 'Nhân viên bán hàng' },
    { code: 'POS_017', name: 'Nhân viên marketing' },
    { code: 'POS_018', name: 'Nhân viên kế toán' },
    { code: 'POS_019', name: 'Kế toán trưởng' },
    { code: 'POS_020', name: 'Nhân viên thu mua' },
    { code: 'POS_021', name: 'Trưởng nhóm thu mua' },
    { code: 'POS_022', name: 'Nhân viên kho' },
    { code: 'POS_023', name: 'Quản lý kho' },
    { code: 'POS_024', name: 'Nhân viên vận chuyển' },
    { code: 'POS_025', name: 'Nhân viên logistics' },
    { code: 'POS_026', name: 'Nhân viên hành chính' },
    { code: 'POS_027', name: 'Nhân viên nhân sự' },
    { code: 'POS_028', name: 'Trưởng nhóm nhân sự' },
    { code: 'POS_029', name: 'Nhân viên an toàn lao động' },
    { code: 'POS_030', name: 'Nhân viên bảo vệ' },
    { code: 'POS_031', name: 'Nhân viên vệ sinh' },
    { code: 'POS_032', name: 'Nhân viên bảo trì' },
    { code: 'POS_033', name: 'Thợ cơ khí' },
    { code: 'POS_034', name: 'Thợ điện' },
    { code: 'POS_035', name: 'Thợ hàn' },
    { code: 'POS_036', name: 'Thợ lắp ráp' },
    { code: 'POS_037', name: 'Nhân viên kiểm tra' },
    { code: 'POS_038', name: 'Nhân viên đóng gói' },
    { code: 'POS_039', name: 'Nhân viên dán nhãn' },
    { code: 'POS_040', name: 'Nhân viên vận hành máy' },
    { code: 'POS_041', name: 'Nhân viên giám sát' },
    { code: 'POS_042', name: 'Nhân viên tư vấn' },
    { code: 'POS_043', name: 'Nhân viên đào tạo' },
    { code: 'POS_044', name: 'Nhân viên phát triển' },
    { code: 'POS_045', name: 'Nhân viên nghiên cứu' },
    { code: 'POS_046', name: 'Nhân viên thiết kế' },
    { code: 'POS_047', name: 'Nhân viên lập kế hoạch' },
    { code: 'POS_048', name: 'Nhân viên phân tích' },
    { code: 'POS_049', name: 'Nhân viên báo cáo' },
    { code: 'POS_050', name: 'Nhân viên hỗ trợ' },
  ];

  for (const pos of positions) {
    await prisma.position.upsert({
      where: { code: pos.code },
      update: {},
      create: {
        code: pos.code,
        name: pos.name,
        description: `Vị trí: ${pos.name}`,
      },
    });
  }

  console.log('✅ Positions created (50 positions)');

  // Create Position Levels
  console.log('\n💰 Creating position levels...');
  const allPositions = await prisma.position.findMany();

  // Define standard levels for all positions
  const standardLevels = [
    { level: 'Junior', baseSalary: 4000000, kpiSalary: 1000000 },
    { level: 'Senior', baseSalary: 6500000, kpiSalary: 1500000 },
    { level: 'Manager', baseSalary: 10000000, kpiSalary: 2000000 },
    { level: 'Executive', baseSalary: 16000000, kpiSalary: 4000000 },
  ];

  for (const position of allPositions) {
    // Create all standard levels for each position
    for (const levelData of standardLevels) {
      await prisma.positionLevel.upsert({
        where: { positionId_level: { positionId: position.id, level: levelData.level } },
        update: {},
        create: {
          positionId: position.id,
          level: levelData.level,
          baseSalary: levelData.baseSalary,
          kpiSalary: levelData.kpiSalary,
        },
      });
    }
  }

  console.log('✅ Position levels created');

  // Create admin user
  console.log('\n👤 Creating users...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { password: adminPassword },
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN' as any,
      isActive: true,
      departmentId: generalDept.id,
    },
  });
  await prisma.employee.upsert({
    where: { employeeCode: 'NV0000' },
    update: { userId: admin.id },
    create: {
      userId: admin.id,
      employeeCode: 'NV0000',
      gender: 'MALE',
      dateOfBirth: new Date('1985-01-01'),
      phoneNumber: '0900000000',
      address: 'TP.HCM',
      positionId: qcStaffPos.id,
      hireDate: new Date('2020-01-01'),
      contractType: 'PERMANENT',
      educationLevel: 'MASTER',
      specialization: 'Quản trị hệ thống',
      baseSalary: 30000000,
      kpiLevel: 100,
      weight: 70,
      height: 175,
      shirtSize: 'L',
      pantSize: '32',
      shoeSize: '42',
      bankAccount: '0000000000',
      lockerNumber: 'L000',
      notes: 'Quản trị viên hệ thống',
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create Roles
  console.log('\n🔐 Creating roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'Quản trị viên hệ thống',
      level: 1,
      isActive: true,
    },
  });

  const deptHeadRole = await prisma.role.upsert({
    where: { name: 'Trưởng bộ phận' },
    update: {},
    create: {
      name: 'Trưởng bộ phận',
      description: 'Trưởng bộ phận',
      level: 2,
      isActive: true,
    },
  });

  const teamLeadRole = await prisma.role.upsert({
    where: { name: 'Trưởng phòng' },
    update: {},
    create: {
      name: 'Trưởng phòng',
      description: 'Trưởng phòng/Nhóm',
      level: 3,
      isActive: true,
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'Nhân viên' },
    update: {},
    create: {
      name: 'Nhân viên',
      description: 'Nhân viên thường',
      level: 4,
      isActive: true,
    },
  });

  console.log('✅ Roles created');

  // Create Permissions
  console.log('\n🔐 Creating permissions...');
  const permissions = [
    // Employee permissions
    { action: 'CREATE', resource: 'EMPLOYEE', name: 'Tạo nhân viên' },
    { action: 'READ', resource: 'EMPLOYEE', name: 'Xem nhân viên' },
    { action: 'UPDATE', resource: 'EMPLOYEE', name: 'Cập nhật nhân viên' },
    { action: 'DELETE', resource: 'EMPLOYEE', name: 'Xóa nhân viên' },

    // Department permissions
    { action: 'CREATE', resource: 'DEPARTMENT', name: 'Tạo phòng ban' },
    { action: 'READ', resource: 'DEPARTMENT', name: 'Xem phòng ban' },
    { action: 'UPDATE', resource: 'DEPARTMENT', name: 'Cập nhật phòng ban' },
    { action: 'DELETE', resource: 'DEPARTMENT', name: 'Xóa phòng ban' },

    // Position permissions
    { action: 'CREATE', resource: 'POSITION', name: 'Tạo vị trí' },
    { action: 'READ', resource: 'POSITION', name: 'Xem vị trí' },
    { action: 'UPDATE', resource: 'POSITION', name: 'Cập nhật vị trí' },
    { action: 'DELETE', resource: 'POSITION', name: 'Xóa vị trí' },

    // Payroll permissions
    { action: 'CREATE', resource: 'PAYROLL', name: 'Tạo bảng lương' },
    { action: 'READ', resource: 'PAYROLL', name: 'Xem bảng lương' },
    { action: 'UPDATE', resource: 'PAYROLL', name: 'Cập nhật bảng lương' },
    { action: 'APPROVE', resource: 'PAYROLL', name: 'Duyệt bảng lương' },

    // Evaluation permissions
    { action: 'CREATE', resource: 'EVALUATION', name: 'Tạo đánh giá' },
    { action: 'READ', resource: 'EVALUATION', name: 'Xem đánh giá' },
    { action: 'UPDATE', resource: 'EVALUATION', name: 'Cập nhật đánh giá' },
    { action: 'APPROVE', resource: 'EVALUATION', name: 'Duyệt đánh giá' },

    // Quality Check permissions
    { action: 'CREATE', resource: 'QUALITY_CHECK', name: 'Tạo kiểm tra chất lượng' },
    { action: 'READ', resource: 'QUALITY_CHECK', name: 'Xem kiểm tra chất lượng' },
    { action: 'UPDATE', resource: 'QUALITY_CHECK', name: 'Cập nhật kiểm tra chất lượng' },
    { action: 'APPROVE', resource: 'QUALITY_CHECK', name: 'Duyệt kiểm tra chất lượng' },

    // Inspection permissions
    { action: 'CREATE', resource: 'INSPECTION', name: 'Tạo kiểm tra' },
    { action: 'READ', resource: 'INSPECTION', name: 'Xem kiểm tra' },
    { action: 'UPDATE', resource: 'INSPECTION', name: 'Cập nhật kiểm tra' },
    { action: 'APPROVE', resource: 'INSPECTION', name: 'Duyệt kiểm tra' },

    // Report permissions
    { action: 'READ', resource: 'REPORT', name: 'Xem báo cáo' },
    { action: 'EXPORT', resource: 'REPORT', name: 'Xuất báo cáo' },
  ];

  const createdPermissions = await Promise.all(
    permissions.map((perm) =>
      prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: {
          name: perm.name,
          action: perm.action as any,
          resource: perm.resource as any,
        },
      })
    )
  );

  console.log('✅ Permissions created');

  // Assign permissions to roles
  console.log('\n🔐 Assigning permissions to roles...');

  // Admin has all permissions
  for (const perm of createdPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Trưởng bộ phận - can manage employees, view payroll, approve evaluations
  const deptHeadPermissions = createdPermissions.filter(
    (p) =>
      (p.resource === 'EMPLOYEE' && ['READ', 'UPDATE'].includes(p.action)) ||
      (p.resource === 'PAYROLL' && ['READ'].includes(p.action)) ||
      (p.resource === 'EVALUATION' && ['READ', 'APPROVE'].includes(p.action)) ||
      (p.resource === 'QUALITY_CHECK' && ['READ', 'APPROVE'].includes(p.action)) ||
      (p.resource === 'REPORT' && ['READ', 'EXPORT'].includes(p.action))
  );

  for (const perm of deptHeadPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: deptHeadRole.id, permissionId: perm.id } },
      update: {},
      create: {
        roleId: deptHeadRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Trưởng phòng - can view employees, create quality checks, view reports
  const teamLeadPermissions = createdPermissions.filter(
    (p) =>
      (p.resource === 'EMPLOYEE' && ['READ'].includes(p.action)) ||
      (p.resource === 'QUALITY_CHECK' && ['CREATE', 'READ'].includes(p.action)) ||
      (p.resource === 'INSPECTION' && ['CREATE', 'READ'].includes(p.action)) ||
      (p.resource === 'REPORT' && ['READ'].includes(p.action))
  );

  for (const perm of teamLeadPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: teamLeadRole.id, permissionId: perm.id } },
      update: {},
      create: {
        roleId: teamLeadRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Nhân viên - can view own data and reports
  const employeePermissions = createdPermissions.filter(
    (p) =>
      (p.resource === 'EMPLOYEE' && ['READ'].includes(p.action)) ||
      (p.resource === 'PAYROLL' && ['READ'].includes(p.action)) ||
      (p.resource === 'EVALUATION' && ['READ'].includes(p.action)) ||
      (p.resource === 'REPORT' && ['READ'].includes(p.action))
  );

  for (const perm of employeePermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: employeeRole.id, permissionId: perm.id } },
      update: {},
      create: {
        roleId: employeeRole.id,
        permissionId: perm.id,
      },
    });
  }

  console.log('✅ Permissions assigned to roles');

  // Assign roles to users
  console.log('\n🔐 Assigning roles to users...');

  await prisma.userRoleAssignment.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  });

  console.log('✅ Roles assigned to users');

  // Create Office Accounts (Tài khoản văn phòng)
  console.log('\n🏢 Creating office accounts...');

  for (let i = 1; i <= 5; i++) {
    const officeEmail = `office${i}@example.com`;
    const officePassword = await bcrypt.hash(`office${i}123`, 10);

    const officeUser = await prisma.user.upsert({
      where: { email: officeEmail },
      update: { password: officePassword },
      create: {
        email: officeEmail,
        password: officePassword,
        firstName: `Văn phòng`,
        lastName: `${i}`,
        role: 'EMPLOYEE',
        isActive: true,
        departmentId: generalDept.id,
      },
    });

    await prisma.employee.upsert({
      where: { employeeCode: `VP00${i}` },
      update: { userId: officeUser.id },
      create: {
        userId: officeUser.id,
        employeeCode: `VP00${i}`,
        gender: 'MALE',
        dateOfBirth: new Date('1990-01-01'),
        phoneNumber: `090000000${i}`,
        address: 'TP.HCM',
        positionId: qcStaffPos.id,
        hireDate: new Date('2023-01-01'),
        contractType: 'PERMANENT',
        educationLevel: 'BACHELOR',
        specialization: 'Hành chính',
        baseSalary: 8000000,
        kpiLevel: 80,
        weight: 70,
        height: 170,
        shirtSize: 'M',
        pantSize: '30',
        shoeSize: '40',
        bankAccount: `000000000${i}`,
        lockerNumber: `VP${i}`,
        notes: `Tài khoản văn phòng số ${i}`,
      },
    });

    console.log(`✅ Office account ${i} created: ${officeEmail}`);
  }

  // Create 20 Employees with different names and departments
  console.log('\n👥 Creating 20 employees...');

  const employeeData = [
    { firstName: 'Nguyễn', lastName: 'Văn A', dept: generalDept, pos: 'POS_001', phone: '0901111111' },
    { firstName: 'Trần', lastName: 'Thị B', dept: qualityDept, pos: 'POS_002', phone: '0901111112' },
    { firstName: 'Lê', lastName: 'Văn C', dept: businessDept, pos: 'POS_003', phone: '0901111113' },
    { firstName: 'Phạm', lastName: 'Thị D', dept: accountingDept, pos: 'POS_004', phone: '0901111114' },
    { firstName: 'Hoàng', lastName: 'Văn E', dept: purchasingDept, pos: 'POS_005', phone: '0901111115' },
    { firstName: 'Vũ', lastName: 'Thị F', dept: productionDept, pos: 'POS_006', phone: '0901111116' },
    { firstName: 'Đặng', lastName: 'Văn G', dept: technicalDept, pos: 'POS_007', phone: '0901111117' },
    { firstName: 'Bùi', lastName: 'Thị H', dept: generalDept, pos: 'POS_008', phone: '0901111118' },
    { firstName: 'Dương', lastName: 'Văn I', dept: qualityDept, pos: 'POS_009', phone: '0901111119' },
    { firstName: 'Tô', lastName: 'Thị J', dept: businessDept, pos: 'POS_010', phone: '0901111120' },
    { firstName: 'Cao', lastName: 'Văn K', dept: accountingDept, pos: 'POS_011', phone: '0901111121' },
    { firstName: 'Nông', lastName: 'Thị L', dept: purchasingDept, pos: 'POS_012', phone: '0901111122' },
    { firstName: 'Tạ', lastName: 'Văn M', dept: productionDept, pos: 'POS_013', phone: '0901111123' },
    { firstName: 'Hà', lastName: 'Thị N', dept: technicalDept, pos: 'POS_014', phone: '0901111124' },
    { firstName: 'Phan', lastName: 'Văn O', dept: generalDept, pos: 'POS_015', phone: '0901111125' },
    { firstName: 'Võ', lastName: 'Thị P', dept: qualityDept, pos: 'POS_016', phone: '0901111126' },
    { firstName: 'Tây', lastName: 'Văn Q', dept: businessDept, pos: 'POS_017', phone: '0901111127' },
    { firstName: 'Sơn', lastName: 'Thị R', dept: accountingDept, pos: 'POS_018', phone: '0901111128' },
    { firstName: 'Mạnh', lastName: 'Văn S', dept: purchasingDept, pos: 'POS_019', phone: '0901111129' },
    { firstName: 'Linh', lastName: 'Thị T', dept: productionDept, pos: 'POS_020', phone: '0901111130' },
  ];

  for (let i = 0; i < employeeData.length; i++) {
    const emp = employeeData[i];
    const empCode = `NV${String(i + 1).padStart(4, '0')}`;
    const empEmail = `${emp.firstName.toLowerCase()}${emp.lastName.toLowerCase()}@example.com`;
    const empPassword = await bcrypt.hash('employee123', 10);

    const empUser = await prisma.user.upsert({
      where: { email: empEmail },
      update: { password: empPassword },
      create: {
        email: empEmail,
        password: empPassword,
        firstName: emp.firstName,
        lastName: emp.lastName,
        role: 'EMPLOYEE',
        isActive: true,
        departmentId: emp.dept.id,
      },
    });

    const position = await prisma.position.findUnique({
      where: { code: emp.pos },
    });

    await prisma.employee.upsert({
      where: { employeeCode: empCode },
      update: { userId: empUser.id },
      create: {
        userId: empUser.id,
        employeeCode: empCode,
        gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
        dateOfBirth: new Date(1990 + Math.floor(i / 2), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        phoneNumber: emp.phone,
        address: 'TP.HCM',
        positionId: position?.id || qcStaffPos.id,
        hireDate: new Date(2022 + Math.floor(i / 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        contractType: 'PERMANENT',
        educationLevel: i % 3 === 0 ? 'BACHELOR' : i % 3 === 1 ? 'MASTER' : 'ASSOCIATE',
        specialization: emp.dept.name,
        baseSalary: 6000000 + Math.floor(Math.random() * 4000000),
        kpiLevel: 70 + Math.floor(Math.random() * 30),
        weight: 60 + Math.floor(Math.random() * 20),
        height: 160 + Math.floor(Math.random() * 20),
        shirtSize: ['S', 'M', 'L', 'XL'][Math.floor(Math.random() * 4)],
        pantSize: String(28 + Math.floor(Math.random() * 8)),
        shoeSize: String(36 + Math.floor(Math.random() * 8)),
        bankAccount: `${String(i + 1).padStart(10, '0')}`,
        lockerNumber: `L${String(i + 1).padStart(3, '0')}`,
        notes: `Nhân viên ${emp.firstName} ${emp.lastName} - Bộ phận ${emp.dept.name}`,
      },
    });

    console.log(`✅ Employee ${i + 1}/20 created: ${emp.firstName} ${emp.lastName} (${empEmail})`);
  }

  // Seed 5 work shifts với check-in windows
  console.log('\n🕐 Creating work shifts...');
  const shifts = [
    { name: 'Ca 1',       startTime: '06:00', endTime: '14:00', checkInWindowStart: '05:30', checkInWindowEnd: '06:30' },
    { name: 'Hành chính', startTime: '07:00', endTime: '16:00', checkInWindowStart: '06:30', checkInWindowEnd: '07:30' },
    { name: 'Văn phòng',  startTime: '08:00', endTime: '17:00', checkInWindowStart: '07:30', checkInWindowEnd: '08:30' },
    { name: 'Ca 2',       startTime: '14:00', endTime: '22:00', checkInWindowStart: '13:30', checkInWindowEnd: '14:30' },
    { name: 'Ca 3',       startTime: '22:00', endTime: '06:00', checkInWindowStart: '21:00', checkInWindowEnd: '22:30' },
  ];
  for (const s of shifts) {
    await prisma.workShift.upsert({
      where: { name: s.name },
      update: {
        startTime: s.startTime,
        endTime: s.endTime,
        checkInWindowStart: s.checkInWindowStart,
        checkInWindowEnd: s.checkInWindowEnd,
        isActive: true,
      },
      create: s,
    });
    console.log(`✅ Shift: ${s.name} (${s.startTime}-${s.endTime}, window ${s.checkInWindowStart}-${s.checkInWindowEnd})`);
  }

  console.log('✨ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

