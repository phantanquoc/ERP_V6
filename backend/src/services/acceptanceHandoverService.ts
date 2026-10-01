import { Prisma, RepairRequestStatus, RequestType, NghiemThuKetQua } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { AuthorizationError, NotFoundError, ValidationError } from '@utils/errors';
import ExcelJS from 'exceljs';
import { NotificationEvent } from '@types';
import notificationService from './notificationService';
import logger from '@config/logger';

interface AcceptanceHandoverItemRequest {
  repairRequestItemId: string;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  ghiChu?: string;
}

interface CreateAcceptanceHandoverRequest {
  repairRequestId: number;
  maYeuCauSuaChua: string;
  tenHeThongThietBi: string;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  nguoiBanGiao: string;
  nguoiNhan: string;
  nguoiNhanId?: string;
  fileDinhKem?: string;
  ghiChu?: string;
  items?: AcceptanceHandoverItemRequest[];
  userId?: string;
  actorRole?: string;
  warehouseIssueId?: string | null;
  ketQua?: NghiemThuKetQua | string | null;
  chiPhiThucTe?: number | null;
}

interface UpdateAcceptanceHandoverRequest {
  repairRequestId?: number;
  maYeuCauSuaChua?: string;
  tenHeThongThietBi?: string;
  tinhTrangTruocSuaChua?: string;
  tinhTrangSauSuaChua?: string;
  nguoiBanGiao?: string;
  nguoiNhan?: string;
  nguoiNhanId?: string;
  fileDinhKem?: string;
  ghiChu?: string;
  items?: AcceptanceHandoverItemRequest[];
  actorRole?: string;
  actorId?: string;
  warehouseIssueId?: string | null;
  ketQua?: NghiemThuKetQua | string | null;
  chiPhiThucTe?: number | null;
}

