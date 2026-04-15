import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { AuthorizationError, NotFoundError, ValidationError } from '@utils/errors';
import ExcelJS from 'exceljs';
import { NotificationType, UserRole, type JwtPayload } from '@types';
import notificationService from '@services/notificationService';

interface SupplyRequestItemInput {
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
}

interface CreateSupplyRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  boPhan: string;
  items: SupplyRequestItemInput[];
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  fileKemTheo?: string;
}

interface UpdateSupplyRequestRequest {
  items?: SupplyRequestItemInput[];
  mucDichYeuCau?: string;
  mucDoUuTien?: string;
  ghiChu?: string;
  fileKemTheo?: string;
}

// Status sequence for advancement checks
const STATUS_SEQUENCE = ['Chờ duyệt', 'Đã duyệt', 'Đang xử lý', 'Đã duyệt mua', 'Đã mua hàng', 'Đã cung cấp'];
const DIRECT_STATUS_SEQUENCE = ['Chờ duyệt', 'Đã duyệt', 'Đang xử lý', 'Đã cung cấp'];
const LEGACY_PENDING_STATUS = 'Chưa cung cấp';
const REJECTED_STATUS = 'Từ chối';

type SupplyRequestType = 'material' | 'equipment' | 'manpower' | 'mixed';

const normalizeCategory = (value?: string): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const detectCategoryType = (value?: string): Exclude<SupplyRequestType, 'mixed'> => {
  const normalized = normalizeCategory(value);

  if (
    normalized.includes('nhan luc') ||
    normalized.includes('nhan su') ||
    normalized.includes('tuyen dung')
  ) {
    return 'manpower';
  }

  if (
    normalized.includes('thiet bi') ||
    normalized.includes('cong cu') ||
    normalized.includes('tai san')
  ) {
    return 'equipment';
  }

  return 'material';
};

const getSupplyRequestType = (items: SupplyRequestItemInput[] = []): SupplyRequestType => {
  const types = new Set(items.map((item) => detectCategoryType(item.phanLoai)));
  return types.size <= 1 ? (Array.from(types)[0] || 'material') : 'mixed';
};

const containsManpowerItems = (items: SupplyRequestItemInput[] = []): boolean =>
  items.some((item) => detectCategoryType(item.phanLoai) === 'manpower');

const getSupplyRequestTypeLabel = (type: SupplyRequestType): string => {
  switch (type) {
    case 'equipment':
      return 'Thiết bị';
    case 'manpower':
      return 'Nhân lực';
    case 'mixed':
      return 'Hỗn hợp';
    case 'material':
    default:
      return 'Vật tư';
  }
};

const matchesRequestTypeFilter = (
  request: { items?: SupplyRequestItemInput[] },
  filter?: string
): boolean => {
  if (!filter) {
    return true;
  }

  return getSupplyRequestType(request.items || []) === filter;
};

const dedupeIds = (ids: string[]): string[] => Array.from(new Set(ids.filter(Boolean)));
const isPendingApprovalStatus = (status?: string): boolean => [LEGACY_PENDING_STATUS, 'Chờ duyệt'].includes(status || '');
const isRejectedStatus = (status?: string): boolean => status === REJECTED_STATUS;

class SupplyRequestService {
  private getAllowedStatuses(items: SupplyRequestItemInput[] = []): string[] {
    return containsManpowerItems(items) ? DIRECT_STATUS_SEQUENCE : STATUS_SEQUENCE;
  }

  private getProgressStatuses(items: SupplyRequestItemInput[] = []): string[] {
    return this.getAllowedStatuses(items).filter((status) => status !== 'Chờ duyệt');
  }

  private async getActorApprovalContext(actor: JwtPayload): Promise<{ approverEmployeeId: string | null; approverName: string }> {
    const actorUser = await prisma.user.findUnique({
      where: { id: actor.id },
      include: { employees: true },
    });

    const approverName = [actorUser?.firstName, actorUser?.lastName].filter(Boolean).join(' ').trim()
      || actorUser?.email
      || 'Người xử lý';

    return {
      approverEmployeeId: actorUser?.employees?.id || null,
      approverName,
    };
  }

