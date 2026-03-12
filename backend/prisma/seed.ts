import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('password123', 10);

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
  const qualityPersonnelSubDept = await prisma.subDepartment.upsert({
    where: { code: 'SUBDEPT_QUALITY_PERSONNEL' },
    update: {},
    create: {
      code: 'SUBDEPT_QUALITY_PERSONNEL',
      name: 'Phòng chất lượng nhân sự',
      description: 'Phòng chất lượng nhân sự',
      departmentId: qualityDept.id,
    },
  });

  const qualityProcessSubDept = await prisma.subDepartment.upsert({
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
  const productionManagementSubDept = await prisma.subDepartment.upsert({
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

  const qcLeadPos = await prisma.position.upsert({
    where: { code: 'POS_QC_LEAD' },
    update: {},
    create: {
      code: 'POS_QC_LEAD',
      name: 'Trưởng nhóm QC',
      description: 'Trưởng nhóm kiểm tra chất lượng',
    },
  });

  const prodWorkerPos = await prisma.position.upsert({
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
    where: { employeeCode: 'NV000' },
    update: { userId: admin.id },
    create: {
      userId: admin.id,
      employeeCode: 'NV000',
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

  // Create QC staff user (Nguyễn Văn An)
  const qcStaff = await prisma.user.upsert({
    where: { email: 'an.nguyen@company.com' },
    update: { password: userPassword },
    create: {
      email: 'an.nguyen@company.com',
      password: userPassword,
      firstName: 'Nguyễn',
      lastName: 'Văn An',
      role: 'TEAM_LEAD' as any,
      isActive: true,
      departmentId: qualityDept.id,
      subDepartmentId: qualityPersonnelSubDept.id,
    },
  });
  await prisma.employee.upsert({
    where: { employeeCode: 'NV001' },
    update: { userId: qcStaff.id },
    create: {
      userId: qcStaff.id,
      employeeCode: 'NV001',
      gender: 'MALE',
      dateOfBirth: new Date('1990-05-15'),
      phoneNumber: '0901234567',
      address: '123 Nguyễn Văn Linh, Q.7, TP.HCM',
      positionId: qcStaffPos.id,
      subDepartmentId: qualityPersonnelSubDept.id,
      hireDate: new Date('2022-01-15'),
      contractType: 'PERMANENT',
      educationLevel: 'BACHELOR',
      specialization: 'Kiểm tra chất lượng thực phẩm',
      specialSkills: 'HACCP, ISO 22000',
      baseSalary: 15000000,
      kpiLevel: 100,
      weight: 65,
      height: 170,
      shirtSize: 'M',
      pantSize: '32',
      shoeSize: '42',
      bankAccount: '1234567890',
      lockerNumber: 'L001',
      notes: 'Nhân viên tích cực, có kinh nghiệm',
    },
  });

  console.log('✅ QC staff user created:', qcStaff.email);

  // Create QC lead user (Trần Thị Bình)
  const qcLead = await prisma.user.upsert({
    where: { email: 'binh.tran@company.com' },
    update: { password: userPassword },
    create: {
      email: 'binh.tran@company.com',
      password: userPassword,
      firstName: 'Trần',
      lastName: 'Thị Bình',
      role: 'DEPARTMENT_HEAD' as any,
      isActive: true,
      departmentId: qualityDept.id,
      subDepartmentId: qualityProcessSubDept.id,
    },
  });
  await prisma.employee.upsert({
    where: { employeeCode: 'NV002' },
    update: { userId: qcLead.id },
    create: {
      userId: qcLead.id,
      employeeCode: 'NV002',
      gender: 'FEMALE',
      dateOfBirth: new Date('1992-08-20'),
      phoneNumber: '0902345678',
      address: '456 Lê Văn Việt, Q.9, TP.HCM',
      positionId: qcLeadPos.id,
      subDepartmentId: qualityProcessSubDept.id,
      hireDate: new Date('2021-03-10'),
      contractType: 'PERMANENT',
      educationLevel: 'MASTER',
      specialization: 'Quản lý chất lượng',
      specialSkills: 'Six Sigma, Lean Manufacturing',
      baseSalary: 20000000,
      kpiLevel: 120,
      weight: 58,
      height: 165,
      shirtSize: 'S',
      pantSize: '28',
      shoeSize: '38',
      bankAccount: '0987654321',
      lockerNumber: 'L002',
      notes: 'Lãnh đạo tốt, có tầm nhìn',
    },
  });

  console.log('✅ QC lead user created:', qcLead.email);

  // Create production worker user
  const prodWorker = await prisma.user.upsert({
    where: { email: 'employee@example.com' },
    update: { password: userPassword },
    create: {
      email: 'employee@example.com',
      password: userPassword,
      firstName: 'Employee',
      lastName: 'User',
      role: 'EMPLOYEE' as any,
      isActive: true,
      departmentId: productionDept.id,
      subDepartmentId: productionManagementSubDept.id,
    },
  });
  await prisma.employee.upsert({
    where: { employeeCode: 'NV003' },
    update: { userId: prodWorker.id },
    create: {
      userId: prodWorker.id,
      employeeCode: 'NV003',
      gender: 'MALE',
      dateOfBirth: new Date('1995-03-10'),
      phoneNumber: '0903456789',
      address: '789 Trần Hưng Đạo, Q.1, TP.HCM',
      positionId: prodWorkerPos.id,
      subDepartmentId: productionManagementSubDept.id,
      hireDate: new Date('2023-06-01'),
      contractType: 'PERMANENT',
      educationLevel: 'HIGH_SCHOOL',
      baseSalary: 12000000,
      kpiLevel: 100,
      weight: 70,
      height: 175,
      shirtSize: 'L',
      pantSize: '34',
      shoeSize: '44',
      bankAccount: '1111111111',
      lockerNumber: 'L003',
    },
  });

  console.log('✅ Production worker user created:', prodWorker.email);

  // Create HR user (with ADMIN role)
  const hr = await prisma.user.upsert({
    where: { email: 'hr@example.com' },
    update: { password: userPassword }, // Update password
    create: {
      email: 'hr@example.com',
      password: userPassword,
      firstName: 'HR',
      lastName: 'Staff',
      role: 'ADMIN' as any,
      isActive: true,
    },
  });

  console.log('✅ HR user created:', hr.email);

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

  await prisma.userRoleAssignment.upsert({
    where: { userId_roleId: { userId: qcStaff.id, roleId: teamLeadRole.id } },
    update: {},
    create: {
      userId: qcStaff.id,
      roleId: teamLeadRole.id,
    },
  });

  await prisma.userRoleAssignment.upsert({
    where: { userId_roleId: { userId: qcLead.id, roleId: deptHeadRole.id } },
    update: {},
    create: {
      userId: qcLead.id,
      roleId: deptHeadRole.id,
    },
  });

  await prisma.userRoleAssignment.upsert({
    where: { userId_roleId: { userId: prodWorker.id, roleId: employeeRole.id } },
    update: {},
    create: {
      userId: prodWorker.id,
      roleId: employeeRole.id,
    },
  });

  await prisma.userRoleAssignment.upsert({
    where: { userId_roleId: { userId: hr.id, roleId: adminRole.id } },
    update: {},
    create: {
      userId: hr.id,
      roleId: adminRole.id,
    },
  });

  console.log('✅ Roles assigned to users');

  // Create Evaluations for current month
  console.log('\n📊 Creating evaluations...');
  const currentDate = new Date();
  const period = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // Get QC Staff employee
  const qcStaffEmployee = await prisma.employee.findFirst({
    where: { userId: qcStaff.id },
  });

  if (qcStaffEmployee) {
    // Create evaluation for QC Staff
    const evaluation = await prisma.evaluation.upsert({
      where: {
        employeeId_period: {
          employeeId: qcStaffEmployee.id,
          period,
        },
      },
      update: {},
      create: {
        employeeId: qcStaffEmployee.id,
        period,
        score: 0,
      },
    });

    // Get QC Staff position responsibilities
    const qcStaffPosition = await prisma.position.findFirst({
      where: { code: 'POS_QC_STAFF' },
      include: { responsibilities: true },
    });

    if (qcStaffPosition && qcStaffPosition.responsibilities.length > 0) {
      // Create evaluation details for each responsibility
      for (const resp of qcStaffPosition.responsibilities) {
        await prisma.evaluationDetail.upsert({
          where: {
            evaluationId_positionResponsibilityId: {
              evaluationId: evaluation.id,
              positionResponsibilityId: resp.id,
            },
          },
          update: {},
          create: {
            evaluationId: evaluation.id,
            positionResponsibilityId: resp.id,
            selfScore: 80 + Math.random() * 20, // Random score between 80-100
            supervisorScore1: 75 + Math.random() * 25, // Random score between 75-100
            supervisorScore2: 78 + Math.random() * 22, // Random score between 78-100
          },
        });
      }
    }
  }

  console.log('✅ Evaluations created');

  // Create Payroll data for current month
  console.log('\n💰 Creating payroll data...');

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Get all employees
  const allEmployees = await prisma.employee.findMany({
    include: {
      position: {
        include: {
          levels: true,
        },
      },
    },
  });

  // Create payroll for each employee
  for (const employee of allEmployees) {
    // Get position level (default to first level if exists)
    const positionLevel = employee.position?.levels?.[0];
    const baseSalary = positionLevel?.baseSalary || employee.baseSalary || 5000000;
    const kpiSalary = positionLevel?.kpiSalary || 1000000;

    // Get evaluation score for KPI bonus calculation
    const evaluation = await prisma.evaluation.findFirst({
      where: {
        employeeId: employee.id,
        period,
      },
      include: {
        details: true,
      },
    });

    // Calculate average evaluation score
    let evaluationScore = 0;
    if (evaluation && evaluation.details.length > 0) {
      const avgSelfScore =
        evaluation.details.reduce((sum, d) => sum + (d.selfScore || 0), 0) / evaluation.details.length;
      const avgSupervisor1 =
        evaluation.details.reduce((sum, d) => sum + (d.supervisorScore1 || 0), 0) / evaluation.details.length;
      const avgSupervisor2 =
        evaluation.details.reduce((sum, d) => sum + (d.supervisorScore2 || 0), 0) / evaluation.details.length;
      evaluationScore = (avgSelfScore + avgSupervisor1 + avgSupervisor2) / 3 / 100; // Convert to percentage
    } else {
      evaluationScore = 0.8; // Default 80% if no evaluation
    }

    // Calculate KPI bonus based on evaluation score
    const kpiBonus = kpiSalary * evaluationScore;

    // Calculate other values
    const positionAllowance = baseSalary * 0.05; // 5% position allowance
    const otherAllowances = 0;
    const totalIncome = baseSalary + kpiBonus + positionAllowance + otherAllowances;

    // Calculate deductions (Vietnamese standard)
    const socialInsurance = baseSalary * 0.08; // 8%
    const healthInsurance = baseSalary * 0.015; // 1.5%
    const unemploymentInsurance = baseSalary * 0.01; // 1%
    const personalIncomeTax = Math.max(0, (totalIncome - 11000000) * 0.1); // 10% on income above 11M
    const totalDeductions = socialInsurance + healthInsurance + unemploymentInsurance + personalIncomeTax;

    // Calculate net salary
    const netSalary = totalIncome - totalDeductions;

    // Create payroll
    await prisma.payroll.upsert({
      where: {
        employeeId_month_year: {
          employeeId: employee.id,
          month: currentMonth,
          year: currentYear,
        },
      },
      update: {
        baseSalary,
        kpiBonus,
        positionAllowance,
        otherAllowances,
        totalIncome,
        socialInsurance,
        healthInsurance,
        unemploymentInsurance,
        personalIncomeTax,
        totalDeductions,
        netSalary,
        workDays: 22,
        leaveDays: 0,
        overtimeHours: 0,
      },
      create: {
        employeeId: employee.id,
        month: currentMonth,
        year: currentYear,
        baseSalary,
        kpiBonus,
        positionAllowance,
        otherAllowances,
        totalIncome,
        socialInsurance,
        healthInsurance,
        unemploymentInsurance,
        personalIncomeTax,
        totalDeductions,
        netSalary,
        workDays: 22,
        leaveDays: 0,
        overtimeHours: 0,
      },
    });
  }

  console.log('✅ Payroll data created');

  // Create Internal Inspection data
  console.log('\n🔍 Creating internal inspection data...');
  const inspectionViolations = [
    {
      violationCode: 'VI-001',
      violationContent: 'Vi phạm quy định vệ sinh',
      violationLevel: 'Quy định',
      violationCategory: 'Vệ sinh',
      violationDescription: 'Khu vực sản xuất không đạt tiêu chuẩn vệ sinh',
    },
    {
      violationCode: 'VI-002',
      violationContent: 'Vi phạm quy trình kiểm tra',
      violationLevel: 'Quy phạm quản lý',
      violationCategory: 'Quy trình',
      violationDescription: 'Không thực hiện đúng quy trình kiểm tra chất lượng',
    },
    {
      violationCode: 'VI-003',
      violationContent: 'Vi phạm an toàn lao động',
      violationLevel: 'Quy định',
      violationCategory: 'An toàn',
      violationDescription: 'Không đeo đầy đủ trang bị bảo vệ cá nhân',
    },
  ];

  for (let i = 0; i < 5; i++) {
    const violation = inspectionViolations[i % inspectionViolations.length];
    const inspectionDate = new Date();
    inspectionDate.setDate(inspectionDate.getDate() - i);

    const inspectionCode = `KTN-${new Date().getFullYear()}-${String(i + 1).padStart(5, '0')}`;
    await prisma.internalInspection.upsert({
      where: { inspectionCode },
      update: {},
      create: {
        inspectionCode,
        inspectionDate,
        inspectionPlanCode: `KH-${new Date().getFullYear()}-${String(i + 1).padStart(3, '0')}`,
        inspectionPlanId: `plan-${i}`,
        violationCode: violation.violationCode,
        violationContent: violation.violationContent,
        violationLevel: violation.violationLevel,
        violationCategory: violation.violationCategory,
        violationDescription: violation.violationDescription,
        inspectedBy: 'Nguyễn Văn An',
        inspectedByCode: 'NV001',
        verifiedBy1: 'Trần Thị Bình',
        verifiedBy1Code: 'NV002',
        verifiedBy2: 'Lê Văn Cường',
        verifiedBy2Code: 'NV003',
        status: i % 3 === 0 ? 'PENDING' : i % 3 === 1 ? 'VERIFIED' : 'CLOSED',
        notes: `Ghi chú kiểm tra ${i + 1}`,
      },
    });
  }

  console.log('✅ Internal inspection data created');

  // Create Attendance data
  console.log('\n📅 Creating attendance data...');
  const employees = await prisma.employee.findMany({ take: 10 });

  for (let i = 0; i < 30; i++) {
    const employee = employees[i % employees.length];
    const attendanceDate = new Date();
    attendanceDate.setDate(attendanceDate.getDate() - (30 - i));

    const checkInTime = new Date(attendanceDate);
    checkInTime.setHours(8, 0, 0, 0);

    const checkOutTime = new Date(attendanceDate);
    checkOutTime.setHours(17, 0, 0, 0);

    const workHours = 8;
    const statuses = ['PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE', 'OVERTIME'];
    const status = statuses[i % statuses.length];

    await prisma.attendance.upsert({
      where: {
        employeeId_attendanceDate_isOvertime: {
          employeeId: employee.id,
          attendanceDate: attendanceDate,
          isOvertime: false,
        },
      },
      update: {},
      create: {
        employeeId: employee.id,
        attendanceDate: attendanceDate,
        checkInTime: status === 'ABSENT' || status === 'ON_LEAVE' ? null : checkInTime,
        checkOutTime: status === 'ABSENT' || status === 'ON_LEAVE' ? null : checkOutTime,
        workHours: status === 'ABSENT' || status === 'ON_LEAVE' ? 0 : workHours,
        status: status as any,
        notes: status === 'LATE' ? 'Đến muộn 30 phút' : null,
      },
    });
  }

  console.log('✅ Attendance data created');

  // ─── International Products ───────────────────────────────────────────────
  console.log('\n📦 Creating international products...');
  const internationalProducts = [
    { maSanPham: 'SP-001', tenSanPham: 'Khoai tây chiên đông lạnh', moTaSanPham: 'Khoai tây cắt lát, chiên sơ và đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-002', tenSanPham: 'Cà rốt xay nhuyễn', moTaSanPham: 'Cà rốt tươi xay nhuyễn, đóng gói hút chân không', loaiSanPham: 'Xay nhuyễn', donViTinh: 'kg' },
    { maSanPham: 'SP-003', tenSanPham: 'Bắp ngô ngọt đông lạnh', moTaSanPham: 'Hạt bắp ngô ngọt tách hạt, đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-004', tenSanPham: 'Đậu Hà Lan đông lạnh', moTaSanPham: 'Đậu Hà Lan tươi, đông lạnh nhanh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-005', tenSanPham: 'Ớt chuông đỏ cắt lát', moTaSanPham: 'Ớt chuông đỏ cắt lát mỏng, đông lạnh', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-006', tenSanPham: 'Cải bó xôi xay nhuyễn', moTaSanPham: 'Cải bó xôi tươi xay nhuyễn, đóng túi 1kg', loaiSanPham: 'Xay nhuyễn', donViTinh: 'kg' },
    { maSanPham: 'SP-007', tenSanPham: 'Bông cải xanh đông lạnh', moTaSanPham: 'Bông cải xanh cắt bông, đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-008', tenSanPham: 'Cà chua bi đông lạnh', moTaSanPham: 'Cà chua bi nguyên quả, đông lạnh', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-009', tenSanPham: 'Hành tây cắt hạt lựu', moTaSanPham: 'Hành tây cắt hạt lựu 1cm, đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-010', tenSanPham: 'Tỏi băm đông lạnh', moTaSanPham: 'Tỏi tươi băm nhỏ, đông lạnh, đóng gói 500g', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-011', tenSanPham: 'Gừng xay nhuyễn', moTaSanPham: 'Gừng tươi xay nhuyễn, đóng hũ 200g', loaiSanPham: 'Xay nhuyễn', donViTinh: 'kg' },
    { maSanPham: 'SP-012', tenSanPham: 'Khoai lang đông lạnh', moTaSanPham: 'Khoai lang cắt khối vuông, đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-013', tenSanPham: 'Bí đỏ xay nhuyễn', moTaSanPham: 'Bí đỏ hấp chín và xay nhuyễn, đóng túi 1kg', loaiSanPham: 'Xay nhuyễn', donViTinh: 'kg' },
    { maSanPham: 'SP-014', tenSanPham: 'Đậu bắp cắt khúc đông lạnh', moTaSanPham: 'Đậu bắp tươi cắt khúc 2cm, đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-015', tenSanPham: 'Nấm rơm đông lạnh', moTaSanPham: 'Nấm rơm nguyên tai, đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-016', tenSanPham: 'Nấm hương sấy khô', moTaSanPham: 'Nấm hương sấy khô nguyên tai, đóng gói 200g', loaiSanPham: 'Sấy khô', donViTinh: 'kg' },
    { maSanPham: 'SP-017', tenSanPham: 'Măng tây đông lạnh', moTaSanPham: 'Măng tây xanh cắt khúc 5cm, đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-018', tenSanPham: 'Cần tây cắt nhỏ đông lạnh', moTaSanPham: 'Cần tây cắt nhỏ 1cm, đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-019', tenSanPham: 'Dứa cắt miếng đông lạnh', moTaSanPham: 'Dứa tươi cắt miếng tam giác, đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-020', tenSanPham: 'Xoài cắt miếng đông lạnh', moTaSanPham: 'Xoài chín cắt miếng, đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-021', tenSanPham: 'Thanh long ruột đỏ đông lạnh', moTaSanPham: 'Thanh long ruột đỏ cắt khối, đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-022', tenSanPham: 'Chanh dây xay nhuyễn', moTaSanPham: 'Chanh dây tươi xay nhuyễn, lọc hạt, đóng túi 1kg', loaiSanPham: 'Xay nhuyễn', donViTinh: 'kg' },
    { maSanPham: 'SP-023', tenSanPham: 'Chuối xay nhuyễn đông lạnh', moTaSanPham: 'Chuối chín xay nhuyễn, đông lạnh, đóng túi 1kg', loaiSanPham: 'Xay nhuyễn', donViTinh: 'kg' },
    { maSanPham: 'SP-024', tenSanPham: 'Ổi xay nhuyễn', moTaSanPham: 'Ổi tươi xay nhuyễn, lọc hạt, đóng túi 1kg', loaiSanPham: 'Xay nhuyễn', donViTinh: 'kg' },
    { maSanPham: 'SP-025', tenSanPham: 'Mãng cầu xay nhuyễn', moTaSanPham: 'Mãng cầu xiêm xay nhuyễn, đóng túi 500g', loaiSanPham: 'Xay nhuyễn', donViTinh: 'kg' },
    { maSanPham: 'SP-026', tenSanPham: 'Sầu riêng đông lạnh', moTaSanPham: 'Múi sầu riêng Monthong đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-027', tenSanPham: 'Vải thiều đông lạnh', moTaSanPham: 'Vải thiều bóc vỏ, bỏ hạt, đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-028', tenSanPham: 'Nhãn đông lạnh', moTaSanPham: 'Nhãn bóc vỏ, bỏ hạt, đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-029', tenSanPham: 'Chôm chôm đông lạnh', moTaSanPham: 'Chôm chôm bóc vỏ, bỏ hạt, đông lạnh IQF', loaiSanPham: 'Đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-030', tenSanPham: 'Bơ xay nhuyễn đông lạnh', moTaSanPham: 'Bơ chín xay nhuyễn, đông lạnh, đóng túi 500g', loaiSanPham: 'Xay nhuyễn', donViTinh: 'kg' },
    { maSanPham: 'SP-031', tenSanPham: 'Tôm thẻ đông lạnh', moTaSanPham: 'Tôm thẻ chân trắng bóc vỏ, bỏ đầu, đông lạnh IQF', loaiSanPham: 'Hải sản đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-032', tenSanPham: 'Mực ống đông lạnh', moTaSanPham: 'Mực ống làm sạch, cắt khoanh, đông lạnh IQF', loaiSanPham: 'Hải sản đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-033', tenSanPham: 'Cá tra phi lê đông lạnh', moTaSanPham: 'Cá tra phi lê, cắt miếng, đông lạnh IQF', loaiSanPham: 'Hải sản đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-034', tenSanPham: 'Cua thịt đông lạnh', moTaSanPham: 'Thịt cua tách sẵn, đông lạnh, đóng hộp 500g', loaiSanPham: 'Hải sản đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-035', tenSanPham: 'Nghêu luộc đông lạnh', moTaSanPham: 'Nghêu luộc chín, tách vỏ, đông lạnh IQF', loaiSanPham: 'Hải sản đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-036', tenSanPham: 'Thịt heo xay đông lạnh', moTaSanPham: 'Thịt heo nạc xay, đông lạnh, đóng gói 500g', loaiSanPham: 'Thịt đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-037', tenSanPham: 'Thịt gà phi lê đông lạnh', moTaSanPham: 'Ức gà phi lê, đông lạnh IQF, đóng gói 1kg', loaiSanPham: 'Thịt đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-038', tenSanPham: 'Thịt bò xay đông lạnh', moTaSanPham: 'Thịt bò nạc xay, đông lạnh, đóng gói 500g', loaiSanPham: 'Thịt đông lạnh', donViTinh: 'kg' },
    { maSanPham: 'SP-039', tenSanPham: 'Lạp xưởng tươi', moTaSanPham: 'Lạp xưởng tươi truyền thống, đóng gói 500g', loaiSanPham: 'Chế biến', donViTinh: 'kg' },
    { maSanPham: 'SP-040', tenSanPham: 'Chả giò đông lạnh', moTaSanPham: 'Chả giò nhân thịt heo và rau củ, đông lạnh', loaiSanPham: 'Chế biến', donViTinh: 'thùng' },
    { maSanPham: 'SP-041', tenSanPham: 'Bánh mì đông lạnh', moTaSanPham: 'Bánh mì baguette nướng sơ, đông lạnh, đóng túi 5 cái', loaiSanPham: 'Chế biến', donViTinh: 'thùng' },
    { maSanPham: 'SP-042', tenSanPham: 'Nước cốt dừa đóng hộp', moTaSanPham: 'Nước cốt dừa tươi nguyên chất, đóng hộp 400ml', loaiSanPham: 'Đồ hộp', donViTinh: 'thùng' },
    { maSanPham: 'SP-043', tenSanPham: 'Cà chua nghiền đóng hộp', moTaSanPham: 'Cà chua chín nghiền, đóng hộp 400g', loaiSanPham: 'Đồ hộp', donViTinh: 'thùng' },
    { maSanPham: 'SP-044', tenSanPham: 'Đậu đỏ đóng hộp', moTaSanPham: 'Đậu đỏ luộc chín, đóng hộp 400g', loaiSanPham: 'Đồ hộp', donViTinh: 'thùng' },
    { maSanPham: 'SP-045', tenSanPham: 'Ngô ngọt đóng hộp', moTaSanPham: 'Hạt ngô ngọt luộc chín, đóng hộp 340g', loaiSanPham: 'Đồ hộp', donViTinh: 'thùng' },
    { maSanPham: 'SP-046', tenSanPham: 'Gạo Jasmine xuất khẩu', moTaSanPham: 'Gạo Jasmine thơm, hạt dài, đóng bao 25kg', loaiSanPham: 'Ngũ cốc', donViTinh: 'tấn' },
    { maSanPham: 'SP-047', tenSanPham: 'Gạo ST25 xuất khẩu', moTaSanPham: 'Gạo ST25 ngon nhất thế giới, đóng bao 5kg', loaiSanPham: 'Ngũ cốc', donViTinh: 'tấn' },
    { maSanPham: 'SP-048', tenSanPham: 'Hạt điều rang muối', moTaSanPham: 'Hạt điều W240 rang muối, đóng gói 500g', loaiSanPham: 'Hạt khô', donViTinh: 'kg' },
    { maSanPham: 'SP-049', tenSanPham: 'Hạt tiêu đen xuất khẩu', moTaSanPham: 'Hạt tiêu đen Phú Quốc, đóng gói 1kg', loaiSanPham: 'Gia vị', donViTinh: 'kg' },
    { maSanPham: 'SP-050', tenSanPham: 'Cà phê Robusta xuất khẩu', moTaSanPham: 'Cà phê Robusta Tây Nguyên rang xay, đóng gói 500g', loaiSanPham: 'Đồ uống', donViTinh: 'kg' },
  ];

  for (const product of internationalProducts) {
    await prisma.internationalProduct.upsert({
      where: { maSanPham: product.maSanPham },
      update: {},
      create: product,
    });
  }
  console.log(`✅ Created ${internationalProducts.length} international products`);

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

