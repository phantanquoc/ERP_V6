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
  const employees = await prisma.employee.findMany({
    where: { subDepartment: { code }, status: 'ACTIVE' },
    select: { id: true },
  });
  return employees.map(e => e.id);
}

async function getEmployeeIdsByDeptCode(code: string): Promise<string[]> {
  const employees = await prisma.employee.findMany({
    where: { subDepartment: { department: { code } }, status: 'ACTIVE' },
    select: { id: true },
  });
  return employees.map(e => e.id);
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
      message: `${ctx.metadata?.creatorName ?? ''} đã tạo kế hoạch tăng ca. Vui lòng xem xét và phê duyệt.`,
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
          ? 'Kế hoạch tăng ca của bạn đã được phê duyệt.'
          : 'Kế hoạch tăng ca của bạn đã bị từ chối.',
      };
    },
    resolveRecipients: resolveDirectRecipients,
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
];

/* ─── Build Registry Map ───────────────────────────────────────────────────── */

export const notificationRegistry = new Map<NotificationEvent, NotificationEventDef>(
  entries.map(entry => [entry.event, entry])
);