const handoverInclude = {
  inspectionRequest: { select: { id: true, maYeuCau: true, trangThai: true, createdByName: true } },
  repairRequest: {
    include: {
      items: {
        include: {
          machineSystem: true,
          machineSystemDetail: true,
        },
      },
    },
  },
  items: {
    include: {
      repairRequestItem: true,
      machineSystem: true,
      machineSystemDetail: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.AcceptanceHandoverInclude;

const HANDOVER_CODE_PREFIX = 'NT-';
const HANDOVER_CODE_MAX_ATTEMPTS = 3;

type SlipNotifyInfo = { id: string; maNghiemThu: string; maYeuCauSuaChua: string; tenHeThongThietBi: string };

/** True for a unique violation on maNghiemThu (or an unknown unique target). */
function isHandoverCodeConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  const target = error.meta?.target;
  if (target === undefined) return true;
  const text = Array.isArray(target) ? target.join(',') : String(target);
  return /maNghiemThu|ma_nghiem_thu/i.test(text);
}

class AcceptanceHandoverService {
  /**
   * Next acceptance code NT-{SEQUENCE} (NT-001, NT-002, …, NT-1000).
   * The max is computed numerically — a string sort would put NT-999 after NT-1000.
   */
  async nextHandoverCode(client: Prisma.TransactionClient = prisma): Promise<string> {
    const rows = await client.acceptanceHandover.findMany({
      where: { maNghiemThu: { startsWith: HANDOVER_CODE_PREFIX } },
      select: { maNghiemThu: true },
    });
    let max = 0;
    for (const r of rows) {
      const n = Number.parseInt(r.maNghiemThu.slice(HANDOVER_CODE_PREFIX.length), 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return `${HANDOVER_CODE_PREFIX}${String(max + 1).padStart(3, '0')}`;
  }

  /** Preview code for the UI (not reserved — the real code is generated inside the create transaction). */
  async generateAcceptanceHandoverCode(): Promise<string> {
    return this.nextHandoverCode();
  }

  /**
   * Run a transaction that generates an NT code, retrying when a concurrent create took the same
   * code (unique violation aborts the PG transaction, so the whole transaction is re-run).
   */
  async withHandoverCodeRetry<T>(run: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await run();
      } catch (error) {
        if (attempt >= HANDOVER_CODE_MAX_ATTEMPTS || !isHandoverCodeConflict(error)) throw error;
        logger.warn(`[AcceptanceHandoverService] maNghiemThu conflict, retry ${attempt}/${HANDOVER_CODE_MAX_ATTEMPTS - 1}`);
      }
    }
  }

  /**
   * The pending (unconfirmed) slip of a YCSC that belongs to the current acceptance round:
   * the newest slip with ketQua = null created after the last KHÔNG ĐẠT decision.
   */
  async findActivePendingRepairSlip(tx: Prisma.TransactionClient, repairRequestId: number) {
    const lastRejection = await tx.repairRequestStatusLog.findFirst({
      where: { repairRequestId, reason: { startsWith: 'acceptance_khong_dat' } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return tx.acceptanceHandover.findFirst({
      where: {
        repairRequestId,
        ketQua: null,
        ...(lastRejection ? { createdAt: { gt: lastRejection.createdAt } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, maNghiemThu: true, maYeuCauSuaChua: true, tenHeThongThietBi: true, nguoiBanGiao: true, nguoiXacNhanId: true },
    });
  }

  async getAllAcceptanceHandovers(page: number = 1, limit: number = 10, search?: string) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { maNghiemThu: { contains: search, mode: 'insensitive' } },
        { maYeuCauSuaChua: { contains: search, mode: 'insensitive' } },
        { tenHeThongThietBi: { contains: search, mode: 'insensitive' } },
        { nguoiBanGiao: { contains: search, mode: 'insensitive' } },
        { nguoiNhan: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [handovers, total] = await Promise.all([
      prisma.acceptanceHandover.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: handoverInclude,
      }),
      prisma.acceptanceHandover.count({ where }),
    ]);

    return {
      data: handovers,
      pagination: {
        page,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getAcceptanceHandoverById(id: string) {
    const handover = await prisma.acceptanceHandover.findUnique({
      where: { id },
      include: handoverInclude,
    });

    if (!handover) {
      throw new NotFoundError('Không tìm thấy nghiệm thu bàn giao');
    }

    return handover;
  }

  private async resolveHandoverItems(
    repairRequestId: number,
    items: AcceptanceHandoverItemRequest[] = [],
    tx: Prisma.TransactionClient,
  ) {
    if (items.length === 0) return [];

    const repairRequestItems = await tx.repairRequestItem.findMany({
      where: { id: { in: items.map((item) => item.repairRequestItemId) } },
      include: {
        machineSystem: true,
        machineSystemDetail: true,
      },
    });

    const itemById = new Map(repairRequestItems.map((item) => [item.id, item]));

    return items.map((item) => {
      const repairItem = itemById.get(item.repairRequestItemId);
      if (!repairItem) {
        throw new ValidationError('Hạng mục yêu cầu sửa chữa không hợp lệ');
      }
      if (repairItem.repairRequestId !== repairRequestId) {
        throw new ValidationError('Hạng mục nghiệm thu phải thuộc cùng yêu cầu sửa chữa');
      }

      return {
        repairRequestItemId: repairItem.id,
        machineSystemId: repairItem.machineSystemId,
        machineSystemDetailId: repairItem.machineSystemDetailId,
        tenHeThong: repairItem.tenHeThong,
        tenChiTiet: repairItem.machineSystemDetail?.tenChiTiet ?? null,
        tinhTrangTruocSuaChua: item.tinhTrangTruocSuaChua,
        tinhTrangSauSuaChua: item.tinhTrangSauSuaChua,
        ghiChu: item.ghiChu,
      };
    });
  }

  /**
   * Who must confirm a YCSC acceptance slip: the creator of the source YCKT when the repair
   * came from an inspection request, otherwise the creator of the repair request itself.
   */
  async resolveRepairConfirmer(
    tx: Prisma.TransactionClient,
    repairRequestId: number,
  ): Promise<{ userId: string | null; name: string | null }> {
    const rr = await tx.repairRequest.findUnique({
      where: { id: repairRequestId },
      select: {
        createdById: true,
        createdByName: true,
        inspectionRequest: { select: { createdById: true, createdByName: true } },
      },
    });
    if (!rr) return { userId: null, name: null };
    if (rr.inspectionRequest?.createdById) {
      return { userId: rr.inspectionRequest.createdById, name: rr.inspectionRequest.createdByName ?? null };
    }
    return { userId: rr.createdById ?? null, name: rr.createdByName ?? null };
  }

  /** Map auth.User.id → Employee.id for notification targeting (best-effort). */
  private async employeeIdsForUser(userId: string | null): Promise<string[]> {
    if (!userId) return [];
    try {
      const emp = await prisma.employee.findUnique({ where: { userId }, select: { id: true } });
      return emp ? [emp.id] : [];
    } catch {
      return [];
    }
  }

  /**
   * Create the YCSC acceptance slip (repair work done → waiting for requester confirmation).
   * The repair request is NOT completed here — completion happens only after the requester
   * confirms ĐẠT via repairRequestService.confirmAcceptance + complete.
   */
  async createAcceptanceHandover(data: CreateAcceptanceHandoverRequest) {
    if (!Number.isFinite(data.repairRequestId)) {
      throw new ValidationError('Phiếu nghiệm thu phải gắn với một yêu cầu sửa chữa');
    }

    const { handover, confirmerUserId, notifyNow } = await this.withHandoverCodeRetry(() =>
      prisma.$transaction(async (tx) => {
        const repairRequest = await tx.repairRequest.findUnique({
          where: { id: data.repairRequestId },
          select: { id: true, maYeuCau: true, trangThai: true, requestType: true },
        });
        if (!repairRequest) throw new ValidationError('Yêu cầu sửa chữa không hợp lệ');

        if (repairRequest.requestType === RequestType.KIEM_TRA) {
          throw new ValidationError('Phiếu kiểm tra không thể tạo nghiệm thu');
        }

        if (data.warehouseIssueId) {
          const wi = await tx.warehouseIssue.findUnique({ where: { id: data.warehouseIssueId } });
          if (!wi) throw new ValidationError(`Phiếu xuất kho không tồn tại: ${data.warehouseIssueId}`);
        }

        // Every role (ADMIN included): slips are created while repairing, or — recovery path for legacy
        // rows pushed to CHO_NGHIEM_THU without a slip — in CHO_NGHIEM_THU when no slip is pending.
        const isRecovery = repairRequest.trangThai === RepairRequestStatus.CHO_NGHIEM_THU;
        if (repairRequest.trangThai !== RepairRequestStatus.DANG_SUA_CHUA && !isRecovery) {
          throw new ValidationError('Chỉ có thể tạo nghiệm thu bàn giao khi yêu cầu sửa chữa đang ở trạng thái Đang sửa chữa');
        }
        const pending = await this.findActivePendingRepairSlip(tx, repairRequest.id);
        if (pending) {
          throw new ValidationError(`Yêu cầu sửa chữa đã có phiếu nghiệm thu ${pending.maNghiemThu} đang chờ xác nhận`);
        }

        const resolvedItems = await this.resolveHandoverItems(data.repairRequestId, data.items, tx);
        const confirmer = await this.resolveRepairConfirmer(tx, repairRequest.id);
        const maNghiemThu = await this.nextHandoverCode(tx);
        const created = await tx.acceptanceHandover.create({
          data: {
            maNghiemThu,
            repairRequestId: repairRequest.id,
            maYeuCauSuaChua: data.maYeuCauSuaChua || repairRequest.maYeuCau,
            tenHeThongThietBi: data.tenHeThongThietBi,
            tinhTrangTruocSuaChua: data.tinhTrangTruocSuaChua,
            tinhTrangSauSuaChua: data.tinhTrangSauSuaChua,
            nguoiBanGiao: data.nguoiBanGiao,
            // Receiver = the requester who must confirm (fallback to client-picked name for legacy rows)
            nguoiNhan: confirmer.name || data.nguoiNhan || '',
            nguoiNhanId: data.nguoiNhanId,
            fileDinhKem: data.fileDinhKem,
            ghiChu: data.ghiChu,
            createdById: data.userId ?? null,
            warehouseIssueId: data.warehouseIssueId ?? null,
            ketQua: null,
            chiPhiThucTe: data.chiPhiThucTe as never ?? null,
            nguoiXacNhanId: confirmer.userId,
            nguoiXacNhanTen: confirmer.name,
          },
        });

        if (resolvedItems.length > 0) {
          await tx.acceptanceHandoverItem.createMany({
            data: resolvedItems.map((item) => ({
              acceptanceHandoverId: created.id,
              ...item,
            })),
          });
        }

        // No auto-complete: the requester must confirm ĐẠT/KHÔNG ĐẠT (repairRequestService.confirmAcceptance).
        const handoverWithItems = await tx.acceptanceHandover.findUnique({
          where: { id: created.id },
          include: handoverInclude,
        });
        if (!handoverWithItems) throw new NotFoundError('Không tìm thấy nghiệm thu bàn giao');

        return { handover: handoverWithItems, confirmerUserId: confirmer.userId, notifyNow: isRecovery };
      }),
    );

    // Normal flow: the requester is notified when the YCSC reaches CHO_NGHIEM_THU
    // (repairRequestService.submitForAcceptance). Recovery slip: the YCSC is already waiting.
    if (notifyNow) await this.notifyConfirmer(handover, confirmerUserId, data.nguoiBanGiao);
    return handover;
  }

  /**
   * Create the YCKT acceptance slip when the technician concludes "Đã khắc phục".
   * Called from inspectionRequestService inside its transaction. File attachment is mandatory.
   */
  async createInspectionAcceptanceTx(
    tx: Prisma.TransactionClient,
    input: {
      inspectionRequestId: number;
      maYeuCau: string;
      tenHeThongThietBi: string;
      tinhTrangTruoc: string;
      tinhTrangSau: string;
      nguoiBanGiao: string;
      fileDinhKem: string;
      ghiChu?: string | null;
      confirmerUserId: string | null;
      confirmerName: string | null;
      userId?: string | null;
    },
  ): Promise<SlipNotifyInfo> {
    const maNghiemThu = await this.nextHandoverCode(tx);
    return tx.acceptanceHandover.create({
      data: {
        maNghiemThu,
        inspectionRequestId: input.inspectionRequestId,
        maYeuCauSuaChua: input.maYeuCau,
        tenHeThongThietBi: input.tenHeThongThietBi,
        tinhTrangTruocSuaChua: input.tinhTrangTruoc,
        tinhTrangSauSuaChua: input.tinhTrangSau,
        nguoiBanGiao: input.nguoiBanGiao,
        nguoiNhan: input.confirmerName ?? '',
        fileDinhKem: input.fileDinhKem,
        ghiChu: input.ghiChu ?? null,
        createdById: input.userId ?? null,
        nguoiXacNhanId: input.confirmerUserId,
        nguoiXacNhanTen: input.confirmerName,
      },
    });
  }

  /** Notify the person who must confirm (best-effort — never throws). */
  async notifyConfirmer(
    handover: SlipNotifyInfo,
    confirmerUserId: string | null,
    nguoiBanGiao: string,
  ): Promise<void> {
    try {
      const targetEmployeeIds = await this.employeeIdsForUser(confirmerUserId);
      if (targetEmployeeIds.length === 0) {
        logger.warn(`[AcceptanceHandoverService] slip ${handover.maNghiemThu} has no confirmer employee — notification skipped`);
        return;
      }
      await notificationService.notify(NotificationEvent.ACCEPTANCE_HANDOVER_CREATED, {
        entityId: handover.id,
        targetEmployeeIds,
        metadata: {
          maNghiemThu: handover.maNghiemThu,
          maYeuCauSuaChua: handover.maYeuCauSuaChua,
          tenThietBi: handover.tenHeThongThietBi,
          nguoiBanGiao,
        },
      });
    } catch (e) {
      logger.warn(`[AcceptanceHandoverService] notifyConfirmer failed: ${(e as Error).message}`);
    }
  }

  /**
   * Requester confirmation guard shared by YCSC and YCKT.
   * Only the designated confirmer (or ADMIN) may confirm; records the decision on the latest pending slip.
   */
  async recordConfirmationTx(
    tx: Prisma.TransactionClient,
    where: { repairRequestId: number } | { inspectionRequestId: number },
    actor: { actorId?: string; actorRole?: string },
    ketQua: NghiemThuKetQua,
    lyDo?: string | null,
  ): Promise<string> {
    const pending = await tx.acceptanceHandover.findFirst({
      where: { ...where, ketQua: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, nguoiXacNhanId: true, nguoiXacNhanTen: true },
    });
    if (!pending) throw new ValidationError('Chưa có phiếu nghiệm thu chờ xác nhận');
    const isAdmin = actor.actorRole === 'ADMIN';
    if (!isAdmin && (!pending.nguoiXacNhanId || pending.nguoiXacNhanId !== actor.actorId)) {
      throw new AuthorizationError(`Chỉ người tạo yêu cầu${pending.nguoiXacNhanTen ? ` (${pending.nguoiXacNhanTen})` : ''} mới được xác nhận nghiệm thu`);
    }
    if (ketQua === NghiemThuKetQua.KHONG_DAT && !String(lyDo ?? '').trim()) {
      throw new ValidationError('Vui lòng nhập lý do không đạt');
    }
    await tx.acceptanceHandover.update({
      where: { id: pending.id },
      data: {
        ketQua,
        xacNhanLuc: new Date(),
        xacNhanBoiId: actor.actorId ?? null,
        lyDoXacNhan: String(lyDo ?? '').trim() || null,
      },
    });
    return pending.id;
  }

  async getGeneratedCode() {
    return this.generateAcceptanceHandoverCode();
  }

  async updateAcceptanceHandover(id: string, data: UpdateAcceptanceHandoverRequest) {
    const existingHandover = await prisma.acceptanceHandover.findUnique({
      where: { id },
      include: { repairRequest: { select: { id: true, trangThai: true, maYeuCau: true } } },
    });

    if (!existingHandover) {
      throw new NotFoundError('Không tìm thấy nghiệm thu bàn giao');
    }

    const isAdmin = data.actorRole === 'ADMIN';

    // 6.5 Guard: block edits when parent is HOAN_THANH, unless ADMIN
    if (existingHandover.repairRequest?.trangThai === RepairRequestStatus.HOAN_THANH && !isAdmin) {
      throw new ValidationError('Không thể chỉnh sửa nghiệm thu bàn giao khi yêu cầu sửa chữa đã hoàn thành');
    }

    const { items, actorRole: _actorRole, actorId, ...scalarData } = data as unknown as { items?: AcceptanceHandoverItemRequest[]; actorRole?: string; actorId?: string; [k: string]: unknown } & UpdateAcceptanceHandoverRequest;

    // Validate warehouseIssueId if provided
    if ((scalarData as Record<string, unknown>).warehouseIssueId) {
      const wi = await prisma.warehouseIssue.findUnique({ where: { id: (scalarData as Record<string, unknown>).warehouseIssueId as string } });
      if (!wi) throw new ValidationError(`Phiếu xuất kho không tồn tại: ${(scalarData as Record<string, unknown>).warehouseIssueId}`);
    }

    // A slip can never be moved to another request: the confirmer was resolved from its parent,
    // so retargeting would let someone confirm a request they did not create.
    const rawScalar = scalarData as Record<string, unknown>;
    const isRetarget = (key: 'repairRequestId' | 'inspectionRequestId', current: number | null) => {
      const v = rawScalar[key];
      if (v === undefined || v === null || v === '') return false;
      return Number(v) !== current;
    };
    if (isRetarget('repairRequestId', existingHandover.repairRequestId) || isRetarget('inspectionRequestId', existingHandover.inspectionRequestId)) {
      throw new ValidationError('Không thể chuyển phiếu nghiệm thu sang yêu cầu khác');
    }

    // Confirmation result/identity is written only via the confirm flow — never through generic update.
    const normalizedScalar: Record<string, unknown> = { ...rawScalar };
    for (const k of ['ketQua', 'nguoiXacNhanId', 'nguoiXacNhanTen', 'xacNhanLuc', 'xacNhanBoiId', 'lyDoXacNhan', 'inspectionRequestId', 'repairRequestId', 'maNghiemThu', 'createdById']) {
      delete normalizedScalar[k];
    }
    if (existingHandover.ketQua && !isAdmin) {
      throw new ValidationError('Phiếu nghiệm thu đã được xác nhận, không thể chỉnh sửa');
    }

    const handover = await prisma.$transaction(async (tx) => {
      const repairRequestId = existingHandover.repairRequestId;
      if (items !== undefined && items.length > 0 && !repairRequestId) {
        throw new ValidationError('Phiếu nghiệm thu của yêu cầu kiểm tra không có hạng mục sửa chữa');
      }

      if (items !== undefined && repairRequestId) {
        const resolvedItems = await this.resolveHandoverItems(repairRequestId, items, tx);
        await tx.acceptanceHandoverItem.deleteMany({ where: { acceptanceHandoverId: id } });
        if (resolvedItems.length > 0) {
          await tx.acceptanceHandoverItem.createMany({
            data: resolvedItems.map((item) => ({
              acceptanceHandoverId: id,
              ...item,
            })),
          });
        }
      }

      // ADMIN override audit log
      if (isAdmin && existingHandover.repairRequestId && existingHandover.repairRequest?.trangThai === RepairRequestStatus.HOAN_THANH) {
        await tx.repairRequestStatusLog.create({
          data: {
            repairRequestId: existingHandover.repairRequestId,
            oldStatus: RepairRequestStatus.HOAN_THANH,
            newStatus: RepairRequestStatus.HOAN_THANH,
            actorId: actorId ?? null,
            actorRole: 'ADMIN',
            reason: 'admin_override:edit',
          },
        });
      }

      return tx.acceptanceHandover.update({
        where: { id },
        data: normalizedScalar as Prisma.AcceptanceHandoverUpdateInput,
        include: handoverInclude,
      });
    });

    return handover;
  }

  async deleteAcceptanceHandover(id: string, actorRole?: string, actorId?: string) {
    const existingHandover = await prisma.acceptanceHandover.findUnique({
      where: { id },
      include: { repairRequest: { select: { id: true, trangThai: true, maYeuCau: true } } },
    });

    if (!existingHandover) {
      throw new NotFoundError('Không tìm thấy nghiệm thu bàn giao');
    }

    const isAdmin = actorRole === 'ADMIN';

    // 6.5 Guard: block deletes when parent is HOAN_THANH, unless ADMIN
    if (existingHandover.repairRequest?.trangThai === RepairRequestStatus.HOAN_THANH && !isAdmin) {
      throw new ValidationError('Không thể xóa nghiệm thu bàn giao khi yêu cầu sửa chữa đã hoàn thành');
    }
    // YCKT slips are the evidence for "Đã khắc phục" — only ADMIN may remove them
    if (existingHandover.inspectionRequestId && !isAdmin) {
      throw new ValidationError('Không thể xóa phiếu nghiệm thu của yêu cầu kiểm tra');
    }

    await prisma.$transaction(async (tx) => {
      // ADMIN override audit log
      if (isAdmin && existingHandover.repairRequestId && existingHandover.repairRequest?.trangThai === RepairRequestStatus.HOAN_THANH) {
        await tx.repairRequestStatusLog.create({
          data: {
            repairRequestId: existingHandover.repairRequestId,
            oldStatus: RepairRequestStatus.HOAN_THANH,
            newStatus: RepairRequestStatus.HOAN_THANH,
            actorId: actorId ?? null,
            actorRole: 'ADMIN',
            reason: 'admin_override:delete',
          },
        });
      }

      await tx.acceptanceHandover.delete({ where: { id } });
    });

    return { message: 'Xóa nghiệm thu bàn giao thành công' };
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { maNghiemThu: { contains: filters.search, mode: 'insensitive' } },
        { maYeuCauSuaChua: { contains: filters.search, mode: 'insensitive' } },
        { tenHeThongThietBi: { contains: filters.search, mode: 'insensitive' } },
        { nguoiBanGiao: { contains: filters.search, mode: 'insensitive' } },
        { nguoiNhan: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const data = await prisma.acceptanceHandover.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách nghiệm thu bàn giao');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã nghiệm thu', key: 'maNghiemThu', width: 18 },
      { header: 'Mã yêu cầu sửa chữa', key: 'maYeuCauSuaChua', width: 22 },
      { header: 'Tên hệ thống/thiết bị', key: 'tenHeThongThietBi', width: 25 },
      { header: 'Tình trạng trước sửa chữa', key: 'tinhTrangTruocSuaChua', width: 25 },
      { header: 'Tình trạng sau sửa chữa', key: 'tinhTrangSauSuaChua', width: 25 },
      { header: 'Người bàn giao', key: 'nguoiBanGiao', width: 20 },
      { header: 'Người nhận', key: 'nguoiNhan', width: 20 },
      { header: 'Ghi chú', key: 'ghiChu', width: 25 },
      { header: 'Ngày tạo', key: 'createdAt', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((item, index) => {
      worksheet.addRow({
        stt: index + 1,
        maNghiemThu: item.maNghiemThu,
        maYeuCauSuaChua: item.maYeuCauSuaChua,
        tenHeThongThietBi: item.tenHeThongThietBi,
        tinhTrangTruocSuaChua: item.tinhTrangTruocSuaChua,
        tinhTrangSauSuaChua: item.tinhTrangSauSuaChua,
        nguoiBanGiao: item.nguoiBanGiao,
        nguoiNhan: item.nguoiNhan,
        ghiChu: item.ghiChu || '',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new AcceptanceHandoverService();
