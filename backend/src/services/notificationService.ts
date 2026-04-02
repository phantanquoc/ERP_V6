/**
 * Notification Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles creation, retrieval, and management of user notifications.
 *
 * Notification types:
 *   EVALUATION, EVALUATION_SUPERVISOR1, EVALUATION_SUPERVISOR2,
 *   TASK, LEAVE_REQUEST, LEAVE_REQUEST_RESPONSE,
 *   PAYROLL, ACCEPTANCE_HANDOVER,
 *   OVERTIME_PLAN, OVERTIME_PLAN_APPROVAL,
 *   ORDER, QUALITY_EVALUATION,
 *   SUPPLY_REQUEST, WAREHOUSE_RECEIPT,
 *   ATTENDANCE_REMINDER
 *
 * After saving a notification to the DB, all public methods automatically
 * push it to connected clients via WebSocket (real-time delivery).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import prisma from '@config/database';
import { NotificationType } from '@types';
import { pushNotification } from '@services/websocket';

/* ─────────────────────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────────────────────── */

/** Subset of Prisma Notification fields sent over WebSocket */
export interface NotificationData {
  id: string;
  employeeId: string;
  type: string;
  title: string;
  message: string;
  period?: string | null;
  evaluationId?: string | null;
  taskId?: string | null;
  acceptanceHandoverId?: string | null;
  leaveRequestId?: string | null;
  payrollId?: string | null;
  orderId?: string | null;
  supplyRequestId?: string | null;
  warehouseReceiptId?: string | null;
  overtimePlanId?: string | null;
  meetingId?: string | null;
  supplyAdjustmentId?: string | null;
  isRead: boolean;
  createdAt: Date;
}

/** WebSocket push message — matches the WsNotificationPayload expected by pushNotification */
export interface WsNotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: Push notification to connected clients
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Pushes a saved notification to all active WebSocket clients of the employee.
 * This runs AFTER the DB write — the notification is already persisted
 * and will appear on next page refresh if the user is offline.
 *
 * @param employeeId - Employee who should receive the push
 * @param data       - The notification record (DB fields)
 */
function pushAfterCreate(
  employeeId: string,
  data: NotificationData
): void {
  const payload: WsNotificationPayload = {
    id:        data.id,
    type:      data.type,
    title:     data.title,
    message:   data.message,
    isRead:    data.isRead,
    createdAt: data.createdAt instanceof Date
      ? data.createdAt.toISOString()
      : String(data.createdAt),
  };

  pushNotification(employeeId, payload);
}

/* ─────────────────────────────────────────────────────────────────────────────
   NotificationService
   ───────────────────────────────────────────────────────────────────────────── */

export class NotificationService {

  /* ── Create ─────────────────────────────────────────────────────────────── */

