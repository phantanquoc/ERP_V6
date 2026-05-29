import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const POS_PROD_WORKER_ID = 'cmmvdhsf80013m8kkcw4df84s';
const POS_031_ID = 'cmmvdhshq001ym8kk4twrtsy6';
const employees: [string, string, string, string, string][] = [
  ["doanvanphuoc@anbinhfoods.com",      "NV0018", "Đoàn",    "Văn Phước",        POS_PROD_WORKER_ID],
  ["hothanhtuan@anbinhfoods.com",       "NV0019", "Hồ",      "Thanh Tuấn",       POS_PROD_WORKER_ID],
  ["nguyenquocphong@anbinhfoods.com",   "NV0020", "Nguyễn",  "Quốc Phong",       POS_PROD_WORKER_ID],
  ["nguyentrungthanh@anbinhfoods.com",  "NV0021", "Nguyễn",  "Trung Thành",      POS_PROD_WORKER_ID],
  ["nguyenngocthanh@anbinhfoods.com",   "NV0022", "Nguyễn",  "Ngọc Thành",       POS_PROD_WORKER_ID],
  ["nguyenvanhai@anbinhfoods.com",      "NV0023", "Nguyễn",  "Văn Hải",          POS_PROD_WORKER_ID],
  ["lequanglinh@anbinhfoods.com",       "NV0024", "Lê",      "Quang Linh",       POS_PROD_WORKER_ID],
  ["nguyenhungvuong@anbinhfoods.com",   "NV0025", "Nguyễn",  "Hùng Vương",       POS_PROD_WORKER_ID],
  ["nguyentanhieu@anbinhfoods.com",     "NV0026", "Nguyễn",  "Tấn Hiếu",         POS_PROD_WORKER_ID],
  ["nguyenvanhuynh@anbinhfoods.com",    "NV0027", "Nguyễn",  "Văn Huỳnh",        POS_PROD_WORKER_ID],
  ["hothanhson@anbinhfoods.com",        "NV0028", "Hồ",      "Thanh Sơn",        POS_PROD_WORKER_ID],
  ["nguyenmauphuc@anbinhfoods.com",     "NV0029", "Nguyễn",  "Mậu Phúc",         POS_PROD_WORKER_ID],
  ["phamthiphuongdung@anbinhfoods.com", "NV0030", "Phạm",    "Thị Phương Dung",  POS_PROD_WORKER_ID],
  ["tranthiquynhdao@anbinhfoods.com",   "NV0031", "Trần",    "Thị Quỳnh Dao",    POS_PROD_WORKER_ID],
  ["nguyenthilien@anbinhfoods.com",     "NV0032", "Nguyễn",  "Thị Liên",         POS_PROD_WORKER_ID],
  ["tranthimytuyen@anbinhfoods.com",    "NV0033", "Trần",    "Thị Mỹ Tuyền",     POS_PROD_WORKER_ID],
  ["thieuthinga@anbinhfoods.com",       "NV0034", "Thiều",   "Thị Nga",          POS_PROD_WORKER_ID],
  ["tranthithanhtruyen@anbinhfoods.com","NV0035", "Trần",    "Thị Thanh Truyền", POS_PROD_WORKER_ID],
  ["nguyenthitrang@anbinhfoods.com",    "NV0036", "Nguyễn",  "Thị Trang",        POS_PROD_WORKER_ID],
  ["lungochuong@anbinhfoods.com",       "NV0037", "Lữ",      "Ngọc Hương",       POS_PROD_WORKER_ID],
  ["nguyenthinguyen@anbinhfoods.com",   "NV0038", "Nguyễn",  "Thị Nguyên",       POS_PROD_WORKER_ID],
  ["tranthidiemtrinh@anbinhfoods.com",  "NV0039", "Trần",    "Thị Diễm Trinh",   POS_PROD_WORKER_ID],
  ["phamthiphuongloan@anbinhfoods.com", "NV0040", "Phạm",    "Thị Phương Loan",  POS_PROD_WORKER_ID],
  ["nguyenthituyetquy@anbinhfoods.com", "NV0041", "Nguyễn",  "Thị Tuyết Quý",    POS_PROD_WORKER_ID],
  ["dangnuhoang@anbinhfoods.com",       "NV0042", "Đặng",    "Nữ Hoàng",         POS_PROD_WORKER_ID],
  ["vothikimtuyen@anbinhfoods.com",     "NV0043", "Võ",      "Thị Kim Tuyến",    POS_031_ID],
];

async function main(): Promise<void> {
  console.log('🌱 Seeding NVSX/NVVS employees...\n');

  const password = await bcrypt.hash('123123', 10);
  let created = 0;
  let skipped = 0;

  for (const [email, code, lastName, firstName, posId] of employees) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log(`  ⏭  SKIP ${email} — user exists`);
      skipped++;
      continue;
    }

    const existingEmp = await prisma.employee.findUnique({ where: { employeeCode: code } });
    if (existingEmp) {
      console.log(`  ⏭  SKIP ${code} — employee exists`);
      skipped++;
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email,
        password,
        firstName,
        lastName,
        role: 'EMPLOYEE',
        isActive: true,
      },
    });

    await prisma.employee.create({
      data: {
        userId: user.id,
        employeeCode: code,
        positionId: posId,
        hireDate: new Date('2026-05-29'),
        contractType: 'PERMANENT',
        baseSalary: 0,
        status: 'ACTIVE',
      },
    });

    console.log(`  ✅ ${code} — ${lastName} ${firstName} (${email})`);
    created++;
  }

  console.log(`\n📊 Done: ${created} created, ${skipped} skipped`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
