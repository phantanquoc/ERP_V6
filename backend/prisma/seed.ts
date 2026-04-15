import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const employeePassword = await bcrypt.hash('123123', 10);

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
  const qualityProcessSubDepartment = await prisma.subDepartment.findUnique({
    where: { code: 'SUBDEPT_QUALITY_PROCESS' },
  });
  const qualityPersonnelSubDepartment = await prisma.subDepartment.findUnique({
    where: { code: 'SUBDEPT_QUALITY_PERSONNEL' },
  });
  const businessDomesticSubDepartment = await prisma.subDepartment.findUnique({
    where: { code: 'SUBDEPT_BUSINESS_DOMESTIC' },
  });
  const purchasingMaterialsSubDepartment = await prisma.subDepartment.findUnique({
    where: { code: 'SUBDEPT_PURCHASING_MATERIALS' },
  });
  const productionWarehouseSubDepartment = await prisma.subDepartment.findUnique({
    where: { code: 'SUBDEPT_PRODUCTION_WAREHOUSE' },
  });
  const warehouseManagerPosition = await prisma.position.findUnique({
    where: { code: 'POS_023' },
  });
  const businessStaffPosition = await prisma.position.findUnique({
    where: { code: 'POS_015' },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: { password: adminPassword },
    create: {
      email: 'admin@gmail.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN' as any,
      isActive: true,
      departmentId: generalDept.id,
    },
  });
  const adminEmployee = await prisma.employee.upsert({
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

  const testUser = await prisma.user.upsert({
    where: { email: 'asd@gmail.com' },
    update: {
      password: employeePassword,
      departmentId: qualityDept.id,
      subDepartmentId: qualityProcessSubDepartment?.id || null,
    },
    create: {
      email: 'asd@gmail.com',
      password: employeePassword,
      firstName: 'TEST',
      lastName: '1',
      role: 'EMPLOYEE' as any,
      isActive: true,
      departmentId: qualityDept.id,
      subDepartmentId: qualityProcessSubDepartment?.id || null,
    },
  });

  const testEmployee = await prisma.employee.upsert({
    where: { employeeCode: 'NV002' },
    update: {
      userId: testUser.id,
      subDepartmentId: qualityProcessSubDepartment?.id || null,
    },
    create: {
      userId: testUser.id,
      employeeCode: 'NV002',
      gender: 'MALE',
      dateOfBirth: new Date('1990-01-01'),
      phoneNumber: '',
      address: '',
      subDepartmentId: qualityProcessSubDepartment?.id || null,
      hireDate: new Date(),
      contractType: 'PERMANENT',
      baseSalary: 0,
    },
  });

  console.log('✅ Test employee created:', testUser.email);

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@gmail.com' },
    update: {
      password: employeePassword,
      departmentId: businessDept.id,
      subDepartmentId: businessDomesticSubDepartment?.id || null,
    },
    create: {
      email: 'sales@gmail.com',
      password: employeePassword,
      firstName: 'Nguyễn',
      lastName: 'Hoàng Nam',
      role: 'EMPLOYEE' as any,
      isActive: true,
      departmentId: businessDept.id,
      subDepartmentId: businessDomesticSubDepartment?.id || null,
    },
  });

  const salesEmployee = await prisma.employee.upsert({
    where: { employeeCode: 'NV006' },
    update: {
      userId: salesUser.id,
      subDepartmentId: businessDomesticSubDepartment?.id || null,
      positionId: businessStaffPosition?.id || qcStaffPos.id,
    },
    create: {
      userId: salesUser.id,
      employeeCode: 'NV006',
      gender: 'MALE',
      dateOfBirth: new Date('1993-07-08'),
      phoneNumber: '0906000006',
      address: 'TP.HCM',
      positionId: businessStaffPosition?.id || qcStaffPos.id,
      subDepartmentId: businessDomesticSubDepartment?.id || null,
      hireDate: new Date('2023-09-01'),
      contractType: 'PERMANENT',
      baseSalary: 14500000,
      notes: 'Nhân viên kinh doanh seeded để demo luồng đơn hàng nội địa.',
    },
  });

  console.log('✅ Sales demo user created:', salesUser.email);

  const purchasingUser = await prisma.user.upsert({
    where: { email: 'purchasing@gmail.com' },
    update: {
      password: employeePassword,
      departmentId: purchasingDept.id,
      subDepartmentId: purchasingMaterialsSubDepartment?.id || null,
    },
    create: {
      email: 'purchasing@gmail.com',
      password: employeePassword,
      firstName: 'Thu mua',
      lastName: 'NVL',
      role: 'EMPLOYEE' as any,
      isActive: true,
      departmentId: purchasingDept.id,
      subDepartmentId: purchasingMaterialsSubDepartment?.id || null,
    },
  });

  const purchasingEmployee = await prisma.employee.upsert({
    where: { employeeCode: 'NV003' },
    update: {
      userId: purchasingUser.id,
      subDepartmentId: purchasingMaterialsSubDepartment?.id || null,
    },
    create: {
      userId: purchasingUser.id,
      employeeCode: 'NV003',
      gender: 'MALE',
      dateOfBirth: new Date('1991-05-15'),
      phoneNumber: '0903000003',
      address: 'TP.HCM',
      positionId: qcStaffPos.id,
      subDepartmentId: purchasingMaterialsSubDepartment?.id || null,
      hireDate: new Date('2022-06-01'),
      contractType: 'PERMANENT',
      baseSalary: 12000000,
    },
  });

  console.log('✅ Purchasing reviewer created:', purchasingUser.email);

  const personnelUser = await prisma.user.upsert({
    where: { email: 'personnel@gmail.com' },
    update: {
      password: employeePassword,
      departmentId: qualityDept.id,
      subDepartmentId: qualityPersonnelSubDepartment?.id || null,
    },
    create: {
      email: 'personnel@gmail.com',
      password: employeePassword,
      firstName: 'Nhân sự',
      lastName: 'Phụ trách',
      role: 'EMPLOYEE' as any,
      isActive: true,
      departmentId: qualityDept.id,
      subDepartmentId: qualityPersonnelSubDepartment?.id || null,
    },
  });

  const personnelEmployee = await prisma.employee.upsert({
    where: { employeeCode: 'NV004' },
    update: {
      userId: personnelUser.id,
      subDepartmentId: qualityPersonnelSubDepartment?.id || null,
    },
    create: {
      userId: personnelUser.id,
      employeeCode: 'NV004',
      gender: 'FEMALE',
      dateOfBirth: new Date('1992-09-20'),
      phoneNumber: '0904000004',
      address: 'TP.HCM',
      positionId: qcStaffPos.id,
      subDepartmentId: qualityPersonnelSubDepartment?.id || null,
      hireDate: new Date('2021-04-10'),
      contractType: 'PERMANENT',
      baseSalary: 13000000,
    },
  });

  console.log('✅ Personnel reviewer created:', personnelUser.email);

  const warehouseUser = await prisma.user.upsert({
    where: { email: 'warehouse@gmail.com' },
    update: {
      password: employeePassword,
      departmentId: productionDept.id,
      subDepartmentId: productionWarehouseSubDepartment?.id || null,
    },
    create: {
      email: 'warehouse@gmail.com',
      password: employeePassword,
      firstName: 'Thủ kho',
      lastName: 'Demo',
      role: 'EMPLOYEE' as any,
      isActive: true,
      departmentId: productionDept.id,
      subDepartmentId: productionWarehouseSubDepartment?.id || null,
    },
  });

  const warehouseEmployee = await prisma.employee.upsert({
    where: { employeeCode: 'NV005' },
    update: {
      userId: warehouseUser.id,
      subDepartmentId: productionWarehouseSubDepartment?.id || null,
      positionId: warehouseManagerPosition?.id || qcStaffPos.id,
    },
    create: {
      userId: warehouseUser.id,
      employeeCode: 'NV005',
      gender: 'MALE',
      dateOfBirth: new Date('1988-11-12'),
      phoneNumber: '0905000005',
      address: 'TP.HCM',
      positionId: warehouseManagerPosition?.id || qcStaffPos.id,
      subDepartmentId: productionWarehouseSubDepartment?.id || null,
      hireDate: new Date('2023-03-15'),
      contractType: 'PERMANENT',
      baseSalary: 11000000,
    },
  });

  console.log('✅ Warehouse operator created:', warehouseUser.email);

  const upsertSupplyRequestSeed = async ({
    maYeuCau,
    requester,
    boPhan,
    mucDichYeuCau,
    mucDoUuTien,
    trangThai,
    items,
    approvedByEmployeeId,
    approvedByName,
    approvedAt,
    rejectionReason,
  }: {
    maYeuCau: string;
    requester: { id: string; employeeCode: string };
    boPhan: string;
    mucDichYeuCau: string;
    mucDoUuTien: string;
    trangThai: string;
    items: { phanLoai: string; tenGoi: string; soLuong: number; donViTinh: string }[];
    approvedByEmployeeId?: string | null;
    approvedByName?: string | null;
    approvedAt?: Date | null;
    rejectionReason?: string | null;
  }) => {
    const request = await prisma.supplyRequest.upsert({
      where: { maYeuCau },
      update: {
        employeeId: requester.id,
        maNhanVien: requester.employeeCode,
        tenNhanVien: 'TEST 1',
        boPhan,
        mucDichYeuCau,
        mucDoUuTien,
        trangThai,
        approvedByEmployeeId: approvedByEmployeeId || null,
        approvedByName: approvedByName || null,
        approvedAt: approvedAt || null,
        rejectionReason: rejectionReason || null,
      },
      create: {
        maYeuCau,
        employeeId: requester.id,
        maNhanVien: requester.employeeCode,
        tenNhanVien: 'TEST 1',
        boPhan,
        mucDichYeuCau,
        mucDoUuTien,
        trangThai,
        approvedByEmployeeId: approvedByEmployeeId || null,
        approvedByName: approvedByName || null,
        approvedAt: approvedAt || null,
        rejectionReason: rejectionReason || null,
      },
    });

    await prisma.supplyRequestItem.deleteMany({
      where: { supplyRequestId: request.id },
    });

    await prisma.supplyRequestItem.createMany({
      data: items.map((item) => ({
        supplyRequestId: request.id,
        ...item,
      })),
    });
  };

  await upsertSupplyRequestSeed({
    maYeuCau: 'YC-CC101',
    requester: testEmployee,
    boPhan: 'Bộ phận chất lượng',
    mucDichYeuCau: 'Yêu cầu vật tư đang chờ admin hoặc bộ phận thu mua duyệt ngay trên bảng.',
    mucDoUuTien: 'Cao',
    trangThai: 'Chờ duyệt',
    items: [
      { phanLoai: 'Vật tư', tenGoi: 'Màng co nhiệt', soLuong: 25, donViTinh: 'Kg' },
      { phanLoai: 'Vật tư', tenGoi: 'Tem nhãn phụ', soLuong: 200, donViTinh: 'Cái' },
    ],
  });

  await upsertSupplyRequestSeed({
    maYeuCau: 'YC-CC102',
    requester: testEmployee,
    boPhan: 'Bộ phận chất lượng',
    mucDichYeuCau: 'Yêu cầu thiết bị đã được duyệt và sẵn sàng chuyển qua bước xử lý tiếp theo.',
    mucDoUuTien: 'Trung bình',
    trangThai: 'Đã duyệt',
    approvedByEmployeeId: adminEmployee.id,
    approvedByName: 'Admin User',
    approvedAt: new Date('2026-04-15T02:00:00.000Z'),
    items: [
      { phanLoai: 'Thiết bị', tenGoi: 'Máy in tem cầm tay', soLuong: 1, donViTinh: 'Bộ' },
    ],
  });

  await upsertSupplyRequestSeed({
    maYeuCau: 'YC-CC103',
    requester: testEmployee,
    boPhan: 'Bộ phận chất lượng',
    mucDichYeuCau: 'Yêu cầu bổ sung nhân lực để test luồng từ chối ngay trên màn hình quản lý.',
    mucDoUuTien: 'Cao',
    trangThai: 'Từ chối',
    approvedByEmployeeId: personnelEmployee.id,
    approvedByName: 'Nhân sự Phụ trách',
    approvedAt: new Date('2026-04-15T02:15:00.000Z'),
    rejectionReason: 'Thiếu mô tả số ca làm và khung thời gian cần bổ sung nhân sự.',
    items: [
      { phanLoai: 'Nhân lực', tenGoi: 'Công nhân QC thời vụ', soLuong: 3, donViTinh: 'Người' },
    ],
  });

  await upsertSupplyRequestSeed({
    maYeuCau: 'YC-CC104',
    requester: testEmployee,
    boPhan: 'Bộ phận chất lượng',
    mucDichYeuCau: 'Yêu cầu vật tư đã được bộ phận thu mua tiếp nhận và đang xử lý.',
    mucDoUuTien: 'Trung bình',
    trangThai: 'Đang xử lý',
    approvedByEmployeeId: purchasingEmployee.id,
    approvedByName: 'Thu mua NVL',
    approvedAt: new Date('2026-04-15T02:30:00.000Z'),
    items: [
      { phanLoai: 'Vật tư', tenGoi: 'Bao bì carton 5 lớp', soLuong: 80, donViTinh: 'Cái' },
    ],
  });

  console.log('✅ Supply request approval scenarios seeded');

  console.log('\n🏭 Creating warehouse demo data...');

  const warehouseCategories = [
    'Nguyên vật liệu',
    'Thành phẩm',
    'Bao bì',
    'Thiết bị',
    'Vật tư phụ trợ',
  ];

  for (const categoryName of warehouseCategories) {
    await prisma.productCategory.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName },
    });
  }

  const upsertInternationalProductSeed = async ({
    maSanPham,
    tenSanPham,
    moTaSanPham,
    loaiSanPham,
    donViTinh,
  }: {
    maSanPham: string;
    tenSanPham: string;
    moTaSanPham?: string;
    loaiSanPham: string;
    donViTinh: string;
  }) =>
    prisma.internationalProduct.upsert({
      where: { maSanPham },
      update: {
        tenSanPham,
        moTaSanPham: moTaSanPham || null,
        loaiSanPham,
        donViTinh,
      },
      create: {
        maSanPham,
        tenSanPham,
        moTaSanPham: moTaSanPham || null,
        loaiSanPham,
        donViTinh,
      },
    });

  const materialResin = await upsertInternationalProductSeed({
    maSanPham: 'SP-101',
    tenSanPham: 'Hạt nhựa PP nguyên sinh',
    moTaSanPham: 'Nguyên liệu chính cho dây chuyền ép nhựa.',
    loaiSanPham: 'Nguyên vật liệu',
    donViTinh: 'Kg',
  });

  const shrinkFilm = await upsertInternationalProductSeed({
    maSanPham: 'SP-102',
    tenSanPham: 'Màng co nhiệt',
    moTaSanPham: 'Bao bì màng co dùng cho đóng gói thành phẩm.',
    loaiSanPham: 'Bao bì',
    donViTinh: 'Kg',
  });

  const labelSticker = await upsertInternationalProductSeed({
    maSanPham: 'SP-103',
    tenSanPham: 'Tem nhãn phụ',
    moTaSanPham: 'Tem dán nhãn phụ cho lô hàng xuất kho.',
    loaiSanPham: 'Bao bì',
    donViTinh: 'Cái',
  });

  const cartonBox = await upsertInternationalProductSeed({
    maSanPham: 'SP-104',
    tenSanPham: 'Bao bì carton 5 lớp',
    moTaSanPham: 'Thùng carton chịu lực cho đóng gói hàng xuất xưởng.',
    loaiSanPham: 'Bao bì',
    donViTinh: 'Cái',
  });

  const industrialTape = await upsertInternationalProductSeed({
    maSanPham: 'SP-105',
    tenSanPham: 'Băng keo công nghiệp',
    moTaSanPham: 'Vật tư phụ trợ dùng cho niêm phong kiện hàng.',
    loaiSanPham: 'Vật tư phụ trợ',
    donViTinh: 'Cuộn',
  });

  const handheldPrinter = await upsertInternationalProductSeed({
    maSanPham: 'SP-106',
    tenSanPham: 'Máy in tem cầm tay',
    moTaSanPham: 'Thiết bị in tem cho kho và bộ phận đóng gói.',
    loaiSanPham: 'Thiết bị',
    donViTinh: 'Bộ',
  });

  const scale30kg = await upsertInternationalProductSeed({
    maSanPham: 'SP-107',
    tenSanPham: 'Cân điện tử 30kg',
    moTaSanPham: 'Thiết bị cân phục vụ kiểm đếm khi nhập xuất kho.',
    loaiSanPham: 'Thiết bị',
    donViTinh: 'Cái',
  });

  const upsertWarehouseSeed = async ({
    maKho,
    tenKho,
    loaiKho,
    diaChi,
    dienTich,
    sucChua,
    nguoiQuanLy,
    soDienThoai,
    ghiChu,
  }: {
    maKho: string;
    tenKho: string;
    loaiKho: string;
    diaChi: string;
    dienTich: number;
    sucChua: number;
    nguoiQuanLy: string;
    soDienThoai: string;
    ghiChu?: string;
  }) =>
    prisma.warehouses.upsert({
      where: { maKho },
      update: {
        tenKho,
        loaiKho,
        diaChi,
        dienTich,
        sucChua,
        nguoiQuanLy,
        soDienThoai,
        ghiChu: ghiChu || null,
        trangThai: 'active',
        updatedAt: new Date(),
      },
      create: {
        id: maKho,
        maKho,
        tenKho,
        loaiKho,
        diaChi,
        dienTich,
        sucChua,
        nguoiQuanLy,
        soDienThoai,
        ghiChu: ghiChu || null,
        trangThai: 'active',
        updatedAt: new Date(),
      },
    });

  const materialWarehouse = await upsertWarehouseSeed({
    maKho: 'KHO001',
    tenKho: 'Kho nguyên vật liệu',
    loaiKho: 'Nguyên vật liệu',
    diaChi: 'Khu A - Xưởng chính',
    dienTich: 320,
    sucChua: 2500,
    nguoiQuanLy: 'Thủ kho Demo',
    soDienThoai: '0905000005',
    ghiChu: 'Kho chính lưu nguyên vật liệu đầu vào.',
  });

  const packagingWarehouse = await upsertWarehouseSeed({
    maKho: 'KHO002',
    tenKho: 'Kho bao bì',
    loaiKho: 'Bao bì',
    diaChi: 'Khu B - Gần bộ phận đóng gói',
    dienTich: 240,
    sucChua: 1800,
    nguoiQuanLy: 'Thủ kho Demo',
    soDienThoai: '0905000005',
    ghiChu: 'Kho chứa vật tư bao bì phục vụ đóng gói và xuất hàng.',
  });

  const equipmentWarehouse = await upsertWarehouseSeed({
    maKho: 'KHO003',
    tenKho: 'Kho thiết bị',
    loaiKho: 'Thiết bị',
    diaChi: 'Khu C - Nhà điều hành',
    dienTich: 180,
    sucChua: 600,
    nguoiQuanLy: 'Thủ kho Demo',
    soDienThoai: '0905000005',
    ghiChu: 'Kho quản lý thiết bị và tài sản phụ trợ.',
  });

  await upsertWarehouseSeed({
    maKho: 'KHO004',
    tenKho: 'Kho chờ kiểm định',
    loaiKho: 'Tạm chờ',
    diaChi: 'Khu D - Khu cách ly',
    dienTich: 120,
    sucChua: 400,
    nguoiQuanLy: 'Thủ kho Demo',
    soDienThoai: '0905000005',
    ghiChu: 'Kho demo đang để trống để kiểm tra UI kho trống.',
  });

  await prisma.$transaction(async (tx) => {
    const seedLotNames = ['Lô NVL-0426-A', 'Lô NVL-DP-01', 'Lô BB-0426-A', 'Lô BB-DP-01', 'Lô TB-0426-A'];
    const existingSeedLots = await tx.lot.findMany({
      where: {
        warehouseId: {
          in: [materialWarehouse.id, packagingWarehouse.id, equipmentWarehouse.id],
        },
        tenLo: {
          in: seedLotNames,
        },
      },
    });
    const existingSeedLotIds = existingSeedLots.map((lot) => lot.id);

    await tx.warehouseReceipt.deleteMany({
      where: {
        OR: [
          {
            maPhieuNhap: {
              in: ['PN202604150001', 'PN202604150002', 'PN202604150003'],
            },
          },
          {
            ghiChu: {
              in: ['Test nhập kho tự động'],
            },
          },
          ...(existingSeedLotIds.length > 0 ? [{ lotId: { in: existingSeedLotIds } }] : []),
        ],
      },
    });

    await tx.warehouseIssue.deleteMany({
      where: {
        OR: [
          {
            maPhieuXuat: {
              in: ['PX-20260415-0001', 'PX-20260415-0002', 'PX-20260415-0003'],
            },
          },
          {
            ghiChu: {
              in: ['Test xuất kho cân bằng lại tồn'],
            },
          },
          ...(existingSeedLotIds.length > 0 ? [{ lotId: { in: existingSeedLotIds } }] : []),
        ],
      },
    });

    if (existingSeedLotIds.length > 0) {
      await tx.lot.deleteMany({
        where: {
          id: {
            in: existingSeedLotIds,
          },
        },
      });
    }

    const materialLot = await tx.lot.create({
      data: {
        tenLo: 'Lô NVL-0426-A',
        warehouseId: materialWarehouse.id,
      },
    });

    await tx.lot.create({
      data: {
        tenLo: 'Lô NVL-DP-01',
        warehouseId: materialWarehouse.id,
      },
    });

    const packagingLot = await tx.lot.create({
      data: {
        tenLo: 'Lô BB-0426-A',
        warehouseId: packagingWarehouse.id,
      },
    });

    await tx.lot.create({
      data: {
        tenLo: 'Lô BB-DP-01',
        warehouseId: packagingWarehouse.id,
      },
    });

    const equipmentLot = await tx.lot.create({
      data: {
        tenLo: 'Lô TB-0426-A',
        warehouseId: equipmentWarehouse.id,
      },
    });

    const resinLotProduct = await tx.lotProduct.create({
      data: {
        lotId: materialLot.id,
        internationalProductId: materialResin.id,
        soLuong: 1200,
        donViTinh: 'Kg',
        giaThanh: 42000,
      },
    });

    await tx.lotProduct.create({
      data: {
        lotId: materialLot.id,
        internationalProductId: industrialTape.id,
        soLuong: 80,
        donViTinh: 'Cuộn',
        giaThanh: 28000,
      },
    });

    const shrinkFilmLotProduct = await tx.lotProduct.create({
      data: {
        lotId: packagingLot.id,
        internationalProductId: shrinkFilm.id,
        soLuong: 320,
        donViTinh: 'Kg',
        giaThanh: 55000,
      },
    });

    const labelLotProduct = await tx.lotProduct.create({
      data: {
        lotId: packagingLot.id,
        internationalProductId: labelSticker.id,
        soLuong: 5000,
        donViTinh: 'Cái',
        giaThanh: 800,
      },
    });

    await tx.lotProduct.create({
      data: {
        lotId: packagingLot.id,
        internationalProductId: cartonBox.id,
        soLuong: 1500,
        donViTinh: 'Cái',
        giaThanh: 18500,
      },
    });

    const printerLotProduct = await tx.lotProduct.create({
      data: {
        lotId: equipmentLot.id,
        internationalProductId: handheldPrinter.id,
        soLuong: 4,
        donViTinh: 'Bộ',
        giaThanh: 2500000,
      },
    });

    const scaleLotProduct = await tx.lotProduct.create({
      data: {
        lotId: equipmentLot.id,
        internationalProductId: scale30kg.id,
        soLuong: 6,
        donViTinh: 'Cái',
        giaThanh: 1400000,
      },
    });

    await tx.warehouseReceipt.create({
      data: {
        maPhieuNhap: 'PN202604150001',
        ngayNhap: new Date('2026-04-15T08:00:00.000Z'),
        employeeId: warehouseEmployee.id,
        maNhanVien: warehouseEmployee.employeeCode,
        tenNhanVien: 'Thủ kho Demo',
        warehouseId: materialWarehouse.id,
        tenKho: materialWarehouse.tenKho,
        lotId: materialLot.id,
        tenLo: materialLot.tenLo,
        lotProductId: resinLotProduct.id,
        tenSanPham: materialResin.tenSanPham,
        soLuongTruoc: 900,
        soLuongNhap: 300,
        soLuongSau: 1200,
        donViTinh: 'Kg',
        ghiChu: 'Nhập bổ sung nguyên liệu cho kế hoạch sản xuất tuần.',
      },
    });

    await tx.warehouseReceipt.create({
      data: {
        maPhieuNhap: 'PN202604150002',
        ngayNhap: new Date('2026-04-15T09:15:00.000Z'),
        employeeId: warehouseEmployee.id,
        maNhanVien: warehouseEmployee.employeeCode,
        tenNhanVien: 'Thủ kho Demo',
        warehouseId: packagingWarehouse.id,
        tenKho: packagingWarehouse.tenKho,
        lotId: packagingLot.id,
        tenLo: packagingLot.tenLo,
        lotProductId: shrinkFilmLotProduct.id,
        tenSanPham: shrinkFilm.tenSanPham,
        soLuongTruoc: 280,
        soLuongNhap: 70,
        soLuongSau: 350,
        donViTinh: 'Kg',
        ghiChu: 'Nhập bổ sung màng co theo lịch giao từ nhà cung cấp.',
      },
    });

    await tx.warehouseReceipt.create({
      data: {
        maPhieuNhap: 'PN202604150003',
        ngayNhap: new Date('2026-04-15T10:30:00.000Z'),
        employeeId: adminEmployee.id,
        maNhanVien: adminEmployee.employeeCode,
        tenNhanVien: 'Admin User',
        warehouseId: equipmentWarehouse.id,
        tenKho: equipmentWarehouse.tenKho,
        lotId: equipmentLot.id,
        tenLo: equipmentLot.tenLo,
        lotProductId: printerLotProduct.id,
        tenSanPham: handheldPrinter.tenSanPham,
        soLuongTruoc: 2,
        soLuongNhap: 2,
        soLuongSau: 4,
        donViTinh: 'Bộ',
        ghiChu: 'Nhập thêm thiết bị in tem phục vụ đóng gói và truy xuất.',
      },
    });

    await tx.warehouseIssue.create({
      data: {
        maPhieuXuat: 'PX-20260415-0001',
        ngayXuat: new Date('2026-04-15T11:00:00.000Z'),
        employeeId: warehouseEmployee.id,
        maNhanVien: warehouseEmployee.employeeCode,
        tenNhanVien: 'Thủ kho Demo',
        warehouseId: packagingWarehouse.id,
        tenKho: packagingWarehouse.tenKho,
        lotId: packagingLot.id,
        tenLo: packagingLot.tenLo,
        lotProductId: shrinkFilmLotProduct.id,
        tenSanPham: shrinkFilm.tenSanPham,
        soLuongTruoc: 350,
        soLuongXuat: 30,
        soLuongSau: 320,
        donViTinh: 'Kg',
        ghiChu: 'Xuất màng co cho line đóng gói ca sáng.',
      },
    });

    await tx.warehouseIssue.create({
      data: {
        maPhieuXuat: 'PX-20260415-0002',
        ngayXuat: new Date('2026-04-15T13:30:00.000Z'),
        employeeId: warehouseEmployee.id,
        maNhanVien: warehouseEmployee.employeeCode,
        tenNhanVien: 'Thủ kho Demo',
        warehouseId: packagingWarehouse.id,
        tenKho: packagingWarehouse.tenKho,
        lotId: packagingLot.id,
        tenLo: packagingLot.tenLo,
        lotProductId: labelLotProduct.id,
        tenSanPham: labelSticker.tenSanPham,
        soLuongTruoc: 5200,
        soLuongXuat: 200,
        soLuongSau: 5000,
        donViTinh: 'Cái',
        ghiChu: 'Xuất tem nhãn cho lô hàng hoàn thiện cuối ngày.',
      },
    });

    await tx.warehouseIssue.create({
      data: {
        maPhieuXuat: 'PX-20260415-0003',
        ngayXuat: new Date('2026-04-15T15:00:00.000Z'),
        employeeId: warehouseEmployee.id,
        maNhanVien: warehouseEmployee.employeeCode,
        tenNhanVien: 'Thủ kho Demo',
        warehouseId: equipmentWarehouse.id,
        tenKho: equipmentWarehouse.tenKho,
        lotId: equipmentLot.id,
        tenLo: equipmentLot.tenLo,
        lotProductId: scaleLotProduct.id,
        tenSanPham: scale30kg.tenSanPham,
        soLuongTruoc: 8,
        soLuongXuat: 2,
        soLuongSau: 6,
        donViTinh: 'Cái',
        ghiChu: 'Điều chuyển cân điện tử cho bộ phận QC kiểm tra đóng gói.',
      },
    });
  });

  console.log('✅ Warehouse, stock, products, receipts, and issues seeded');

  console.log('\n🥭 Creating end-to-end dried jackfruit order demo...');

  const finishedGoodsWarehouse = await upsertWarehouseSeed({
    maKho: 'KHO005',
    tenKho: 'Kho thành phẩm',
    loaiKho: 'Thành phẩm',
    diaChi: 'Khu E - Sau line đóng gói',
    dienTich: 210,
    sucChua: 950,
    nguoiQuanLy: 'Thủ kho Demo',
    soDienThoai: '0905000005',
    ghiChu: 'Kho thành phẩm demo cho các đơn hàng trái cây sấy.',
  });

  const rawJackfruit = await upsertInternationalProductSeed({
    maSanPham: 'SP-201',
    tenSanPham: 'Mít tách hạt loại 1',
    moTaSanPham: 'Nguyên liệu mít đã tách hạt, sơ chế sạch, dùng cho line sấy chân không.',
    loaiSanPham: 'Nguyên vật liệu',
    donViTinh: 'Kg',
  });

  const driedJackfruitGrade1 = await upsertInternationalProductSeed({
    maSanPham: 'SP-202',
    tenSanPham: 'Mít sấy loại 1',
    moTaSanPham: 'Thành phẩm mít sấy giòn loại 1, quy cách đóng túi 500g.',
    loaiSanPham: 'Thành phẩm',
    donViTinh: 'Kg',
  });

  const driedJackfruitGrade2 = await upsertInternationalProductSeed({
    maSanPham: 'SP-203',
    tenSanPham: 'Mít sấy loại 2',
    moTaSanPham: 'Thành phẩm mít sấy loại 2 phục vụ kênh nội địa và combo bán lẻ.',
    loaiSanPham: 'Thành phẩm',
    donViTinh: 'Kg',
  });

  const driedJackfruitCrumbs = await upsertInternationalProductSeed({
    maSanPham: 'SP-204',
    tenSanPham: 'Vụn mít sấy',
    moTaSanPham: 'Phần vụn mít sấy dùng cho topping và phối trộn.',
    loaiSanPham: 'Thành phẩm',
    donViTinh: 'Kg',
  });

  const zipperBag500g = await upsertInternationalProductSeed({
    maSanPham: 'SP-205',
    tenSanPham: 'Túi zipper nhôm 500g',
    moTaSanPham: 'Bao bì túi zipper nhôm dùng cho mít sấy loại 1.',
    loaiSanPham: 'Bao bì',
    donViTinh: 'Cái',
  });

  const driedJackfruitCarton = await upsertInternationalProductSeed({
    maSanPham: 'SP-206',
    tenSanPham: 'Thùng carton mít sấy 24 túi',
    moTaSanPham: 'Thùng carton 5 lớp đóng 24 túi mít sấy 500g.',
    loaiSanPham: 'Bao bì',
    donViTinh: 'Thùng',
  });

  await prisma.$transaction(async (tx) => {
    const customerCode = 'KHND-MIT-001';
    const quotationRequestCode = 'YCBG-201';
    const quotationCode = 'BG-YCBG-201';
    const orderCode = 'DH-201';
    const invoiceCode = 'HD201';
    const materialStandardCode = 'DM-201';
    const processCode = 'QT-201';
    const productionProcessCode = 'QTSX-MIT-20260415-01';
    const batchCode = 'MIT-20260415-01';
    const machineCode = 'MAY-VC-01';
    const rawLotName = 'Lô MIT-TACHHAT-20260412';
    const packagingLotName = 'Lô BB-MIT-20260412';
    const finishedLotName = 'Lô TP-MIT-150426-A';
    const generalCostCodes = ['GCC-MIT-001', 'GCC-MIT-002', 'GCC-MIT-003'];
    const demoReceiptCodes = [
      'PN202604160101',
      'PN202604160102',
      'PN202604160103',
      'PN202604160104',
      'PN202604160105',
      'PN202604160106',
    ];
    const demoIssueCodes = [
      'PX-20260416-0101',
      'PX-20260416-0102',
      'PX-20260416-0103',
      'PX-20260416-0104',
    ];

    const existingCustomer = await tx.internationalCustomer.findUnique({
      where: { maKhachHang: customerCode },
      select: { id: true },
    });
    if (existingCustomer) {
      await tx.customerFeedback.deleteMany({ where: { customerId: existingCustomer.id } });
    }

    const existingOrder = await tx.order.findUnique({
      where: { maDonHang: orderCode },
      select: { id: true },
    });
    if (existingOrder) {
      await tx.taxReport.deleteMany({ where: { orderId: existingOrder.id } });
      await tx.order.delete({ where: { id: existingOrder.id } });
    }

    await tx.invoice.deleteMany({ where: { soHoaDon: invoiceCode } });

    const existingQuotation = await tx.quotation.findUnique({
      where: { maBaoGia: quotationCode },
      select: { id: true },
    });
    if (existingQuotation) {
      await tx.quotation.delete({ where: { id: existingQuotation.id } });
    }

    const existingQuotationRequest = await tx.quotationRequest.findUnique({
      where: { maYeuCauBaoGia: quotationRequestCode },
      select: { id: true },
    });
    if (existingQuotationRequest) {
      await tx.quotationCalculator.deleteMany({
        where: { quotationRequestId: existingQuotationRequest.id },
      });
      await tx.quotationRequest.delete({
        where: { id: existingQuotationRequest.id },
      });
    }

    const existingProductionProcess = await tx.productionProcess.findUnique({
      where: { maQuyTrinhSanXuat: productionProcessCode },
      select: { id: true },
    });
    if (existingProductionProcess) {
      await tx.productionProcess.delete({ where: { id: existingProductionProcess.id } });
    }

    const existingProcess = await tx.process.findUnique({
      where: { maQuyTrinh: processCode },
      select: { id: true },
    });
    if (existingProcess) {
      await tx.process.delete({ where: { id: existingProcess.id } });
    }

    const existingMaterialStandard = await tx.materialStandard.findUnique({
      where: { maDinhMuc: materialStandardCode },
      select: { id: true },
    });
    if (existingMaterialStandard) {
      await tx.materialStandard.delete({ where: { id: existingMaterialStandard.id } });
    }

    await tx.productionReport.deleteMany({ where: { maDinhMuc: materialStandardCode } });
    await tx.qualityEvaluation.deleteMany({ where: { maChien: batchCode } });
    await tx.finishedProduct.deleteMany({ where: { maChien: batchCode } });
    await tx.systemOperation.deleteMany({ where: { maChien: batchCode } });
    await tx.materialEvaluation.deleteMany({ where: { maChien: batchCode } });

    const existingMachine = await tx.machine.findUnique({
      where: { maMay: machineCode },
      select: { id: true },
    });
    if (existingMachine) {
      await tx.machine.delete({ where: { id: existingMachine.id } });
    }

    await tx.generalCost.deleteMany({
      where: {
        maChiPhi: {
          in: generalCostCodes,
        },
      },
    });

    const existingOrderLots = await tx.lot.findMany({
      where: {
        warehouseId: {
          in: [materialWarehouse.id, packagingWarehouse.id, finishedGoodsWarehouse.id],
        },
        tenLo: {
          in: [rawLotName, packagingLotName, finishedLotName],
        },
      },
    });
    const existingOrderLotIds = existingOrderLots.map((lot) => lot.id);

    await tx.warehouseReceipt.deleteMany({
      where: {
        OR: [
          { maPhieuNhap: { in: demoReceiptCodes } },
          ...(existingOrderLotIds.length > 0 ? [{ lotId: { in: existingOrderLotIds } }] : []),
        ],
      },
    });

    await tx.warehouseIssue.deleteMany({
      where: {
        OR: [
          { maPhieuXuat: { in: demoIssueCodes } },
          ...(existingOrderLotIds.length > 0 ? [{ lotId: { in: existingOrderLotIds } }] : []),
        ],
      },
    });

    if (existingOrderLotIds.length > 0) {
      await tx.lot.deleteMany({
        where: {
          id: {
            in: existingOrderLotIds,
          },
        },
      });
    }

    const customer = await tx.internationalCustomer.upsert({
      where: { maKhachHang: customerCode },
      update: {
        tenCongTy: 'Công ty TNHH Thực Phẩm An Phú',
        nguoiLienHe: 'Trần Thu Hà',
        loaiKhachHang: 'Nhà phân phối',
        diaChi: 'Lô B2, KCN Tân Bình, TP.HCM',
        soDienThoai: '0909123456',
        email: 'thuha@anphufoods.vn',
        trangThai: 'Hoạt động',
        ngayHopTac: new Date('2025-09-15T00:00:00.000Z'),
        doanhThuNam: 44640000,
        soLuongDonHang: 1,
        sanPhamChinh: 'Mít sấy loại 1',
        ghiChu: 'Khách hàng nội địa chuyên phân phối trái cây sấy cho hệ thống siêu thị miền Nam.',
        tinhThanh: 'TP.HCM',
        quanHuyen: 'Bình Tân',
        maSoThue: '0312345678',
      },
      create: {
        maKhachHang: customerCode,
        tenCongTy: 'Công ty TNHH Thực Phẩm An Phú',
        nguoiLienHe: 'Trần Thu Hà',
        loaiKhachHang: 'Nhà phân phối',
        diaChi: 'Lô B2, KCN Tân Bình, TP.HCM',
        soDienThoai: '0909123456',
        email: 'thuha@anphufoods.vn',
        trangThai: 'Hoạt động',
        ngayHopTac: new Date('2025-09-15T00:00:00.000Z'),
        doanhThuNam: 44640000,
        soLuongDonHang: 1,
        sanPhamChinh: 'Mít sấy loại 1',
        ghiChu: 'Khách hàng nội địa chuyên phân phối trái cây sấy cho hệ thống siêu thị miền Nam.',
        tinhThanh: 'TP.HCM',
        quanHuyen: 'Bình Tân',
        maSoThue: '0312345678',
      },
    });

    const processTemplate = await tx.process.create({
      data: {
        maQuyTrinh: processCode,
        msnv: adminEmployee.employeeCode,
        tenNhanVien: 'Admin User',
        tenQuyTrinh: 'Quy trình sấy mít loại 1 từ mít tách hạt',
        loaiQuyTrinh: 'Trái cây sấy',
        flowchart: {
          create: {
            sections: {
              create: [
                {
                  phanDoan: 'TiepNhan',
                  tenPhanDoan: 'Tiếp nhận và phân loại nguyên liệu',
                  noiDungCongViec: 'Kiểm tra mít tách hạt, độ đồng đều, độ sạch và loại bỏ phần dập nát.',
                  stt: 1,
                  costs: {
                    create: [
                      {
                        loaiChiPhi: 'Nguyên liệu',
                        tenChiPhi: 'Mít tách hạt loại 1',
                        donVi: 'Kg',
                        dinhMucLaoDong: 1,
                        donViDinhMucLaoDong: 'Kg/phút',
                        soLuongNguyenLieu: 675,
                        soPhutThucHien: 45,
                        soLuongKeHoach: 15,
                        soLuongThucTe: 16,
                      },
                    ],
                  },
                },
                {
                  phanDoan: 'NgamDuong',
                  tenPhanDoan: 'Ngâm dịch đường',
                  noiDungCongViec: 'Ngâm 2 lần bằng dịch đường 35-38 Brix để ổn định độ ngọt và màu.',
                  stt: 2,
                  costs: {
                    create: [
                      {
                        loaiChiPhi: 'Nhân công',
                        tenChiPhi: 'Tổ ngâm và sơ chế',
                        donVi: 'Công',
                        dinhMucLaoDong: 0.12,
                        donViDinhMucLaoDong: 'Công/kg',
                        soLuongNguyenLieu: 675,
                        soPhutThucHien: 95,
                        soLuongKeHoach: 56.25,
                        soLuongThucTe: 60,
                      },
                    ],
                  },
                },
                {
                  phanDoan: 'SayChanKhong',
                  tenPhanDoan: 'Sấy chân không',
                  noiDungCongViec: 'Sấy ở 68-72°C, áp suất âm 680-720 mmHg đến khi độ ẩm còn 2-3%.',
                  stt: 3,
                  costs: {
                    create: [
                      {
                        loaiChiPhi: 'Điện năng',
                        tenChiPhi: 'Điện năng máy sấy VC-01',
                        donVi: 'kWh',
                        dinhMucLaoDong: 2.8,
                        donViDinhMucLaoDong: 'kWh/giờ',
                        soLuongNguyenLieu: 675,
                        soPhutThucHien: 300,
                        soLuongKeHoach: 31.5,
                        soLuongThucTe: 34,
                      },
                    ],
                  },
                },
                {
                  phanDoan: 'PhanLoai',
                  tenPhanDoan: 'Phân loại và kiểm tra chất lượng',
                  noiDungCongViec: 'Tách loại 1, loại 2, vụn và phế phẩm; QC kiểm tra màu, mùi, độ giòn.',
                  stt: 4,
                  costs: {
                    create: [
                      {
                        loaiChiPhi: 'QC',
                        tenChiPhi: 'QC thành phẩm',
                        donVi: 'Công',
                        dinhMucLaoDong: 0.08,
                        donViDinhMucLaoDong: 'Công/kg',
                        soLuongNguyenLieu: 219.5,
                        soPhutThucHien: 80,
                        soLuongKeHoach: 34,
                        soLuongThucTe: 36,
                      },
                    ],
                  },
                },
                {
                  phanDoan: 'DongGoi',
                  tenPhanDoan: 'Đóng gói và nhập kho thành phẩm',
                  noiDungCongViec: 'Đóng túi 500g, đóng thùng 24 túi/thùng, in tem truy xuất và nhập kho.',
                  stt: 5,
                  costs: {
                    create: [
                      {
                        loaiChiPhi: 'Bao bì',
                        tenChiPhi: 'Túi zipper nhôm 500g và thùng carton',
                        donVi: 'Bộ',
                        dinhMucLaoDong: 0.04,
                        donViDinhMucLaoDong: 'Công/kg',
                        soLuongNguyenLieu: 360,
                        soPhutThucHien: 75,
                        soLuongKeHoach: 18,
                        soLuongThucTe: 18,
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
      include: {
        flowchart: {
          include: {
            sections: {
              include: {
                costs: true,
              },
              orderBy: {
                stt: 'asc',
              },
            },
          },
        },
      },
    });

    const materialStandard = await tx.materialStandard.create({
      data: {
        maDinhMuc: materialStandardCode,
        tenDinhMuc: 'Định mức Mít sấy loại 1 từ mít tách hạt',
        loaiDinhMuc: 'RAW_MATERIAL',
        tiLeThuHoi: 32.5,
        ghiChu: 'Định mức sử dụng cho line mít sấy, nguyên liệu đầu vào là mít đã tách hạt.',
        inputItems: {
          create: [
            { tenNguyenLieu: 'Mít tách hạt loại 1', tiLe: 94 },
            { tenNguyenLieu: 'Dịch đường 38 Brix', tiLe: 4 },
            { tenNguyenLieu: 'Phụ gia chống oxy hóa', tiLe: 2 },
          ],
        },
        items: {
          create: [
            { tenThanhPham: 'Mít sấy loại 1', tiLe: 82 },
            { tenThanhPham: 'Mít sấy loại 2', tiLe: 12 },
            { tenThanhPham: 'Vụn mít sấy', tiLe: 6 },
          ],
        },
      },
      include: {
        items: true,
        inputItems: true,
      },
    });

    const productionProcess = await tx.productionProcess.create({
      data: {
        maQuyTrinhSanXuat: productionProcessCode,
        processId: processTemplate.id,
        msnv: adminEmployee.employeeCode,
        tenNhanVien: 'Admin User',
        tenQuyTrinh: processTemplate.tenQuyTrinh,
        loaiQuyTrinh: processTemplate.loaiQuyTrinh,
        tenQuyTrinhSanXuat: 'Lệnh sản xuất DH-201 - Mít sấy loại 1',
        maNVSanXuat: 'TO-SX-01',
        tenNVSanXuat: 'Tổ sấy chân không ca 1',
        khoiLuong: 180,
        thoiGian: 9.5,
        materialStandardId: materialStandard.id,
        sanPhamDauRa: 'Mít sấy loại 1',
        tongNguyenLieuCanSanXuat: 675,
        soGioLamTrong1Ngay: 10,
        flowchart: {
          create: {
            sections: {
              create: processTemplate.flowchart?.sections.map((section) => ({
                phanDoan: section.phanDoan,
                tenPhanDoan: section.tenPhanDoan,
                noiDungCongViec: section.noiDungCongViec,
                fileUrl: section.fileUrl,
                stt: section.stt,
                costs: {
                  create: section.costs.map((cost) => ({
                    loaiChiPhi: cost.loaiChiPhi,
                    tenChiPhi: cost.tenChiPhi,
                    donVi: cost.donVi,
                    dinhMucLaoDong: cost.dinhMucLaoDong,
                    donViDinhMucLaoDong: cost.donViDinhMucLaoDong,
                    soLuongNguyenLieu: cost.soLuongNguyenLieu,
                    soPhutThucHien: cost.soPhutThucHien,
                    soLuongKeHoach: cost.soLuongKeHoach,
                    soLuongThucTe: cost.soLuongThucTe,
                  })),
                },
              })) || [],
            },
          },
        },
      },
      include: {
        flowchart: {
          include: {
            sections: {
              include: {
                costs: true,
              },
              orderBy: {
                stt: 'asc',
              },
            },
          },
        },
      },
    });

    await tx.generalCost.createMany({
      data: [
        {
          maChiPhi: 'GCC-MIT-001',
          tenChiPhi: 'Điện năng máy sấy VC-01',
          loaiChiPhi: 'Điện',
          noiDung: 'Điện năng tiêu thụ cho mẻ sấy mít loại 1.',
          donViTinh: 'kWh',
          giaThanhNgay: 335000,
          donViTien: 'VND',
          msnv: adminEmployee.employeeCode,
          tenNhanVien: 'Admin User',
        },
        {
          maChiPhi: 'GCC-MIT-002',
          tenChiPhi: 'Nhân công phân loại và đóng gói',
          loaiChiPhi: 'Nhân công',
          noiDung: 'Chi phí nhân công phân loại, cân và đóng gói mít sấy.',
          donViTinh: 'Công',
          giaThanhNgay: 1480000,
          donViTien: 'VND',
          msnv: adminEmployee.employeeCode,
          tenNhanVien: 'Admin User',
        },
        {
          maChiPhi: 'GCC-MIT-003',
          tenChiPhi: 'Khấu hao line sấy chân không',
          loaiChiPhi: 'Khấu hao',
          noiDung: 'Khấu hao phân bổ cho line VC-01 trong một mẻ sấy.',
          donViTinh: 'Mẻ',
          giaThanhNgay: 620000,
          donViTien: 'VND',
          msnv: adminEmployee.employeeCode,
          tenNhanVien: 'Admin User',
        },
      ],
    });

    const [electricityCost, laborCost, depreciationCost] = await Promise.all([
      tx.generalCost.findUnique({ where: { maChiPhi: 'GCC-MIT-001' } }),
      tx.generalCost.findUnique({ where: { maChiPhi: 'GCC-MIT-002' } }),
      tx.generalCost.findUnique({ where: { maChiPhi: 'GCC-MIT-003' } }),
    ]);

    const machine = await tx.machine.create({
      data: {
        maMay: machineCode,
        tenMay: 'Máy sấy chân không VC-01',
        moTa: 'Line sấy chân không dùng cho mít sấy và các dòng trái cây sấy cao cấp.',
        trangThai: 'HOAT_DONG',
        ghiChu: 'Máy đang chạy ổn định cho mẻ mít sấy demo.',
      },
    });

    const materialEvaluation = await tx.materialEvaluation.create({
      data: {
        maChien: batchCode,
        thoiGianChien: new Date('2026-04-15T01:30:00.000Z'),
        tenHangHoa: 'Mít tách hạt loại 1',
        soLoKien: rawLotName,
        khoiLuong: 780,
        soLanNgam: 2,
        nhietDoNuocTruocNgam: 28,
        nhietDoNuocSauVot: 23,
        thoiGianNgam: 95,
        brixNuocNgam: 37.5,
        danhGiaTruocNgam: 'Múi mít vàng sáng, kích cỡ đồng đều, tỷ lệ dập hỏng dưới 1%.',
        danhGiaSauNgam: 'Nguyên liệu thấm dịch đường đều, bề mặt ráo, màu giữ ổn định.',
        nguoiThucHien: 'Tổ sơ chế trái cây sấy',
      },
    });

    await tx.systemOperation.create({
      data: {
        maChien: batchCode,
        machineId: machine.id,
        tenMay: machine.tenMay,
        thoiGianChien: new Date('2026-04-15T02:00:00.000Z'),
        khoiLuongDauVao: 780,
        giaiDoan1ThoiGian: 45,
        giaiDoan1NhietDo: 68,
        giaiDoan1ApSuat: 710,
        giaiDoan2ThoiGian: 90,
        giaiDoan2NhietDo: 70,
        giaiDoan2ApSuat: 700,
        giaiDoan3ThoiGian: 110,
        giaiDoan3NhietDo: 72,
        giaiDoan3ApSuat: 690,
        giaiDoan4ThoiGian: 55,
        giaiDoan4NhietDo: 66,
        giaiDoan4ApSuat: 680,
        tongThoiGianSay: 300,
        trangThai: 'DANG_HOAT_DONG',
        ghiChu: 'Mẻ sấy hoàn tất ổn định, độ ẩm đầu ra đạt 2.4%.',
        nguoiThucHien: 'Tổ vận hành VC-01',
        materialEvaluationId: materialEvaluation.id,
      },
    });

    const finishedProduct = await tx.finishedProduct.create({
      data: {
        maChien: batchCode,
        thoiGianChien: '15/04/2026 08:00 - 16:30',
        tenHangHoa: 'Mít sấy loại 1 - Lô TP-MIT-150426-A',
        khoiLuong: 257,
        machineId: machine.id,
        tenMay: machine.tenMay,
        trangThai: 'DANG_HOAT_DONG',
        materialEvaluationId: materialEvaluation.id,
        aKhoiLuong: 205,
        aTiLe: 79.77,
        bKhoiLuong: 30,
        bTiLe: 11.67,
        bDauKhoiLuong: 0,
        bDauTiLe: 0,
        cKhoiLuong: 8,
        cTiLe: 3.11,
        vunLonKhoiLuong: 7,
        vunLonTiLe: 2.72,
        vunNhoKhoiLuong: 4,
        vunNhoTiLe: 1.56,
        phePhamKhoiLuong: 2,
        phePhamTiLe: 0.78,
        uotKhoiLuong: 1,
        uotTiLe: 0.39,
        tongKhoiLuong: 257,
        nguoiThucHien: 'Tổ hoàn thiện VC-01',
      },
    });

    await tx.qualityEvaluation.create({
      data: {
        maChien: batchCode,
        thoiGianChien: '15/04/2026 08:00 - 16:30',
        tenHangHoa: 'Mít sấy loại 1',
        mauSac: 'Vàng tươi đồng đều, không cháy cạnh',
        machineId: machine.id,
        tenMay: machine.tenMay,
        finishedProductId: finishedProduct.id,
        materialEvaluationId: materialEvaluation.id,
        aTiLe: finishedProduct.aTiLe,
        bTiLe: finishedProduct.bTiLe,
        bDauTiLe: finishedProduct.bDauTiLe,
        cTiLe: finishedProduct.cTiLe,
        vunLonTiLe: finishedProduct.vunLonTiLe,
        vunNhoTiLe: finishedProduct.vunNhoTiLe,
        phePhamTiLe: finishedProduct.phePhamTiLe,
        uotTiLe: finishedProduct.uotTiLe,
        muiHuong: 'Thơm đặc trưng của mít chín, không có mùi dầu cũ',
        huongVi: 'Ngọt thanh, hậu vị tự nhiên',
        doNgot: '11/10 Brix quy đổi sau sấy, phù hợp chuẩn khách hàng',
        doGion: 'Giòn tốt, độ ẩm 2.4%',
        danhGiaTongQuan: 'Đạt chuẩn xuất kho cho đơn hàng nội địa loại 1',
        deXuatDieuChinh: 'Giữ nguyên thời gian ngâm 95 phút và áp suất giai đoạn 3 ở mức 690 mmHg.',
        nguoiThucHien: 'QC thành phẩm - Ca 1',
      },
    });

    await tx.productionReport.create({
      data: {
        ngayThang: '2026-04-15',
        tongSoTuaSanXuat: 2,
        soMeTua: 1,
        tongSoMeKeHoach: 2,
        soMeThucTe: 2,
        maDinhMuc: materialStandard.maDinhMuc,
        tongKhoiLuongNguyenLieu: 780,
        tongKhoiLuongThanhPhamDinhMuc: 219.4,
        khoiLuongThanhPhamThucTe: 257,
        chenhLechKhoiLuong: 37.6,
        danhGiaChenhLech: 'Vượt định mức kế hoạch nhờ nguyên liệu đồng đều và hao hụt thấp.',
        nguyenNhanChenhLech: 'Nguyên liệu mít chín đồng đều, quá trình ngâm và sấy ổn định, tỷ lệ vụn thấp hơn dự kiến.',
        deXuatDieuChinh: 'Giữ định mức đầu vào 675kg cho đơn 180kg, đồng thời duy trì kiểm soát độ ẩm trước sấy dưới 78%.',
        nguoiThucHien: 'Tổ trưởng sản xuất trái cây sấy',
      },
    });

    const rawLot = await tx.lot.create({
      data: {
        tenLo: rawLotName,
        warehouseId: materialWarehouse.id,
      },
    });

    const packagingLot = await tx.lot.create({
      data: {
        tenLo: packagingLotName,
        warehouseId: packagingWarehouse.id,
      },
    });

    const finishedLot = await tx.lot.create({
      data: {
        tenLo: finishedLotName,
        warehouseId: finishedGoodsWarehouse.id,
      },
    });

    const rawJackfruitLotProduct = await tx.lotProduct.create({
      data: {
        lotId: rawLot.id,
        internationalProductId: rawJackfruit.id,
        soLuong: 70,
        donViTinh: 'Kg',
        giaThanh: 38500,
      },
    });

    const zipperBagLotProduct = await tx.lotProduct.create({
      data: {
        lotId: packagingLot.id,
        internationalProductId: zipperBag500g.id,
        soLuong: 140,
        donViTinh: 'Cái',
        giaThanh: 3200,
      },
    });

    const cartonLotProduct = await tx.lotProduct.create({
      data: {
        lotId: packagingLot.id,
        internationalProductId: driedJackfruitCarton.id,
        soLuong: 17,
        donViTinh: 'Thùng',
        giaThanh: 18500,
      },
    });

    const grade1LotProduct = await tx.lotProduct.create({
      data: {
        lotId: finishedLot.id,
        internationalProductId: driedJackfruitGrade1.id,
        soLuong: 25,
        donViTinh: 'Kg',
        giaThanh: 198000,
      },
    });

    const grade2LotProduct = await tx.lotProduct.create({
      data: {
        lotId: finishedLot.id,
        internationalProductId: driedJackfruitGrade2.id,
        soLuong: 30,
        donViTinh: 'Kg',
        giaThanh: 145000,
      },
    });

    const crumbsLotProduct = await tx.lotProduct.create({
      data: {
        lotId: finishedLot.id,
        internationalProductId: driedJackfruitCrumbs.id,
        soLuong: 11,
        donViTinh: 'Kg',
        giaThanh: 98000,
      },
    });

    await tx.warehouseReceipt.createMany({
      data: [
        {
          maPhieuNhap: 'PN202604160101',
          ngayNhap: new Date('2026-04-12T08:15:00.000Z'),
          employeeId: warehouseEmployee.id,
          maNhanVien: warehouseEmployee.employeeCode,
          tenNhanVien: 'Thủ kho Demo',
          warehouseId: materialWarehouse.id,
          tenKho: materialWarehouse.tenKho,
          lotId: rawLot.id,
          tenLo: rawLot.tenLo,
          lotProductId: rawJackfruitLotProduct.id,
          tenSanPham: rawJackfruit.tenSanPham,
          soLuongTruoc: 0,
          soLuongNhap: 850,
          soLuongSau: 850,
          donViTinh: 'Kg',
          ghiChu: 'Nhập nguyên liệu mít tách hạt loại 1 cho kế hoạch DH-201.',
        },
        {
          maPhieuNhap: 'PN202604160102',
          ngayNhap: new Date('2026-04-13T09:00:00.000Z'),
          employeeId: warehouseEmployee.id,
          maNhanVien: warehouseEmployee.employeeCode,
          tenNhanVien: 'Thủ kho Demo',
          warehouseId: packagingWarehouse.id,
          tenKho: packagingWarehouse.tenKho,
          lotId: packagingLot.id,
          tenLo: packagingLot.tenLo,
          lotProductId: zipperBagLotProduct.id,
          tenSanPham: zipperBag500g.tenSanPham,
          soLuongTruoc: 0,
          soLuongNhap: 500,
          soLuongSau: 500,
          donViTinh: 'Cái',
          ghiChu: 'Nhập bao bì 500g cho đơn hàng mít sấy loại 1.',
        },
        {
          maPhieuNhap: 'PN202604160103',
          ngayNhap: new Date('2026-04-13T09:20:00.000Z'),
          employeeId: warehouseEmployee.id,
          maNhanVien: warehouseEmployee.employeeCode,
          tenNhanVien: 'Thủ kho Demo',
          warehouseId: packagingWarehouse.id,
          tenKho: packagingWarehouse.tenKho,
          lotId: packagingLot.id,
          tenLo: packagingLot.tenLo,
          lotProductId: cartonLotProduct.id,
          tenSanPham: driedJackfruitCarton.tenSanPham,
          soLuongTruoc: 0,
          soLuongNhap: 32,
          soLuongSau: 32,
          donViTinh: 'Thùng',
          ghiChu: 'Nhập thùng carton 24 túi/thùng cho mẻ đóng gói nội địa.',
        },
        {
          maPhieuNhap: 'PN202604160104',
          ngayNhap: new Date('2026-04-15T17:10:00.000Z'),
          employeeId: warehouseEmployee.id,
          maNhanVien: warehouseEmployee.employeeCode,
          tenNhanVien: 'Thủ kho Demo',
          warehouseId: finishedGoodsWarehouse.id,
          tenKho: finishedGoodsWarehouse.tenKho,
          lotId: finishedLot.id,
          tenLo: finishedLot.tenLo,
          lotProductId: grade1LotProduct.id,
          tenSanPham: driedJackfruitGrade1.tenSanPham,
          soLuongTruoc: 0,
          soLuongNhap: 205,
          soLuongSau: 205,
          donViTinh: 'Kg',
          ghiChu: 'Nhập kho thành phẩm loại 1 sau QC mẻ MIT-20260415-01.',
        },
        {
          maPhieuNhap: 'PN202604160105',
          ngayNhap: new Date('2026-04-15T17:20:00.000Z'),
          employeeId: warehouseEmployee.id,
          maNhanVien: warehouseEmployee.employeeCode,
          tenNhanVien: 'Thủ kho Demo',
          warehouseId: finishedGoodsWarehouse.id,
          tenKho: finishedGoodsWarehouse.tenKho,
          lotId: finishedLot.id,
          tenLo: finishedLot.tenLo,
          lotProductId: grade2LotProduct.id,
          tenSanPham: driedJackfruitGrade2.tenSanPham,
          soLuongTruoc: 0,
          soLuongNhap: 30,
          soLuongSau: 30,
          donViTinh: 'Kg',
          ghiChu: 'Nhập kho thành phẩm loại 2 sau khi hoàn tất phân loại mẻ MIT-20260415-01.',
        },
        {
          maPhieuNhap: 'PN202604160106',
          ngayNhap: new Date('2026-04-15T17:35:00.000Z'),
          employeeId: warehouseEmployee.id,
          maNhanVien: warehouseEmployee.employeeCode,
          tenNhanVien: 'Thủ kho Demo',
          warehouseId: finishedGoodsWarehouse.id,
          tenKho: finishedGoodsWarehouse.tenKho,
          lotId: finishedLot.id,
          tenLo: finishedLot.tenLo,
          lotProductId: crumbsLotProduct.id,
          tenSanPham: driedJackfruitCrumbs.tenSanPham,
          soLuongTruoc: 0,
          soLuongNhap: 11,
          soLuongSau: 11,
          donViTinh: 'Kg',
          ghiChu: 'Nhập kho vụn mít sấy để phục vụ kênh topping và hàng phối trộn.',
        },
      ],
    });

    await tx.warehouseIssue.createMany({
      data: [
        {
          maPhieuXuat: 'PX-20260416-0101',
          ngayXuat: new Date('2026-04-15T07:30:00.000Z'),
          employeeId: warehouseEmployee.id,
          maNhanVien: warehouseEmployee.employeeCode,
          tenNhanVien: 'Thủ kho Demo',
          warehouseId: materialWarehouse.id,
          tenKho: materialWarehouse.tenKho,
          lotId: rawLot.id,
          tenLo: rawLot.tenLo,
          lotProductId: rawJackfruitLotProduct.id,
          tenSanPham: rawJackfruit.tenSanPham,
          soLuongTruoc: 850,
          soLuongXuat: 780,
          soLuongSau: 70,
          donViTinh: 'Kg',
          ghiChu: 'Xuất nguyên liệu cho lệnh sản xuất QTSX-MIT-20260415-01.',
        },
        {
          maPhieuXuat: 'PX-20260416-0102',
          ngayXuat: new Date('2026-04-15T15:45:00.000Z'),
          employeeId: warehouseEmployee.id,
          maNhanVien: warehouseEmployee.employeeCode,
          tenNhanVien: 'Thủ kho Demo',
          warehouseId: packagingWarehouse.id,
          tenKho: packagingWarehouse.tenKho,
          lotId: packagingLot.id,
          tenLo: packagingLot.tenLo,
          lotProductId: zipperBagLotProduct.id,
          tenSanPham: zipperBag500g.tenSanPham,
          soLuongTruoc: 500,
          soLuongXuat: 360,
          soLuongSau: 140,
          donViTinh: 'Cái',
          ghiChu: 'Xuất bao bì 500g để đóng gói 180kg mít sấy loại 1 cho DH-201.',
        },
        {
          maPhieuXuat: 'PX-20260416-0103',
          ngayXuat: new Date('2026-04-15T15:55:00.000Z'),
          employeeId: warehouseEmployee.id,
          maNhanVien: warehouseEmployee.employeeCode,
          tenNhanVien: 'Thủ kho Demo',
          warehouseId: packagingWarehouse.id,
          tenKho: packagingWarehouse.tenKho,
          lotId: packagingLot.id,
          tenLo: packagingLot.tenLo,
          lotProductId: cartonLotProduct.id,
          tenSanPham: driedJackfruitCarton.tenSanPham,
          soLuongTruoc: 32,
          soLuongXuat: 15,
          soLuongSau: 17,
          donViTinh: 'Thùng',
          ghiChu: 'Xuất thùng carton giao hàng cho khách An Phú Foods.',
        },
        {
          maPhieuXuat: 'PX-20260416-0104',
          ngayXuat: new Date('2026-04-16T08:30:00.000Z'),
          employeeId: warehouseEmployee.id,
          maNhanVien: warehouseEmployee.employeeCode,
          tenNhanVien: 'Thủ kho Demo',
          warehouseId: finishedGoodsWarehouse.id,
          tenKho: finishedGoodsWarehouse.tenKho,
          lotId: finishedLot.id,
          tenLo: finishedLot.tenLo,
          lotProductId: grade1LotProduct.id,
          tenSanPham: driedJackfruitGrade1.tenSanPham,
          soLuongTruoc: 205,
          soLuongXuat: 180,
          soLuongSau: 25,
          donViTinh: 'Kg',
          ghiChu: 'Xuất giao đơn hàng DH-201 cho Công ty TNHH Thực Phẩm An Phú.',
        },
      ],
    });

    const quotationRequest = await tx.quotationRequest.create({
      data: {
        maYeuCauBaoGia: quotationRequestCode,
        ngayYeuCau: new Date('2026-04-10T02:30:00.000Z'),
        employeeId: salesEmployee.id,
        maNhanVien: salesEmployee.employeeCode,
        tenNhanVien: 'Nguyễn Hoàng Nam',
        customerId: customer.id,
        maKhachHang: customer.maKhachHang,
        tenKhachHang: customer.tenCongTy,
        hinhThucVanChuyen: 'Giao tận kho khách hàng tại TP.HCM',
        hinhThucThanhToan: 'Chuyển khoản 50/50',
        quocGia: null,
        cangDen: 'Kho Bình Tân - TP.HCM',
        ghiChu: 'Khách yêu cầu Mít sấy loại 1, quy cách 500g/túi, nguyên liệu đầu vào là mít đã tách hạt.',
        items: {
          create: [
            {
              productId: driedJackfruitGrade1.id,
              maSanPham: driedJackfruitGrade1.maSanPham,
              tenSanPham: driedJackfruitGrade1.tenSanPham,
              moTaSanPham: driedJackfruitGrade1.moTaSanPham,
              yeuCauSanPham: 'Màu vàng sáng, độ ẩm dưới 3%, đóng túi zipper nhôm 500g, 24 túi/thùng.',
              quyDongGoi: '500g/túi, 24 túi/thùng',
              soLuong: 180,
              donViTinh: 'Kg',
              giaDoiThuBan: 255000,
              giaBanGanNhat: 246000,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });

    await tx.quotationCalculator.create({
      data: {
        quotationRequestId: quotationRequest.id,
        maYeuCauBaoGia: quotationRequest.maYeuCauBaoGia,
        phanTramThue: 8,
        phanTramQuy: 3,
        generalCostGroupsData: [
          {
            id: 'gcg-mit-201',
            tenBangChiPhi: 'Chi phí chung mẻ mít sấy loại 1',
            selectedCosts: generalCostCodes,
            selectedProducts: [driedJackfruitGrade1.id],
          },
        ],
        products: {
          create: [
            {
              quotationRequestItemId: quotationRequest.items[0].id,
              productId: driedJackfruitGrade1.id,
              tenSanPham: driedJackfruitGrade1.tenSanPham,
              soLuong: 180,
              donViTinh: 'Kg',
              maBaoGia: quotationCode,
              materialStandardId: materialStandard.id,
              maDinhMuc: materialStandard.maDinhMuc,
              tenDinhMuc: materialStandard.tenDinhMuc,
              tiLeThuHoi: materialStandard.tiLeThuHoi,
              sanPhamDauRa: 'Mít sấy loại 1',
              thanhPhamTonKho: 12,
              tongThanhPhamCanSxThem: 168,
              tongNguyenLieuCanSanXuat: 675,
              nguyenLieuTonKho: 850,
              nguyenLieuCanNhapThem: 0,
              productionProcessId: productionProcess.id,
              maQuyTrinhSanXuat: productionProcess.maQuyTrinhSanXuat,
              tenQuyTrinhSanXuat: productionProcess.tenQuyTrinhSanXuat,
               flowchartData: productionProcess.flowchart
                 ? toJsonValue(productionProcess.flowchart)
                 : Prisma.JsonNull,
              thoiGianChoPhepToiDa: 6,
              ngayBatDauSanXuat: new Date('2026-04-14T01:00:00.000Z'),
              ngayBatDauSanXuatThucTe: new Date('2026-04-15T01:00:00.000Z'),
              ngayHoanThanhThucTe: 1.5,
              chiPhiSanXuatKeHoach: 26250000,
              chiPhiSanXuatThucTe: 27840000,
              chiPhiChungKeHoach: 2435000,
              chiPhiChungThucTe: 2515000,
              chiPhiXuatKhauKeHoach: 0,
              chiPhiXuatKhauThucTe: 0,
              giaHoaVon: 198000,
              loiNhuanCongThem: 50000,
              ghiChu: 'Giá chào đã tính theo quy cách 500g/túi, giao tại kho khách hàng.',
              tongKhoiLuongThanhPhamThucTe: 205,
              thanhPhamTonKhoThucTe: 12,
              tongThanhPhamCanSxThemThucTe: 168,
              tongNguyenLieuCanSanXuatThucTe: 780,
              loiNhuanCongThemThucTe: 46000,
              tiGiaUSD: 0,
              byProducts: {
                create: [
                  {
                    tenSanPham: 'Mít sấy loại 2',
                    tiLe: 12,
                    tiLeThuHoiThucTe: 11.67,
                    giaHoaVon: 145000,
                    giaHoaVonThucTe: 149000,
                  },
                  {
                    tenSanPham: 'Vụn mít sấy',
                    tiLe: 6,
                    tiLeThuHoiThucTe: 4.28,
                    giaHoaVon: 98000,
                    giaHoaVonThucTe: 101000,
                  },
                ],
              },
            },
          ],
        },
        generalCosts: {
          create: [
            {
              generalCostId: electricityCost?.id || '',
              maChiPhi: electricityCost?.maChiPhi || 'GCC-MIT-001',
              tenChiPhi: electricityCost?.tenChiPhi || 'Điện năng máy sấy VC-01',
              donViTinh: electricityCost?.donViTinh || 'kWh',
              keHoach: 335000,
              thucTe: 352000,
            },
            {
              generalCostId: laborCost?.id || '',
              maChiPhi: laborCost?.maChiPhi || 'GCC-MIT-002',
              tenChiPhi: laborCost?.tenChiPhi || 'Nhân công phân loại và đóng gói',
              donViTinh: laborCost?.donViTinh || 'Công',
              keHoach: 1480000,
              thucTe: 1525000,
            },
            {
              generalCostId: depreciationCost?.id || '',
              maChiPhi: depreciationCost?.maChiPhi || 'GCC-MIT-003',
              tenChiPhi: depreciationCost?.tenChiPhi || 'Khấu hao line sấy chân không',
              donViTinh: depreciationCost?.donViTinh || 'Mẻ',
              keHoach: 620000,
              thucTe: 638000,
            },
          ],
        },
      },
    });

    const quotation = await tx.quotation.create({
      data: {
        maBaoGia: quotationCode,
        ngayBaoGia: new Date('2026-04-11T03:15:00.000Z'),
        quotationRequestId: quotationRequest.id,
        maYeuCauBaoGia: quotationRequest.maYeuCauBaoGia,
        customerId: customer.id,
        maKhachHang: customer.maKhachHang,
        tenKhachHang: customer.tenCongTy,
        productId: driedJackfruitGrade1.id,
        tenSanPham: driedJackfruitGrade1.tenSanPham,
        khoiLuong: 180,
        donViTinh: 'Kg',
        materialStandardId: materialStandard.id,
        maDinhMuc: materialStandard.maDinhMuc,
        tenDinhMuc: materialStandard.tenDinhMuc,
        tiLeThuHoi: materialStandard.tiLeThuHoi,
        sanPhamDauRa: 'Mít sấy loại 1',
        thanhPhamTonKho: 12,
        tongThanhPhamCanSxThem: 168,
        tongNguyenLieuCanSanXuat: 675,
        nguyenLieuTonKho: 850,
        nguyenLieuCanNhapThem: 0,
        giaBaoKhach: 248000,
        thoiGianGiaoHang: 6,
        hieuLucBaoGia: 10,
        employeeId: salesEmployee.id,
        tenNhanVien: 'Nguyễn Hoàng Nam',
        tinhTrang: 'DA_DAT_HANG',
        ghiChu: 'Khách xác nhận đặt 180kg, giao 1 đợt sau khi hoàn tất kiểm tra QC.',
        items: {
          create: [
            {
              tenThanhPham: 'Mít sấy loại 1',
              tiLe: 82,
              khoiLuongTuongUng: 180,
            },
            {
              tenThanhPham: 'Mít sấy loại 2',
              tiLe: 12,
              khoiLuongTuongUng: 26.34,
            },
            {
              tenThanhPham: 'Vụn mít sấy',
              tiLe: 6,
              khoiLuongTuongUng: 13.16,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });

    const order = await tx.order.create({
      data: {
        maDonHang: orderCode,
        ngayDatHang: new Date('2026-04-13T02:00:00.000Z'),
        quotationId: quotation.id,
        maBaoGia: quotation.maBaoGia,
        quotationRequestId: quotationRequest.id,
        maYeuCauBaoGia: quotationRequest.maYeuCauBaoGia,
        customerId: customer.id,
        maKhachHang: customer.maKhachHang,
        tenKhachHang: customer.tenCongTy,
        employeeId: salesEmployee.id,
        tenNhanVien: 'Nguyễn Hoàng Nam',
        giaTriDonHangVND: 44640000,
        noiDiaDot1VND: 22320000,
        ngayThanhToanDot1: new Date('2026-04-13T09:30:00.000Z'),
        noiDiaDot2VND: 22320000,
        ngayThanhToanDot2: new Date('2026-04-17T03:00:00.000Z'),
        ngayBatDauSanXuatKeHoach: new Date('2026-04-14T01:00:00.000Z'),
        ngayHoanThanhSanXuatKeHoach: new Date('2026-04-15T09:00:00.000Z'),
        ngayHoanThanhThucTe: new Date('2026-04-15T08:30:00.000Z'),
        ngayGiaoHang: new Date('2026-04-16T08:30:00.000Z'),
        trangThaiSanXuat: 'DA_GIAO_CHO_KHACH_HANG',
        trangThaiThanhToan: 'DA_THANH_TOAN_DU',
        ghiChu: 'Đơn hàng demo full flow: từ mít tách hạt -> sấy -> QC -> nhập kho -> giao khách.',
        items: {
          create: [
            {
              productId: driedJackfruitGrade1.id,
              maSanPham: driedJackfruitGrade1.maSanPham,
              tenHangHoa: driedJackfruitGrade1.tenSanPham,
              yeuCauHangHoa: 'Quy cách 500g/túi, độ ẩm < 3%, màu vàng sáng đồng đều.',
              dongGoi: '500g/túi, 24 túi/thùng',
              soLuong: 180,
              donVi: 'Kg',
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });

    await tx.taxReport.create({
      data: {
        orderId: order.id,
        ngayDatHang: order.ngayDatHang,
        maDonHang: order.maDonHang,
        tenHangHoa: 'Mít sấy loại 1',
        soLuong: 180,
        donVi: 'Kg',
        giaTriDonHang: 44640000,
        soTienDongThue: 3571200,
        trangThai: 'DA_QUYET_TOAN',
        ghiChi: 'Hồ sơ VAT 8% cho đơn DH-201 đã hoàn tất và đối soát với hóa đơn bán hàng.',
      },
    });

    await tx.invoice.create({
      data: {
        soHoaDon: invoiceCode,
        ngayLap: new Date('2026-04-16T10:00:00.000Z'),
        khachHang: customer.tenCongTy,
        maSoThue: customer.maSoThue,
        loaiHoaDon: 'Bán hàng',
        tongTien: 44640000,
        thue: 8,
        thanhTien: 48211200,
        trangThai: 'Đã thanh toán',
        nhanVienLap: 'Kế toán hành chính - Demo',
        phuongThucThanhToan: 'Chuyển khoản',
        ngayThanhToan: new Date('2026-04-17T03:00:00.000Z'),
        ghiChu: 'Hóa đơn bán hàng cho DH-201, khách thanh toán đủ 2 đợt.',
      },
    });

    await tx.customerFeedback.create({
      data: {
        customerId: customer.id,
        ngayPhanHoi: new Date('2026-04-18T02:00:00.000Z'),
        loaiPhanHoi: 'Phản hồi chất lượng sau giao hàng',
        mucDoNghiemTrong: 'Thấp',
        noiDungPhanHoi: 'Màu sắc và độ giòn đạt yêu cầu, đề nghị giữ ổn định quy cách 500g/túi cho các đợt sau.',
        sanPhamLienQuan: 'Mít sấy loại 1',
        donHangLienQuan: order.maDonHang,
        nguoiTiepNhan: 'Nguyễn Hoàng Nam',
        trangThaiXuLy: 'Đã xử lý',
        bienPhapXuLy: 'Kinh doanh và sản xuất thống nhất giữ cấu hình đóng gói hiện tại cho đơn lặp lại.',
        ketQuaXuLy: 'Khách xác nhận hài lòng và lên kế hoạch đặt đơn tiếp theo trong tháng 05.',
        ngayXuLyXong: new Date('2026-04-18T08:00:00.000Z'),
        mucDoHaiLong: 'Hài lòng',
        ghiChu: 'Feedback dùng để demo bước hậu mãi sau khi đơn hàng hoàn tất.',
      },
    });
  });

  console.log('✅ Dried jackfruit order demo seeded across business, pricing, production, warehouse, tax, invoice, and feedback');

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

  console.log('✨ Database seeding completed!');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Seeding error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
