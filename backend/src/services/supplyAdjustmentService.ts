/**
 * SupplyAdjustmentService
 * Business logic for Điều chỉnh vật tư (Supply Adjustment) workflow.
 *
 * Responsibilities:
 *   • create()    — employee submits adjustment request; notifies approvers
 *   • getAll()    — role-based list (ADMIN/head: all; EMPLOYEE: own only)
 *   • getById()   — full detail with employee.user join
 *   • approve()   — set DA_DUYET; notify requester
 *   • reject()    — set TU_CHOI with reason; notify requester
 *
 * ⚠️ Side effects: creates Notification records, broadcasts SUPPLY_ADJUSTMENT_CHANGED
 */
import prisma from '@config/database';
import logger from '@config/logger';
import { broadcast } from '@services/websocket';
import notificationService from '@services/notificationService';
import { NotificationType, UserRole } from '@types';
import { ValidationError, NotFoundError, AuthorizationError } from '@utils/errors';
import { getPaginationParams } from '@utils/helpers';

export interface CreateSupplyAdjustmentInput {
  loaiVatTu: string;
  tenVatTu: string;
  soLuongHienTai: number;
  soLuongDieuChinh: number;
  donViTinh: string;
  lyDo: string;
  ngayDieuChinh: string | Date;
  ghiChuQC?: string;
}

export interface SupplyAdjustmentQuery {
  page?: number | string;
  limit?: number | string;
  trangThai?: string;
  search?: string;
}

const APPROVER_ROLES = [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD];

export class SupplyAdjustmentService {
  /**
   * Check if a role is allowed to approve/reject supply adjustments.
   */
  private canApprove(userRole: string): boolean {
    return (APPROVER_ROLES as string[]).includes(userRole);
  }

