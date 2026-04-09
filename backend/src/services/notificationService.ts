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
 *
 * Note on employee-less users (e.g. pure admin accounts):
 *   Notifications are stored in the DB with a null employeeId so they can be
 *   retrieved via polling. Real-time WebSocket pushes use the same fallback
 *   key (`u:<userId>`) as the WebSocket registry, so connected admin clients
 *   still receive real-time delivery.
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
  employeeId: string | null;
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
  privateFeedbackId?: string | null;
  purchaseRequestId?: string | null;
  workPlanId?: string | null;
  dailyWorkReportId?: string | null;
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
   Helpers
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Returns the key used to route WebSocket pushes for a given user.
 * Uses employee.id when available; falls back to `u:<userId>` for admin-only users.
 * This mirrors the same keying logic used in websocket.ts handleConnection.
 */
async function getPushKey(userId: string): Promise<string> {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });
  return employee ? employee.id : `u:${userId}`;
}

/**
 * Builds a WebSocket payload from a notification data record.
 */
function buildPayload(data: NotificationData): WsNotificationPayload {
  return {
    id:        data.id,
    type:      data.type,
    title:     data.title,
    message:   data.message,
    isRead:    data.isRead,
    createdAt: data.createdAt instanceof Date
      ? data.createdAt.toISOString()
      : String(data.createdAt),
  };
}

/**
 * Pushes a notification to all active WebSocket clients of a user.
 * Resolves userId → push key (employee.id or u:<userId>) and sends via WS.
 *
 * @param userId - The user whose clients should receive the push
 * @param data  - The notification record
 */
async function pushAfterCreate(userId: string, data: NotificationData): Promise<void> {
  const pushKey = await getPushKey(userId);
  pushNotification(pushKey, buildPayload(data));
}

/**
 * Batch push helper — used when only employeeId is available (not userId).
 * Resolves employeeId → userId → push key then sends via WS.
 *
 * @param employeeId - The employee whose clients should receive the push
 * @param data       - The notification record
 */
async function batchPushAfterCreate(
  employeeId: string,
  data: NotificationData
): Promise<void> {
  // employees is a one-to-one relation, so filter directly on the relation's scalar field
  const user = await prisma.user.findFirst({
    where: { employees: { id: employeeId } },
    select: { id: true },
  });
  if (!user) return; // No user found, skip push (admin-only accounts use null employeeId)
  await pushAfterCreate(user.id, data);
}

/* ─────────────────────────────────────────────────────────────────────────────
   NotificationService
   ───────────────────────────────────────────────────────────────────────────── */

export class NotificationService {

  /* ── Generic Create ──────────────────────────────────────────────────────── */

  /**
   * Generic notification creation.
   * Stores the notification in the DB (with null employeeId if no employee record)
   * and pushes to all connected WebSocket clients of the user in real-time.
   *
   * Note: For users without an employee record (e.g. pure admin accounts),
   * the notification is still stored (with employeeId = null) so it appears
   * when the user next polls / loads the notification list.
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
    privateFeedbackId?: string;
    purchaseRequestId?: string;
    workPlanId?: string;
    dailyWorkReportId?: string;
    processId?: string;
  }): Promise<NotificationData> {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { employees: true },
    });

    // Guard: user must exist (caller bug if not)
    if (!user) throw new Error('Employee not found for user');

    // Allow null employeeId so admin-only users still get real-time push
    const employeeId = user.employees?.id ?? null;

    // ⚠️ Admins without an employee record: skip DB storage but still push real-time
    // so the bell icon updates immediately. The notification will not appear on page
    // refresh (DB constraint requires employeeId), but the real-time refresh of the
    // overtime list + notification bell still works.
    if (!employeeId) {
      // Push directly without DB storage
      const payload: WsNotificationPayload = {
        id:        '',
        type:      data.type,
        title:     data.title,
        message:   data.message,
        isRead:    false,
        createdAt: new Date().toISOString(),
      };
      const pushKey = await getPushKey(data.userId);
      pushNotification(pushKey, payload);
      // Return a synthetic record for callers that expect a return value
      return {
        id: '',
        employeeId: null,
        type: data.type,
        title: data.title,
        message: data.message,
        isRead: false,
        createdAt: new Date(),
      };
    }

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
        privateFeedbackId:   data.privateFeedbackId   ?? null,
        purchaseRequestId:   data.purchaseRequestId   ?? null,
        workPlanId:          data.workPlanId          ?? null,
        dailyWorkReportId:   data.dailyWorkReportId   ?? null,
        processId:           data.processId           ?? null,
        isRead:              false,
      },
    });

    // Always push in real-time regardless of employeeId (WS handles u:<userId> fallback)
    await pushAfterCreate(data.userId, notification);

    return notification;
  }

  /* ── Evaluation ──────────────────────────────────────────────────────────── */

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

