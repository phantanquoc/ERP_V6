import { Prisma, RepairRequestStatus, FaultRecordStatus, RequestType, NghiemThuKetQua, InspectionRequestStatus } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import { NotificationEvent } from '@types';
import notificationService from './notificationService';
import { advanceRepairRequestStatus } from '@utils/statusTransitions';
import { closeLinkedFaultRecords } from '@utils/faultRecordCascade';
import acceptanceHandoverService from '@services/acceptanceHandoverService';
import { isTechnicalMember } from '@middlewares/technicalAccess';
import ExcelJS from 'exceljs';
import logger from '@config/logger';

export const STALE_ROW_MESSAGE = 'Phiếu đã được cập nhật bởi người khác, vui lòng tải lại';
export const ITEM_IN_USE_MESSAGE = 'Không thể xóa hạng mục đã có nghiệm thu/vật tư/liên kết';

// Technician / ADMIN may edit a YCSC up to Chờ nghiệm thu (B: allow edit at CHO_NGHIEM_THU).
const YCSC_TECH_EDITABLE: ReadonlySet<RepairRequestStatus> = new Set<RepairRequestStatus>([
  RepairRequestStatus.CHO_XU_LY,
  RepairRequestStatus.DA_TIEP_NHAN,
  RepairRequestStatus.LEN_KE_HOACH,
  RepairRequestStatus.DANG_SUA_CHUA,
  RepairRequestStatus.CHO_NGHIEM_THU,
]);
const YCSC_DELETABLE: ReadonlySet<RepairRequestStatus> = new Set<RepairRequestStatus>([
  RepairRequestStatus.CHO_XU_LY,
  RepairRequestStatus.DA_HUY,
  RepairRequestStatus.TU_CHOI,
]);
// Execution fields belong to the technician — never accepted from a non-technical requester.
const EXECUTION_FIELDS = ['chiPhiThucTe', 'noiDungThucHien', 'gioCongThucTe'] as const;
const SOURCE_KET_LUAN_CAN_SUA_CHUA = 'CAN_SUA_CHUA';
// Supply lines closed without further issuing: cancelled, or warehouse decided not to issue
// (supplyRequestService sets 'Không cấp' with fulfilledQty = 0). They cost only what was issued.
const CLOSED_SUPPLY_ITEM_STATUSES: ReadonlySet<string> = new Set(['Đã hủy', 'Không cấp']);

const REPAIR_STATUS_LABELS: Record<string, string> = {
  CHO_XU_LY: 'Chờ xử lý',
  DA_TIEP_NHAN: 'Đã tiếp nhận',
  LEN_KE_HOACH: 'Lên kế hoạch',
  DANG_SUA_CHUA: 'Đang sửa chữa',
  CHO_NGHIEM_THU: 'Chờ nghiệm thu',
  DA_NGHIEM_THU: 'Đã nghiệm thu',
  HOAN_THANH: 'Hoàn thành',
  DA_HUY: 'Đã hủy',
  TU_CHOI: 'Từ chối',
};
const REQUEST_TYPE_LABELS: Record<string, string> = { SUA_CHUA: 'Sửa chữa', KIEM_TRA: 'Kiểm tra' };
const KET_QUA_LABELS: Record<string, string> = { DAT: 'Đạt', KHONG_DAT: 'Không đạt' };

interface RepairRequestItemData {
  /** Existing item id — present when the client edits an item in place. */
  id?: string;
  machineSystemId?: string;
  machineSystemDetailId?: string;
  tenHeThong: string;
  tinhTrangThietBi: string;
  loaiLoi: string;
  noiDungLoi: string;
  faultRecordId?: string | null;
  sourceInspectionItemId?: string | null;
  phuongAnSua?: string | null;
}

interface CreateRepairRequestData {
  ngayThang: Date;
  maYeuCau: string;
  tenHeThong?: string;
  tinhTrangThietBi?: string;
  loaiLoi?: string;
  mucDoUuTien: string;
  noiDungLoi?: string;
  ghiChu?: string;
  trangThai?: string;
  fileDinhKem?: string;
  items?: RepairRequestItemData[];
  userId?: string;
  actorRole?: string;
  requestType?: RequestType;
  sourceInspectionRequestId?: string | null;
  ngayHoanThienDuKien?: Date | null;
  ngayBatDauKeHoach?: Date | null;
  keHoachChiTiet?: string | null;
  phuongAn?: string | null;
  bienPhapAnToan?: string | null;
  chiPhiDuKien?: number | null;
  chiPhiThucTe?: number | null;
  noiDungThucHien?: string | null;
  gioCongThucTe?: number | null;
  canNgungMay?: boolean;
  phongBanId?: string | null;
}

interface UpdateRepairRequestData {
  ngayThang?: Date;
  tenHeThong?: string;
  tinhTrangThietBi?: string;
  loaiLoi?: string;
  mucDoUuTien?: string;
  noiDungLoi?: string;
  ghiChu?: string;
  trangThai?: string;
  fileDinhKem?: string;
  items?: RepairRequestItemData[];
  requestType?: string;
  ngayHoanThienDuKien?: Date | null;
  ngayBatDauKeHoach?: Date | null;
  keHoachChiTiet?: string | null;
  phuongAn?: string | null;
  bienPhapAnToan?: string | null;
  chiPhiDuKien?: number | null;
  chiPhiThucTe?: number | null;
  noiDungThucHien?: string | null;
  gioCongThucTe?: number | null;
  canNgungMay?: boolean;
  phongBanId?: string | null;
}

export interface RepairRequestFilters {
  search?: string;
  trangThai?: RepairRequestStatus;
  requestType?: RequestType;
  sourceInspectionRequestId?: string;
}

interface ActorContext {
  actorId?: string;
  actorRole?: string;
}

type TransitionRow = {
  id: number;
  trangThai: RepairRequestStatus;
  maYeuCau: string;
  requestType: RequestType;
  createdById: string | null;
};

interface TransitionOptions {
  extraData?: Prisma.RepairRequestUpdateManyMutationInput;
  /** Runs inside the transaction on the freshly read row, before the status change. */
  precheck?: (row: TransitionRow, tx: Prisma.TransactionClient) => Promise<void> | void;
  afterUpdate?: (tx: Prisma.TransactionClient, maYeuCau: string) => Promise<void>;
}

