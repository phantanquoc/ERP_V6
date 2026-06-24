/**
 * Notification Event Registry
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized registry mapping business events to notification definitions.
 * Each entry defines: notification type, message template, recipient resolver.
 *
 * To add a new notification: add one entry here. No other files need changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import prisma from '@config/database';
import {
  NotificationEvent,
  NotificationEventDef,
  NotificationContext,
  NotificationType,
} from '@types';

/* ─── Recipient Resolver Helpers ───────────────────────────────────────────── */

async function getAdminEmployeeIds(excludeUserId?: string): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: {
      role: 'ADMIN',
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    include: { employees: { select: { id: true } } },
  });
  return admins.filter(u => u.employees).map(u => u.employees!.id);
}

async function getEmployeeIdsBySubDeptCode(code: string): Promise<string[]> {
  const primaryEmployees = await prisma.employee.findMany({
    where: { subDepartment: { code }, status: 'ACTIVE' },
    select: { id: true },
  });

  // Also include users with secondary department assignment to this sub-department
  const subDept = await prisma.subDepartment.findUnique({ where: { code }, select: { id: true } });
  let secondaryIds: string[] = [];
  if (subDept) {
    const secondaryUsers = await prisma.user.findMany({
      where: {
        secondaryDepartments: { some: { subDepartmentId: subDept.id } },
        isActive: true,
      },
      include: { employees: { select: { id: true } } },
    });
    secondaryIds = secondaryUsers.filter(u => u.employees).map(u => u.employees!.id);
  }

  const primaryIds = primaryEmployees.map(e => e.id);
  return [...new Set([...primaryIds, ...secondaryIds])];
}

async function getEmployeeIdsByDeptCode(code: string): Promise<string[]> {
  const primaryEmployees = await prisma.employee.findMany({
    where: { subDepartment: { department: { code } }, status: 'ACTIVE' },
    select: { id: true },
  });

  // Also include users with secondary department assignment to this department
  const dept = await prisma.department.findUnique({ where: { code }, select: { id: true } });
  let secondaryIds: string[] = [];
  if (dept) {
    const secondaryUsers = await prisma.user.findMany({
      where: {
        secondaryDepartments: { some: { departmentId: dept.id } },
        isActive: true,
      },
      include: { employees: { select: { id: true } } },
    });
    secondaryIds = secondaryUsers.filter(u => u.employees).map(u => u.employees!.id);
  }

  const primaryIds = primaryEmployees.map(e => e.id);
  return [...new Set([...primaryIds, ...secondaryIds])];
}

async function resolveDirectRecipients(ctx: NotificationContext): Promise<string[]> {
  return ctx.targetEmployeeIds ?? [];
}

/* ─── Registry Entries ─────────────────────────────────────────────────────── */