  private getStatusNotificationType(status: string): string {
    switch (status) {
      case 'Đang xử lý':
        return NotificationType.SUPPLY_REQUEST_PROCESSING;
      case 'Đã duyệt':
      case 'Đã duyệt mua':
      case 'Đã mua hàng':
        return NotificationType.SUPPLY_REQUEST_APPROVED;
      case REJECTED_STATUS:
        return NotificationType.SUPPLY_REQUEST_REJECTED;
      case 'Đã cung cấp':
        return NotificationType.SUPPLY_REQUEST_FULFILLED;
      default:
        return NotificationType.SUPPLY_REQUEST;
    }
  }

  private async getResponsibleEmployeeIdsByType(requestType: SupplyRequestType): Promise<string[]> {
    const queries: Promise<Array<{ id: string }>>[] = [];

    if (requestType === 'manpower' || requestType === 'mixed') {
      queries.push(
        prisma.employee.findMany({
          where: { subDepartment: { code: 'SUBDEPT_QUALITY_PERSONNEL' } },
          select: { id: true },
        })
      );
    }

    if (requestType === 'material' || requestType === 'equipment' || requestType === 'mixed') {
      queries.push(
        prisma.employee.findMany({
          where: { subDepartment: { department: { code: 'DEPT_PURCHASING' } } },
          select: { id: true },
        })
      );
    }

    const employees = (await Promise.all(queries)).flat();
    return dedupeIds(employees.map((employee) => employee.id));
  }

  private async getAdminEmployeeIds(): Promise<string[]> {
    const admins = await prisma.employee.findMany({
      where: {
        user: {
          role: UserRole.ADMIN,
        },
      },
      select: { id: true },
    });

    return admins.map((employee) => employee.id);
  }

  private async getCreateNotificationRecipients(items: SupplyRequestItemInput[]): Promise<string[]> {
    const requestType = getSupplyRequestType(items);
    const [adminIds, responsibleIds] = await Promise.all([
      this.getAdminEmployeeIds(),
      this.getResponsibleEmployeeIdsByType(requestType),
    ]);

    return dedupeIds([...adminIds, ...responsibleIds]);
  }

  private async assertStatusUpdatePermission(
    request: { items: SupplyRequestItemInput[] },
    actor?: JwtPayload
  ): Promise<void> {
    if (!actor) {
      throw new AuthorizationError('Bạn chưa đăng nhập để cập nhật trạng thái');
    }

    if ([UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD].includes(actor.role as any)) {
      return;
    }

    const requestType = getSupplyRequestType(request.items);

    const [purchasingDepartment, personnelSubDepartment] = await Promise.all([
      prisma.department.findFirst({
        where: { code: 'DEPT_PURCHASING' },
        select: { id: true },
      }),
      prisma.subDepartment.findFirst({
        where: { code: 'SUBDEPT_QUALITY_PERSONNEL' },
        select: { id: true },
      }),
    ]);

    const belongsToPurchasing = Boolean(
      purchasingDepartment?.id && actor.departmentId === purchasingDepartment.id
    );
    const belongsToPersonnel = Boolean(
      personnelSubDepartment?.id && actor.subDepartmentId === personnelSubDepartment.id
    );

    const canManage =
      requestType === 'manpower'
        ? belongsToPersonnel
        : requestType === 'mixed'
          ? belongsToPersonnel || belongsToPurchasing
          : belongsToPurchasing;

    if (!canManage) {
      throw new AuthorizationError('Bạn không có quyền cập nhật trạng thái yêu cầu này');
    }
  }

  private enrichSupplyRequest<T extends {
    items?: SupplyRequestItemInput[];
    approvedByEmployeeId?: string | null;
    approvedByName?: string | null;
    approvedAt?: Date | null;
    rejectionReason?: string | null;
  }>(request: T): T & {
    requestType: SupplyRequestType;
    requestTypeLabel: string;
    supportsProcurementFlow: boolean;
  } {
    const requestType = getSupplyRequestType(request.items || []);

    return {
      ...request,
      requestType,
      requestTypeLabel: getSupplyRequestTypeLabel(requestType),
      supportsProcurementFlow: !containsManpowerItems(request.items || []),
    };
  }