const repairRequestInclude = {
  acceptanceHandovers: {
    include: {
      items: {
        include: {
          repairRequestItem: true,
          machineSystem: true,
          machineSystemDetail: true,
        },
      },
    },
  },
  items: {
    include: {
      machineSystem: true,
      machineSystemDetail: true,
      materialNeeds: true,
      supplyLinks: true,
      sourceInspectionItem: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
  assignees: {
    orderBy: [{ isLead: 'desc' as const }, { assignedAt: 'asc' as const }],
  },
  supplyLinks: true,
  materialNeeds: {
    include: { repairRequestItem: { select: { id: true, tenHeThong: true } } },
  },
  inspectionRequest: { select: { maYeuCau: true, createdById: true, createdByName: true } },
  incidentalCosts: true,
} satisfies Prisma.RepairRequestInclude;

type PlanCostItem = { supplyRequestItemId: string; tenGoi: string; soLuong: number; price: number | null };
type ActualCostItem = { supplyRequestItemId: string; tenGoi: string; qty: number; price: number | null };

// faultRecordId / sourceInspectionItemId / phuongAnSua stay `undefined` when the client omitted them,
// so an in-place item update keeps the stored value instead of clearing it.
type ResolvedRepairRequestItemData = Omit<RepairRequestItemData, 'machineSystemId' | 'machineSystemDetailId'> & {
  machineSystemId: string | null;
  machineSystemDetailId: string | null;
  faultRecordId?: string | null;
};

// Planning fields only for SUA_CHUA
const PLANNING_FIELDS = [
  'ngayHoanThienDuKien',
  'ngayBatDauKeHoach',
  'keHoachChiTiet',
  'phuongAn',
  'bienPhapAnToan',
  'chiPhiDuKien',
  'canNgungMay',
  'phongBanId',
] as const;

class RepairRequestService {
  async generateRepairRequestCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.repairRequest.findFirst({
      where: { maYeuCau: yearlyCodeWhere('YC-SC', year) },
      orderBy: { maYeuCau: 'desc' },
      select: { maYeuCau: true },
    });
    return nextYearlyCode(last?.maYeuCau ?? null, 'YC-SC', year);
  }

  async getAllRepairRequests(page: number = 1, limit: number = 10, filters?: RepairRequestFilters) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);

    const where: Prisma.RepairRequestWhereInput = {};
    if (filters?.search) {
      where.OR = [
        { maYeuCau: { contains: filters.search, mode: 'insensitive' } },
        { tenHeThong: { contains: filters.search, mode: 'insensitive' } },
        { noiDungLoi: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.trangThai) {
      where.trangThai = filters.trangThai;
    }
    if (filters?.requestType) {
      where.requestType = filters.requestType;
    }
    if (filters?.sourceInspectionRequestId) {
      const sid = Number(filters.sourceInspectionRequestId);
      if (!Number.isNaN(sid)) where.sourceInspectionRequestId = sid;
    }

    const [data, total] = await Promise.all([
      prisma.repairRequest.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: repairRequestInclude,
      }),
      prisma.repairRequest.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getRepairRequestById(id: number) {
    const request = await prisma.repairRequest.findUnique({
      where: { id },
      include: repairRequestInclude,
    });

    if (!request) {
      throw new NotFoundError('Không tìm thấy yêu cầu sửa chữa');
    }

    return request;
  }

  /** ADMIN or a Kỹ thuật member (primary or secondary department). */
  private async isPrivileged(actor: ActorContext): Promise<boolean> {
    if (actor.actorRole === 'ADMIN') return true;
    if (!actor.actorId) return false;
    return isTechnicalMember(actor.actorId);
  }

  /**
   * Edit permission (shared contract with the frontend):
   *  - non-technical user: only their own request and only while CHO_XU_LY
   *  - technician / ADMIN: while the request is before acceptance (≤ DANG_SUA_CHUA)
   */
  private assertCanEdit(row: { trangThai: RepairRequestStatus; createdById: string | null }, actor: ActorContext, privileged: boolean): void {
    if (privileged) {
      if (!YCSC_TECH_EDITABLE.has(row.trangThai)) {
        throw new ValidationError('Không thể chỉnh sửa yêu cầu sửa chữa từ bước Chờ nghiệm thu trở đi');
      }
      return;
    }
    if (!actor.actorId || row.createdById !== actor.actorId) {
      throw new AuthorizationError('Chỉ người tạo phiếu hoặc bộ phận Kỹ thuật mới được sửa yêu cầu này');
    }
    if (row.trangThai !== RepairRequestStatus.CHO_XU_LY) {
      throw new ValidationError('Chỉ được sửa yêu cầu của mình khi phiếu còn Chờ xử lý');
    }
  }

  /** sourceInspectionItemId must belong to the YCSC's source YCKT (and requires a source). */
  private async assertSourceInspectionItems(sourceInspectionRequestId: number | null, items: Array<{ sourceInspectionItemId?: string | null }>): Promise<void> {
    const srcItemIds = items.map((it) => it.sourceInspectionItemId).filter((v): v is string => !!v);
    if (srcItemIds.length === 0) return;
    if (!sourceInspectionRequestId) {
      throw new ValidationError('Hạng mục chỉ được liên kết phiếu kiểm tra khi yêu cầu sửa chữa được tạo từ phiếu kiểm tra');
    }
    const srcItems = await prisma.inspectionRequestItem.findMany({
      where: { id: { in: srcItemIds }, inspectionRequestId: sourceInspectionRequestId },
      select: { id: true },
    });
    const foundIds = new Set(srcItems.map((s) => s.id));
    for (const sid of srcItemIds) {
      if (!foundIds.has(sid)) {
        throw new ValidationError(`sourceInspectionItemId không thuộc phiếu kiểm tra nguồn: ${sid}`);
      }
    }
  }

  /**
   * Sync items of an existing YCSC by id.
   * Intentional deviation from the "delete-then-recreate" convention: RepairMaterialNeed,
   * RepairSupplyLink and AcceptanceHandoverItem reference RepairRequestItem.id, so items are diffed —
   * entries with an id are updated in place, entries without id are created, missing ones are deleted
   * unless something still references them.
   */
  private async syncRepairItems(tx: Prisma.TransactionClient, repairRequestId: number, items: ResolvedRepairRequestItemData[]): Promise<void> {
    const existing = await tx.repairRequestItem.findMany({ where: { repairRequestId }, select: { id: true } });
    const existingIds = new Set(existing.map((e) => e.id));
    const keepIds = new Set<string>();
    for (const it of items) {
      if (!it.id) continue;
      if (!existingIds.has(it.id)) throw new ValidationError('Hạng mục không thuộc yêu cầu sửa chữa này');
      if (keepIds.has(it.id)) throw new ValidationError('Hạng mục bị trùng trong danh sách');
      keepIds.add(it.id);
    }

    const removeIds = existing.map((e) => e.id).filter((eid) => !keepIds.has(eid));
    if (removeIds.length > 0) {
      const inRemoved = { repairRequestItemId: { in: removeIds } };
      const handoverRefs = await tx.acceptanceHandoverItem.count({ where: inRemoved });
      const needRefs = await tx.repairMaterialNeed.count({ where: inRemoved });
      const linkRefs = await tx.repairSupplyLink.count({ where: inRemoved });
      if (handoverRefs + needRefs + linkRefs > 0) throw new ValidationError(ITEM_IN_USE_MESSAGE);
      await tx.repairRequestItem.deleteMany({ where: { id: { in: removeIds }, repairRequestId } });
    }

    for (const it of items) {
      if (!it.id) continue;
      await tx.repairRequestItem.update({
        where: { id: it.id },
        data: {
          machineSystemId: it.machineSystemId,
          machineSystemDetailId: it.machineSystemDetailId,
          tenHeThong: it.tenHeThong,
          tinhTrangThietBi: it.tinhTrangThietBi,
          loaiLoi: it.loaiLoi,
          noiDungLoi: it.noiDungLoi,
          ...(it.faultRecordId !== undefined && { faultRecordId: it.faultRecordId }),
          ...(it.sourceInspectionItemId !== undefined && { sourceInspectionItemId: it.sourceInspectionItemId }),
          ...(it.phuongAnSua !== undefined && { phuongAnSua: it.phuongAnSua }),
        },
      });
    }

    const toCreate = items.filter((it) => !it.id);
    if (toCreate.length > 0) {
      await tx.repairRequestItem.createMany({
        data: toCreate.map((item) => ({
          repairRequestId,
          machineSystemId: item.machineSystemId,
          machineSystemDetailId: item.machineSystemDetailId,
          tenHeThong: item.tenHeThong,
          tinhTrangThietBi: item.tinhTrangThietBi,
          loaiLoi: item.loaiLoi,
          noiDungLoi: item.noiDungLoi,
          faultRecordId: item.faultRecordId ?? null,
          sourceInspectionItemId: item.sourceInspectionItemId ?? null,
          phuongAnSua: item.phuongAnSua ?? null,
        })),
      });
    }
  }

  /**
   * sourceInspectionItemId → faultRecordId for the items of the source YCKT. A YCSC item that comes
   * from a YCKT item inherits that item's fault link even when the fault record is no longer
   * DANG_THEO_DOI / TAI_PHAT (the YCKT already decided the link).
   */
  private async inheritedFaultBySourceItem(sourceInspectionRequestId: number | null, items: RepairRequestItemData[] = []): Promise<Map<string, string>> {
    const srcItemIds = items.map((it) => it.sourceInspectionItemId).filter((v): v is string => !!v);
    if (!sourceInspectionRequestId || srcItemIds.length === 0) return new Map();
    const rows = await prisma.inspectionRequestItem.findMany({
      where: { id: { in: srcItemIds }, inspectionRequestId: sourceInspectionRequestId, faultRecordId: { not: null } },
      select: { id: true, faultRecordId: true },
    });
    return new Map(rows.map((r) => [r.id, r.faultRecordId as string]));
  }

  /**
   * @param keepFaultIds fault records already linked to the request — their status is not re-validated
   *                     (a linked record may have moved on since it was attached).
   * @param inheritedFaults sourceInspectionItemId → faultRecordId of the source YCKT items; an item whose
   *                     faultRecordId equals its source item's link is accepted without a status check.
   */
  private async resolveRepairItems(
    items: RepairRequestItemData[] = [],
    keepFaultIds: ReadonlySet<string> = new Set(),
    inheritedFaults: ReadonlyMap<string, string> = new Map(),
  ): Promise<ResolvedRepairRequestItemData[]> {
    return Promise.all(items.map(async (item) => {
      let machineSystem = item.machineSystemId
        ? await prisma.machineSystem.findUnique({ where: { id: item.machineSystemId } })
        : null;

      let machineSystemDetail = item.machineSystemDetailId
        ? await prisma.machineSystemDetail.findUnique({
            where: { id: item.machineSystemDetailId },
            include: { machineSystem: true },
          })
        : null;

      if (item.machineSystemId && !machineSystem) {
        throw new ValidationError('Hệ thống máy không hợp lệ');
      }

      if (item.machineSystemDetailId && !machineSystemDetail) {
        throw new ValidationError('Chi tiết hệ thống máy không hợp lệ');
      }

      if (machineSystemDetail) {
        if (machineSystem && machineSystem.id !== machineSystemDetail.machineSystemId) {
          throw new ValidationError('Chi tiết máy không thuộc hệ thống máy đã chọn');
        }
        machineSystem = machineSystemDetail.machineSystem;
      }

      let resolvedFaultRecordId: string | null = null;
      if (item.faultRecordId) {
        const fr = await prisma.faultRecord.findUnique({
          where: { id: item.faultRecordId },
          select: { id: true, trangThai: true },
        });
        if (!fr) {
          throw new ValidationError(`Bản ghi lỗi không tồn tại: ${item.faultRecordId}`);
        }
        const allowedStatuses: FaultRecordStatus[] = [FaultRecordStatus.DANG_THEO_DOI, FaultRecordStatus.TAI_PHAT];
        const inherited = !!item.sourceInspectionItemId && inheritedFaults.get(item.sourceInspectionItemId) === fr.id;
        if (!keepFaultIds.has(fr.id) && !inherited && !allowedStatuses.includes(fr.trangThai)) {
          throw new ValidationError(`Bản ghi lỗi phải ở trạng thái Đang theo dõi hoặc Tái phát để liên kết`);
        }
        resolvedFaultRecordId = fr.id;
      }

      return {
        ...item,
        machineSystemId: machineSystem?.id ?? null,
        machineSystemDetailId: machineSystemDetail?.id ?? null,
        tenHeThong: machineSystem ? machineSystem.tenHeThong : item.tenHeThong,
        tinhTrangThietBi: machineSystemDetail && !item.tinhTrangThietBi
          ? machineSystemDetail.tenChiTiet
          : item.tinhTrangThietBi,
        faultRecordId: item.faultRecordId === undefined ? undefined : resolvedFaultRecordId,
        sourceInspectionItemId: item.sourceInspectionItemId === undefined ? undefined : (item.sourceInspectionItemId || null),
        phuongAnSua: item.phuongAnSua === undefined ? undefined : (item.phuongAnSua ?? null),
      };
    }));
  }

  async createRepairRequest(data: CreateRepairRequestData) {
    if (data.trangThai !== undefined) {
      logger.warn(`Ignored client-supplied trangThai on repair-request create (maYeuCau: ${data.maYeuCau})`);
    }

    if ((data.requestType as string) === RequestType.KIEM_TRA) {
      throw new ValidationError('Phiếu kiểm tra phải tạo qua /inspection-requests');
    }
    const requestType: RequestType = RequestType.SUA_CHUA;

    let sourceInspectionRequestId: string | null = data.sourceInspectionRequestId ? String(data.sourceInspectionRequestId) : null;
    if (sourceInspectionRequestId) {
      const sid = Number(sourceInspectionRequestId);
      if (Number.isNaN(sid)) throw new ValidationError(`Phiếu kiểm tra nguồn không hợp lệ: ${sourceInspectionRequestId}`);
      // Creating a YCSC from a YCKT is a technician step (it also decides who confirms acceptance).
      if (!(await this.isPrivileged({ actorId: data.userId, actorRole: data.actorRole }))) {
        throw new AuthorizationError('Chỉ nhân viên bộ phận Kỹ thuật mới được tạo yêu cầu sửa chữa từ phiếu kiểm tra');
      }
      const src = await prisma.inspectionRequest.findUnique({
        where: { id: sid },
        select: { id: true, trangThai: true, ketLuan: true },
      });
      if (!src) throw new ValidationError(`Phiếu kiểm tra nguồn không tồn tại: ${sourceInspectionRequestId}`);
      if (src.trangThai !== InspectionRequestStatus.DA_KIEM_TRA || src.ketLuan !== SOURCE_KET_LUAN_CAN_SUA_CHUA) {
        throw new ValidationError('Chỉ tạo yêu cầu sửa chữa từ phiếu kiểm tra đã kiểm tra với kết luận Cần sửa chữa');
      }
      sourceInspectionRequestId = String(src.id);
    }

    const sourceId = sourceInspectionRequestId ? Number(sourceInspectionRequestId) : null;
    const inheritedFaults = await this.inheritedFaultBySourceItem(sourceId, data.items);
    const resolvedItems = await this.resolveRepairItems(data.items, new Set(), inheritedFaults);

    await this.assertSourceInspectionItems(sourceId, resolvedItems);

    const firstItem = resolvedItems.length > 0 ? resolvedItems[0] : null;

    let createdByName: string | null = null;
    if (data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        createdByName = `${user.lastName} ${user.firstName}`.trim();
      }
    }

    // Build planning data — only persist for SUA_CHUA
    const planningData: Record<string, unknown> = {};
    if (requestType === RequestType.SUA_CHUA) {
      if (data.ngayHoanThienDuKien !== undefined) planningData.ngayHoanThienDuKien = data.ngayHoanThienDuKien ?? null;
      if (data.ngayBatDauKeHoach !== undefined) planningData.ngayBatDauKeHoach = data.ngayBatDauKeHoach ?? null;
      if (data.keHoachChiTiet !== undefined) planningData.keHoachChiTiet = data.keHoachChiTiet ?? null;
      if (data.phuongAn !== undefined) planningData.phuongAn = data.phuongAn ?? null;
      if (data.bienPhapAnToan !== undefined) planningData.bienPhapAnToan = data.bienPhapAnToan ?? null;
      if (data.chiPhiDuKien !== undefined) planningData.chiPhiDuKien = data.chiPhiDuKien ?? null;
      if (data.chiPhiThucTe !== undefined) planningData.chiPhiThucTe = data.chiPhiThucTe ?? null;
      if (data.noiDungThucHien !== undefined) planningData.noiDungThucHien = data.noiDungThucHien ?? null;
      if (data.gioCongThucTe !== undefined) planningData.gioCongThucTe = data.gioCongThucTe ?? null;
      if (data.canNgungMay !== undefined) planningData.canNgungMay = data.canNgungMay;
      if (data.phongBanId !== undefined) planningData.phongBanId = data.phongBanId ?? null;
    }

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.repairRequest.create({
        data: {
          ngayThang: data.ngayThang,
          maYeuCau: data.maYeuCau,
          tenHeThong: firstItem ? firstItem.tenHeThong : (data.tenHeThong ?? null),
          tinhTrangThietBi: firstItem ? firstItem.tinhTrangThietBi : (data.tinhTrangThietBi ?? null),
          loaiLoi: firstItem ? firstItem.loaiLoi : (data.loaiLoi ?? null),
          noiDungLoi: firstItem ? firstItem.noiDungLoi : (data.noiDungLoi ?? null),
          mucDoUuTien: data.mucDoUuTien,
          ghiChu: data.ghiChu,
          trangThai: RepairRequestStatus.CHO_XU_LY,
          requestType,
          sourceInspectionRequestId: sourceInspectionRequestId ? Number(sourceInspectionRequestId) : null,
          fileDinhKem: data.fileDinhKem,
          createdById: data.userId ?? null,
          createdByName,
          ...planningData,
        },
      });

      if (resolvedItems.length > 0) {
        await tx.repairRequestItem.createMany({
          data: resolvedItems.map((item) => ({
            repairRequestId: created.id,
            machineSystemId: item.machineSystemId,
            machineSystemDetailId: item.machineSystemDetailId,
            tenHeThong: item.tenHeThong,
            tinhTrangThietBi: item.tinhTrangThietBi,
            loaiLoi: item.loaiLoi,
            noiDungLoi: item.noiDungLoi,
            faultRecordId: item.faultRecordId ?? null,
            sourceInspectionItemId: item.sourceInspectionItemId ?? null,
            phuongAnSua: item.phuongAnSua ?? null,
          })),
        });
      }

      // Initial status log (null → CHO_XU_LY) like YCKT, so the timeline starts at creation.
      // oldStatus is non-nullable on RepairRequestStatusLog, so the creation edge is stored as CHO_XU_LY→CHO_XU_LY.
      await tx.repairRequestStatusLog.create({
        data: {
          repairRequestId: created.id,
          oldStatus: RepairRequestStatus.CHO_XU_LY,
          newStatus: RepairRequestStatus.CHO_XU_LY,
          actorId: data.userId ?? null,
          actorRole: data.actorRole ?? null,
          reason: 'create',
        },
      });

      return tx.repairRequest.findUnique({
        where: { id: created.id },
        include: repairRequestInclude,
      });
    });

    notificationService.notify(NotificationEvent.REPAIR_REQUEST_CREATED, {
      entityId: String(request!.id),
      metadata: {
        maYeuCau: request!.maYeuCau,
        tenHeThong: request!.tenHeThong,
      },
    }).catch(() => {});

    return request;
  }

  async updateRepairRequest(id: number, data: UpdateRepairRequestData, actor: ActorContext = {}) {
    const existing = await this.getRepairRequestById(id);
    const privileged = await this.isPrivileged(actor);
    this.assertCanEdit(existing, actor, privileged);

    if ('trangThai' in data && data.trangThai !== undefined) {
      logger.warn(`Ignored client-supplied trangThai on repair-request update (id: ${id})`);
    }
    if ('requestType' in data && data.requestType !== undefined && data.requestType !== existing.requestType) {
      throw new ValidationError('Không thể đổi loại phiếu sau khi tạo');
    }

    const { items, trangThai: _dropped, requestType: _rt, ...scalarData } = data as UpdateRepairRequestData & { trangThai?: string; requestType?: string };
    const scalar = scalarData as Record<string, unknown>;
    // Acceptance result is written only by confirmAcceptance.
    delete scalar.ketQuaNghiemThu;
    if (!privileged) {
      for (const f of EXECUTION_FIELDS) delete scalar[f];
    }
    // For KIEM_TRA, strip planning fields
    if (existing.requestType === RequestType.KIEM_TRA) {
      for (const f of PLANNING_FIELDS) {
        if (f in scalar) {
          delete scalar[f];
          logger.warn(`Ignored planning field ${f} on KIEM_TRA update (id: ${id})`);
        }
      }
    }
    const linkedFaultIds = new Set(existing.items.map((it) => it.faultRecordId).filter((v): v is string => !!v));
    const inheritedFaults = items !== undefined
      ? await this.inheritedFaultBySourceItem(existing.sourceInspectionRequestId, items)
      : new Map<string, string>();
    const resolvedItems = items !== undefined ? await this.resolveRepairItems(items, linkedFaultIds, inheritedFaults) : undefined;
    if (resolvedItems) await this.assertSourceInspectionItems(existing.sourceInspectionRequestId, resolvedItems);

    const updated = await prisma.$transaction(async (tx) => {
      // Optimistic guard: the row must still be in the status the permission check saw.
      const guard = await tx.repairRequest.updateMany({
        where: { id, trangThai: existing.trangThai },
        data: { updatedAt: new Date() },
      });
      if (guard.count === 0) throw new ConflictError(STALE_ROW_MESSAGE);

      if (resolvedItems !== undefined) {
        await this.syncRepairItems(tx, id, resolvedItems);
        if (resolvedItems.length > 0) {
          const firstItem = resolvedItems[0];
          scalar.tenHeThong = firstItem.tenHeThong;
          scalar.tinhTrangThietBi = firstItem.tinhTrangThietBi;
          scalar.loaiLoi = firstItem.loaiLoi;
          scalar.noiDungLoi = firstItem.noiDungLoi;
        }
      }

      return tx.repairRequest.update({
        where: { id },
        data: scalar as Prisma.RepairRequestUpdateInput,
        include: repairRequestInclude,
      });
    });

    notificationService.notify(NotificationEvent.REPAIR_REQUEST_UPDATED, {
      entityId: String(updated.id),
      metadata: {
        maYeuCau: updated.maYeuCau,
        tenHeThong: updated.tenHeThong,
        status: updated.trangThai,
      },
    }).catch(() => {});

    return updated;
  }

  // ── Transitions ──────────────────────────────────────────────────────────

  /**
   * Single status-change path. Reads the row inside the transaction, runs `precheck` on that fresh
   * row, then writes with an optimistic guard (where trangThai = current) so two concurrent
   * transitions cannot both succeed from the same source status.
   */
  private async transition(
    id: number,
    nextStatus: RepairRequestStatus,
    actor: ActorContext,
    reason: string,
    opts: TransitionOptions = {},
  ) {
    const { extraData, precheck, afterUpdate } = opts;
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.repairRequest.findUnique({
        where: { id },
        select: { id: true, trangThai: true, maYeuCau: true, requestType: true, createdById: true },
      });
      if (!request) throw new NotFoundError('Không tìm thấy yêu cầu sửa chữa');

      if (precheck) await precheck(request, tx);

      const validated = advanceRepairRequestStatus(
        request.trangThai,
        nextStatus,
        { bypass: actor.actorRole === 'ADMIN', requestType: request.requestType as string }
      );

      if (validated === request.trangThai) {
        return tx.repairRequest.findUnique({ where: { id }, include: repairRequestInclude });
      }

      const guard = await tx.repairRequest.updateMany({
        where: { id, trangThai: request.trangThai },
        data: { trangThai: validated, ...(extraData ?? {}) },
      });
      if (guard.count === 0) throw new ConflictError(STALE_ROW_MESSAGE);

      await tx.repairRequestStatusLog.create({
        data: {
          repairRequestId: id,
          oldStatus: request.trangThai,
          newStatus: validated,
          actorId: actor.actorId ?? null,
          actorRole: actor.actorRole ?? null,
          reason,
        },
      });

      if (afterUpdate) await afterUpdate(tx, request.maYeuCau);

      return tx.repairRequest.findUnique({ where: { id }, include: repairRequestInclude });
    });

    notificationService.notify(NotificationEvent.REPAIR_REQUEST_UPDATED, {
      entityId: String(id),
      metadata: { maYeuCau: result?.maYeuCau, status: result?.trangThai },
    }).catch(() => {});

    return result;
  }

  async accept(id: number, actor: ActorContext) {
    return this.transition(id, RepairRequestStatus.DA_TIEP_NHAN, actor, 'accept');
  }

  async plan(id: number, actor: ActorContext, keHoachData?: Record<string, unknown>) {
    if (!Number.isFinite(id)) throw new ValidationError('ID không hợp lệ');
    const req = await prisma.repairRequest.findUnique({ where: { id }, select: { requestType: true } });
    if (!req) throw new NotFoundError('Không tìm thấy yêu cầu sửa chữa');
    if (req.requestType === RequestType.KIEM_TRA) {
      throw new ValidationError('Phiếu kiểm tra không đi qua trạng thái này');
    }
    const extra: Prisma.RepairRequestUpdateManyMutationInput = {};
    if (keHoachData) {
      if (keHoachData.keHoachChiTiet !== undefined) extra.keHoachChiTiet = keHoachData.keHoachChiTiet as string;
      if (keHoachData.phuongAn !== undefined) extra.phuongAn = keHoachData.phuongAn as string;
      if (keHoachData.bienPhapAnToan !== undefined) extra.bienPhapAnToan = keHoachData.bienPhapAnToan as string;
      if (keHoachData.ngayHoanThienDuKien !== undefined) {
        const v = keHoachData.ngayHoanThienDuKien as unknown as string | Date | null;
        extra.ngayHoanThienDuKien = v ? (v instanceof Date ? v : new Date(v as string)) as never : null as never;
      }
      if (keHoachData.ngayBatDauKeHoach !== undefined) {
        const v = keHoachData.ngayBatDauKeHoach as unknown as string | Date | null;
        extra.ngayBatDauKeHoach = v ? (v instanceof Date ? v : new Date(v as string)) as never : null as never;
      }
      if (keHoachData.chiPhiDuKien !== undefined) extra.chiPhiDuKien = keHoachData.chiPhiDuKien as number;
      if (keHoachData.canNgungMay !== undefined) extra.canNgungMay = keHoachData.canNgungMay as boolean;
      if (keHoachData.phongBanId !== undefined) {
        const s = String(keHoachData.phongBanId ?? '').trim();
        if (s) extra.phongBanId = s;
      }
      const dStart = extra.ngayBatDauKeHoach as unknown as Date | undefined;
      const dEnd = extra.ngayHoanThienDuKien as unknown as Date | undefined;
      if (dStart instanceof Date && Number.isNaN(dStart.getTime())) throw new ValidationError('Ngày bắt đầu kế hoạch không hợp lệ');
      if (dEnd instanceof Date && Number.isNaN(dEnd.getTime())) throw new ValidationError('Ngày hoàn thiện dự kiến không hợp lệ');
      if (dStart instanceof Date && dEnd instanceof Date && dEnd.getTime() <= dStart.getTime()) {
        throw new ValidationError('Ngày hoàn thiện dự kiến phải sau ngày bắt đầu kế hoạch');
      }
    }
    try {
      return await this.transition(id, RepairRequestStatus.LEN_KE_HOACH, actor, 'plan', { extraData: extra });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = (e as { code?: string })?.code;
      if (e instanceof ValidationError || e instanceof NotFoundError || e instanceof ConflictError) throw e;
      if (code === 'P2003' || /Foreign key constraint|Invalid.*Date/i.test(msg)) {
        logger.error(`plan: Prisma error id=${id}: ${msg}`);
        throw new ValidationError(msg.includes('phongBanId') || msg.includes('phong_ban') ? 'Phòng ban không hợp lệ' : 'Dữ liệu kế hoạch không hợp lệ');
      }
      throw e;
    }
  }

  async startRepair(id: number, actor: ActorContext) {
    // YCCC optional — warn-mode R4: only warn if links exist but no WarehouseIssue
    const req = await prisma.repairRequest.findUnique({
      where: { id },
      select: { requestType: true, trangThai: true, supplyLinks: { select: { id: true, supplyRequestId: true } } },
    });
    if (req?.requestType === RequestType.KIEM_TRA) {
      throw new ValidationError('Phiếu kiểm tra không đi qua trạng thái này');
    }
    if (req && req.supplyLinks.length > 0) {
      const supplyIds = req.supplyLinks.map((l) => l.supplyRequestId);
      const issues = await prisma.warehouseIssue.findMany({
        where: { supplyRequestId: { in: supplyIds } },
        select: { id: true },
      });
      if (issues.length === 0) {
        logger.warn(`RepairRequest ${id} has supplyLinks but no WarehouseIssue yet (warn-mode R4)`);
      }
    }
    return this.transition(id, RepairRequestStatus.DANG_SUA_CHUA, actor, 'start_repair', {
      // Repair starts only after planning — also for ADMIN, and never re-opens an accepted request.
      precheck: (row) => {
        if (row.trangThai !== RepairRequestStatus.LEN_KE_HOACH) {
          throw new ValidationError('Chỉ bắt đầu sửa chữa khi phiếu đang Lên kế hoạch');
        }
      },
    });
  }

  async submitForAcceptance(id: number, actor: ActorContext) {
    const req = await prisma.repairRequest.findUnique({ where: { id }, select: { requestType: true } });
    if (req?.requestType === RequestType.KIEM_TRA) {
      throw new ValidationError('Phiếu kiểm tra không đi qua trạng thái này');
    }
    const found: { slip: Awaited<ReturnType<typeof acceptanceHandoverService.findActivePendingRepairSlip>> } = { slip: null };
    const result = await this.transition(id, RepairRequestStatus.CHO_NGHIEM_THU, actor, 'submit_acceptance', {
      // A pending slip is mandatory for every role (ADMIN included) — otherwise the requester has
      // nothing to confirm. After a KHÔNG ĐẠT the slip must be a new one, created after that decision.
      precheck: async (row, tx) => {
        if (row.trangThai !== RepairRequestStatus.DANG_SUA_CHUA) {
          throw new ValidationError('Chỉ đề nghị nghiệm thu khi phiếu đang Đang sửa chữa');
        }
        found.slip = await acceptanceHandoverService.findActivePendingRepairSlip(tx, id);
        if (!found.slip) {
          throw new ValidationError('Vui lòng lập phiếu nghiệm thu trước khi đề nghị nghiệm thu');
        }
      },
    });
    // Ask the requester to confirm only now that the YCSC is really waiting (best-effort, never throws).
    if (found.slip) {
      await acceptanceHandoverService.notifyConfirmer(found.slip, found.slip.nguoiXacNhanId, found.slip.nguoiBanGiao);
    }
    return result;
  }

  /**
   * Requester confirms the acceptance slip (CHO_NGHIEM_THU only).
   * Confirmer = creator of the source YCKT if any, else creator of this YCSC (ADMIN may act on behalf).
   * ĐẠT → DA_NGHIEM_THU (technician then completes); KHÔNG ĐẠT (lý do bắt buộc) → back to DANG_SUA_CHUA.
   */
  async confirmAcceptance(id: number, actor: ActorContext, ketQua: NghiemThuKetQua, lyDo?: string) {
    if (ketQua !== NghiemThuKetQua.DAT && ketQua !== NghiemThuKetQua.KHONG_DAT) {
      throw new ValidationError('Kết quả nghiệm thu không hợp lệ');
    }
    const isAdmin = actor.actorRole === 'ADMIN';
    const result = await prisma.$transaction(async (tx) => {
      const r = await tx.repairRequest.findUnique({ where: { id }, select: { id: true, trangThai: true, maYeuCau: true, requestType: true } });
      if (!r) throw new NotFoundError('Không tìm thấy yêu cầu sửa chữa');
      if (r.requestType === RequestType.KIEM_TRA) throw new ValidationError('Phiếu kiểm tra không đi qua trạng thái này');
      if (r.trangThai !== RepairRequestStatus.CHO_NGHIEM_THU) {
        throw new ValidationError('Chỉ xác nhận nghiệm thu khi phiếu đang Chờ nghiệm thu');
      }
      const next = ketQua === NghiemThuKetQua.DAT ? RepairRequestStatus.DA_NGHIEM_THU : RepairRequestStatus.DANG_SUA_CHUA;
      // KHÔNG ĐẠT goes CHO_NGHIEM_THU → DANG_SUA_CHUA directly; validate the forward step it replaces.
      advanceRepairRequestStatus(r.trangThai, RepairRequestStatus.DA_NGHIEM_THU, { bypass: isAdmin, requestType: r.requestType as string });
      // Claim the row first so a concurrent double-confirm fails before touching the slip.
      // Actual cost is never taken from the confirmer (technicians set it). On KHÔNG ĐẠT the stored
      // result is cleared — the request is back in re-work and the slip keeps the decision + reason.
      const guard = await tx.repairRequest.updateMany({
        where: { id, trangThai: r.trangThai },
        data: { trangThai: next, ketQuaNghiemThu: ketQua === NghiemThuKetQua.DAT ? ketQua : null },
      });
      if (guard.count === 0) throw new ConflictError(STALE_ROW_MESSAGE);
      await acceptanceHandoverService.recordConfirmationTx(tx, { repairRequestId: id }, actor, ketQua, lyDo);
      await tx.repairRequestStatusLog.create({
        data: {
          repairRequestId: id,
          oldStatus: r.trangThai,
          newStatus: next,
          actorId: actor.actorId ?? null,
          actorRole: actor.actorRole ?? null,
          reason: ketQua === NghiemThuKetQua.DAT ? 'acceptance_dat' : `acceptance_khong_dat: ${String(lyDo ?? '').trim()}`,
        },
      });
      return tx.repairRequest.findUnique({ where: { id }, include: repairRequestInclude });
    });
    const reasonText = String(lyDo ?? '').trim();
    const statusText = ketQua === NghiemThuKetQua.DAT
      ? 'Đã nghiệm thu (ĐẠT)'
      : `Không đạt nghiệm thu — quay lại sửa chữa${reasonText ? ` (lý do: ${reasonText})` : ''}`;
    notificationService.notify(NotificationEvent.REPAIR_REQUEST_UPDATED, {
      entityId: String(id),
      metadata: { maYeuCau: result?.maYeuCau, status: statusText },
    }).catch(() => {});
    return result;
  }

  async reject(id: number, actor: ActorContext, reason?: string) {
    return this.transition(id, RepairRequestStatus.TU_CHOI, actor, reason ?? 'reject');
  }

  /**
   * Cancel permission: a non-technical user may cancel only their own request while CHO_XU_LY;
   * technicians / ADMIN follow the DA_HUY allowed-from table of advanceRepairRequestStatus.
   */
  async cancel(id: number, actor: ActorContext, opts?: { reason?: string }) {
    const reason = opts?.reason ?? (actor.actorRole === 'ADMIN' ? 'admin_override' : 'user_cancel');
    const privileged = await this.isPrivileged(actor);
    return this.transition(id, RepairRequestStatus.DA_HUY, actor, reason, {
      precheck: (row) => {
        if (privileged) return;
        if (!actor.actorId || row.createdById !== actor.actorId) {
          throw new AuthorizationError('Chỉ người tạo phiếu hoặc bộ phận Kỹ thuật mới được hủy yêu cầu này');
        }
        if (row.trangThai !== RepairRequestStatus.CHO_XU_LY) {
          throw new ValidationError('Chỉ được hủy yêu cầu của mình khi phiếu còn Chờ xử lý');
        }
      },
    });
  }

  // ── Cost helpers ─────────────────────────────────────────────────────────

  private async resolveGiaThanh(tenGoi: string): Promise<number | null> {
    const product = await (prisma as any).internationalProduct?.findFirst?.({
      where: { tenSanPham: { equals: tenGoi, mode: 'insensitive' } },
      select: { giaThanh: true },
    });
    if (product && product.giaThanh != null && Number(product.giaThanh) > 0) return Number(product.giaThanh);
    // Fallback: LotProduct giaThanh (average or first lot with this product name)
    const lot = await (prisma as any).lotProduct?.findFirst?.({
      where: { internationalProduct: { tenSanPham: { equals: tenGoi, mode: 'insensitive' } } },
      select: { giaThanh: true },
      orderBy: { createdAt: 'desc' as const },
    });
    if (lot && lot.giaThanh != null && Number(lot.giaThanh) > 0) return Number(lot.giaThanh);
    // Direct lotProduct by tenSanPham text match (when internationalProductId not linked)
    const lot2 = await prisma.$queryRawUnsafe(
      `SELECT "giaThanh" FROM business.lot_products lp JOIN business.lots l ON l.id=lp."lotId" LIMIT 1`
    ).catch(() => null);
    void lot2;
    return null;
  }

  async calcPlanCost(repairRequestId: number): Promise<{ total: number; items: PlanCostItem[]; itemsWithNullPrice: PlanCostItem[] }> {
    const firstLink = await prisma.repairSupplyLink.findFirst({
      where: { repairRequestId },
      orderBy: { createdAt: 'asc' },
    });
    if (!firstLink) return { total: 0, items: [], itemsWithNullPrice: [] };
    const srItems = await prisma.supplyRequestItem.findMany({
      where: { supplyRequestId: firstLink.supplyRequestId },
    });
    const items: PlanCostItem[] = [];
    let total = 0;
    for (const it of srItems) {
      const price = await this.resolveGiaThanh((it as any).tenGoi);
      const qty = Number((it as any).soLuong ?? 0);
      items.push({ supplyRequestItemId: it.id, tenGoi: (it as any).tenGoi, soLuong: qty, price });
      if (price != null) total += price * qty;
    }
    const itemsWithNullPrice = items.filter((i) => i.price == null);
    return { total, items, itemsWithNullPrice };
  }

  async calcActualCost(repairRequestId: number): Promise<{
    actual: number;
    planSnapshot: number | null;
    incidentalTotal: number;
    itemsWithNullPrice: ActualCostItem[];
    items: ActualCostItem[];
  }> {
    const repair = await prisma.repairRequest.findUnique({
      where: { id: repairRequestId },
      select: { chiPhiDuKien: true },
    });
    const planSnapshot = repair?.chiPhiDuKien != null ? Number(repair.chiPhiDuKien) : null;

    const links = await prisma.repairSupplyLink.findMany({ where: { repairRequestId } });
    const supplyIds = [...new Set(links.map((l) => l.supplyRequestId))];
    const srItems = supplyIds.length > 0
      ? await prisma.supplyRequestItem.findMany({ where: { supplyRequestId: { in: supplyIds } } })
      : [];

    const items: ActualCostItem[] = [];
    let actual = 0;
    for (const it of srItems) {
      // SupplyRequestItem has only soLuong (requested), fulfilledQty (issued by warehouse, default 0)
      // and fulfillmentStatus — no price columns. Quantity = issued qty once the warehouse has issued,
      // else the requested qty; a cancelled / not-issued ('Không cấp') line costs only what was issued.
      const fulfilled = Number(it.fulfilledQty ?? 0);
      const closed = CLOSED_SUPPLY_ITEM_STATUSES.has(String(it.fulfillmentStatus ?? ''));
      const qty = closed ? fulfilled : (fulfilled > 0 ? fulfilled : Number(it.soLuong ?? 0));
      const price = qty > 0 ? await this.resolveGiaThanh(it.tenGoi) : null;
      items.push({ supplyRequestItemId: it.id, tenGoi: it.tenGoi, qty, price });
      if (price != null) actual += price * qty;
    }

    const incidentalCosts = await prisma.repairIncidentalCost.findMany({ where: { repairRequestId } });
    let incidentalTotal = 0;
    for (const ic of incidentalCosts) incidentalTotal += Number(ic.soTien ?? 0);
    actual += incidentalTotal;

    // Only lines that actually cost something need a price.
    const itemsWithNullPrice = items.filter((i) => i.qty > 0 && i.price == null);
    return { actual, planSnapshot, incidentalTotal, itemsWithNullPrice, items };
  }

  async complete(id: number, actor: ActorContext) {
    const { itemsWithNullPrice } = await this.calcActualCost(id);
    if (itemsWithNullPrice.length > 0) {
      const names = itemsWithNullPrice.map((i) => i.tenGoi).join(', ');
      throw new ValidationError(`Không thể hoàn thành: món [${names}] chưa có giá thành. Vui lòng cập nhật giá trước.`);
    }
    const incidentalCosts = await prisma.repairIncidentalCost.findMany({ where: { repairRequestId: id } });
    for (const ic of incidentalCosts) {
      if (Number(ic.soTien) > 0 && !String(ic.lyDo ?? '').trim()) {
        throw new ValidationError('Không thể hoàn thành: chi phí phát sinh có số tiền > 0 nhưng thiếu lý do');
      }
    }
    const result = await this.transition(id, RepairRequestStatus.HOAN_THANH, actor, 'complete', {
      extraData: { ngayHoanThanhThucTe: new Date() },
      // Checked on the row read inside the transaction — ADMIN included (no completion without ĐẠT).
      precheck: (row) => {
        if (row.requestType !== RequestType.KIEM_TRA && row.trangThai !== RepairRequestStatus.DA_NGHIEM_THU) {
          throw new ValidationError('Chỉ hoàn thành khi người yêu cầu đã xác nhận nghiệm thu ĐẠT');
        }
      },
      afterUpdate: (tx, maYeuCau) => closeLinkedFaultRecords(tx, id, maYeuCau, actor.actorId ?? null),
    });
    notificationService.notify(NotificationEvent.REPAIR_REQUEST_COMPLETED, {
      entityId: String(id),
      metadata: { maYeuCau: result?.maYeuCau },
    }).catch(() => {});
    return result;
  }

  // ── Actual execution fields (only when DA_NGHIEM_THU or HOAN_THANH) ───────
  async updateActualFields(
    id: number,
    data: {
      gioCongThucTe?: number | null;
      noiDungThucHien?: string | null;
      chiPhiThucTe?: number | null;
      ketQuaNghiemThu?: NghiemThuKetQua | string | null;
      ngayHoanThanhThucTe?: Date | null;
    },
    actor?: ActorContext
  ) {
    const existing = await this.getRepairRequestById(id);
    const allowedStatuses: RepairRequestStatus[] = [
      RepairRequestStatus.DA_NGHIEM_THU,
      RepairRequestStatus.HOAN_THANH,
    ];
    const bypass = actor?.actorRole === 'ADMIN';
    if (!bypass && !allowedStatuses.includes(existing.trangThai as RepairRequestStatus)) {
      throw new ValidationError('Chỉ được cập nhật thực tế khi phiếu ở trạng thái Đã nghiệm thu hoặc Hoàn thành');
    }
    // ketQuaNghiemThu is written only by confirmAcceptance — never through this endpoint.
    if (data.ketQuaNghiemThu !== undefined) {
      logger.warn(`Ignored ketQuaNghiemThu on actual-fields update (id: ${id})`);
    }
    if (data.chiPhiThucTe != null && (!Number.isFinite(Number(data.chiPhiThucTe)) || Number(data.chiPhiThucTe) < 0)) {
      throw new ValidationError('Chi phí thực tế phải >= 0');
    }
    const updateData: Prisma.RepairRequestUpdateInput = {};
    if (data.gioCongThucTe !== undefined) updateData.gioCongThucTe = data.gioCongThucTe;
    if (data.noiDungThucHien !== undefined) updateData.noiDungThucHien = data.noiDungThucHien;
    if (data.chiPhiThucTe !== undefined) updateData.chiPhiThucTe = data.chiPhiThucTe;
    if (data.ngayHoanThanhThucTe !== undefined) updateData.ngayHoanThanhThucTe = data.ngayHoanThanhThucTe;

    return prisma.repairRequest.update({
      where: { id },
      data: updateData,
      include: repairRequestInclude,
    });
  }

  // ── Assignees ────────────────────────────────────────────────────────────

  async listAssignees(id: number) {
    await this.getRepairRequestById(id);
    return prisma.repairRequestAssignee.findMany({ where: { repairRequestId: id }, orderBy: { assignedAt: 'asc' } });
  }

  async assignUser(id: number, data: { userId?: string; userName?: string; vaiTro?: string; isLead?: boolean }, actor: ActorContext) {
    const req = await this.getRepairRequestById(id);
    if ((req as any).requestType === RequestType.KIEM_TRA) throw new ValidationError('Phiếu kiểm tra không phân công người thực hiện');
    return prisma.$transaction(async (tx) => {
      if (data.isLead) {
        await tx.repairRequestAssignee.updateMany({
          where: { repairRequestId: id, isLead: true },
          data: { isLead: false, vaiTro: 'PHU' as unknown as never },
        });
      }
      const created = await tx.repairRequestAssignee.create({
        data: {
          repairRequestId: id,
          userId: data.userId ?? null,
          userName: data.userName ?? null,
          vaiTro: (data.vaiTro as unknown as never) ?? 'PHU',
          isLead: data.isLead ?? false,
          assignedById: actor.actorId ?? null,
        },
      });
      return created;
    });
  }

  async unassignUser(id: number, assigneeId: string) {
    await this.getRepairRequestById(id);
    const assignee = await prisma.repairRequestAssignee.findFirst({
      where: { id: assigneeId, repairRequestId: id },
    });
    if (!assignee) throw new NotFoundError('Không tìm thấy người được phân công');
    await prisma.repairRequestAssignee.delete({ where: { id: assigneeId } });
    return { message: 'Đã gỡ phân công' };
  }

  // ── MaterialNeeds ────────────────────────────────────────────────────────

  async listMaterialNeeds(id: number) {
    await this.getRepairRequestById(id);
    return prisma.repairMaterialNeed.findMany({ where: { repairRequestId: id }, orderBy: { createdAt: 'asc' } });
  }

  async upsertMaterialNeed(
    id: number,
    needIdOrData: string | Record<string, unknown>,
    dataMaybe?: Record<string, unknown>
  ) {
    const req = await this.getRepairRequestById(id);
    if (req.requestType === RequestType.KIEM_TRA) {
      throw new ValidationError('Phiếu kiểm tra không có vật tư');
    }
    let needId: string | null = null;
    let data: Record<string, unknown>;
    if (typeof needIdOrData === 'string') {
      needId = needIdOrData;
      data = (dataMaybe ?? {}) as Record<string, unknown>;
    } else {
      data = needIdOrData as Record<string, unknown>;
    }

    if (!data.repairRequestItemId || !data.tenVatTu) {
      throw new ValidationError('Thiếu repairRequestItemId hoặc tenVatTu');
    }
    // Validate item belongs to request
    const item = await prisma.repairRequestItem.findFirst({
      where: { id: data.repairRequestItemId as string, repairRequestId: id },
    });
    if (!item) throw new ValidationError('RepairRequestItem không thuộc phiếu này');

    if (needId) {
      return prisma.repairMaterialNeed.update({
        where: { id: needId },
        data: {
          tenVatTu: data.tenVatTu as string,
          maVatTu: (data.maVatTu as string) ?? null,
          donVi: (data.donVi as string) ?? null,
          soLuongDuKien: data.soLuongDuKien as never,
          soLuongThucTe: (data.soLuongThucTe as never) ?? undefined,
          ghiChu: (data.ghiChu as string) ?? null,
        },
      });
    } else {
      return prisma.repairMaterialNeed.create({
        data: {
          repairRequestId: id,
          repairRequestItemId: data.repairRequestItemId as string,
          tenVatTu: data.tenVatTu as string,
          maVatTu: (data.maVatTu as string) ?? null,
          donVi: (data.donVi as string) ?? null,
          soLuongDuKien: data.soLuongDuKien as never,
          soLuongThucTe: (data.soLuongThucTe as never) ?? null,
          ghiChu: (data.ghiChu as string) ?? null,
        },
      });
    }
  }

  async removeMaterialNeed(id: number, needId: string) {
    await this.getRepairRequestById(id);
    const need = await prisma.repairMaterialNeed.findFirst({ where: { id: needId, repairRequestId: id } });
    if (!need) throw new NotFoundError('Không tìm thấy vật tư');
    await prisma.repairMaterialNeed.delete({ where: { id: needId } });
    return { message: 'Đã xóa vật tư' };
  }

  // ── SupplyLinks ──────────────────────────────────────────────────────────

  async listSupplyLinks(id: number) {
    await this.getRepairRequestById(id);
    return prisma.repairSupplyLink.findMany({ where: { repairRequestId: id }, orderBy: { createdAt: 'asc' } });
  }

  async linkSupplyRequest(
    id: number,
    data: { supplyRequestId: string; repairRequestItemId?: string | null; supplyRequestItemId?: string | null; soLuong?: number; ghiChu?: string },
    actor: ActorContext
  ) {
    const req = await this.getRepairRequestById(id);
    if (req.requestType === RequestType.KIEM_TRA) {
      throw new ValidationError('Phiếu kiểm tra không thể liên kết yêu cầu vật tư');
    }
    // Validate SupplyRequest exists (String cuid)
    const sr = await prisma.supplyRequest.findUnique({ where: { id: data.supplyRequestId } });
    if (!sr) throw new ValidationError(`Yêu cầu vật tư không tồn tại: ${data.supplyRequestId}`);

    if (data.repairRequestItemId) {
      const item = await prisma.repairRequestItem.findFirst({
        where: { id: data.repairRequestItemId, repairRequestId: id },
      });
      if (!item) throw new ValidationError('RepairRequestItem không thuộc phiếu này');
    }

    const created = await prisma.repairSupplyLink.create({
      data: {
        repairRequestId: id,
        repairRequestItemId: data.repairRequestItemId ?? null,
        supplyRequestId: data.supplyRequestId,
        supplyRequestItemId: data.supplyRequestItemId ?? null,
        soLuong: data.soLuong as never ?? null,
        ghiChu: data.ghiChu ?? null,
        createdById: actor.actorId ?? null,
      },
    });

    // Auto-calc and snapshot plan cost if chiPhiDuKien is null (first YCCC link)
    try {
      const repair = await prisma.repairRequest.findUnique({ where: { id }, select: { chiPhiDuKien: true } });
      if (repair && repair.chiPhiDuKien == null) {
        const { total } = await this.calcPlanCost(id);
        if (total > 0) {
          await prisma.repairRequest.update({ where: { id }, data: { chiPhiDuKien: total as unknown as never } });
        }
      }
    } catch (e) {
      logger.warn(`linkSupplyRequest auto calcPlanCost failed for repair ${id}: ${e instanceof Error ? e.message : String(e)}`);
    }

    return created;
  }

  async unlinkSupplyRequest(id: number, linkId: string) {
    await this.getRepairRequestById(id);
    const link = await prisma.repairSupplyLink.findFirst({ where: { id: linkId, repairRequestId: id } });
    if (!link) throw new NotFoundError('Không tìm thấy liên kết vật tư');
    await prisma.repairSupplyLink.delete({ where: { id: linkId } });
    return { message: 'Đã gỡ liên kết' };
  }

  // ── Incidental Costs CRUD ────────────────────────────────────────────
  async listIncidentalCosts(id: number) {
    await this.getRepairRequestById(id);
    return (prisma as any).repairIncidentalCost.findMany({ where: { repairRequestId: id }, orderBy: { createdAt: 'asc' } });
  }

  async createIncidentalCost(id: number, data: { tenKhoan: string; soTien: number; lyDo: string; fileMinhChung?: string | null }) {
    await this.getRepairRequestById(id);
    if (data.soTien == null || Number(data.soTien) < 0) throw new ValidationError('soTien phải >= 0');
    if (Number(data.soTien) > 0 && !String(data.lyDo ?? '').trim()) throw new ValidationError('lyDo là bắt buộc khi soTien > 0');
    if (!String(data.tenKhoan ?? '').trim()) throw new ValidationError('tenKhoan là bắt buộc');
    return (prisma as any).repairIncidentalCost.create({
      data: {
        repairRequestId: id,
        tenKhoan: String(data.tenKhoan).trim(),
        soTien: data.soTien as unknown as never,
        lyDo: String(data.lyDo ?? '').trim(),
        fileMinhChung: data.fileMinhChung ?? null,
      },
    });
  }

  async updateIncidentalCost(id: number, costId: string, data: { tenKhoan?: string; soTien?: number; lyDo?: string; fileMinhChung?: string | null }) {
    await this.getRepairRequestById(id);
    const existing = await (prisma as any).repairIncidentalCost.findFirst({ where: { id: costId, repairRequestId: id } });
    if (!existing) throw new NotFoundError('Không tìm thấy chi phí phát sinh');
    const nextSoTien = data.soTien !== undefined ? Number(data.soTien) : Number(existing.soTien);
    if (nextSoTien < 0) throw new ValidationError('soTien phải >= 0');
    const nextLyDo = data.lyDo !== undefined ? String(data.lyDo) : String(existing.lyDo ?? '');
    if (nextSoTien > 0 && !nextLyDo.trim()) throw new ValidationError('lyDo là bắt buộc khi soTien > 0');
    return (prisma as any).repairIncidentalCost.update({
      where: { id: costId },
      data: {
        ...(data.tenKhoan !== undefined ? { tenKhoan: String(data.tenKhoan).trim() } : {}),
        ...(data.soTien !== undefined ? { soTien: data.soTien as unknown as never } : {}),
        ...(data.lyDo !== undefined ? { lyDo: String(data.lyDo).trim() } : {}),
        ...(data.fileMinhChung !== undefined ? { fileMinhChung: data.fileMinhChung } : {}),
      },
    });
  }

  async deleteIncidentalCost(id: number, costId: string) {
    await this.getRepairRequestById(id);
    const existing = await (prisma as any).repairIncidentalCost.findFirst({ where: { id: costId, repairRequestId: id } });
    if (!existing) throw new NotFoundError('Không tìm thấy chi phí phát sinh');
    await (prisma as any).repairIncidentalCost.delete({ where: { id: costId } });
    return { message: 'Đã xóa chi phí phát sinh' };
  }

  async getCostSummary(id: number) {
    await this.getRepairRequestById(id);
    const { actual, planSnapshot, incidentalTotal, itemsWithNullPrice, items } = await this.calcActualCost(id);
    const planFromSnapshot = planSnapshot;
    // Also compute plan total from first YCCC for display if snapshot null
    let planFallback: number | null = null;
    if (planFromSnapshot == null) {
      try { const p = await this.calcPlanCost(id); planFallback = p.total > 0 ? p.total : null; } catch {}
    }
    const duKien = planFromSnapshot ?? planFallback;
    const thucTe = actual;
    const chenhLech = duKien != null ? thucTe - duKien : null;
    return { duKien, thucTe, chenhLech, incidentalTotal, itemsWithNullPrice, items };
  }

  async getStatusHistory(id: number) {
    const exists = await prisma.repairRequest.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError('Không tìm thấy yêu cầu sửa chữa');

    const logs = await prisma.repairRequestStatusLog.findMany({
      where: { repairRequestId: id },
      orderBy: { createdAt: 'asc' },
    });

    const actorIds = [...new Set(logs.map((log) => log.actorId).filter(Boolean))] as string[];
    let actorNames: Map<string, string> = new Map();

    if (actorIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      users.forEach((user) => {
        actorNames.set(user.id, `${user.lastName} ${user.firstName}`.trim());
      });
    }

    return logs.map((log) => ({
      ...log,
      actorName: log.actorId ? (actorNames.get(log.actorId) ?? null) : null,
    }));
  }

  async getStats(filters?: { dateFrom?: Date; dateTo?: Date; machineSystemId?: string; requestType?: RequestType }) {
    const now = new Date();
    const dateTo = filters?.dateTo ?? now;
    const windowMs = filters?.dateFrom
      ? dateTo.getTime() - filters.dateFrom.getTime()
      : 90 * 24 * 60 * 60 * 1000;
    const dateFrom = filters?.dateFrom ?? new Date(dateTo.getTime() - windowMs);

    const prevDateTo = new Date(dateFrom.getTime() - 1);
    const prevDateFrom = new Date(prevDateTo.getTime() - windowMs);

    const buildWhere = (from: Date, to: Date): Prisma.RepairRequestWhereInput => {
      const where: Prisma.RepairRequestWhereInput = {
        createdAt: { gte: from, lte: to },
      };
      if (filters?.machineSystemId) {
        where.items = { some: { machineSystemId: filters.machineSystemId } };
      }
      if (filters?.requestType) {
        where.requestType = filters.requestType;
      }
      return where;
    };

    const currentWhere = buildWhere(dateFrom, dateTo);
    const prevWhere = buildWhere(prevDateFrom, prevDateTo);

    const countByStatus = async (where: Prisma.RepairRequestWhereInput) => {
      const results = await prisma.repairRequest.groupBy({
        by: ['trangThai'],
        where,
        _count: { _all: true },
      });
      const counts: Record<string, number> = {
        CHO_XU_LY: 0,
        DA_TIEP_NHAN: 0,
        LEN_KE_HOACH: 0,
        DANG_SUA_CHUA: 0,
        CHO_NGHIEM_THU: 0,
        DA_NGHIEM_THU: 0,
        HOAN_THANH: 0,
        DA_HUY: 0,
        TU_CHOI: 0,
      };
      for (const r of results) {
        counts[r.trangThai] = r._count._all;
      }
      return counts;
    };

    const countByRequestType = async (where: Prisma.RepairRequestWhereInput) => {
      const results = await prisma.repairRequest.groupBy({
        by: ['requestType'],
        where,
        _count: { _all: true },
      });
      const counts: Record<string, number> = { KIEM_TRA: 0, SUA_CHUA: 0 };
      for (const r of results) counts[r.requestType] = r._count._all;
      return counts;
    };

    const avgCompletionHours = async (where: Prisma.RepairRequestWhereInput): Promise<number | null> => {
      const completedLogs = await prisma.repairRequestStatusLog.findMany({
        where: {
          newStatus: RepairRequestStatus.HOAN_THANH,
          repairRequest: where,
        },
        select: {
          repairRequestId: true,
          createdAt: true,
          repairRequest: { select: { createdAt: true } },
        },
      });

      if (completedLogs.length === 0) return null;

      const totalHours = completedLogs.reduce((sum, log) => {
        const diffMs = log.createdAt.getTime() - log.repairRequest.createdAt.getTime();
        return sum + diffMs / (1000 * 60 * 60);
      }, 0);

      return totalHours / completedLogs.length;
    };

    const [total, byStatus, byRequestType, avgHours, prevByStatus, prevByRequestType, prevAvgHours, prevTotal] = await Promise.all([
      prisma.repairRequest.count({ where: currentWhere }),
      countByStatus(currentWhere),
      countByRequestType(currentWhere),
      avgCompletionHours(currentWhere),
      countByStatus(prevWhere),
      countByRequestType(prevWhere),
      avgCompletionHours(prevWhere),
      prisma.repairRequest.count({ where: prevWhere }),
    ]);

    const delta = {
      total: total - prevTotal,
      byStatus: {
        CHO_XU_LY: byStatus.CHO_XU_LY - prevByStatus.CHO_XU_LY,
        DA_TIEP_NHAN: byStatus.DA_TIEP_NHAN - prevByStatus.DA_TIEP_NHAN,
        LEN_KE_HOACH: byStatus.LEN_KE_HOACH - prevByStatus.LEN_KE_HOACH,
        DANG_SUA_CHUA: byStatus.DANG_SUA_CHUA - prevByStatus.DANG_SUA_CHUA,
        CHO_NGHIEM_THU: byStatus.CHO_NGHIEM_THU - prevByStatus.CHO_NGHIEM_THU,
        DA_NGHIEM_THU: byStatus.DA_NGHIEM_THU - prevByStatus.DA_NGHIEM_THU,
        HOAN_THANH: byStatus.HOAN_THANH - prevByStatus.HOAN_THANH,
        DA_HUY: byStatus.DA_HUY - prevByStatus.DA_HUY,
        TU_CHOI: byStatus.TU_CHOI - prevByStatus.TU_CHOI,
      },
      byRequestType: {
        KIEM_TRA: byRequestType.KIEM_TRA - prevByRequestType.KIEM_TRA,
        SUA_CHUA: byRequestType.SUA_CHUA - prevByRequestType.SUA_CHUA,
      },
      avgCompletionHours: avgHours !== null && prevAvgHours !== null
        ? avgHours - prevAvgHours
        : null,
    };

    const topMachinesRaw = await prisma.repairRequestItem.groupBy({
      by: ['machineSystemId'],
      where: {
        repairRequest: currentWhere,
        machineSystemId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { machineSystemId: 'desc' } },
      take: 5,
    });

    const topMachineIds = topMachinesRaw.map((r) => r.machineSystemId!).filter(Boolean);
    const machineSystemsMap = new Map<string, string>();
    if (topMachineIds.length > 0) {
      const machineSystems = await prisma.machineSystem.findMany({
        where: { id: { in: topMachineIds } },
        select: { id: true, tenHeThong: true },
      });
      for (const ms of machineSystems) {
        machineSystemsMap.set(ms.id, ms.tenHeThong);
      }
    }

    const topMachines = topMachinesRaw.map((r) => ({
      machineSystemId: r.machineSystemId,
      tenHeThong: r.machineSystemId ? (machineSystemsMap.get(r.machineSystemId) ?? null) : null,
      count: r._count._all,
    }));

    const recurringWindowFrom = new Date(dateTo.getTime() - 180 * 24 * 60 * 60 * 1000);
    const recurringRaw = await prisma.repairRequestItem.groupBy({
      by: ['machineSystemDetailId'],
      where: {
        repairRequest: {
          createdAt: { gte: recurringWindowFrom, lte: dateTo },
          ...(filters?.machineSystemId ? { items: { some: { machineSystemId: filters.machineSystemId } } } : {}),
        },
        machineSystemDetailId: { not: null },
      },
      _count: { repairRequestId: true },
      having: { repairRequestId: { _count: { gt: 2 } } },
      orderBy: { _count: { repairRequestId: 'desc' } },
      take: 10,
    });

    const recurringDetailIds = recurringRaw.map((r) => r.machineSystemDetailId!).filter(Boolean);
    const machineDetailMap = new Map<string, string>();
    if (recurringDetailIds.length > 0) {
      const details = await prisma.machineSystemDetail.findMany({
        where: { id: { in: recurringDetailIds } },
        select: { id: true, tenChiTiet: true },
      });
      for (const d of details) {
        machineDetailMap.set(d.id, d.tenChiTiet);
      }
    }

    const recurringItems = await Promise.all(
      recurringRaw.map(async (r) => {
        const latest = await prisma.repairRequest.findFirst({
          where: {
            createdAt: { gte: recurringWindowFrom, lte: dateTo },
            items: { some: { machineSystemDetailId: r.machineSystemDetailId! } },
          },
          orderBy: { createdAt: 'desc' },
          select: { maYeuCau: true },
        });
        return {
          machineSystemDetailId: r.machineSystemDetailId,
          tenChiTiet: r.machineSystemDetailId ? (machineDetailMap.get(r.machineSystemDetailId) ?? null) : null,
          count: r._count.repairRequestId,
          latestMaYeuCau: latest?.maYeuCau ?? null,
        };
      })
    );

    const monthlyTrend: Array<{ month: string; total: number; hoanThanh: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const bucketEnd = new Date(dateTo);
      bucketEnd.setDate(1);
      bucketEnd.setMonth(bucketEnd.getMonth() - i + 1);
      bucketEnd.setDate(0);
      bucketEnd.setHours(23, 59, 59, 999);

      const bucketStart = new Date(dateTo);
      bucketStart.setDate(1);
      bucketStart.setMonth(bucketStart.getMonth() - i);
      bucketStart.setHours(0, 0, 0, 0);

      const monthKey = `${bucketStart.getFullYear()}-${String(bucketStart.getMonth() + 1).padStart(2, '0')}`;
      const bucketWhere: Prisma.RepairRequestWhereInput = {
        createdAt: { gte: bucketStart, lte: bucketEnd },
        ...(filters?.machineSystemId ? { items: { some: { machineSystemId: filters.machineSystemId } } } : {}),
        ...(filters?.requestType ? { requestType: filters.requestType } : {}),
      };

      const [bucketTotal, bucketHoanThanh] = await Promise.all([
        prisma.repairRequest.count({ where: bucketWhere }),
        prisma.repairRequest.count({ where: { ...bucketWhere, trangThai: RepairRequestStatus.HOAN_THANH } }),
      ]);

      monthlyTrend.push({ month: monthKey, total: bucketTotal, hoanThanh: bucketHoanThanh });
    }

    const recentlyCreatedRaw = await prisma.repairRequest.findMany({
      where: {
        trangThai: { in: [RepairRequestStatus.CHO_XU_LY, RepairRequestStatus.DANG_SUA_CHUA] },
        ...(filters?.machineSystemId ? { items: { some: { machineSystemId: filters.machineSystemId } } } : {}),
        ...(filters?.requestType ? { requestType: filters.requestType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        maYeuCau: true,
        tenHeThong: true,
        trangThai: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    });

    const recentlyCreated = recentlyCreatedRaw.map((r) => ({
      id: r.id,
      maYeuCau: r.maYeuCau,
      tenHeThongThietBi: r.tenHeThong,
      trangThai: r.trangThai,
      createdAt: r.createdAt,
      itemCount: r._count.items,
    }));

    return {
      total,
      byStatus,
      byRequestType,
      avgCompletionHours: avgHours,
      delta,
      topMachines,
      recurringItems,
      monthlyTrend,
      recentlyCreated,
    };
  }

  /**
   * Hard delete is allowed (ADMIN included) only for CHO_XU_LY / DA_HUY / TU_CHOI requests without
   * any acceptance slip — slips are acceptance evidence and must not cascade away.
   */
  async deleteRepairRequest(id: number) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.repairRequest.findUnique({
        where: { id },
        select: { id: true, trangThai: true, _count: { select: { acceptanceHandovers: true } } },
      });
      if (!row) throw new NotFoundError('Không tìm thấy yêu cầu sửa chữa');
      if (row._count.acceptanceHandovers > 0) {
        throw new ValidationError('Không thể xóa yêu cầu sửa chữa đã có phiếu nghiệm thu');
      }
      if (!YCSC_DELETABLE.has(row.trangThai)) {
        throw new ValidationError('Chỉ xóa được yêu cầu sửa chữa ở trạng thái Chờ xử lý, Đã hủy hoặc Từ chối');
      }
      const deleted = await tx.repairRequest.deleteMany({ where: { id, trangThai: row.trangThai } });
      if (deleted.count === 0) throw new ConflictError(STALE_ROW_MESSAGE);
    });

    return { message: 'Xóa yêu cầu sửa chữa thành công' };
  }

  async exportToExcel(filters?: RepairRequestFilters): Promise<Buffer> {
    const where: Prisma.RepairRequestWhereInput = {};
    if (filters?.search) {
      where.OR = [
        { maYeuCau: { contains: filters.search, mode: 'insensitive' } },
        { tenHeThong: { contains: filters.search, mode: 'insensitive' } },
        { noiDungLoi: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.trangThai) {
      where.trangThai = filters.trangThai;
    }
    if (filters?.requestType) {
      where.requestType = filters.requestType;
    }
    if (filters?.sourceInspectionRequestId) {
      const sid = Number(filters.sourceInspectionRequestId);
      if (!Number.isNaN(sid)) where.sourceInspectionRequestId = sid;
    }

    const data = await prisma.repairRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { materialNeeds: true } },
        assignees: true,
        supplyLinks: true,
        inspectionRequest: { select: { maYeuCau: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách yêu cầu sửa chữa');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Ngày tháng', key: 'ngayThang', width: 15 },
      { header: 'Mã yêu cầu', key: 'maYeuCau', width: 20 },
      { header: 'YCKT nguồn', key: 'maYcktNguon', width: 20 },
      { header: 'Loại phiếu', key: 'loaiPhieu', width: 14 },
      { header: 'Tên hệ thống/thiết bị', key: 'tenHeThong', width: 25 },
      { header: 'Tình trạng thiết bị', key: 'tinhTrangThietBi', width: 20 },
      { header: 'Loại lỗi', key: 'loaiLoi', width: 15 },
      { header: 'Mức độ ưu tiên', key: 'mucDoUuTien', width: 15 },
      { header: 'Nội dung lỗi', key: 'noiDungLoi', width: 30 },
      { header: 'Trạng thái', key: 'trangThai', width: 15 },
      { header: 'Người thực hiện', key: 'nguoiThucHien', width: 28 },
      { header: 'Vật tư dự kiến', key: 'vatTuDuKien', width: 30 },
      { header: 'YC vật tư liên kết', key: 'ycVatTuLienKet', width: 22 },
      { header: 'Kết quả nghiệm thu', key: 'ketQuaNghiemThu', width: 18 },
      { header: 'Ghi chú', key: 'ghiChu', width: 25 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    let rowIndex = 1;
    data.forEach((request: any) => {
      const ngayThangStr = request.ngayThang ? new Date(request.ngayThang).toLocaleDateString('vi-VN') : '';
      const loaiCode = String(request.requestType ?? 'SUA_CHUA');
      const loaiPhieu = REQUEST_TYPE_LABELS[loaiCode] ?? loaiCode;
      const nguoiThucHien = (request.assignees ?? []).map((a: any) => a.userName ?? a.userId ?? a.id).join(', ');
      const ketQuaCode = request.ketQuaNghiemThu ? String(request.ketQuaNghiemThu) : '';
      const ketQuaNghiemThu = ketQuaCode ? (KET_QUA_LABELS[ketQuaCode] ?? ketQuaCode) : '';
      const ycVatTuLienKet = (request.supplyLinks ?? []).map((l: any) => l.supplyRequestId).join(', ');
      const buildVatTu = (item: any) => (item?.materialNeeds ?? []).map((m: any) => `${m.tenVatTu} x${m.soLuongDuKien ?? ''}${m.donVi ? ' ' + m.donVi : ''}`.trim()).join('; ');
      const baseRow = {
        ngayThang: ngayThangStr,
        maYeuCau: request.maYeuCau,
        maYcktNguon: request.inspectionRequest?.maYeuCau ?? '',
        loaiPhieu,
        mucDoUuTien: request.mucDoUuTien,
        trangThai: REPAIR_STATUS_LABELS[String(request.trangThai)] ?? request.trangThai,
        nguoiThucHien,
        ycVatTuLienKet,
        ketQuaNghiemThu,
        ghiChu: request.ghiChu || '',
      };
      if (request.items && request.items.length > 0) {
        request.items.forEach((item: any) => {
          worksheet.addRow({
            stt: rowIndex++,
            ...baseRow,
            tenHeThong: item.tenHeThong,
            tinhTrangThietBi: item.tinhTrangThietBi,
            loaiLoi: item.loaiLoi,
            noiDungLoi: item.noiDungLoi,
            vatTuDuKien: buildVatTu(item),
          });
        });
      } else {
        worksheet.addRow({
          stt: rowIndex++,
          ...baseRow,
          tenHeThong: request.tenHeThong,
          tinhTrangThietBi: request.tinhTrangThietBi,
          loaiLoi: request.loaiLoi,
          noiDungLoi: request.noiDungLoi,
          vatTuDuKien: '',
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }

  // ── Supply Chain batch resolve ────────────────────────────────────────
  async getSupplyChain(id: number) {
    const links = await prisma.repairSupplyLink.findMany({
      where: { repairRequestId: id },
      orderBy: { createdAt: 'desc' as const },
    });
    if (links.length === 0) return [];

    const supplyIds = [...new Set(links.map((l) => l.supplyRequestId))];

    const supplyRequests = await prisma.supplyRequest.findMany({
      where: { id: { in: supplyIds } },
      select: { id: true, maYeuCau: true, trangThai: true, createdAt: true },
    });
    const srMap = new Map(supplyRequests.map((s) => [s.id, s]));

    // Batch decisions: group by supplyRequestId via items
    const srItems = await prisma.supplyRequestItem.findMany({
      where: { supplyRequestId: { in: supplyIds } },
      select: { id: true, supplyRequestId: true },
    });
    const itemIds = srItems.map((i) => i.id);

    const decisions = itemIds.length > 0 ? await prisma.supplyRequestDecision.findMany({
      where: { supplyRequestItemId: { in: itemIds }, triggeredReplenishmentRequestId: { not: null } },
      orderBy: { decidedAt: 'desc' as const },
      select: { supplyRequestItemId: true, triggeredReplenishmentRequestId: true, shortageQty: true, reason: true, decidedAt: true },
    }) : [];

    // Latest decision per supplyRequestId
    const itemToSr = new Map(srItems.map((i) => [i.id, i.supplyRequestId]));
    const bySr = new Map<string, typeof decisions[0]>();
    for (const d of decisions) {
      const srId = itemToSr.get(d.supplyRequestItemId);
      if (srId && !bySr.has(srId)) bySr.set(srId, d);
    }

    const replIds = [...new Set(Array.from(bySr.values()).map((d) => d.triggeredReplenishmentRequestId!).filter(Boolean))] as string[];
    const replenishments = replIds.length > 0 ? await prisma.replenishmentRequest.findMany({
      where: { id: { in: replIds } },
      select: { id: true, maYeuCau: true, trangThai: true, phanLoaiGroup: true, createdAt: true, convertedPurchaseRequestId: true },
    }) : [];
    const replMap = new Map(replenishments.map((r) => [r.id, r]));

    const prIds = [...new Set(replenishments.map((r) => r.convertedPurchaseRequestId).filter(Boolean))] as string[];
    // Legacy fallback: decisions may point directly to PurchaseRequest
    const legacyPrIds = decisions.map((d) => (d as unknown as { triggeredPurchaseRequestId?: string }).triggeredPurchaseRequestId).filter(Boolean) as string[];
    const allPrIds = [...new Set([...prIds, ...legacyPrIds])];
    const purchaseRequests = allPrIds.length > 0 ? await prisma.purchaseRequest.findMany({
      where: { id: { in: allPrIds } },
      select: { id: true, maYeuCau: true, trangThai: true, sourceType: true, createdAt: true },
    }) : [];
    const prMap = new Map(purchaseRequests.map((p) => [p.id, p]));

    const replToPr = new Map<string, string>();
    for (const r of replenishments) if (r.convertedPurchaseRequestId) replToPr.set(r.id, r.convertedPurchaseRequestId);

    const inboundPlans = prIds.length > 0 ? await prisma.inboundPlan.findMany({
      where: { purchaseRequestId: { in: prIds } },
      select: { id: true, maKeHoach: true, trangThai: true, purchaseRequestId: true },
    }) : [];
    const prToInbound = new Map(inboundPlans.map((ip) => [ip.purchaseRequestId, ip]));

    const warehouseIssues = await prisma.warehouseIssue.findMany({
      where: { supplyRequestId: { in: supplyIds } },
      select: { id: true, maPhieuXuat: true, supplyRequestId: true },
    });
    // WarehouseIssue has no trangThai; use existence as indicator
    const srToIssue = new Map(warehouseIssues.map((wi) => [wi.supplyRequestId, { id: wi.id, maPhieu: wi.maPhieuXuat, trangThai: null }]));

    return links.map((link) => {
      const sr = srMap.get(link.supplyRequestId) ?? null;
      const dec = bySr.get(link.supplyRequestId) ?? null;
      const repl = dec ? (replMap.get(dec.triggeredReplenishmentRequestId!) ?? null) : null;
      const prId = repl ? (replToPr.get(repl.id) ?? null) : ((dec as unknown as { triggeredPurchaseRequestId?: string })?.triggeredPurchaseRequestId ?? null);
      const pr = prId ? (prMap.get(prId) ?? null) : null;
      const inboundPlan = pr ? (prToInbound.get(pr.id) ?? null) : null;
      const warehouseIssue = srToIssue.get(link.supplyRequestId) ?? null;
      return {
        link,
        supplyRequest: sr,
        replenishmentRequest: repl,
        purchaseRequest: pr,
        inboundPlan,
        warehouseIssue,
        decisionsMeta: dec ? { shortageQty: dec.shortageQty, reason: dec.reason, decidedAt: dec.decidedAt } : null,
      };
    });
  }

  // ── Reverse lookup helpers (used by other services' controllers) ─────
  static async resolveRepairLinksForSupplyIds(supplyRequestIds: string[]) {
    if (supplyRequestIds.length === 0) return [] as Array<{ supplyRequestId: string; repairRequestId: number; maYeuCau: string; trangThai: RepairRequestStatus }>;
    const links = await prisma.repairSupplyLink.findMany({
      where: { supplyRequestId: { in: supplyRequestIds } },
      select: { supplyRequestId: true, repairRequestId: true },
    });
    if (links.length === 0) return [];
    const repairIds = [...new Set(links.map((l) => l.repairRequestId))];
    const repairs = await prisma.repairRequest.findMany({
      where: { id: { in: repairIds } },
      select: { id: true, maYeuCau: true, trangThai: true },
    });
    const repairMap = new Map(repairs.map((r) => [r.id, r]));
    return links.map((l) => {
      const r = repairMap.get(l.repairRequestId);
      return { supplyRequestId: l.supplyRequestId, repairRequestId: l.repairRequestId, maYeuCau: r?.maYeuCau ?? '', trangThai: r?.trangThai as RepairRequestStatus };
    });
  }

  static async resolveRepairLinksForReplenishmentId(replenishmentRequestId: string) {
    const decisions = await prisma.supplyRequestDecision.findMany({
      where: { triggeredReplenishmentRequestId: replenishmentRequestId },
      select: { supplyRequestItemId: true },
    });
    if (decisions.length === 0) return [];
    const itemIds = decisions.map((d) => d.supplyRequestItemId);
    const items = await prisma.supplyRequestItem.findMany({ where: { id: { in: itemIds } }, select: { supplyRequestId: true } });
    const srIds = [...new Set(items.map((i) => i.supplyRequestId))];
    return RepairRequestService.resolveRepairLinksForSupplyIds(srIds);
  }

  static async resolveRepairLinksForPurchaseId(purchaseRequestId: string) {
    // Via ReplenishmentRequest.convertedPurchaseRequestId -> decisions -> supplyRequestItem
    const repl = await prisma.replenishmentRequest.findFirst({
      where: { convertedPurchaseRequestId: purchaseRequestId },
      select: { id: true },
    });
    if (repl) return RepairRequestService.resolveRepairLinksForReplenishmentId(repl.id);
    // Legacy direct: decisions.triggeredPurchaseRequestId
    const decisions = await prisma.supplyRequestDecision.findMany({
      where: { triggeredPurchaseRequestId: purchaseRequestId },
      select: { supplyRequestItemId: true },
    });
    if (decisions.length === 0) return [];
    const itemIds = decisions.map((d) => d.supplyRequestItemId);
    const items = await prisma.supplyRequestItem.findMany({ where: { id: { in: itemIds } }, select: { supplyRequestId: true } });
    const srIds = [...new Set(items.map((i) => i.supplyRequestId))];
    return RepairRequestService.resolveRepairLinksForSupplyIds(srIds);
  }
}

export default new RepairRequestService();
