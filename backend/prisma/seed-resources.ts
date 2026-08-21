import { PrismaClient } from '@prisma/client';

const RESOURCES: Array<{ code: string; label: string; group: string; sortOrder: number }> = [
  { code: 'auth', label: 'Xác thực', group: 'system', sortOrder: 1 },
  { code: 'users', label: 'Người dùng', group: 'system', sortOrder: 2 },
  { code: 'employees', label: 'Nhân viên', group: 'hr', sortOrder: 10 },
  { code: 'departments', label: 'Phòng ban', group: 'hr', sortOrder: 11 },
  { code: 'positions', label: 'Chức vụ', group: 'hr', sortOrder: 12 },
  { code: 'position-responsibilities', label: 'Tiêu chí đánh giá', group: 'hr', sortOrder: 13 },
  { code: 'position-levels', label: 'Bậc chức vụ', group: 'hr', sortOrder: 14 },
  { code: 'employee-evaluations', label: 'Đánh giá nhân viên', group: 'hr', sortOrder: 15 },
  { code: 'payrolls', label: 'Bảng lương', group: 'hr', sortOrder: 16 },
  { code: 'attendances', label: 'Chấm công', group: 'hr', sortOrder: 17 },
  { code: 'attendance-codes', label: 'Mã chấm công', group: 'hr', sortOrder: 18 },
  { code: 'holidays', label: 'Ngày lễ', group: 'hr', sortOrder: 19 },
  { code: 'timesheet', label: 'Bảng chấm công', group: 'hr', sortOrder: 20 },
  { code: 'work-shifts', label: 'Ca làm việc', group: 'hr', sortOrder: 21 },
  { code: 'overtime-plans', label: 'Kế hoạch tăng ca', group: 'hr', sortOrder: 22 },
  { code: 'face-attendance', label: 'Chấm công khuôn mặt', group: 'hr', sortOrder: 23 },
  { code: 'internal-inspections', label: 'Kiểm tra nội bộ', group: 'quality', sortOrder: 30 },
  { code: 'material-standards', label: 'Định mức NVL', group: 'production', sortOrder: 40 },
  { code: 'processes', label: 'Quy trình', group: 'production', sortOrder: 41 },
  { code: 'process-types', label: 'Loại quy trình', group: 'production', sortOrder: 42 },
  { code: 'production-processes', label: 'Quy trình sản xuất', group: 'production', sortOrder: 43 },
  { code: 'system-operations', label: 'Vận hành hệ thống', group: 'production', sortOrder: 44 },
  { code: 'material-evaluations', label: 'Đánh giá NVL', group: 'production', sortOrder: 45 },
  { code: 'material-evaluation-criteria', label: 'Tiêu chí đánh giá NVL', group: 'production', sortOrder: 46 },
  { code: 'finished-products', label: 'Thành phẩm', group: 'production', sortOrder: 47 },
  { code: 'quality-evaluations', label: 'Đánh giá chất lượng', group: 'production', sortOrder: 48 },
  { code: 'production-reports', label: 'Báo cáo sản xuất', group: 'production', sortOrder: 49 },
  { code: 'general-costs', label: 'Chi phí chung', group: 'finance', sortOrder: 60 },
  { code: 'export-costs', label: 'Chi phí xuất khẩu', group: 'finance', sortOrder: 61 },
  { code: 'invoices', label: 'Hóa đơn', group: 'finance', sortOrder: 62 },
  { code: 'debts', label: 'Công nợ', group: 'finance', sortOrder: 63 },
  { code: 'tax-reports', label: 'Báo cáo thuế', group: 'finance', sortOrder: 64 },
  { code: 'orders', label: 'Đơn hàng', group: 'business', sortOrder: 70 },
  { code: 'international-customers', label: 'Khách hàng quốc tế', group: 'business', sortOrder: 71 },
  { code: 'international-products', label: 'Sản phẩm quốc tế', group: 'business', sortOrder: 72 },
  { code: 'quotation-requests', label: 'Yêu cầu báo giá', group: 'business', sortOrder: 73 },
  { code: 'quotations', label: 'Báo giá', group: 'business', sortOrder: 74 },
  { code: 'quotation-calculators', label: 'Tính giá báo giá', group: 'business', sortOrder: 75 },
  { code: 'supply-requests', label: 'Yêu cầu cung ứng', group: 'purchasing', sortOrder: 80 },
  { code: 'purchase-requests', label: 'Yêu cầu mua hàng', group: 'purchasing', sortOrder: 81 },
  { code: 'suppliers', label: 'Nhà cung cấp', group: 'purchasing', sortOrder: 82 },
  { code: 'warehouses', label: 'Kho', group: 'warehouse', sortOrder: 90 },
  { code: 'lots', label: 'Lô', group: 'warehouse', sortOrder: 91 },
  { code: 'lot-products', label: 'Sản phẩm theo lô', group: 'warehouse', sortOrder: 92 },
  { code: 'warehouse-receipts', label: 'Phiếu nhập kho', group: 'warehouse', sortOrder: 93 },
  { code: 'warehouse-issues', label: 'Phiếu xuất kho', group: 'warehouse', sortOrder: 94 },
  { code: 'warehouse-stock', label: 'Tồn kho', group: 'warehouse', sortOrder: 95 },
  { code: 'inventory', label: 'Kiểm kê', group: 'warehouse', sortOrder: 96 },
  { code: 'reorder-rules', label: 'Quy tắc đặt lại hàng', group: 'warehouse', sortOrder: 97 },
  { code: 'machine-status-logs', label: 'Nhật ký trạng thái máy', group: 'technical', sortOrder: 100 },
  { code: 'repair-requests', label: 'Yêu cầu sửa chữa', group: 'technical', sortOrder: 101 },
  { code: 'machine-systems', label: 'Hệ thống máy', group: 'technical', sortOrder: 102 },
  { code: 'machine-system-details', label: 'Chi tiết hệ thống máy', group: 'technical', sortOrder: 103 },
  { code: 'fault-templates', label: 'Mẫu lỗi', group: 'technical', sortOrder: 104 },
  { code: 'fault-records', label: 'Ghi nhận lỗi', group: 'technical', sortOrder: 105 },
  { code: 'daily-work-reports', label: 'Báo cáo công việc hàng ngày', group: 'project', sortOrder: 110 },
  { code: 'tasks', label: 'Công việc', group: 'project', sortOrder: 111 },
  { code: 'work-plans', label: 'Kế hoạch công việc', group: 'project', sortOrder: 112 },
  { code: 'projects', label: 'Dự án', group: 'project', sortOrder: 113 },
  { code: 'maintenance-templates', label: 'Mẫu bảo trì', group: 'technical', sortOrder: 114 },
  { code: 'maintenance-plans', label: 'Kế hoạch bảo trì', group: 'technical', sortOrder: 115 },
  { code: 'maintenance-records', label: 'Ghi nhận bảo trì', group: 'technical', sortOrder: 116 },
  { code: 'spare-parts', label: 'Phụ tùng', group: 'technical', sortOrder: 117 },
  { code: 'acceptance-handovers', label: 'Biên bản nghiệm thu', group: 'technical', sortOrder: 118 },
  { code: 'private-feedbacks', label: 'Góp ý riêng', group: 'system', sortOrder: 120 },
  { code: 'leave-requests', label: 'Đơn nghỉ phép', group: 'hr', sortOrder: 121 },
  { code: 'customer-feedbacks', label: 'Phản hồi khách hàng', group: 'business', sortOrder: 122 },
  { code: 'notifications', label: 'Thông báo', group: 'system', sortOrder: 123 },
  { code: 'login-history', label: 'Lịch sử đăng nhập', group: 'system', sortOrder: 124 },
  { code: 'audit-logs', label: 'Nhật ký kiểm toán', group: 'system', sortOrder: 125 },
  { code: 'docs', label: 'Tài liệu', group: 'system', sortOrder: 126 },
  { code: 'system-settings', label: 'Cài đặt hệ thống', group: 'system', sortOrder: 127 },
  { code: 'technical-summary', label: 'Tổng quan kỹ thuật', group: 'technical', sortOrder: 128 },
  { code: 'data-entry-page-positions', label: 'Phân quyền trang nhập liệu', group: 'system', sortOrder: 129 },
  { code: 'lookups', label: 'Danh mục dùng chung', group: 'system', sortOrder: 130 },
  { code: 'pricing-overview', label: 'Tổng quan giá', group: 'finance', sortOrder: 131 },
  { code: 'rules', label: 'Quy tắc phân quyền', group: 'system', sortOrder: 132 },
  { code: 'kiosk', label: 'Kiosk', group: 'system', sortOrder: 133 },
];