  async getAllSupplyRequests(page: number = 1, limit: number = 10, search?: string, requestType?: string) {
    const { skip } = getPaginationParams(page, limit);

    const where = search
      ? {
          OR: [
            { maYeuCau: { contains: search, mode: 'insensitive' as const } },
            { tenNhanVien: { contains: search, mode: 'insensitive' as const } },
            { maNhanVien: { contains: search, mode: 'insensitive' as const } },
            {
              items: {
                some: {
                  OR: [
                    { tenGoi: { contains: search, mode: 'insensitive' as const } },
                    { phanLoai: { contains: search, mode: 'insensitive' as const } },
                  ],
                },
              },
            },
          ],
        }
      : {};

    const baseQuery = {
      where,
      orderBy: {
        createdAt: 'desc' as const,
      },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        items: true,
        purchaseRequests: true,
        warehouseReceipts: true,
      },
    };

    if (requestType) {
      const data = await prisma.supplyRequest.findMany(baseQuery);
      const filtered = data
        .map((request) => this.enrichSupplyRequest(request))
        .filter((request) => matchesRequestTypeFilter(request, requestType));

      const pagedData = filtered.slice(skip, skip + limit);

      return {
        data: pagedData,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filtered.length / limit),
          totalItems: filtered.length,
          itemsPerPage: limit,
        },
      };
    }

    const [data, total] = await Promise.all([
      prisma.supplyRequest.findMany({
        ...baseQuery,
        skip,
        take: limit,
      }),
      prisma.supplyRequest.count({ where }),
    ]);

    return {
      data: data.map((request) => this.enrichSupplyRequest(request)),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  }

  async getSupplyRequestById(id: string) {
    const supplyRequest = await prisma.supplyRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        items: true,
        purchaseRequests: true,
        warehouseReceipts: true,
      },
    });

    if (!supplyRequest) {
      throw new NotFoundError('Supply request not found');
    }

    return this.enrichSupplyRequest(supplyRequest);
  }

  async createSupplyRequest(data: CreateSupplyRequestRequest) {
    // Validate employeeId exists
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });
    if (!employee) {
      throw new ValidationError('Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.');
    }

    if (!data.items || data.items.length === 0) {
      throw new ValidationError('Phải có ít nhất một sản phẩm trong yêu cầu cung cấp.');
    }

    // Use transaction to prevent race condition on code generation
    const supplyRequest = await prisma.$transaction(async (tx) => {
      const lastRequest = await tx.supplyRequest.findFirst({
        orderBy: { maYeuCau: 'desc' },
      });

      let sequence = 1;
      if (lastRequest && lastRequest.maYeuCau) {
        const match = lastRequest.maYeuCau.match(/YC-CC(\d+)/);
        if (match) {
          sequence = parseInt(match[1], 10) + 1;
        }
      }
      const maYeuCau = `YC-CC${sequence.toString().padStart(3, '0')}`;

      const created = await tx.supplyRequest.create({
        data: {
          maYeuCau,
          employeeId: data.employeeId,
          maNhanVien: data.maNhanVien,
          tenNhanVien: data.tenNhanVien,
          boPhan: data.boPhan,
          mucDichYeuCau: data.mucDichYeuCau,
          mucDoUuTien: data.mucDoUuTien,
          ghiChu: data.ghiChu,
          trangThai: 'Chờ duyệt',
          fileKemTheo: data.fileKemTheo,
        },
      });

      await tx.supplyRequestItem.createMany({
        data: data.items.map((item) => ({
          supplyRequestId: created.id,
          phanLoai: item.phanLoai,
          tenGoi: item.tenGoi,
          soLuong: item.soLuong,
          donViTinh: item.donViTinh,
        })),
      });

      return tx.supplyRequest.findUnique({
        where: { id: created.id },
        include: {
          employee: {
            include: {
              user: true,
              position: true,
            },
          },
          items: true,
          purchaseRequests: true,
        },
      });
    });

    // Send notification to purchasing department employees
    try {
      const requestType = getSupplyRequestType(data.items);
      const recipientEmployeeIds = await this.getCreateNotificationRecipients(data.items);

      if (recipientEmployeeIds.length > 0) {
        const itemNames = data.items.map((i) => i.tenGoi).join(', ');
        const notificationTitle = requestType === 'manpower'
          ? 'Yêu cầu bổ sung nhân sự mới'
          : requestType === 'mixed'
            ? 'Yêu cầu bổ sung tổng hợp mới'
            : 'Yêu cầu cung cấp mới';
        await notificationService.createSupplyRequestNotifications(
          recipientEmployeeIds,
          NotificationType.SUPPLY_REQUEST,
          notificationTitle,
          `${data.tenNhanVien} (${data.boPhan}) yêu cầu cung cấp: ${itemNames}`,
          supplyRequest?.id
        );
      }
    } catch (error) {
      console.error('Error sending supply request notifications:', error);
    }

    return supplyRequest ? this.enrichSupplyRequest(supplyRequest) : supplyRequest;
  }

  async updateSupplyRequest(id: string, data: UpdateSupplyRequestRequest) {
    // Check record exists
    const existing = await prisma.supplyRequest.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Supply request not found');
    }

    // Strip trangThai from incoming data — status is server-managed only
    const { items, ...headerData } = data as any;
    delete headerData.trangThai;

    if (items && Array.isArray(items)) {
      // Replace items within a transaction
      await prisma.$transaction(async (tx) => {
        // Delete existing items
        await tx.supplyRequestItem.deleteMany({ where: { supplyRequestId: id } });
        // Create new items
        await tx.supplyRequestItem.createMany({
          data: items.map((item: SupplyRequestItemInput) => ({
            supplyRequestId: id,
            phanLoai: item.phanLoai,
            tenGoi: item.tenGoi,
            soLuong: item.soLuong,
            donViTinh: item.donViTinh,
          })),
        });
        // Update header
        if (Object.keys(headerData).length > 0) {
          await tx.supplyRequest.update({
            where: { id },
            data: headerData,
          });
        }
      });
    } else if (Object.keys(headerData).length > 0) {
      await prisma.supplyRequest.update({
        where: { id },
        data: headerData,
      });
    }

    const updated = await prisma.supplyRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        items: true,
      },
    });

    return updated ? this.enrichSupplyRequest(updated) : updated;
  }

  async updateSupplyRequestStatus(id: string, trangThai: string, actor?: JwtPayload) {
    const existing = await prisma.supplyRequest.findUnique({
      where: { id },
      include: {
        items: true,
        employee: {
          select: { id: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Supply request not found');
    }

    await this.assertStatusUpdatePermission(existing, actor);

    if (isPendingApprovalStatus(existing.trangThai)) {
      throw new ValidationError('Yêu cầu đang chờ duyệt. Vui lòng dùng thao tác duyệt hoặc từ chối trực tiếp.');
    }

    if (isRejectedStatus(existing.trangThai)) {
      throw new ValidationError('Yêu cầu đã bị từ chối và không thể tiếp tục cập nhật trạng thái xử lý.');
    }

    const allowedStatuses = this.getProgressStatuses(existing.items as SupplyRequestItemInput[]);
    if (!allowedStatuses.includes(trangThai)) {
      throw new ValidationError('Trạng thái này không phù hợp với loại yêu cầu hiện tại');
    }

    const updated = await prisma.supplyRequest.update({
      where: { id },
      data: { trangThai },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        items: true,
        purchaseRequests: true,
        warehouseReceipts: true,
      },
    });

    if (existing.trangThai !== trangThai) {
      try {
        await notificationService.createSupplyRequestNotification(
          existing.employeeId,
          this.getStatusNotificationType(trangThai),
          'Trạng thái yêu cầu được cập nhật',
          `Yêu cầu ${existing.maYeuCau} của bạn đã được cập nhật sang trạng thái "${trangThai}".`,
          id
        );
      } catch (error) {
        console.error('Error sending supply request status notification:', error);
      }
    }

    return this.enrichSupplyRequest(updated);
  }

  async approveSupplyRequest(id: string, actor?: JwtPayload) {
    const existing = await prisma.supplyRequest.findUnique({
      where: { id },
      include: {
        items: true,
        employee: {
          select: { id: true },
        },
        purchaseRequests: true,
        warehouseReceipts: true,
      },
    });

    if (!existing) {
      throw new NotFoundError('Supply request not found');
    }

    await this.assertStatusUpdatePermission(existing, actor);

    if (!isPendingApprovalStatus(existing.trangThai)) {
      throw new ValidationError('Chỉ có thể duyệt yêu cầu đang chờ duyệt.');
    }

    const { approverEmployeeId, approverName } = await this.getActorApprovalContext(actor as JwtPayload);

    const updated = await prisma.supplyRequest.update({
      where: { id },
      data: {
        trangThai: 'Đã duyệt',
        approvedByEmployeeId: approverEmployeeId,
        approvedByName: approverName,
        approvedAt: new Date(),
        rejectionReason: null,
      },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        items: true,
        purchaseRequests: true,
        warehouseReceipts: true,
      },
    });

    try {
      await notificationService.createSupplyRequestNotification(
        existing.employeeId,
        NotificationType.SUPPLY_REQUEST_APPROVED,
        'Yêu cầu cung cấp đã được duyệt',
        `Yêu cầu ${existing.maYeuCau} của bạn đã được ${approverName} duyệt.`,
        id
      );
    } catch (error) {
      console.error('Error sending supply request approval notification:', error);
    }

    return this.enrichSupplyRequest(updated);
  }

  async rejectSupplyRequest(id: string, rejectionReason?: string, actor?: JwtPayload) {
    const normalizedReason = rejectionReason?.trim() || 'Yêu cầu chưa được chấp thuận ở bước xác nhận.';

    const existing = await prisma.supplyRequest.findUnique({
      where: { id },
      include: {
        items: true,
        employee: {
          select: { id: true },
        },
        purchaseRequests: true,
        warehouseReceipts: true,
      },
    });

    if (!existing) {
      throw new NotFoundError('Supply request not found');
    }

    await this.assertStatusUpdatePermission(existing, actor);

    if (!isPendingApprovalStatus(existing.trangThai)) {
      throw new ValidationError('Chỉ có thể từ chối yêu cầu đang chờ duyệt.');
    }

    const { approverEmployeeId, approverName } = await this.getActorApprovalContext(actor as JwtPayload);

    const updated = await prisma.supplyRequest.update({
      where: { id },
      data: {
        trangThai: REJECTED_STATUS,
        approvedByEmployeeId: approverEmployeeId,
        approvedByName: approverName,
        approvedAt: new Date(),
        rejectionReason: normalizedReason,
      },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        items: true,
        purchaseRequests: true,
        warehouseReceipts: true,
      },
    });

    try {
      await notificationService.createSupplyRequestNotification(
        existing.employeeId,
        NotificationType.SUPPLY_REQUEST_REJECTED,
        'Yêu cầu cung cấp bị từ chối',
        `Yêu cầu ${existing.maYeuCau} của bạn đã bị ${approverName} từ chối. Lý do: ${normalizedReason}`,
        id
      );
    } catch (error) {
      console.error('Error sending supply request rejection notification:', error);
    }

    return this.enrichSupplyRequest(updated);
  }

  async deleteSupplyRequest(id: string) {
    await prisma.supplyRequest.delete({
      where: { id },
    });
  }

  async assertProcurementFlowSupported(supplyRequestId: string): Promise<void> {
    const request = await prisma.supplyRequest.findUnique({
      where: { id: supplyRequestId },
      include: { items: true },
    });

    if (!request) {
      throw new NotFoundError('Supply request not found');
    }

    if (containsManpowerItems(request.items as SupplyRequestItemInput[])) {
      throw new ValidationError('Yêu cầu nhân lực không đi qua luồng mua hàng/kho. Vui lòng xử lý theo quy trình nhân sự.');
    }

    if (isPendingApprovalStatus(request.trangThai)) {
      throw new ValidationError('Yêu cầu chưa được duyệt. Vui lòng duyệt yêu cầu trước khi thực hiện mua hàng/kho.');
    }

    if (isRejectedStatus(request.trangThai)) {
      throw new ValidationError('Yêu cầu đã bị từ chối nên không thể thực hiện luồng mua hàng/kho.');
    }
  }

  /**
   * Advance status only if newStatus comes later in the ordered sequence.
   * Prevents out-of-order transitions.
   */
  private async advanceStatus(supplyRequestId: string, newStatus: string): Promise<void> {
    const request = await prisma.supplyRequest.findUnique({
      where: { id: supplyRequestId },
      include: { items: true },
    });

    if (!request) return;

    if (!this.getAllowedStatuses(request.items as SupplyRequestItemInput[]).includes(newStatus)) {
      return;
    }

    const progressionStatuses = this.getAllowedStatuses(request.items as SupplyRequestItemInput[]);
    const currentIndex = progressionStatuses.indexOf(request.trangThai);
    const newIndex = progressionStatuses.indexOf(newStatus);

    if (newIndex > currentIndex) {
      await prisma.supplyRequest.update({
        where: { id: supplyRequestId },
        data: { trangThai: newStatus },
      });
    }
  }

  /**
   * Called when a PurchaseRequest is created for this supply request.
   * Advances status to "Đang xử lý" and notifies original requester.
   */
  async onPurchaseRequestCreated(supplyRequestId: string): Promise<void> {
    try {
      await this.advanceStatus(supplyRequestId, 'Đang xử lý');

      const request = await prisma.supplyRequest.findUnique({
        where: { id: supplyRequestId },
        select: { employeeId: true, maYeuCau: true },
      });

      if (request) {
        await notificationService.createSupplyRequestNotification(
          request.employeeId,
          NotificationType.SUPPLY_REQUEST_PROCESSING,
          'Yêu cầu cung cấp đang xử lý',
          `Yêu cầu cung cấp ${request.maYeuCau} của bạn đang được bộ phận phụ trách xử lý.`,
          supplyRequestId
        );
      }
    } catch (error) {
      console.error('Error in onPurchaseRequestCreated notification:', error);
    }
  }

  /**
   * Called when the linked PurchaseRequest is approved.
   * Advances status to "Đã duyệt mua" and notifies requester + warehouse staff.
   */
  async onPurchaseRequestApproved(supplyRequestId: string): Promise<void> {
    try {
      await this.advanceStatus(supplyRequestId, 'Đã duyệt mua');

      const request = await prisma.supplyRequest.findUnique({
        where: { id: supplyRequestId },
        select: { employeeId: true, maYeuCau: true },
      });

      if (!request) return;

      // Notify original requester
      await notificationService.createSupplyRequestNotification(
        request.employeeId,
        NotificationType.SUPPLY_REQUEST_APPROVED,
        'Yêu cầu cung cấp đã được duyệt mua',
        `Yêu cầu cung cấp ${request.maYeuCau} của bạn đã được duyệt mua hàng.`,
        supplyRequestId
      );

      // Notify warehouse employees
      const warehouseEmployees = await prisma.employee.findMany({
        where: {
          subDepartment: {
            department: {
              code: 'DEPT_WAREHOUSE',
            },
          },
        },
        select: { id: true },
      });

      if (warehouseEmployees.length > 0) {
        await notificationService.createSupplyRequestNotifications(
          warehouseEmployees.map((emp) => emp.id),
          NotificationType.SUPPLY_REQUEST_APPROVED,
          'Hàng hóa sắp nhập kho',
          `Yêu cầu cung cấp ${request.maYeuCau} đã được duyệt mua. Chuẩn bị nhập kho.`,
          supplyRequestId
        );
      }
    } catch (error) {
      console.error('Error in onPurchaseRequestApproved notification:', error);
    }
  }

  /**
   * Called when the linked PurchaseRequest is marked as "Hoàn thành" (goods purchased).
   * Advances status to "Đã mua hàng" and notifies the original requester.
   */
  async onPurchaseRequestCompleted(supplyRequestId: string): Promise<void> {
    try {
      await this.advanceStatus(supplyRequestId, 'Đã mua hàng');

      const request = await prisma.supplyRequest.findUnique({
        where: { id: supplyRequestId },
        select: { employeeId: true, maYeuCau: true },
      });

      if (request) {
        await notificationService.createSupplyRequestNotification(
          request.employeeId,
          NotificationType.SUPPLY_REQUEST_APPROVED,
          'Hàng hóa đã được mua',
          `Yêu cầu cung cấp ${request.maYeuCau} đã được mua hàng xong. Đang chờ nhập kho.`,
          supplyRequestId
        );
      }
    } catch (error) {
      console.error('Error in onPurchaseRequestCompleted notification:', error);
    }
  }

  /**
   * Called when a WarehouseReceipt or WarehouseIssue is created for this supply request.
   * Advances status to "Đã cung cấp" and notifies the original requester.
   */
  async onWarehouseDocumentCreated(supplyRequestId: string): Promise<void> {
    try {
      await this.advanceStatus(supplyRequestId, 'Đã cung cấp');

      const request = await prisma.supplyRequest.findUnique({
        where: { id: supplyRequestId },
        select: { employeeId: true, maYeuCau: true },
      });

      if (request) {
        await notificationService.createSupplyRequestNotification(
          request.employeeId,
          NotificationType.SUPPLY_REQUEST_FULFILLED,
          'Yêu cầu cung cấp đã được thực hiện',
          `Yêu cầu cung cấp ${request.maYeuCau} của bạn đã được cung cấp/nhập kho.`,
          supplyRequestId
        );
      }
    } catch (error) {
      console.error('Error in onWarehouseDocumentCreated notification:', error);
    }
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { maYeuCau: { contains: filters.search, mode: 'insensitive' as const } },
        { tenNhanVien: { contains: filters.search, mode: 'insensitive' as const } },
        { maNhanVien: { contains: filters.search, mode: 'insensitive' as const } },
        {
          items: {
            some: {
              OR: [
                { tenGoi: { contains: filters.search, mode: 'insensitive' as const } },
                { phanLoai: { contains: filters.search, mode: 'insensitive' as const } },
              ],
            },
          },
        },
      ];
    }

    const data = await prisma.supplyRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        items: true,
      },
    });

    const filteredData = filters?.requestType
      ? data.filter((request) => matchesRequestTypeFilter(request, filters.requestType))
      : data;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách yêu cầu cung cấp');

    worksheet.columns = [
      { header: 'Ngày yêu cầu', key: 'ngayYeuCau', width: 15 },
      { header: 'Mã yêu cầu', key: 'maYeuCau', width: 15 },
      { header: 'Nhân viên', key: 'tenNhanVien', width: 25 },
      { header: 'Bộ phận', key: 'boPhan', width: 20 },
      { header: 'Phân loại', key: 'phanLoai', width: 15 },
      { header: 'Tên gọi', key: 'tenGoi', width: 25 },
      { header: 'Số lượng', key: 'soLuong', width: 12 },
      { header: 'Đơn vị tính', key: 'donViTinh', width: 12 },
      { header: 'Mức độ ưu tiên', key: 'mucDoUuTien', width: 15 },
      { header: 'Trạng thái', key: 'trangThai', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Emit one row per item
    filteredData.forEach((request) => {
      if (request.items && request.items.length > 0) {
        request.items.forEach((item) => {
          worksheet.addRow({
            ngayYeuCau: new Date(request.ngayYeuCau).toLocaleDateString('vi-VN'),
            maYeuCau: request.maYeuCau,
            tenNhanVien: request.tenNhanVien,
            boPhan: request.boPhan,
            phanLoai: item.phanLoai,
            tenGoi: item.tenGoi,
            soLuong: item.soLuong,
            donViTinh: item.donViTinh,
            mucDoUuTien: request.mucDoUuTien,
            trangThai: request.trangThai,
          });
        });
      } else {
        // Legacy row with no items
        worksheet.addRow({
          ngayYeuCau: new Date(request.createdAt).toLocaleDateString('vi-VN'),
          maYeuCau: request.maYeuCau,
          tenNhanVien: request.tenNhanVien,
          boPhan: request.boPhan,
          phanLoai: '',
          tenGoi: '',
          soLuong: '',
          donViTinh: '',
          mucDoUuTien: request.mucDoUuTien,
          trangThai: request.trangThai,
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new SupplyRequestService();