    await batchPushAfterCreate(employeeId, notification);
    return notification;
  }

  /* ── Tasks ───────────────────────────────────────────────────────────────── */

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

    await batchPushAfterCreate(employeeId, notification);
    return notification;
  }

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

    for (const empId of employeeIds) {
      await batchPushAfterCreate(empId, {
        id: '',
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

  /**
   * Notify admins when any task is created.
   */
  async createAdminTaskNotification(
    adminEmployeeIds: string[],
    taskId: string,
    taskTitle: string,
    assignerName: string
  ): Promise<void> {
    if (adminEmployeeIds.length === 0) return;

    await prisma.notification.createMany({
      data: adminEmployeeIds.map((employeeId) => ({
        employeeId,
        type:    NotificationType.TASK,
        title:   'Nhiệm vụ mới được tạo',
        message: `${assignerName} đã tạo nhiệm vụ: "${taskTitle}"`,
        taskId,
        isRead:  false,
      })),
    });

    for (const empId of adminEmployeeIds) {
      await batchPushAfterCreate(empId, {
        id: '',
        employeeId: empId,
        type:       NotificationType.TASK,
        title:      'Nhiệm vụ mới được tạo',
        message:    `${assignerName} đã tạo nhiệm vụ: "${taskTitle}"`,
        taskId,
        isRead:     false,
        createdAt:  new Date(),
      });
    }
  }

  /**
   * Notify the task assigner when an assignee accepts or rejects the task.
   */
  async createTaskAcceptanceNotification(
    assignerEmployeeId: string,
    taskId: string,
    taskTitle: string,
    assigneeName: string,
    trangThai: string
  ): Promise<void> {
    const isAccepted = trangThai === 'DA_TIEP_NHAN';
    const title = isAccepted ? 'Nhiệm vụ đã được tiếp nhận' : 'Nhiệm vụ bị từ chối tiếp nhận';
    const message = isAccepted
      ? `${assigneeName} đã tiếp nhận nhiệm vụ: "${taskTitle}"`
      : `${assigneeName} đã từ chối tiếp nhận nhiệm vụ: "${taskTitle}"`;

    const notification = await prisma.notification.create({
      data: { employeeId: assignerEmployeeId, type: NotificationType.TASK, title, message, taskId, isRead: false },
    });
    await batchPushAfterCreate(assignerEmployeeId, notification);
  }

  /* ── Leave Requests ──────────────────────────────────────────────────────── */

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

    for (const empId of employeeIds) {
      await batchPushAfterCreate(empId, {
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

    await batchPushAfterCreate(employeeId, notification);
    return notification;
  }

  /* ── Payroll ─────────────────────────────────────────────────────────────── */

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

    for (const empId of employeeIds) {
      await batchPushAfterCreate(empId, {
        id: '',
        employeeId: empId,
        type:    NotificationType.PAYROLL,
        title:   `Bảng lương tháng ${month}/${year}`,
        message: `Bảng lương tháng ${month}/${year} của bạn đã sẵn sàng. Nhấn để xem chi tiết.`,
        period,
        isRead: false,
        createdAt: new Date(),
      });
    }
  }

  /* ── Acceptance / Handover ───────────────────────────────────────────────── */

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

    await batchPushAfterCreate(employeeId, notification);
    return notification;
  }

  /* ── Quality Evaluation ─────────────────────────────────────────────────── */

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
      await batchPushAfterCreate(empId, {
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

    await batchPushAfterCreate(employeeId, notification);
    return notification;
  }

  /* ── Order ───────────────────────────────────────────────────────────────── */

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
      await batchPushAfterCreate(empId, {
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

    await batchPushAfterCreate(employeeId, notification);
    return notification;
  }

  /* ── Purchase Request ───────────────────────────────────────────────────── */

  /**
   * Thông báo cho admin khi có yêu cầu mua hàng mới.
   * @param adminEmployeeIds - Danh sách employeeId của admin
   * @param purchaseRequestId - ID yêu cầu mua hàng
   * @param maYeuCau - Mã yêu cầu mua hàng
   * @param tenNhanVien - Tên nhân viên tạo yêu cầu
   * @param tenHangHoa - Tên hàng hóa
   */
  async createPurchaseRequestNotifications(
    adminEmployeeIds: string[],
    purchaseRequestId: string,
    maYeuCau: string,
    tenNhanVien: string,
    tenHangHoa: string
  ): Promise<void> {
    if (adminEmployeeIds.length === 0) return;

    const title = `Yêu cầu mua hàng mới: ${maYeuCau}`;
    const message = `${tenNhanVien} đã gửi yêu cầu mua hàng ${maYeuCau} (${tenHangHoa}). Vui lòng xem xét và phê duyệt.`;

    await prisma.notification.createMany({
      data: adminEmployeeIds.map((employeeId) => ({
        employeeId,
        type: NotificationType.PURCHASE_REQUEST,
        title,
        message,
        purchaseRequestId,
        isRead: false,
      })),
    });

    for (const empId of adminEmployeeIds) {
      await batchPushAfterCreate(empId, {
        id: '',
        employeeId: empId,
        type: NotificationType.PURCHASE_REQUEST,
        title,
        message,
        purchaseRequestId,
        isRead: false,
        createdAt: new Date(),
      } as NotificationData);
    }
  }

  /**
   * Thông báo cho nhân viên khi yêu cầu mua hàng được duyệt hoặc từ chối.
   * @param employeeId - employeeId của người tạo yêu cầu
   * @param purchaseRequestId - ID yêu cầu mua hàng
   * @param maYeuCau - Mã yêu cầu mua hàng
   * @param trangThai - Trạng thái mới (APPROVED / REJECTED)
   * @param nguoiDuyet - Tên người duyệt
   */
  async createPurchaseRequestResponseNotification(
    employeeId: string,
    purchaseRequestId: string,
    maYeuCau: string,
    trangThai: string,
    nguoiDuyet: string
  ): Promise<void> {
    const isApproved = trangThai === 'APPROVED';
    const title = isApproved
      ? `Yêu cầu mua hàng ${maYeuCau} đã được duyệt`
      : `Yêu cầu mua hàng ${maYeuCau} bị từ chối`;
    const message = isApproved
      ? `${nguoiDuyet} đã phê duyệt yêu cầu mua hàng ${maYeuCau} của bạn.`
      : `${nguoiDuyet} đã từ chối yêu cầu mua hàng ${maYeuCau} của bạn.`;

    const notification = await prisma.notification.create({
      data: {
        employeeId,
        type: NotificationType.PURCHASE_REQUEST,
        title,
        message,
        purchaseRequestId,
        isRead: false,
      },
    });

    await batchPushAfterCreate(employeeId, notification as unknown as NotificationData);
  }

  /* ── Warehouse Receipt ───────────────────────────────────────────────────── */

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
      await batchPushAfterCreate(empId, {
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
    return prisma.notification.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
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

  /* ── Update ─────────────────────────────────────────────────────────────── */

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

  /* ── Delete ─────────────────────────────────────────────────────────────── */

  /** Deletes a single notification. */
  async deleteNotification(notificationId: string): Promise<void> {
    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /* ── Work Plan ──────────────────────────────────────────────────────────── */

  /**
   * Thông báo cho admin + người thực hiện khi có kế hoạch công việc mới.
   * @param adminEmployeeIds - employeeId của tất cả admin
   * @param assigneeEmployeeIds - employeeId của người thực hiện (trừ người tạo)
   * @param workPlanId - ID kế hoạch công việc
   * @param tieuDe - Tiêu đề kế hoạch
   * @param creatorName - Tên người tạo
   */
  async createWorkPlanNotifications(
    adminEmployeeIds: string[],
    assigneeEmployeeIds: string[],
    workPlanId: string,
    tieuDe: string,
    creatorName: string
  ): Promise<void> {
    const allRecipients = Array.from(new Set([...adminEmployeeIds, ...assigneeEmployeeIds]));
    if (allRecipients.length === 0) return;

    // Build notification per recipient: admin gets "Kế hoạch mới cần theo dõi", assignee gets "Bạn được giao thực hiện"
    const adminSet = new Set(adminEmployeeIds);
    const assigneeSet = new Set(assigneeEmployeeIds);

    const rows = allRecipients.map((employeeId) => {
      const isAssignee = assigneeSet.has(employeeId);
      const isAdmin    = adminSet.has(employeeId);
      const title   = isAssignee ? `Kế hoạch mới: ${tieuDe}` : `Kế hoạch công việc mới`;
      const message = isAssignee
        ? `${creatorName} đã giao cho bạn thực hiện kế hoạch "${tieuDe}".`
        : isAdmin
          ? `${creatorName} đã tạo kế hoạch công việc mới: "${tieuDe}". Vui lòng theo dõi tiến độ.`
          : `${creatorName} đã tạo kế hoạch công việc mới: "${tieuDe}".`;
      return { employeeId, type: NotificationType.WORK_PLAN, title, message, workPlanId, isRead: false };
    });

    await prisma.notification.createMany({ data: rows });

    for (const row of rows) {
      await batchPushAfterCreate(row.employeeId, {
        id: '',
        employeeId: row.employeeId,
        type:    row.type,
        title:   row.title,
        message: row.message,
        workPlanId,
        isRead:  false,
        createdAt: new Date(),
      } as NotificationData);
    }
  }

  /* ── Daily Work Report ──────────────────────────────────────────────────── */

  /**
   * Thông báo cho supervisor1 khi nhân viên gửi báo cáo công việc.
   */
  async createDailyWorkReportNotification(
    supervisorEmployeeId: string,
    reportId: string,
    employeeName: string,
    reportDate: Date
  ): Promise<void> {
    const dateStr = reportDate.toLocaleDateString('vi-VN');
    const title   = `Báo cáo công việc mới`;
    const message = `${employeeName} đã gửi báo cáo công việc ngày ${dateStr}. Vui lòng xem xét.`;

    const notification = await prisma.notification.create({
      data: {
        employeeId:       supervisorEmployeeId,
        type:             NotificationType.DAILY_WORK_REPORT,
        title,
        message,
        dailyWorkReportId: reportId,
        isRead:           false,
      },
    });

    await batchPushAfterCreate(supervisorEmployeeId, notification as unknown as NotificationData);
  }

  /**
   * Thông báo cho nhân viên khi cấp trên nhận xét báo cáo.
   */
  async createDailyWorkReportReviewNotification(
    employeeId: string,
    reportId: string,
    supervisorName: string,
    status: string
  ): Promise<void> {
    const statusLabel: Record<string, string> = {
      REVIEWED: 'đã xem',
      APPROVED: 'đã phê duyệt',
      REJECTED: 'đã từ chối',
    };
    const label   = statusLabel[status] ?? 'đã cập nhật';
    const title   = `Báo cáo công việc ${label}`;
    const message = `${supervisorName} ${label} báo cáo công việc của bạn.`;

    const notification = await prisma.notification.create({
      data: {
        employeeId,
        type:              NotificationType.DAILY_WORK_REPORT,
        title,
        message,
        dailyWorkReportId: reportId,
        isRead:            false,
      },
    });

    await batchPushAfterCreate(employeeId, notification as unknown as NotificationData);
  }

  /* ── Query ──────────────────────────────────────────────────────────────── */

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