async function main() {
  const prisma = new PrismaClient();
  for (const r of RESOURCES) {
    await prisma.resource.upsert({
      where: { code: r.code },
      update: { label: r.label, group: r.group, sortOrder: r.sortOrder, isActive: true },
      create: { code: r.code, label: r.label, group: r.group, sortOrder: r.sortOrder, isActive: true },
    });
  }
  console.log(`Seeded ${RESOURCES.length} resources`);

  // Seed Position.defaultRole for existing positions
  const positionRoleMap: Record<string, string> = {
    // Map by code prefix or name heuristics — best-effort
  };
  // Heuristic: positions with "Trưởng phòng" or "Trưởng bộ phận" → DEPARTMENT_HEAD
  const allPositions = await prisma.position.findMany({ select: { id: true, name: true, code: true } });
  for (const p of allPositions) {
    const nameLower = p.name.toLowerCase();
    let role: string | null = null;
    if (nameLower.includes('giám đốc') || nameLower.includes('trưởng phòng') || nameLower.includes('trưởng bộ phận')) {
      role = 'DEPARTMENT_HEAD';
    } else if (nameLower.includes('tổ trưởng') || nameLower.includes('tổ phó') || nameLower.includes('quản đốc')) {
      role = 'TEAM_LEAD';
    } else {
      role = 'EMPLOYEE';
    }
    await prisma.position.update({ where: { id: p.id }, data: { defaultRole: role as never } });
  }
  console.log(`Updated defaultRole for ${allPositions.length} positions`);
}

main()
  .then(() => console.log('Resource seed done'))
  .catch((e) => { console.error('Resource seed failed', e); process.exit(1); })
  .finally(async () => { const prisma = new PrismaClient(); await prisma.$disconnect(); });