  /**
   * Generic notification creation.
   * Automatically pushes to WebSocket after DB insert.
   *
   * @throws Error if no employee found for userId
   */
  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    evaluationId?: string;
    period?: string;
    taskId?: string;
    leaveRequestId?: string;
    acceptanceHandoverId?: string;
    payrollId?: string;
    orderId?: string;
    supplyRequestId?: string;
    warehouseReceiptId?: string;
    overtimePlanId?: string;
    meetingId?: string;
    supplyAdjustmentId?: string;
  }): Promise<NotificationData> {
    // Resolve userId → employeeId
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { employees: true },
    });

    if (!user?.employees) {
      throw new Error('Employee not found for user');
    }

    const employeeId = user.employees.id;

    const notification = await prisma.notification.create({
      data: {
        employeeId,
        type:                data.type,
        title:               data.title,
        message:             data.message,
        evaluationId:        data.evaluationId        ?? null,
        period:              data.period              ?? null,
        taskId:              data.taskId              ?? null,
        leaveRequestId:      data.leaveRequestId      ?? null,
        acceptanceHandoverId: data.acceptanceHandoverId ?? null,
        payrollId:           data.payrollId           ?? null,
        orderId:             data.orderId             ?? null,
        supplyRequestId:     data.supplyRequestId     ?? null,
        warehouseReceiptId:  data.warehouseReceiptId  ?? null,
        overtimePlanId:      data.overtimePlanId      ?? null,
        meetingId:           data.meetingId           ?? null,
        supplyAdjustmentId:  data.supplyAdjustmentId  ?? null,
        isRead:              false,
      },
    });

    pushAfterCreate(employeeId, notification);

    return notification;
  }

  /* ── Evaluation ──────────────────────────────────────────────────────────── */

  /**
   * Creates an evaluation notification for an employee and pushes via WebSocket.
   *
   * @param employeeId  - Target employee
   * @param month        - Evaluation month (1–12)
   * @param year         - Evaluation year
   * @param evaluationId - Related evaluation record ID
   */
  async createEvaluationNotification(
    employeeId: string,
    month: number,
    year: number,
    evaluationId: string
  ): Promise<NotificationData> {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const monthName = new Date(year, month - 1).toLocaleDateString('vi-VN', {
      month: 'long',
      year: 'numeric',
    });

    const notification = await prisma.notification.create({
      data: {
        employeeId,
        type:       NotificationType.EVALUATION,
        title:      `Đánh giá tháng ${monthName}`,
        message:    'Bạn có 1 đánh giá mới',
        period,
        evaluationId,
        isRead:     false,
      },
    });

    pushAfterCreate(employeeId, notification);

    return notification;
  }

  /* ── Tasks ───────────────────────────────────────────────────────────────── */

  /**
   * Creates a single task assignment notification and pushes via WebSocket.
   */
  async createTaskNotification(
    employeeId: string,
    taskId: string,
    taskTitle: string,
    assignerName: string
  ): Promise<NotificationData> {
    const notification = await prisma.notification.create({
      data: {
        employeeId,
        type:     NotificationType.TASK,
        title:    'Nhiệm vụ mới',
        message:  `${assignerName} đã giao cho bạn nhiệm vụ: "${taskTitle}"`,
        taskId,
        isRead:   false,
      },
    });

    pushAfterCreate(employeeId, notification);

    return notification;
  }

  /**
   * Creates task notifications for multiple employees (batch) and pushes all via WebSocket.
   */
  async createTaskNotifications(
    employeeIds: string[],
    taskId: string,
    taskTitle: string,
    assignerName: string
  ): Promise<void> {
    if (employeeIds.length === 0) return;

    await prisma.notification.createMany({
      data: employeeIds.map((employeeId) => ({
        employeeId,
        type:    NotificationType.TASK,
        title:   'Nhiệm vụ mới',
        message: `${assignerName} đã giao cho bạn nhiệm vụ: "${taskTitle}"`,
        taskId,
        isRead:  false,
      })),
    });

    // Push each notification to the corresponding employee (one per employeeId)
    for (const empId of employeeIds) {
      pushAfterCreate(empId, {
        id: '',           // Not needed for push — frontend refetches full data from API
        employeeId: empId,
        type:       NotificationType.TASK,
        title:      'Nhiệm vụ mới',
        message:    `${assignerName} đã giao cho bạn nhiệm vụ: "${taskTitle}"`,
        taskId,
        isRead:     false,
        createdAt:  new Date(),
      });
    }
  }

  /* ── Leave Requests ──────────────────────────────────────────────────────── */

  /**
   * Notifies approvers about a new leave request and pushes via WebSocket.
   */
  async createLeaveRequestNotification(
    employeeIds: string[],
    employeeName: string,
    leaveTypeLabel: string,
    leaveRequestId?: string
  ): Promise<void> {
    if (employeeIds.length === 0) return;

    await prisma.notification.createMany({
      data: employeeIds.map((employeeId) => ({
        employeeId,
        type:           NotificationType.LEAVE_REQUEST,
        title:          'Đơn nghỉ phép mới',
        message:         `${employeeName} đã gửi đơn nghỉ phép ${leaveTypeLabel}`,
        leaveRequestId:  leaveRequestId ?? null,
        isRead:          false,
      })),
    });

    // Push notification to each approver
    for (const empId of employeeIds) {
      pushAfterCreate(empId, {
        id: '',
        employeeId: empId,
        type:       NotificationType.LEAVE_REQUEST,
        title:      'Đơn nghỉ phép mới',
        message:    `${employeeName} đã gửi đơn nghỉ phép ${leaveTypeLabel}`,
        leaveRequestId: leaveRequestId ?? null,
        isRead:     false,
        createdAt:  new Date(),
      });
    }
  }

  /**
   * Notifies the employee about the result of their leave request (approved/rejected).
   */
  async createLeaveRequestResponseNotification(
    employeeId: string,
    leaveCode: string,
    status: 'APPROVED' | 'REJECTED'
  ): Promise<NotificationData> {
    const notification = await prisma.notification.create({
      data: {
        employeeId,
        type:    NotificationType.LEAVE_REQUEST_RESPONSE,
        title:   status === 'APPROVED'
          ? 'Đơn nghỉ phép được duyệt'
          : 'Đơn nghỉ phép bị từ từ chối',
        message: status === 'APPROVED'
          ? `Đơn nghỉ phép ${leaveCode} của bạn đã được phê duyệt`
          : `Đơn nghỉ phép ${leaveCode} của bạn đã bị từ chối`,
        isRead: false,
      },
    });

    pushAfterCreate(employeeId, notification);

    return notification;
  }

  /* ── Payroll ─────────────────────────────────────────────────────────────── */

  /**
   * Batch-creates payroll notifications for all target employees and pushes via WebSocket.
   */
  async createPayrollNotifications(
    employeeIds: string[],
    month: number,
    year: number,
    period: string
  ): Promise<void> {
    if (employeeIds.length === 0) return;

    await prisma.notification.createMany({
      data: employeeIds.map((employeeId) => ({
        employeeId,
        type:    NotificationType.PAYROLL,
        title:   `Bảng lương tháng ${month}/${year}`,
        message: `Bảng lương tháng ${month}/${year} của bạn đã sẵn sàng. Nhấn để xem chi tiết.`,
        period,
        isRead:  false,
      })),
    });

    // Push to each employee (WebSocket push doesn't need the DB-generated IDs)
    for (const empId of employeeIds) {
      pushAfterCreate(empId, {
        id: '',
        employeeId: empId,
        type:    NotificationType.PAYROLL,
        title:   `Bảng lương tháng ${month}/${year}`,
        message: `Bảng lương tháng ${month}/${year} của bạn đã sẵn sàng. Nhấn để xem chi tiết.`,
        period,
        isRead:  false,
        createdAt: new Date(),
      });
    }
  }

  /* ── Acceptance / Handover ───────────────────────────────────────────────── */

  /**
   * Notifies a QC employee about a new acceptance handover record.
   */
  async createAcceptanceHandoverNotification(
    employeeId: string,
    maNghiemThu: string,
    tenThietBi: string,
    nguoiBanGiao: string,
    acceptanceHandoverId: string
  ): Promise<NotificationData> {
    const notification = await prisma.notification.create({
      data: {
        employeeId,
        type:                  NotificationType.ACCEPTANCE_HANDOVER,
        title:                 'Nghiệm thu bàn giao mới',
        message:               `${nguoiBanGiao} đã tạo nghiệm thu bàn giao ${maNghiemThu} cho thiết bị "${tenThietBi}". Vui lòng kiểm tra và xác nhận.`,
        acceptanceHandoverId,
        isRead:                false,
      },
    });

    pushAfterCreate(employeeId, notification);

    return notification;
  }

  /* ── Quality Evaluation ─────────────────────────────────────────────────── */

  /**
   * Batch-creates quality evaluation notifications for QC personnel and pushes via WebSocket.
   */
  async createQualityEvaluationNotifications(
    employeeIds: string[],
    evaluationId: string,
    maChien: string,
    tenHangHoa: string,
    assignedBy: string
  ): Promise<void> {
    if (employeeIds.length === 0) return;

    await prisma.notification.createMany({
      data: employeeIds.map((employeeId) => ({
        employeeId,
        type:          NotificationType.QUALITY_EVALUATION,
        title:         'Đánh giá chất lượng mới',
        message:       `${assignedBy} đã tạo đánh giá chất lượng cho mẻ chiên "${maChien}" (${tenHangHoa}). Vui lòng kiểm tra.`,
        evaluationId,
        isRead:        false,
      })),
    });

    for (const empId of employeeIds) {
      pushAfterCreate(empId, {
        id: '',
        employeeId: empId,
        type:    NotificationType.QUALITY_EVALUATION,
        title:   'Đánh giá chất lượng mới',
        message: `${assignedBy} đã tạo đánh giá chất lượng cho mẻ chiên "${maChien}" (${tenHangHoa}). Vui lòng kiểm tra.`,
        evaluationId,
        isRead: false,
        createdAt: new Date(),
      });
    }
  }

  /**
   * Notifies a single QC employee about a quality evaluation assignment (legacy single-target version).
   */
  async createQualityEvaluationNotification(
    employeeId: string,
    evaluationId: string,
    maChien: string,
    tenHangHoa: string,
    assignedBy: string
  ): Promise<NotificationData> {
    const notification = await prisma.notification.create({
      data: {
        employeeId,
        type:          NotificationType.QUALITY_EVALUATION,
        title:         'Đánh giá chất lượng mới',
        message:       `${assignedBy} đã giao đánh giá chất lượng cho mẻ chiên "${maChien}" (${tenHangHoa}). Vui lòng kiểm tra.`,
        evaluationId,
        isRead:        false,
      },
    });

    pushAfterCreate(employeeId, notification);

    return notification;
  }

  /* ── Order ───────────────────────────────────────────────────────────────── */

  /**
   * Batch-creates order status change notifications and pushes via WebSocket.
   */
  async createOrderNotifications(
    employeeIds: string[],
    orderId: string,
    maDonHang: string,
    status: string,
    updatedBy: string
  ): Promise<void> {
    if (employeeIds.length === 0) return;

    await prisma.notification.createMany({
      data: employeeIds.map((employeeId) => ({
        employeeId,
        type:     NotificationType.ORDER,
        title:    `Đơn hàng ${maDonHang} cập nhật`,
        message:  `${updatedBy} đã cập nhật trạng thái đơn hàng ${maDonHang} thành: ${status}`,
        orderId,
        isRead:   false,
      })),
    });

    for (const empId of employeeIds) {
      pushAfterCreate(empId, {
        id: '',
        employeeId: empId,
        type:    NotificationType.ORDER,
        title:   `Đơn hàng ${maDonHang} cập nhật`,
        message: `${updatedBy} đã cập nhật trạng thái đơn hàng ${maDonHang} thành: ${status}`,
        orderId,
        isRead: false,
        createdAt: new Date(),
      });
    }
  }

  /* ── Supply Request ─────────────────────────────────────────────────────── */

  /**
   * Notifies the requester when their supply request status changes.
   */
  async createSupplyRequestNotification(
    employeeId: string,
    supplyRequestId: string,
    maYeuCau: string,
    newStatus: string,
    updatedByName: string
  ): Promise<NotificationData> {
    const notification = await prisma.notification.create({
      data: {
        employeeId,
        type:              NotificationType.SUPPLY_REQUEST,
        title:             `Yêu cầu cung cấp ${maYeuCau} cập nhật`,
        message:           `${updatedByName} đã cập nhật trạng thái yêu cầu cung cấp ${maYeuCau} thành: ${newStatus}`,
        supplyRequestId,
        isRead:            false,
      },
    });

    pushAfterCreate(employeeId, notification);

    return notification;
  }

  /* ── Warehouse Receipt ───────────────────────────────────────────────────── */

  /**
   * Notifies warehouse staff about a new warehouse receipt.
   */
  async createWarehouseReceiptNotification(
    employeeIds: string[],
    warehouseReceiptId: string,
    maPhieuNhap: string,
    createdByName: string,
    supplierName?: string
  ): Promise<void> {
    if (employeeIds.length === 0) return;

    await prisma.notification.createMany({
      data: employeeIds.map((employeeId) => ({
        employeeId,
        type:                NotificationType.WAREHOUSE_RECEIPT,
        title:               'Phiếu nhập kho mới',
        message:             `${createdByName} đã tạo phiếu nhập kho ${maPhieuNhap}${supplierName ? ` từ nhà cung cấp ${supplierName}` : ''}. Vui lòng kiểm tra và xác nhận.`,
        warehouseReceiptId,
        isRead:              false,
      })),
    });

    for (const empId of employeeIds) {
      pushAfterCreate(empId, {
        id: '',
        employeeId: empId,
        type:    NotificationType.WAREHOUSE_RECEIPT,
        title:   'Phiếu nhập kho mới',
        message: `${createdByName} đã tạo phiếu nhập kho ${maPhieuNhap}${supplierName ? ` từ nhà cung cấp ${supplierName}` : ''}. Vui lòng kiểm tra và xác nhận.`,
        warehouseReceiptId,
        isRead: false,
        createdAt: new Date(),
      });
    }
  }

  /* ── Read ────────────────────────────────────────────────────────────────── */

  /**
   * Returns paginated notifications for an employee.
   *
   * @param employeeId - Employee ID (resolved from userId in controller)
   * @param limit      - Max number of notifications to return (default: 10)
   */
  async getEmployeeNotifications(
    employeeId: string,
    limit = 10
  ): Promise<NotificationData[]> {
    const notifications = await prisma.notification.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return notifications;
  }

  /**
   * Returns all unread notifications for an employee.
   */
  async getUnreadNotifications(employeeId: string): Promise<NotificationData[]> {
    return prisma.notification.findMany({
      where: { employeeId, isRead: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  /* ── Update ──────────────────────────────────────────────────────────────── */

  /** Marks a single notification as read. */
  async markAsRead(notificationId: string): Promise<NotificationData> {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /** Marks all notifications as read for an employee. */
  async markAllAsRead(employeeId: string): Promise<{ count: number }> {
    const result = await prisma.notification.updateMany({
      where: { employeeId, isRead: false },
      data: { isRead: true },
    });
    return { count: result.count };
  }

  /* ── Delete ──────────────────────────────────────────────────────────────── */

  /** Deletes a single notification. */
  async deleteNotification(notificationId: string): Promise<void> {
    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /* ── Query ───────────────────────────────────────────────────────────────── */

  /** Returns the most recent evaluation notification for an employee. */
  async getLatestEvaluationNotification(
    employeeId: string
  ): Promise<NotificationData | null> {
    return prisma.notification.findFirst({
      where: { employeeId, type: NotificationType.EVALUATION },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export default new NotificationService();