const entries: NotificationEventDef[] = [
  // ── Evaluation ──
  {
    event: NotificationEvent.EVALUATION_CREATED,
    notificationType: NotificationType.EVALUATION,
    buildMessage: (ctx) => ({
      title: `Đánh giá tháng ${ctx.metadata?.monthName ?? ''}`,
      message: 'Bạn có 1 đánh giá mới',
    }),
    resolveRecipients: resolveDirectRecipients,
  },
  {
    event: NotificationEvent.EVALUATION_SUPERVISOR1_PENDING,
    notificationType: NotificationType.EVALUATION_SUPERVISOR1,
    buildMessage: (ctx) => ({
      title: 'Đánh giá cần duyệt (cấp 1)',
      message: `${ctx.metadata?.employeeName ?? 'Nhân viên'} đã hoàn thành tự đánh giá. Vui lòng duyệt.`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },
  {
    event: NotificationEvent.EVALUATION_SUPERVISOR2_PENDING,
    notificationType: NotificationType.EVALUATION_SUPERVISOR2,
    buildMessage: (ctx) => ({
      title: 'Đánh giá cần duyệt (cấp 2)',
      message: `Đánh giá của ${ctx.metadata?.employeeName ?? 'nhân viên'} cần duyệt cấp 2.`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },
  {
    event: NotificationEvent.EVALUATION_SUPERVISOR1_COMPLETED,
    notificationType: NotificationType.EVALUATION_SUPERVISOR1_COMPLETED,
    buildMessage: () => ({
      title: 'Cấp trên 1 đã đánh giá',
      message: 'Cấp trên 1 đã hoàn thành đánh giá cho bạn. Nhấn để xem chi tiết.',
    }),
    resolveRecipients: resolveDirectRecipients,
  },
  {
    event: NotificationEvent.EVALUATION_COMPLETED,
    notificationType: NotificationType.EVALUATION_COMPLETED,
    buildMessage: () => ({
      title: 'Đánh giá hoàn thành',
      message: 'Đánh giá của bạn đã được hoàn thành. Nhấn để xem kết quả.',
    }),
    resolveRecipients: resolveDirectRecipients,
  },

  // ── Task ──
  {
    event: NotificationEvent.TASK_ASSIGNED,
    notificationType: NotificationType.TASK,
    buildMessage: (ctx) => ({
      title: 'Nhiệm vụ mới',
      message: `${ctx.metadata?.assignerName ?? ''} đã giao cho bạn nhiệm vụ: "${ctx.metadata?.taskTitle ?? ''}"`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },
  {
    event: NotificationEvent.TASK_ADMIN_COPY,
    notificationType: NotificationType.TASK_ADMIN,
    buildMessage: (ctx) => ({
      title: 'Nhiệm vụ mới trong hệ thống',
      message: ctx.metadata?.recipientNames
        ? `${ctx.metadata?.assignerName ?? ''} đã giao cho ${ctx.metadata.recipientNames} nhiệm vụ: "${ctx.metadata?.taskTitle ?? ''}"`
        : `${ctx.metadata?.assignerName ?? ''} đã giao nhiệm vụ: "${ctx.metadata?.taskTitle ?? ''}"`,
    }),
    resolveRecipients: async (ctx) => getAdminEmployeeIds(ctx.actorUserId),
  },

  // ── Leave Request ──
  {
    event: NotificationEvent.LEAVE_REQUEST_SUBMITTED,
    notificationType: NotificationType.LEAVE_REQUEST,
    buildMessage: (ctx) => ({
      title: 'Đơn nghỉ phép mới',
      message: `${ctx.metadata?.employeeName ?? ''} đã gửi đơn nghỉ phép ${ctx.metadata?.leaveTypeLabel ?? ''}`,
    }),
    resolveRecipients: async () => getEmployeeIdsBySubDeptCode('SUBDEPT_QUALITY_PERSONNEL'),
  },
  {
    event: NotificationEvent.LEAVE_REQUEST_RESPONDED,
    notificationType: NotificationType.LEAVE_REQUEST_RESPONSE,
    buildMessage: (ctx) => {
      const approved = ctx.metadata?.status === 'APPROVED';
      const code = ctx.metadata?.leaveCode ?? '';
      return {
        title: approved ? 'Đơn nghỉ phép được duyệt' : 'Đơn nghỉ phép bị từ chối',
        message: approved
          ? `Đơn nghỉ phép ${code} của bạn đã được phê duyệt`
          : `Đơn nghỉ phép ${code} của bạn đã bị từ chối`,
      };
    },
    resolveRecipients: resolveDirectRecipients,
  },

  // ── Payroll ──
  {
    event: NotificationEvent.PAYROLL_PUBLISHED,
    notificationType: NotificationType.PAYROLL,
    buildMessage: (ctx) => ({
      title: `Bảng lương tháng ${ctx.metadata?.month ?? ''}/${ctx.metadata?.year ?? ''}`,
      message: `Bảng lương tháng ${ctx.metadata?.month ?? ''}/${ctx.metadata?.year ?? ''} của bạn đã sẵn sàng. Nhấn để xem chi tiết.`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },

  // ── Acceptance Handover ──
  {
    event: NotificationEvent.ACCEPTANCE_HANDOVER_CREATED,
    notificationType: NotificationType.ACCEPTANCE_HANDOVER,
    buildMessage: (ctx) => ({
      title: 'Nghiệm thu bàn giao mới',
      message: `${ctx.metadata?.nguoiBanGiao ?? ''} đã tạo nghiệm thu bàn giao ${ctx.metadata?.maNghiemThu ?? ''} cho thiết bị "${ctx.metadata?.tenThietBi ?? ''}". Vui lòng kiểm tra và xác nhận.`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },

  // ── Overtime ──
  {
    event: NotificationEvent.OVERTIME_PLAN_SUBMITTED,
    notificationType: NotificationType.OVERTIME_PLAN_APPROVAL,
    buildMessage: (ctx) => ({
      title: 'Kế hoạch tăng ca cần duyệt',
      message: `${ctx.metadata?.creatorName ?? ''} đã tạo kế hoạch tăng ca ngày ${ctx.metadata?.ngayTangCa ?? ''}. Nội dung: ${ctx.metadata?.noiDung ?? ''}. Vui lòng xem xét và phê duyệt.`,
    }),
    resolveRecipients: async (ctx) => getAdminEmployeeIds(ctx.actorUserId),
  },
  {
    event: NotificationEvent.OVERTIME_PLAN_RESPONDED,
    notificationType: NotificationType.OVERTIME_PLAN,
    buildMessage: (ctx) => {
      const approved = ctx.metadata?.status === 'APPROVED';
      return {
        title: approved ? 'Kế hoạch tăng ca được duyệt' : 'Kế hoạch tăng ca bị từ chối',
        message: approved
          ? `Kế hoạch tăng ca ngày ${ctx.metadata?.ngayTangCa ?? ''} của bạn đã được phê duyệt.`
          : `Kế hoạch tăng ca ngày ${ctx.metadata?.ngayTangCa ?? ''} của bạn đã bị từ chối${ctx.metadata?.lyDo ? ': ' + ctx.metadata.lyDo : ''}.`,
      };
    },
    resolveRecipients: resolveDirectRecipients,
  },

  {
    event: NotificationEvent.OVERTIME_PLAN_APPROVED_PARTICIPANT,
    notificationType: NotificationType.OVERTIME_PLAN,
    buildMessage: (ctx) => ({
      title: 'Bạn có lịch tăng ca được duyệt',
      message: `Kế hoạch tăng ca ngày ${ctx.metadata?.ngayTangCa ?? ''} đã được phê duyệt. Nội dung: ${ctx.metadata?.noiDung ?? ''}.`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },
  {
    event: NotificationEvent.OVERTIME_PLAN_REJECTED_PARTICIPANT,
    notificationType: NotificationType.OVERTIME_PLAN,
    buildMessage: (ctx) => ({
      title: 'Kế hoạch tăng ca bị từ chối',
      message: `Kế hoạch tăng ca ngày ${ctx.metadata?.ngayTangCa ?? ''} đã bị từ chối${ctx.metadata?.lyDo ? ': ' + ctx.metadata.lyDo : ''}.`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },
  {
    event: NotificationEvent.OVERTIME_PLAN_APPROVED_DEPT,
    notificationType: NotificationType.OVERTIME_PLAN,
    buildMessage: (ctx) => ({
      title: 'Kế hoạch tăng ca đã được duyệt',
      message: `Kế hoạch tăng ca đã được phê duyệt. Nội dung: ${ctx.metadata?.noiDung ?? ''}.`,
    }),
    resolveRecipients: async (ctx) => {
      const general = await getEmployeeIdsByDeptCode('DEPT_GENERAL');
      const quality = await getEmployeeIdsByDeptCode('DEPT_QUALITY');
      const combined = [...new Set([...general, ...quality])];
      return ctx.actorUserId
        ? combined.filter(id => id !== ctx.actorUserId)
        : combined;
    },
  },

  // ── Supply Request ──
  {
    event: NotificationEvent.SUPPLY_REQUEST_CREATED,
    notificationType: NotificationType.SUPPLY_REQUEST,
    buildMessage: (ctx) => ({
      title: 'Yêu cầu cung cấp mới',
      message: `${ctx.metadata?.employeeName ?? ''} đã tạo yêu cầu cung cấp ${ctx.metadata?.maYeuCau ?? ''}`,
    }),
    resolveRecipients: async (ctx) => {
      const warehouse = await getEmployeeIdsBySubDeptCode('SUBDEPT_PRODUCTION_WAREHOUSE');
      const admins = await getAdminEmployeeIds(ctx.actorUserId);
      return [...new Set([...warehouse, ...admins])];
    },
  },
  {
    event: NotificationEvent.SUPPLY_REQUEST_PROCESSING,
    notificationType: NotificationType.SUPPLY_REQUEST_PROCESSING,
    buildMessage: (ctx) => ({
      title: 'Yêu cầu cung cấp đang xử lý',
      message: `Yêu cầu cung cấp ${ctx.metadata?.maYeuCau ?? ''} đang được xử lý.`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },
  {
    event: NotificationEvent.SUPPLY_REQUEST_APPROVED,
    notificationType: NotificationType.SUPPLY_REQUEST_APPROVED,
    buildMessage: (ctx) => ({
      title: 'Yêu cầu cung cấp đã duyệt',
      message: `Yêu cầu cung cấp ${ctx.metadata?.maYeuCau ?? ''} đã được phê duyệt.`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },
  {
    event: NotificationEvent.SUPPLY_REQUEST_FULFILLED,
    notificationType: NotificationType.SUPPLY_REQUEST_FULFILLED,
    buildMessage: (ctx) => ({
      title: 'Yêu cầu cung cấp hoàn thành',
      message: `Yêu cầu cung cấp ${ctx.metadata?.maYeuCau ?? ''} đã được hoàn thành.`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },

  // ── Auth ──
  {
    event: NotificationEvent.PASSWORD_RESET_REQUESTED,
    notificationType: NotificationType.PASSWORD_RESET,
    buildMessage: (ctx) => ({
      title: 'Yêu cầu đặt lại mật khẩu',
      message: `${ctx.metadata?.employeeName ?? 'Nhân viên'} đã yêu cầu đặt lại mật khẩu.`,
    }),
    resolveRecipients: async (ctx) => getAdminEmployeeIds(ctx.actorUserId),
  },

  // ── Feedback ──
  {
    event: NotificationEvent.PRIVATE_FEEDBACK_SUBMITTED,
    notificationType: NotificationType.PRIVATE_FEEDBACK,
    buildMessage: (ctx) => ({
      title: 'Góp ý mới',
      message: `${ctx.metadata?.employeeName ?? ''} đã gửi góp ý mới`,
    }),
    resolveRecipients: async (ctx) => getAdminEmployeeIds(ctx.actorUserId),
  },

  // ── Daily Work Report ──
  {
    event: NotificationEvent.DAILY_WORK_REPORT_SUBMITTED,
    notificationType: NotificationType.DAILY_WORK_REPORT,
    buildMessage: (ctx) => ({
      title: 'Báo cáo công việc mới',
      message: `${ctx.metadata?.employeeName ?? ''} đã nộp báo cáo công việc ngày ${ctx.metadata?.reportDate ?? ''}`,
    }),
    resolveRecipients: async (ctx) => getAdminEmployeeIds(ctx.actorUserId),
  },

  // ── Work Plan ──
  {
    event: NotificationEvent.WORK_PLAN_ASSIGNED,
    notificationType: NotificationType.WORK_PLAN,
    buildMessage: () => ({
      title: 'Kế hoạch công việc mới',
      message: `Bạn được giao thực hiện kế hoạch công việc mới. Vui lòng kiểm tra.`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },

  // ── Purchase Request (notify requester) ──
  {
    event: NotificationEvent.PURCHASE_REQUEST_APPROVED,
    notificationType: NotificationType.PURCHASE_REQUEST,
    buildMessage: (ctx) => ({
      title: 'Yêu cầu mua hàng được duyệt',
      message: `Yêu cầu mua hàng ${ctx.metadata?.maYeuCau ?? ''} của bạn đã được phê duyệt bởi ${ctx.metadata?.nguoiDuyet ?? 'bộ phận thu mua'}.`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },
  {
    event: NotificationEvent.PURCHASE_REQUEST_REJECTED,
    notificationType: NotificationType.PURCHASE_REQUEST,
    buildMessage: (ctx) => ({
      title: 'Yêu cầu mua hàng bị từ chối',
      message: `Yêu cầu mua hàng ${ctx.metadata?.maYeuCau ?? ''} của bạn đã bị từ chối${ctx.metadata?.lyDo ? ': ' + ctx.metadata.lyDo : ''}.`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },
  {
    event: NotificationEvent.PURCHASE_REQUEST_COMPLETED,
    notificationType: NotificationType.PURCHASE_REQUEST,
    buildMessage: (ctx) => ({
      title: 'Yêu cầu mua hàng hoàn thành',
      message: `Yêu cầu mua hàng ${ctx.metadata?.maYeuCau ?? ''} đã được hoàn thành — hàng đã được mua và sẵn sàng nhập kho.`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },

  // ── Repair Request ──
  {
    event: NotificationEvent.REPAIR_REQUEST_CREATED,
    notificationType: NotificationType.REPAIR_REQUEST,
    buildMessage: (ctx) => ({
      title: 'Yêu cầu sửa chữa mới',
      message: `Yêu cầu sửa chữa ${ctx.metadata?.maYeuCau ?? ''} cho hệ thống "${ctx.metadata?.tenHeThong ?? ''}" đã được tạo.`,
    }),
    resolveRecipients: async (ctx) => {
      const technical = await getEmployeeIdsByDeptCode('DEPT_TECHNICAL');
      const admins = await getAdminEmployeeIds(ctx.actorUserId);
      return [...new Set([...technical, ...admins])];
    },
  },
  {
    event: NotificationEvent.REPAIR_REQUEST_UPDATED,
    notificationType: NotificationType.REPAIR_REQUEST,
    buildMessage: (ctx) => ({
      title: 'Yêu cầu sửa chữa cập nhật',
      message: `Yêu cầu sửa chữa ${ctx.metadata?.maYeuCau ?? ''} đã chuyển sang trạng thái: ${ctx.metadata?.status ?? 'mới'}.`,
    }),
    resolveRecipients: async (ctx) => {
      const technical = await getEmployeeIdsByDeptCode('DEPT_TECHNICAL');
      const admins = await getAdminEmployeeIds(ctx.actorUserId);
      return [...new Set([...technical, ...admins])];
    },
  },

  // ── Order ──
  {
    event: NotificationEvent.ORDER_CREATED,
    notificationType: NotificationType.ORDER,
    buildMessage: (ctx) => ({
      title: 'Đơn hàng mới',
      message: `Đơn hàng ${ctx.metadata?.maDonHang ?? ''} cho khách hàng ${ctx.metadata?.tenKhachHang ?? ''} đã được tạo.`,
    }),
    resolveRecipients: async () => {
      const production = await getEmployeeIdsByDeptCode('DEPT_PRODUCTION');
      const admins = await getAdminEmployeeIds();
      return [...new Set([...production, ...admins])];
    },
  },
  {
    event: NotificationEvent.ORDER_STATUS_UPDATED,
    notificationType: NotificationType.ORDER,
    buildMessage: (ctx) => ({
      title: 'Cập nhật trạng thái đơn hàng',
      message: `Đơn hàng ${ctx.metadata?.maDonHang ?? ''} chuyển trạng thái: ${ctx.metadata?.trangThai ?? ''}.`,
    }),
    resolveRecipients: async () => getAdminEmployeeIds(),
  },

  // ── Warehouse ──
  {
    event: NotificationEvent.WAREHOUSE_RECEIPT_CREATED,
    notificationType: NotificationType.WAREHOUSE,
    buildMessage: (ctx) => ({
      title: 'Phiếu nhập kho mới',
      message: `Phiếu nhập kho ${ctx.metadata?.maPhieuNhap ?? ''}: ${ctx.metadata?.soLuongNhap ?? ''} ${ctx.metadata?.donViTinh ?? ''} ${ctx.metadata?.tenSanPham ?? ''}.`,
    }),
    resolveRecipients: async () => getAdminEmployeeIds(),
  },
  {
    event: NotificationEvent.WAREHOUSE_ISSUE_CREATED,
    notificationType: NotificationType.WAREHOUSE,
    buildMessage: (ctx) => ({
      title: 'Phiếu xuất kho mới',
      message: `Phiếu xuất kho ${ctx.metadata?.maPhieuXuat ?? ''}: ${ctx.metadata?.soLuongXuat ?? ''} ${ctx.metadata?.donViTinh ?? ''} ${ctx.metadata?.tenSanPham ?? ''}.`,
    }),
    resolveRecipients: async () => getAdminEmployeeIds(),
  },

  // ── Invoice ──
  {
    event: NotificationEvent.INVOICE_CREATED,
    notificationType: NotificationType.INVOICE,
    buildMessage: (ctx) => ({
      title: 'Hóa đơn mới',
      message: `Hóa đơn ${ctx.metadata?.soHoaDon ?? ''} — ${ctx.metadata?.khachHang ?? ''}: ${ctx.metadata?.thanhTien ?? 0} VNĐ.`,
    }),
    resolveRecipients: async () => getAdminEmployeeIds(),
  },

  // ── Debt ──
  {
    event: NotificationEvent.DEBT_CREATED,
    notificationType: NotificationType.DEBT,
    buildMessage: (ctx) => ({
      title: 'Công nợ mới',
      message: `Công nợ mới cho ${ctx.metadata?.tenNhaCungCap ?? ''}: ${ctx.metadata?.soTienPhaiTra ?? 0} VNĐ.`,
    }),
    resolveRecipients: async () => getAdminEmployeeIds(),
  },

  // ── Production Report ──
  {
    event: NotificationEvent.PRODUCTION_REPORT_CREATED,
    notificationType: NotificationType.PRODUCTION_REPORT,
    buildMessage: (ctx) => ({
      title: 'Báo cáo sản lượng mới',
      message: `Báo cáo sản lượng ngày ${ctx.metadata?.ngayThang ?? ''} đã được tạo.`,
    }),
    resolveRecipients: async () => getAdminEmployeeIds(),
  },

  // ── Machine Activity ──
  {
    event: NotificationEvent.MACHINE_ACTIVITY_REPORTED,
    notificationType: NotificationType.PRODUCTION_REPORT,
    buildMessage: (ctx) => ({
      title: 'Báo cáo hoạt động máy',
      message: `${ctx.metadata?.soLuongNgung ?? 0} máy ngưng hoạt động tại ${ctx.metadata?.viTri ?? ''} — ${ctx.metadata?.tenHeThong ?? ''}.`,
    }),
    resolveRecipients: async () => {
      const technical = await getEmployeeIdsByDeptCode('DEPT_TECHNICAL');
      const admins = await getAdminEmployeeIds();
      return [...new Set([...technical, ...admins])];
    },
  },

  // ── Project Approval ──
  {
    event: NotificationEvent.PROJECT_APPROVAL_SUBMITTED,
    notificationType: NotificationType.PROJECT_APPROVAL,
    buildMessage: (ctx) => ({
      title: 'Yêu cầu duyệt kế hoạch dự án',
      message: `Dự án "${ctx.metadata?.tenDuAn ?? ''}" đã được gửi duyệt`,
    }),
    resolveRecipients: async (ctx) => ctx.targetEmployeeIds?.length ? ctx.targetEmployeeIds : getAdminEmployeeIds(ctx.actorUserId),
  },
  {
    event: NotificationEvent.PROJECT_APPROVAL_APPROVED,
    notificationType: NotificationType.PROJECT_APPROVAL,
    buildMessage: (ctx) => ({
      title: 'Kế hoạch dự án đã được duyệt',
      message: `Dự án "${ctx.metadata?.tenDuAn ?? ''}" đã được phê duyệt và chuyển sang thực hiện`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },
  {
    event: NotificationEvent.PROJECT_APPROVAL_REJECTED,
    notificationType: NotificationType.PROJECT_APPROVAL,
    buildMessage: (ctx) => ({
      title: 'Kế hoạch dự án bị từ chối',
      message: `Dự án "${ctx.metadata?.tenDuAn ?? ''}" bị từ chối: ${ctx.metadata?.lyDoTuChoi ?? ''}`,
    }),
    resolveRecipients: resolveDirectRecipients,
  },

  // ── Fault Record Recurrence ──
  {
    event: NotificationEvent.FAULT_RECURRENCE_THRESHOLD,
    notificationType: NotificationType.FAULT_RECORD,
    buildMessage: (ctx) => ({
      title: 'Lỗi tái phát nhiều lần',
      message: `Lỗi "${ctx.metadata?.tenLoi ?? ''}" đã xảy ra ${ctx.metadata?.count ?? 0} lần trên thiết bị. Vui lòng kiểm tra.`,
    }),
    resolveRecipients: async (ctx) => {
      const technical = await getEmployeeIdsByDeptCode('DEPT_TECHNICAL');
      const admins = await getAdminEmployeeIds(ctx.actorUserId);
      return [...new Set([...technical, ...admins])];
    },
  },
];

/* ─── Build Registry Map ───────────────────────────────────────────────────── */

export const notificationRegistry = new Map<NotificationEvent, NotificationEventDef>(
  entries.map(entry => [entry.event, entry])
);