  /**
   * Generate a unique adjustment code.
   * Format: DCVT-YYYYMMDD-XXXX (4 random uppercase alphanumeric chars)
   */
  private generateCode(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const suffix = Array.from({ length: 4 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
    return `DCVT-${yyyy}${MM}${dd}-${suffix}`;
  }

  /**
   * Create a new supply adjustment request.
   *
   * ⚠️ Side effects:
   *   - Creates Notification records for all active approvers (excluding creator).
   *   - Broadcasts SUPPLY_ADJUSTMENT_CHANGED via WebSocket.
   *
   * @param input   - Adjustment data from the request body
   * @param userId  - ID of the authenticated user submitting the request
   * @returns       Created SupplyAdjustment record
   * @throws ValidationError  when soLuongDieuChinh <= 0
   * @throws NotFoundError    when no employee record is linked to userId
   */
  async create(input: CreateSupplyAdjustmentInput, userId: string): Promise<any> {
    if (input.soLuongDieuChinh <= 0) {
      throw new ValidationError('Số lượng điều chỉnh phải lớn hơn 0');
    }

    const employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee) {
      throw new NotFoundError('Không tìm thấy thông tin nhân viên cho tài khoản này');
    }

    const maDieuChinh = this.generateCode();

    const adjustment = await (prisma as any).supplyAdjustment.create({
      data: {
        maDieuChinh,
        employeeId: employee.id,
        loaiVatTu: input.loaiVatTu,
        tenVatTu: input.tenVatTu,
        soLuongHienTai: input.soLuongHienTai,
        soLuongDieuChinh: input.soLuongDieuChinh,
        donViTinh: input.donViTinh,
        lyDo: input.lyDo,
        ngayDieuChinh: new Date(input.ngayDieuChinh),
        ghiChuQC: input.ghiChuQC,
      },
      include: {
        employee: { include: { user: true } },
      },
    });

    // Notify all active approvers (excluding creator)
    try {
      const approvers = await prisma.user.findMany({
        where: {
          role: { in: [...APPROVER_ROLES] },
          isActive: true,
          NOT: { id: userId },
        },
      });

      await Promise.all(
        approvers.map((approver) =>
          notificationService.createNotification({
            userId: approver.id,
            type: NotificationType.SUPPLY_ADJUSTMENT_CREATED,
            title: 'Yêu cầu điều chỉnh vật tư mới',
            message: `Nhân viên đã gửi yêu cầu điều chỉnh vật tư "${input.tenVatTu}" (${maDieuChinh})`,
            supplyAdjustmentId: adjustment.id,
          })
        )
      );
    } catch (err) {
      logger.error('Failed to send supply adjustment creation notifications:', err);
    }

    broadcast({ type: 'SUPPLY_ADJUSTMENT_CHANGED' });

    return adjustment;
  }

  /**
   * Get paginated list of supply adjustments.
   * ADMIN / DEPARTMENT_HEAD / TEAM_LEAD see all records.
   * EMPLOYEE sees only their own records.
   *
   * @param query    - Pagination & filter params
   * @param userId   - Authenticated user ID
   * @param userRole - Authenticated user role
   */
  async getAll(
    query: SupplyAdjustmentQuery,
    userId: string,
    userRole: string
  ): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const { page, limit, skip } = getPaginationParams(query.page, query.limit);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (query.trangThai) {
      where.trangThai = query.trangThai;
    }

    if (query.search) {
      where.OR = [
        { maDieuChinh: { contains: query.search, mode: 'insensitive' } },
        { tenVatTu: { contains: query.search, mode: 'insensitive' } },
        { loaiVatTu: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // EMPLOYEE role: restrict to own records only
    if (!this.canApprove(userRole)) {
      const employee = await prisma.employee.findUnique({ where: { userId } });
      if (employee) {
        where.employeeId = employee.id;
      } else {
        // No employee record → return empty result
        return { data: [], total: 0, page, totalPages: 0 };
      }
    }

    const [data, total] = await Promise.all([
      (prisma as any).supplyAdjustment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { employee: { include: { user: true } } },
      }),
      (prisma as any).supplyAdjustment.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single supply adjustment by ID.
   * EMPLOYEE role may only access their own records.
   *
   * @param id       - SupplyAdjustment record ID
   * @param userId   - Authenticated user ID
   * @param userRole - Authenticated user role
   * @throws NotFoundError     when record does not exist
   * @throws AuthorizationError when EMPLOYEE tries to access another's record
   */
  async getById(id: string, userId: string, userRole: string): Promise<any> {
    const adjustment = await (prisma as any).supplyAdjustment.findUnique({
      where: { id },
      include: { employee: { include: { user: true } } },
    });

    if (!adjustment) {
      throw new NotFoundError('Không tìm thấy yêu cầu điều chỉnh vật tư');
    }

    if (!this.canApprove(userRole)) {
      const employee = await prisma.employee.findUnique({ where: { userId } });
      if (!employee || adjustment.employeeId !== employee.id) {
        throw new AuthorizationError('Bạn không có quyền xem yêu cầu điều chỉnh này');
      }
    }

    return adjustment;
  }

  /**
   * Approve a supply adjustment request.
   *
   * ⚠️ Side effects:
   *   - Sets trangThai = DA_DUYET, nguoiDuyetId, ngayDuyet.
   *   - Creates Notification for the requester.
   *   - Broadcasts SUPPLY_ADJUSTMENT_CHANGED via WebSocket.
   *
   * @param id       - SupplyAdjustment record ID
   * @param userId   - Authenticated user ID (approver)
   * @param userRole - Authenticated user role
   * @throws AuthorizationError when caller lacks approval rights
   * @throws NotFoundError      when record does not exist
   */
  async approve(id: string, userId: string, userRole: string): Promise<any> {
    if (!this.canApprove(userRole)) {
      throw new AuthorizationError('Bạn không có quyền duyệt yêu cầu điều chỉnh vật tư');
    }

    const existing = await (prisma as any).supplyAdjustment.findUnique({
      where: { id },
      include: { employee: { include: { user: true } } },
    });

    if (!existing) {
      throw new NotFoundError('Không tìm thấy yêu cầu điều chỉnh vật tư');
    }

    const adjustment = await (prisma as any).supplyAdjustment.update({
      where: { id },
      data: {
        trangThai: 'DA_DUYET',
        nguoiDuyetId: userId,
        ngayDuyet: new Date(),
      },
      include: { employee: { include: { user: true } } },
    });

    // Notify the requester
    const requesterUserId = existing.employee?.user?.id;
    if (requesterUserId) {
      try {
        await notificationService.createNotification({
          userId: requesterUserId,
          type: NotificationType.SUPPLY_ADJUSTMENT_APPROVED,
          title: 'Yêu cầu điều chỉnh vật tư đã được duyệt',
          message: `Yêu cầu điều chỉnh vật tư "${existing.tenVatTu}" (${existing.maDieuChinh}) của bạn đã được duyệt`,
          supplyAdjustmentId: id,
        });
      } catch (err) {
        logger.error('Failed to send supply adjustment approval notification:', err);
      }
    }

    broadcast({ type: 'SUPPLY_ADJUSTMENT_CHANGED' });

    return adjustment;
  }

  /**
   * Reject a supply adjustment request with a reason.
   *
   * ⚠️ Side effects:
   *   - Sets trangThai = TU_CHOI, lyDoTuChoi.
   *   - Creates Notification for the requester.
   *   - Broadcasts SUPPLY_ADJUSTMENT_CHANGED via WebSocket.
   *
   * @param id           - SupplyAdjustment record ID
   * @param userId       - Authenticated user ID (approver)
   * @param userRole     - Authenticated user role
   * @param lyDoTuChoi   - Reason for rejection
   * @throws AuthorizationError when caller lacks approval rights
   * @throws ValidationError    when lyDoTuChoi is empty
   * @throws NotFoundError      when record does not exist
   */
  async reject(
    id: string,
    userId: string,
    userRole: string,
    lyDoTuChoi: string
  ): Promise<any> {
    if (!this.canApprove(userRole)) {
      throw new AuthorizationError('Bạn không có quyền từ chối yêu cầu điều chỉnh vật tư');
    }

    if (!lyDoTuChoi || lyDoTuChoi.trim() === '') {
      throw new ValidationError('Lý do từ chối không được để trống');
    }

    const existing = await (prisma as any).supplyAdjustment.findUnique({
      where: { id },
      include: { employee: { include: { user: true } } },
    });

    if (!existing) {
      throw new NotFoundError('Không tìm thấy yêu cầu điều chỉnh vật tư');
    }

    const adjustment = await (prisma as any).supplyAdjustment.update({
      where: { id },
      data: {
        trangThai: 'TU_CHOI',
        nguoiDuyetId: userId,
        ngayDuyet: new Date(),
        lyDoTuChoi: lyDoTuChoi.trim(),
      },
      include: { employee: { include: { user: true } } },
    });

    // Notify the requester
    const requesterUserId = existing.employee?.user?.id;
    if (requesterUserId) {
      try {
        await notificationService.createNotification({
          userId: requesterUserId,
          type: NotificationType.SUPPLY_ADJUSTMENT_REJECTED,
          title: 'Yêu cầu điều chỉnh vật tư bị từ chối',
          message: `Yêu cầu điều chỉnh vật tư "${existing.tenVatTu}" (${existing.maDieuChinh}) của bạn đã bị từ chối. Lý do: ${lyDoTuChoi.trim()}`,
          supplyAdjustmentId: id,
        });
      } catch (err) {
        logger.error('Failed to send supply adjustment rejection notification:', err);
      }
    }

    broadcast({ type: 'SUPPLY_ADJUSTMENT_CHANGED' });

    return adjustment;
  }
}

export default new SupplyAdjustmentService();
