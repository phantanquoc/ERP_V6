import { InspectionRequestStatus, NghiemThuKetQua, Prisma, RepairRequestStatus } from '@prisma/client';
import ExcelJS from 'exceljs';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import acceptanceHandoverService from '@services/acceptanceHandoverService';
import { isTechnicalMember } from '@middlewares/technicalAccess';
import logger from '@config/logger';

interface InspectionRequestItemData {
  /** Existing item id — present when the client edits an item in place. */
  id?: string;
  tenHeThong: string;
  tinhTrangThietBi: string;
  loaiLoi: string;
  noiDungLoi: string;
  machineSystemId?: string | null;
  machineSystemDetailId?: string | null;
  faultRecordId?: string | null;
}

interface CreateInspectionRequestData {
  ngayThang?: Date;
  maYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string | null;
  phongBanId?: string | null;
  fileDinhKem?: string | null;
  tepDinhKem?: string[];
  items?: InspectionRequestItemData[];
  userId?: string;
}

interface UpdateInspectionRequestData {
  ngayThang?: Date;
  mucDoUuTien?: string;
  ghiChu?: string | null;
  phongBanId?: string | null;
  fileDinhKem?: string | null;
  tepDinhKem?: string[];
  items?: InspectionRequestItemData[];
}

export interface InspectionRequestFilters {
  search?: string;
  trangThai?: InspectionRequestStatus;
}

interface ActorContext {
  actorId?: string;
  actorRole?: string;
}

const inspectionInclude = {
  items: {
    include: { machineSystem: true, machineSystemDetail: true, faultRecord: true },
    orderBy: { createdAt: 'asc' as const },
  },
  statusLogs: { orderBy: { createdAt: 'asc' as const } },
  repairRequests: { select: { id: true, maYeuCau: true, trangThai: true } },
  acceptanceHandovers: { orderBy: { createdAt: 'desc' as const } },
} as const;

// Inspection conclusion: only two outcomes
export const KET_LUAN_CAN_SUA_CHUA = 'CAN_SUA_CHUA';
export const KET_LUAN_DA_KHAC_PHUC = 'DA_KHAC_PHUC';
const KET_LUAN_VALUES: ReadonlySet<string> = new Set([KET_LUAN_CAN_SUA_CHUA, KET_LUAN_DA_KHAC_PHUC]);
const MUC_DO_VALUES: ReadonlySet<string> = new Set(['nhe', 'trung_binh', 'nang']);

const INSPECTION_ORDER: InspectionRequestStatus[] = [
  InspectionRequestStatus.CHO_XU_LY,
  InspectionRequestStatus.DA_TIEP_NHAN,
  InspectionRequestStatus.DANG_KIEM_TRA,
  InspectionRequestStatus.DA_KIEM_TRA,
  InspectionRequestStatus.HOAN_THANH,
];
// Branch edges outside the linear order:
//   DANG_KIEM_TRA → CHO_NGHIEM_THU  (kết luận Đã khắc phục, nộp phiếu nghiệm thu)
//   CHO_NGHIEM_THU → HOAN_THANH     (người tạo xác nhận ĐẠT)
//   CHO_NGHIEM_THU → DANG_KIEM_TRA  (người tạo xác nhận KHÔNG ĐẠT — kỹ thuật xử lý lại)
const INSPECTION_BRANCH_EDGES: ReadonlyArray<[InspectionRequestStatus, InspectionRequestStatus]> = [
  [InspectionRequestStatus.DANG_KIEM_TRA, InspectionRequestStatus.CHO_NGHIEM_THU],
  [InspectionRequestStatus.CHO_NGHIEM_THU, InspectionRequestStatus.HOAN_THANH],
  [InspectionRequestStatus.CHO_NGHIEM_THU, InspectionRequestStatus.DANG_KIEM_TRA],
];
const TERMINAL: ReadonlySet<InspectionRequestStatus> = new Set([
  InspectionRequestStatus.HOAN_THANH,
  InspectionRequestStatus.DA_HUY,
  InspectionRequestStatus.TU_CHOI,
]);
const REJECT_ALLOWED_FROM: ReadonlySet<InspectionRequestStatus> = new Set([
  InspectionRequestStatus.CHO_XU_LY,
  InspectionRequestStatus.DA_TIEP_NHAN,
  InspectionRequestStatus.DANG_KIEM_TRA,
]);

// ADMIN may additionally cancel a DA_KIEM_TRA request (e.g. its YCSC was cancelled). Nobody cancels
// in CHO_NGHIEM_THU — the requester must decide KHÔNG ĐẠT first so the pending slip is not orphaned.
const ADMIN_CANCEL_ALLOWED_FROM: ReadonlySet<InspectionRequestStatus> = new Set([
  ...REJECT_ALLOWED_FROM,
  InspectionRequestStatus.DA_KIEM_TRA,
]);
// ADMIN may skip forward but never past DANG_KIEM_TRA (result submission and closing have their own rules).
const ADMIN_SKIP_LIMIT_INDEX = INSPECTION_ORDER.indexOf(InspectionRequestStatus.DANG_KIEM_TRA);
// Technician / ADMIN may edit only before the result is submitted.
const YCKT_TECH_EDITABLE: ReadonlySet<InspectionRequestStatus> = new Set([
  InspectionRequestStatus.CHO_XU_LY,
  InspectionRequestStatus.DA_TIEP_NHAN,
  InspectionRequestStatus.DANG_KIEM_TRA,
]);
const YCKT_DELETABLE: ReadonlySet<InspectionRequestStatus> = new Set([
  InspectionRequestStatus.CHO_XU_LY,
  InspectionRequestStatus.DA_HUY,
  InspectionRequestStatus.TU_CHOI,
]);
const INACTIVE_REPAIR_STATUSES: RepairRequestStatus[] = [RepairRequestStatus.DA_HUY, RepairRequestStatus.TU_CHOI];

export const STALE_ROW_MESSAGE = 'Phiếu đã được cập nhật bởi người khác, vui lòng tải lại';
export const ITEM_IN_USE_MESSAGE = 'Không thể xóa hạng mục đã có nghiệm thu/vật tư/liên kết';
export const MAX_ATTACHMENT_FILES = 4;

/**
 * Postgres text columns reject NUL (0x00) with `22021 invalid byte sequence` → 500.
 * Free-text input (often pasted from Word/Excel) can carry it, so strip it instead of failing.
 */
function stripNul<T>(value: T): T {
  return (typeof value === 'string' ? value.replace(/\0/g, '') : value) as T;
}

const KET_LUAN_LABELS: Record<string, string> = { CAN_SUA_CHUA: 'Cần sửa chữa', DA_KHAC_PHUC: 'Đã khắc phục' };
const INSPECTION_STATUS_LABELS: Record<string, string> = {
  CHO_XU_LY: 'Chờ xử lý',
  DA_TIEP_NHAN: 'Đã tiếp nhận',
  DANG_KIEM_TRA: 'Đang kiểm tra',
  DA_KIEM_TRA: 'Đã kiểm tra',
  CHO_NGHIEM_THU: 'Chờ xác nhận nghiệm thu',
  HOAN_THANH: 'Hoàn thành',
  DA_HUY: 'Đã hủy',
  TU_CHOI: 'Từ chối',
};

/**
 * Validate a YCKT status change. No role leaves a terminal state or goes backward.
 * Edges out of CHO_NGHIEM_THU (ĐẠT → HOAN_THANH, KHÔNG ĐẠT → DANG_KIEM_TRA) are allowed only
 * from confirmAcceptance (`viaConfirmation`); ADMIN cannot close a pending acceptance otherwise.
 */
export function advanceInspection(
  current: InspectionRequestStatus,
  next: InspectionRequestStatus,
  isAdmin: boolean,
  opts: { viaConfirmation?: boolean } = {},
): InspectionRequestStatus {
  if (next === current) return current;
  const deny = () => new ValidationError(`Không thể chuyển trạng thái phiếu kiểm tra từ ${current} sang ${next}`);
  if (TERMINAL.has(current)) throw deny();
  if (next === InspectionRequestStatus.TU_CHOI) {
    if (!REJECT_ALLOWED_FROM.has(current)) {
      throw new ValidationError(`Không thể từ chối phiếu ở trạng thái ${current}`);
    }
    return next;
  }
  if (next === InspectionRequestStatus.DA_HUY) {
    const allowed = isAdmin ? ADMIN_CANCEL_ALLOWED_FROM : REJECT_ALLOWED_FROM;
    if (!allowed.has(current)) {
      throw new ValidationError(
        current === InspectionRequestStatus.CHO_NGHIEM_THU
          ? 'Phiếu đang chờ xác nhận nghiệm thu — người tạo cần xác nhận KHÔNG ĐẠT trước khi hủy'
          : `Không thể hủy phiếu ở trạng thái ${current}`,
      );
    }
    return next;
  }
  if (current === InspectionRequestStatus.CHO_NGHIEM_THU) {
    if (opts.viaConfirmation && INSPECTION_BRANCH_EDGES.some(([from, to]) => from === current && to === next)) return next;
    throw deny();
  }
  if (INSPECTION_BRANCH_EDGES.some(([from, to]) => from === current && to === next)) return next;
  // DA_KIEM_TRA → HOAN_THANH is only for CAN_SUA_CHUA with an active YCSC (guarded in complete())
  const ci = INSPECTION_ORDER.indexOf(current);
  const ni = INSPECTION_ORDER.indexOf(next);
  if (ci !== -1 && ni === ci + 1) return next;
  if (isAdmin && ci !== -1 && ni > ci && ni <= ADMIN_SKIP_LIMIT_INDEX) return next;
  throw deny();
}

type InspectionRow = { id: number; trangThai: InspectionRequestStatus; maYeuCau: string; createdById: string | null; ketLuan: string | null };

interface InspectionTransitionOptions {
  extraData?: Prisma.InspectionRequestUpdateManyMutationInput;
  /** Runs inside the transaction on the freshly read row, before the status change. */
  precheck?: (row: InspectionRow, tx: Prisma.TransactionClient) => Promise<void> | void;
}

class InspectionRequestService {
  async generateInspectionRequestCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.inspectionRequest.findFirst({
      where: { maYeuCau: yearlyCodeWhere('YC-KT', year) },
      orderBy: { maYeuCau: 'desc' },
      select: { maYeuCau: true },
    });
    return nextYearlyCode(last?.maYeuCau ?? null, 'YC-KT', year);
  }

  private buildListWhere(filters?: InspectionRequestFilters): Prisma.InspectionRequestWhereInput {
    const where: Prisma.InspectionRequestWhereInput = {};
    const search = filters?.search?.trim();
    if (search) {
      where.OR = [
        { maYeuCau: { contains: search, mode: 'insensitive' } },
        { ghiChu: { contains: search, mode: 'insensitive' } },
        { createdByName: { contains: search, mode: 'insensitive' } },
        { nguoiKiemTra: { contains: search, mode: 'insensitive' } },
        { items: { some: { tenHeThong: { contains: search, mode: 'insensitive' } } } },
      ];
    }
    if (filters?.trangThai) where.trangThai = filters.trangThai;
    return where;
  }

  async getAllInspectionRequests(page = 1, limit = 10, filters?: InspectionRequestFilters) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);
    const where = this.buildListWhere(filters);
    const [data, total] = await Promise.all([
      (prisma.inspectionRequest as unknown as { findMany: (a: unknown) => Promise<unknown[]> }).findMany({
        where: where as never,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: inspectionInclude as never,
      }),
      (prisma.inspectionRequest as unknown as { count: (a: unknown) => Promise<number> }).count({ where: where as never }),
    ]);
    return { data, pagination: { page, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } };
  }

  /** Excel export with the same filters and columns as the YCKT list (mirrors repairRequestService.exportToExcel). */
  async exportToExcel(filters?: InspectionRequestFilters): Promise<Buffer> {
    const rows = await prisma.inspectionRequest.findMany({
      where: this.buildListWhere(filters),
      orderBy: { createdAt: 'desc' },
      include: {
        items: { orderBy: { createdAt: 'asc' }, include: { machineSystem: { select: { khuVuc: true } } } },
        repairRequests: { select: { maYeuCau: true, trangThai: true } },
      },
    });

    // phongBanId holds either a Department id or a free-text department label (legacy/auto-resolved).
    const deptIds = [...new Set(rows.map((r) => r.phongBanId).filter((v): v is string => !!v))];
    const departments = deptIds.length
      ? await prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } })
      : [];
    const deptName = new Map(departments.map((d) => [d.id, d.name]));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách phiếu kiểm tra');
    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã', key: 'maYeuCau', width: 20 },
      { header: 'Ngày', key: 'ngayThang', width: 14 },
      { header: 'Người phát hiện', key: 'nguoiPhatHien', width: 24 },
      { header: 'Bộ phận', key: 'boPhan', width: 24 },
      { header: 'Thiết bị', key: 'thietBi', width: 30 },
      { header: 'Khu vực', key: 'khuVuc', width: 18 },
      { header: 'Trạng thái', key: 'trangThai', width: 22 },
      { header: 'Kết luận', key: 'ketLuan', width: 18 },
      { header: 'Mức độ ưu tiên', key: 'mucDoUuTien', width: 15 },
      { header: 'YCSC liên kết', key: 'ycsc', width: 22 },
      { header: 'Ghi chú', key: 'ghiChu', width: 30 },
    ];
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    rows.forEach((r, index) => {
      const khuVuc = [...new Set(r.items.map((it) => it.machineSystem?.khuVuc).filter((v): v is string => !!v))].join(', ');
      worksheet.addRow({
        stt: index + 1,
        maYeuCau: r.maYeuCau,
        ngayThang: r.ngayThang ? new Date(r.ngayThang).toLocaleDateString('vi-VN') : '',
        nguoiPhatHien: r.createdByName ?? '',
        boPhan: r.phongBanId ? (deptName.get(r.phongBanId) ?? r.phongBanId) : '',
        thietBi: r.items.map((it) => it.tenHeThong).filter(Boolean).join('; '),
        khuVuc,
        trangThai: INSPECTION_STATUS_LABELS[r.trangThai] ?? r.trangThai,
        ketLuan: r.ketLuan ? (KET_LUAN_LABELS[r.ketLuan] ?? r.ketLuan) : '',
        mucDoUuTien: r.mucDoUuTien,
        ycsc: r.repairRequests.map((rr) => rr.maYeuCau).join(', '),
        ghiChu: r.ghiChu ?? '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async getInspectionRequestById(id: number) {
    const row = await (prisma.inspectionRequest as unknown as { findUnique: (a: unknown) => Promise<Record<string, unknown> | null> }).findUnique({
      where: { id },
      include: inspectionInclude as never,
    });
    if (!row) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
    return row;
  }

  private async resolveItems(items: InspectionRequestItemData[] = []) {
    return Promise.all(
      items.map(async (item) => {
        let machineSystem = item.machineSystemId
          ? await (prisma.machineSystem as unknown as { findUnique: (a: unknown) => Promise<{ id: string; tenHeThong: string } | null> }).findUnique({ where: { id: item.machineSystemId } })
          : null;
        let machineSystemDetail = item.machineSystemDetailId
          ? await (prisma.machineSystemDetail as unknown as { findUnique: (a: unknown) => Promise<{ id: string; tenChiTiet: string; machineSystemId: string; machineSystem: { id: string; tenHeThong: string } } | null> }).findUnique({
              where: { id: item.machineSystemDetailId },
              include: { machineSystem: true } as never,
            })
          : null;
        if (item.machineSystemId && !machineSystem) throw new ValidationError('Hệ thống máy không hợp lệ');
        if (item.machineSystemDetailId && !machineSystemDetail) throw new ValidationError('Chi tiết hệ thống máy không hợp lệ');
        if (machineSystemDetail) {
          if (machineSystem && machineSystem.id !== machineSystemDetail.machineSystemId) {
            throw new ValidationError('Chi tiết máy không thuộc hệ thống máy đã chọn');
          }
          machineSystem = machineSystemDetail.machineSystem as unknown as typeof machineSystem;
        }
        // undefined = client omitted the field (keep stored value on in-place update)
        let faultRecordId: string | null | undefined = item.faultRecordId === undefined ? undefined : null;
        if (item.faultRecordId) {
          const fr = await prisma.faultRecord.findUnique({ where: { id: item.faultRecordId }, select: { id: true } });
          if (!fr) throw new ValidationError(`Bản ghi lỗi không tồn tại: ${item.faultRecordId}`);
          faultRecordId = fr.id;
        }
        return {
          ...(item.id ? { id: String(item.id) } : {}),
          machineSystemId: machineSystem?.id ?? null,
          machineSystemDetailId: machineSystemDetail?.id ?? null,
          tenHeThong: stripNul(machineSystem ? machineSystem.tenHeThong : item.tenHeThong),
          tinhTrangThietBi: stripNul(machineSystemDetail && !item.tinhTrangThietBi ? machineSystemDetail.tenChiTiet : item.tinhTrangThietBi),
          loaiLoi: stripNul(item.loaiLoi),
          noiDungLoi: stripNul(item.noiDungLoi),
          faultRecordId,
        };
      }),
    );
  }

  private async resolvePhongBanLabelFromUser(userId: string): Promise<string | null> {
    try {
      const emp = await (prisma.employee as unknown as { findFirst: (a: unknown) => Promise<{ subDepartment?: { name: string; department?: { name: string } | null } | null } | null> }).findFirst({
        where: { userId },
        include: { subDepartment: { include: { department: true } }, position: true } as never,
      });
      if (!emp) return null;
      const sub = (emp as unknown as { subDepartment?: { name?: string; department?: { name?: string } | null } | null }).subDepartment;
      if (sub?.name) return sub.name;
      if (sub?.department?.name) return sub.department.name;
      return null;
    } catch {
      return null;
    }
  }

  async createInspectionRequest(data: CreateInspectionRequestData) {
    if ((data as unknown as Record<string, unknown>).trangThai !== undefined) {
      logger.warn(`Ignored client-supplied trangThai on inspection create (maYeuCau: ${data.maYeuCau})`);
    }
    // Auto-resolve phongBanId -> department name when caller didn't supply it but we have userId
    let resolvedPhongBanId: string | null = data.phongBanId ?? null;
    if ((resolvedPhongBanId === null || resolvedPhongBanId === undefined || String(resolvedPhongBanId).trim() === '') && data.userId) {
      const label = await this.resolvePhongBanLabelFromUser(data.userId);
      if (label) resolvedPhongBanId = label;
      else resolvedPhongBanId = null;
    }
    resolvedPhongBanId = stripNul(resolvedPhongBanId);
    const resolvedItems = await this.resolveItems(data.items);
    let createdByName: string | null = null;
    if (data.userId) {
      const user = await (prisma.user as unknown as { findUnique: (a: unknown) => Promise<{ firstName: string; lastName: string } | null> }).findUnique({
        where: { id: data.userId },
        select: { firstName: true, lastName: true } as never,
      });
      if (user) createdByName = `${(user as { lastName: string }).lastName} ${(user as { firstName: string }).firstName}`.trim();
    }
    const row = await (prisma.$transaction as unknown as (fn: (tx: typeof prisma) => Promise<unknown>) => Promise<Record<string, unknown>>)(async (tx: typeof prisma) => {
      const t = tx as unknown as {
        inspectionRequest: { create: (a: unknown) => Promise<{ id: number }> };
        inspectionRequestItem: { createMany: (a: unknown) => Promise<unknown> };
        inspectionRequestStatusLog: { create: (a: unknown) => Promise<unknown> };
      };
      const created = await t.inspectionRequest.create({
        data: {
          ngayThang: data.ngayThang ?? new Date(),
          maYeuCau: data.maYeuCau,
          mucDoUuTien: data.mucDoUuTien,
          ghiChu: stripNul(data.ghiChu ?? null),
          phongBanId: resolvedPhongBanId ?? null,
          fileDinhKem: data.fileDinhKem ?? null,
          tepDinhKem: (data.tepDinhKem ?? []).slice(0, MAX_ATTACHMENT_FILES),
          createdById: data.userId ?? null,
          createdByName,
          trangThai: InspectionRequestStatus.CHO_XU_LY,
        } as never,
      });
      if (resolvedItems.length > 0) {
        await t.inspectionRequestItem.createMany({
          // A new request never reuses client-supplied item ids.
          data: resolvedItems.map(({ id: _ignored, ...it }) => ({ inspectionRequestId: created.id, ...it, faultRecordId: it.faultRecordId ?? null })),
        });
      }
      await t.inspectionRequestStatusLog.create({
        data: {
          inspectionRequestId: created.id,
          oldStatus: null,
          newStatus: InspectionRequestStatus.CHO_XU_LY,
          actorId: data.userId ?? null,
          reason: 'create',
        } as never,
      });
      return (tx as unknown as { inspectionRequest: { findUnique: (a: unknown) => Promise<Record<string, unknown>> } }).inspectionRequest.findUnique({
        where: { id: created.id },
        include: inspectionInclude as never,
      }) as Promise<Record<string, unknown>>;
    });
    return row;
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
   *  - technician / ADMIN: while CHO_XU_LY | DA_TIEP_NHAN | DANG_KIEM_TRA
   */
  private assertCanEdit(row: { trangThai: InspectionRequestStatus; createdById: string | null }, actor: ActorContext, privileged: boolean): void {
    if (privileged) {
      if (!YCKT_TECH_EDITABLE.has(row.trangThai)) {
        throw new ValidationError('Không thể chỉnh sửa phiếu kiểm tra sau khi đã gửi kết quả kiểm tra');
      }
      return;
    }
    if (!actor.actorId || row.createdById !== actor.actorId) {
      throw new AuthorizationError('Chỉ người tạo phiếu hoặc bộ phận Kỹ thuật mới được sửa phiếu kiểm tra này');
    }
    if (row.trangThai !== InspectionRequestStatus.CHO_XU_LY) {
      throw new ValidationError('Chỉ được sửa phiếu kiểm tra của mình khi phiếu còn Chờ xử lý');
    }
  }

  /**
   * Sync items by id. Intentional deviation from the "delete-then-recreate" convention:
   * YCSC items reference InspectionRequestItem.id via sourceInspectionItemId, so items are diffed —
   * update in place (id kept), create new, delete missing ones unless a YCSC item still links to them.
   */
  private async syncInspectionItems(
    tx: Prisma.TransactionClient,
    inspectionRequestId: number,
    items: Array<InspectionRequestItemData & { machineSystemId: string | null; machineSystemDetailId: string | null }>,
  ): Promise<void> {
    const existing = await tx.inspectionRequestItem.findMany({ where: { inspectionRequestId }, select: { id: true } });
    const existingIds = new Set(existing.map((e) => e.id));
    const keepIds = new Set<string>();
    for (const it of items) {
      if (!it.id) continue;
      if (!existingIds.has(it.id)) throw new ValidationError('Hạng mục không thuộc phiếu kiểm tra này');
      if (keepIds.has(it.id)) throw new ValidationError('Hạng mục bị trùng trong danh sách');
      keepIds.add(it.id);
    }
    const removeIds = existing.map((e) => e.id).filter((eid) => !keepIds.has(eid));
    if (removeIds.length > 0) {
      const linked = await tx.repairRequestItem.count({ where: { sourceInspectionItemId: { in: removeIds } } });
      if (linked > 0) throw new ValidationError(ITEM_IN_USE_MESSAGE);
      await tx.inspectionRequestItem.deleteMany({ where: { id: { in: removeIds }, inspectionRequestId } });
    }
    for (const it of items) {
      const { id: itemId, ...fields } = it;
      if (!itemId) continue;
      await tx.inspectionRequestItem.update({
        where: { id: itemId },
        data: {
          machineSystemId: fields.machineSystemId,
          machineSystemDetailId: fields.machineSystemDetailId,
          tenHeThong: fields.tenHeThong,
          tinhTrangThietBi: fields.tinhTrangThietBi,
          loaiLoi: fields.loaiLoi,
          noiDungLoi: fields.noiDungLoi,
          ...(fields.faultRecordId !== undefined && { faultRecordId: fields.faultRecordId }),
        },
      });
    }
    const toCreate = items.filter((it) => !it.id);
    if (toCreate.length > 0) {
      await tx.inspectionRequestItem.createMany({
        data: toCreate.map(({ id: _omit, ...fields }) => ({
          inspectionRequestId,
          machineSystemId: fields.machineSystemId,
          machineSystemDetailId: fields.machineSystemDetailId,
          tenHeThong: fields.tenHeThong,
          tinhTrangThietBi: fields.tinhTrangThietBi,
          loaiLoi: fields.loaiLoi,
          noiDungLoi: fields.noiDungLoi,
          faultRecordId: fields.faultRecordId ?? null,
        })),
      });
    }
  }

  async updateInspectionRequest(id: number, data: UpdateInspectionRequestData, actor: ActorContext = {}) {
    const existing = await prisma.inspectionRequest.findUnique({
      where: { id },
      select: { id: true, trangThai: true, createdById: true },
    });
    if (!existing) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
    this.assertCanEdit(existing, actor, await this.isPrivileged(actor));
    if ((data as unknown as Record<string, unknown>).trangThai !== undefined) {
      logger.warn(`Ignored client-supplied trangThai on inspection update (id: ${id})`);
    }
    const { items, tepDinhKem, ...scalar } = data as UpdateInspectionRequestData & { trangThai?: string };
    delete (scalar as Record<string, unknown>).trangThai;
    if (scalar.ghiChu !== undefined) scalar.ghiChu = stripNul(scalar.ghiChu);
    if (scalar.mucDoUuTien !== undefined) scalar.mucDoUuTien = stripNul(scalar.mucDoUuTien);
    const resolvedItems = items !== undefined ? await this.resolveItems(items) : undefined;
    // Append-only attachments: merge with existing, cap at MAX_ATTACHMENT_FILES.
    let mergedFiles: string[] | undefined;
    if (tepDinhKem !== undefined) {
      const current = await prisma.inspectionRequest.findUnique({ where: { id }, select: { tepDinhKem: true } });
      mergedFiles = [...(current?.tepDinhKem ?? []), ...tepDinhKem].slice(0, MAX_ATTACHMENT_FILES);
      if ((current?.tepDinhKem ?? []).length + tepDinhKem.length > MAX_ATTACHMENT_FILES) {
        throw new ValidationError(`Mỗi phiếu tối đa ${MAX_ATTACHMENT_FILES} tệp đính kèm`);
      }
    }
    await prisma.$transaction(async (tx) => {
      // Optimistic guard: the row must still be in the status the permission check saw.
      const guard = await tx.inspectionRequest.updateMany({
        where: { id, trangThai: existing.trangThai },
        data: { ...(scalar as Prisma.InspectionRequestUpdateManyMutationInput), ...(mergedFiles !== undefined && { tepDinhKem: mergedFiles }), updatedAt: new Date() },
      });
      if (guard.count === 0) throw new ConflictError(STALE_ROW_MESSAGE);
      if (resolvedItems !== undefined) await this.syncInspectionItems(tx, id, resolvedItems);
    });
    return this.getInspectionRequestById(id);
  }

  /**
   * Hard delete is allowed (ADMIN included) only for CHO_XU_LY / DA_HUY / TU_CHOI requests without
   * any acceptance slip — slips are the "Đã khắc phục" evidence and must not cascade away.
   */
  async deleteInspectionRequest(id: number) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.inspectionRequest.findUnique({
        where: { id },
        select: { id: true, trangThai: true, _count: { select: { acceptanceHandovers: true } } },
      });
      if (!row) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
      if (row._count.acceptanceHandovers > 0) {
        throw new ValidationError('Không thể xóa phiếu kiểm tra đã có phiếu nghiệm thu');
      }
      if (!YCKT_DELETABLE.has(row.trangThai)) {
        throw new ValidationError('Chỉ xóa được phiếu kiểm tra ở trạng thái Chờ xử lý, Đã hủy hoặc Từ chối');
      }
      const deleted = await tx.inspectionRequest.deleteMany({ where: { id, trangThai: row.trangThai } });
      if (deleted.count === 0) throw new ConflictError(STALE_ROW_MESSAGE);
    });
    return { message: 'Xóa phiếu kiểm tra thành công' };
  }

  /**
   * Single status-change path: reads the row inside the transaction, runs `precheck` on it, then
   * writes with an optimistic guard (where trangThai = current) so concurrent transitions conflict.
   */
  private async transition(id: number, next: InspectionRequestStatus, actor: ActorContext, reason: string, opts: InspectionTransitionOptions = {}) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.inspectionRequest.findUnique({
        where: { id },
        select: { id: true, trangThai: true, maYeuCau: true, createdById: true, ketLuan: true },
      });
      if (!row) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
      if (opts.precheck) await opts.precheck(row, tx);
      const validated = advanceInspection(row.trangThai, next, actor.actorRole === 'ADMIN');
      if (validated === row.trangThai) return;
      const guard = await tx.inspectionRequest.updateMany({
        where: { id, trangThai: row.trangThai },
        data: { trangThai: validated, ...(opts.extraData ?? {}) },
      });
      if (guard.count === 0) throw new ConflictError(STALE_ROW_MESSAGE);
      await tx.inspectionRequestStatusLog.create({
        data: { inspectionRequestId: id, oldStatus: row.trangThai, newStatus: validated, actorId: actor.actorId ?? null, actorRole: actor.actorRole ?? null, reason },
      });
    });
    return this.getInspectionRequestById(id);
  }

  async accept(id: number, actor: ActorContext) {
    return this.transition(id, InspectionRequestStatus.DA_TIEP_NHAN, actor, 'accept');
  }
  async startInspection(id: number, actor: ActorContext) {
    const row = await (prisma.inspectionRequest as unknown as { findUnique: (a: unknown) => Promise<{ id: number; trangThai: InspectionRequestStatus } | null> }).findUnique({ where: { id }, select: { id: true, trangThai: true } });
    if (!row) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
    let nguoiKiemTra: string | null = null;
    if (actor.actorId) {
      const user = await (prisma.user as unknown as { findUnique: (a: unknown) => Promise<{ firstName: string; lastName: string } | null> }).findUnique({ where: { id: actor.actorId }, select: { firstName: true, lastName: true } as never });
      if (user) nguoiKiemTra = `${(user as { lastName: string }).lastName} ${(user as { firstName: string }).firstName}`.trim();
    }
    // thoiGianKiemTra / nguoiKiemTra are written with the status change (same guarded update).
    return this.transition(id, InspectionRequestStatus.DANG_KIEM_TRA, actor, 'startInspection', {
      extraData: { thoiGianKiemTra: new Date(), ...(nguoiKiemTra ? { nguoiKiemTra } : {}) },
    });
  }
  async updateInspectionDetails(id: number, data: { ketQuaKiemTra?: string | null; mucDoHuHong?: string | null; deXuatXuLy?: string | null; ketLuan?: string | null; anhKiemTra?: string | null; thoiGianKiemTra?: Date | string | null; nguoiKiemTra?: string | null }, _actor: ActorContext) {
    const row = await (prisma.inspectionRequest as unknown as { findUnique: (a: unknown) => Promise<{ id: number; trangThai: InspectionRequestStatus } | null> }).findUnique({ where: { id }, select: { id: true, trangThai: true } });
    if (!row) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
    // Conclusion is locked once submitted (DA_KIEM_TRA / CHO_NGHIEM_THU) — otherwise it could bypass acceptance
    if (row.trangThai !== InspectionRequestStatus.DANG_KIEM_TRA && _actor?.actorRole !== 'ADMIN') {
      throw new ValidationError('Chỉ được cập nhật chi tiết kiểm tra ở trạng thái Đang kiểm tra');
    }
    const allowed: Record<string, unknown> = {};
    for (const k of ['ketQuaKiemTra', 'mucDoHuHong', 'deXuatXuLy', 'ketLuan', 'anhKiemTra', 'thoiGianKiemTra', 'nguoiKiemTra'] as const) {
      if (k in data) (allowed as Record<string, unknown>)[k] = stripNul((data as Record<string, unknown>)[k]);
    }
    if (allowed.ketLuan != null && allowed.ketLuan !== '' && !KET_LUAN_VALUES.has(String(allowed.ketLuan))) {
      throw new ValidationError('Kết luận chỉ được là Cần sửa chữa hoặc Đã khắc phục');
    }
    if (allowed.mucDoHuHong != null && allowed.mucDoHuHong !== '' && !MUC_DO_VALUES.has(String(allowed.mucDoHuHong))) {
      throw new ValidationError('Mức độ hư hỏng không hợp lệ');
    }
    if (allowed.ketLuan === '') allowed.ketLuan = null;
    if (allowed.mucDoHuHong === '') allowed.mucDoHuHong = null;
    if (allowed.thoiGianKiemTra && typeof allowed.thoiGianKiemTra === 'string') allowed.thoiGianKiemTra = new Date(allowed.thoiGianKiemTra as string);
    await (prisma.inspectionRequest as unknown as { update: (a: unknown) => Promise<unknown> }).update({ where: { id }, data: allowed as never });
    // audit log: status unchanged (update_details), never break main update on log failure
    try {
      const snapshot: Record<string, unknown> = {};
      if ('ketQuaKiemTra' in allowed) snapshot.ketQuaKiemTra = allowed.ketQuaKiemTra;
      if ('ketLuan' in allowed) snapshot.ketLuan = allowed.ketLuan;
      const reason = Object.keys(snapshot).length > 0 ? `update_details ${JSON.stringify(snapshot)}` : 'update_details';
      await (prisma.inspectionRequestStatusLog as unknown as { create: (a: unknown) => Promise<unknown> }).create({
        data: {
          inspectionRequestId: id,
          oldStatus: row.trangThai,
          newStatus: row.trangThai,
          actorId: _actor?.actorId ?? null,
          actorRole: _actor?.actorRole ?? null,
          reason,
        } as never,
      });
    } catch (e) {
      logger.warn(`[inspectionRequest] statusLog failed for update_details id=${id}: ${(e as Error).message}`);
    }
    return this.getInspectionRequestById(id);
  }
  /**
   * Technician submits the inspection result.
   *  - CAN_SUA_CHUA → DA_KIEM_TRA (next step: create YCSC).
   *  - DA_KHAC_PHUC → acceptance slip (tình trạng sau + tệp đính kèm bắt buộc) → CHO_NGHIEM_THU,
   *    waiting for the YCKT creator to confirm.
   */
  async submitInspection(id: number, actor: ActorContext, acceptance?: { tinhTrangSau?: string | null; ghiChu?: string | null; fileDinhKem?: string | null }): Promise<Record<string, unknown> | null> {
    const row = await prisma.inspectionRequest.findUnique({
      where: { id },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
    if (row.trangThai !== InspectionRequestStatus.DANG_KIEM_TRA) {
      throw new ValidationError('Chỉ được hoàn tất kiểm tra khi đang ở trạng thái Đang kiểm tra');
    }
    if (!row.ketQuaKiemTra) {
      throw new ValidationError('Vui lòng nhập kết quả kiểm tra thực tế trước khi hoàn tất');
    }
    if (!row.ketLuan || !KET_LUAN_VALUES.has(row.ketLuan)) {
      throw new ValidationError('Vui lòng chọn kết luận kiểm tra (Cần sửa chữa / Đã khắc phục) trước khi hoàn tất');
    }
    if (row.ketLuan === KET_LUAN_CAN_SUA_CHUA) {
      return this.transition(id, InspectionRequestStatus.DA_KIEM_TRA, actor, 'submitInspection', {
        precheck: (fresh) => {
          if (fresh.trangThai !== InspectionRequestStatus.DANG_KIEM_TRA || fresh.ketLuan !== KET_LUAN_CAN_SUA_CHUA) {
            throw new ConflictError(STALE_ROW_MESSAGE);
          }
        },
      });
    }

    // DA_KHAC_PHUC — acceptance data is mandatory
    const tinhTrangSau = stripNul(String(acceptance?.tinhTrangSau ?? '').trim());
    if (!tinhTrangSau) throw new ValidationError('Vui lòng nhập tình trạng sau khắc phục (dữ liệu nghiệm thu)');
    if (!acceptance?.fileDinhKem) throw new ValidationError('Vui lòng đính kèm tệp nghiệm thu');
    if (!row.createdById) throw new ValidationError('Phiếu kiểm tra không có người tạo để xác nhận nghiệm thu');

    const nguoiBanGiao = (await this.userFullName(actor.actorId)) ?? row.nguoiKiemTra ?? '';
    const tenHeThongThietBi = row.items.map((it) => it.tenHeThong).join('; ') || row.maYeuCau;
    const tinhTrangTruoc = row.items.length
      ? row.items.map((it) => `${it.tenHeThong}: ${it.tinhTrangThietBi} - ${it.noiDungLoi}`).join('; ')
      : row.ketQuaKiemTra;

    const handover = await acceptanceHandoverService.withHandoverCodeRetry(() => prisma.$transaction(async (tx) => {
      advanceInspection(row.trangThai, InspectionRequestStatus.CHO_NGHIEM_THU, actor.actorRole === 'ADMIN');
      // Claim the row first: a double-submit fails here instead of creating a second slip.
      const guard = await tx.inspectionRequest.updateMany({
        where: { id, trangThai: InspectionRequestStatus.DANG_KIEM_TRA, ketLuan: KET_LUAN_DA_KHAC_PHUC },
        data: { trangThai: InspectionRequestStatus.CHO_NGHIEM_THU },
      });
      if (guard.count === 0) throw new ConflictError(STALE_ROW_MESSAGE);
      const created = await acceptanceHandoverService.createInspectionAcceptanceTx(tx, {
        inspectionRequestId: id,
        maYeuCau: row.maYeuCau,
        tenHeThongThietBi,
        tinhTrangTruoc,
        tinhTrangSau,
        nguoiBanGiao,
        fileDinhKem: acceptance.fileDinhKem as string,
        ghiChu: acceptance.ghiChu ?? null,
        confirmerUserId: row.createdById,
        confirmerName: row.createdByName,
        userId: actor.actorId ?? null,
      });
      await tx.inspectionRequestStatusLog.create({
        data: {
          inspectionRequestId: id,
          oldStatus: row.trangThai,
          newStatus: InspectionRequestStatus.CHO_NGHIEM_THU,
          actorId: actor.actorId ?? null,
          actorRole: actor.actorRole ?? null,
          reason: `submit_da_khac_phuc ${created.maNghiemThu}`,
        },
      });
      return created;
    }));

    await acceptanceHandoverService.notifyConfirmer(handover, row.createdById, nguoiBanGiao);
    return this.getInspectionRequestById(id);
  }

  /**
   * YCKT creator confirms the "Đã khắc phục" acceptance slip.
   * ĐẠT → HOAN_THANH; KHÔNG ĐẠT (lý do bắt buộc) → back to DANG_KIEM_TRA for the technician.
   */
  async confirmAcceptance(id: number, actor: ActorContext, ketQua: string, lyDo?: string | null): Promise<Record<string, unknown>> {
    if (ketQua !== NghiemThuKetQua.DAT && ketQua !== NghiemThuKetQua.KHONG_DAT) {
      throw new ValidationError('Kết quả nghiệm thu không hợp lệ');
    }
    await prisma.$transaction(async (tx) => {
      const row = await tx.inspectionRequest.findUnique({ where: { id }, select: { id: true, trangThai: true } });
      if (!row) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
      if (row.trangThai !== InspectionRequestStatus.CHO_NGHIEM_THU) {
        throw new ValidationError('Chỉ xác nhận nghiệm thu khi phiếu đang Chờ nghiệm thu');
      }
      const next = ketQua === NghiemThuKetQua.DAT ? InspectionRequestStatus.HOAN_THANH : InspectionRequestStatus.DANG_KIEM_TRA;
      advanceInspection(row.trangThai, next, actor.actorRole === 'ADMIN', { viaConfirmation: true });
      // Claim the row first so a concurrent double-confirm fails before touching the slip.
      const guard = await tx.inspectionRequest.updateMany({ where: { id, trangThai: row.trangThai }, data: { trangThai: next } });
      if (guard.count === 0) throw new ConflictError(STALE_ROW_MESSAGE);
      await acceptanceHandoverService.recordConfirmationTx(tx, { inspectionRequestId: id }, actor, ketQua as NghiemThuKetQua, lyDo);
      await tx.inspectionRequestStatusLog.create({
        data: {
          inspectionRequestId: id,
          oldStatus: row.trangThai,
          newStatus: next,
          actorId: actor.actorId ?? null,
          actorRole: actor.actorRole ?? null,
          reason: ketQua === NghiemThuKetQua.DAT ? 'acceptance_dat' : `acceptance_khong_dat: ${String(lyDo ?? '').trim()}`,
        },
      });
    });
    return this.getInspectionRequestById(id);
  }

  /**
   * Close a CAN_SUA_CHUA inspection once an active YCSC exists (not DA_HUY / TU_CHOI).
   * Same rules for ADMIN. "Đã khắc phục" must go through confirmAcceptance.
   */
  async complete(id: number, actor: ActorContext): Promise<Record<string, unknown> | null> {
    const reason = actor.actorRole === 'ADMIN' ? 'complete_admin' : 'complete';
    return this.transition(id, InspectionRequestStatus.HOAN_THANH, actor, reason, {
      precheck: async (row, tx) => {
        if (row.ketLuan === KET_LUAN_DA_KHAC_PHUC) {
          throw new ValidationError('Kết luận Đã khắc phục phải được người tạo yêu cầu xác nhận nghiệm thu');
        }
        const activeRepairs = await tx.repairRequest.count({
          where: { sourceInspectionRequestId: id, trangThai: { notIn: INACTIVE_REPAIR_STATUSES } },
        });
        if (row.trangThai !== InspectionRequestStatus.DA_KIEM_TRA || row.ketLuan !== KET_LUAN_CAN_SUA_CHUA || activeRepairs === 0) {
          throw new ValidationError('Chỉ hoàn thành khi đã kiểm tra (Cần sửa chữa) và có yêu cầu sửa chữa còn hiệu lực');
        }
      },
    });
  }

  private async userFullName(userId?: string): Promise<string | null> {
    if (!userId) return null;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
    return user ? `${user.lastName} ${user.firstName}`.trim() : null;
  }
  async reject(id: number, actor: ActorContext, reason?: string) {
    return this.transition(id, InspectionRequestStatus.TU_CHOI, actor, reason ?? 'reject');
  }
  /**
   * Cancel permission: a non-technical user may cancel only their own request while CHO_XU_LY;
   * technicians / ADMIN follow advanceInspection's DA_HUY table (never in CHO_NGHIEM_THU).
   */
  async cancel(id: number, actor: ActorContext, reason?: string) {
    const privileged = await this.isPrivileged(actor);
    return this.transition(id, InspectionRequestStatus.DA_HUY, actor, reason ?? (actor.actorRole === 'ADMIN' ? 'admin_override' : 'user_cancel'), {
      precheck: (row) => {
        if (privileged) return;
        if (!actor.actorId || row.createdById !== actor.actorId) {
          throw new AuthorizationError('Chỉ người tạo phiếu hoặc bộ phận Kỹ thuật mới được hủy phiếu kiểm tra này');
        }
        if (row.trangThai !== InspectionRequestStatus.CHO_XU_LY) {
          throw new ValidationError('Chỉ được hủy phiếu kiểm tra của mình khi phiếu còn Chờ xử lý');
        }
      },
    });
  }

  async getStats(filters?: { dateFrom?: Date; dateTo?: Date }) {
    const now = new Date();
    const dateTo = filters?.dateTo ?? now;
    const windowMs = filters?.dateFrom ? dateTo.getTime() - filters.dateFrom.getTime() : 90 * 24 * 60 * 60 * 1000;
    const dateFrom = filters?.dateFrom ?? new Date(dateTo.getTime() - windowMs);
    const prevDateTo = new Date(dateFrom.getTime() - 1);
    const prevDateFrom = new Date(prevDateTo.getTime() - windowMs);
    const buildWhere = (from: Date, to: Date): Record<string, unknown> => ({ createdAt: { gte: from, lte: to } });
    const currentWhere = buildWhere(dateFrom, dateTo);
    const prevWhere = buildWhere(prevDateFrom, prevDateTo);
    const countByStatus = async (where: Record<string, unknown>) => {
      const rows = await (prisma.inspectionRequest as unknown as { groupBy: (a: unknown) => Promise<Array<{ trangThai: string; _count: { _all: number } }>> }).groupBy({ by: ['trangThai'], where: where as never, _count: { _all: true } });
      const counts: Record<string, number> = { CHO_XU_LY: 0, DA_TIEP_NHAN: 0, DANG_KIEM_TRA: 0, DA_KIEM_TRA: 0, CHO_NGHIEM_THU: 0, HOAN_THANH: 0, DA_HUY: 0, TU_CHOI: 0 };
      for (const r of rows) counts[r.trangThai] = r._count._all;
      return counts;
    };
    const [total, byStatus, prevByStatus, prevTotal] = await Promise.all([
      (prisma.inspectionRequest as unknown as { count: (a: unknown) => Promise<number> }).count({ where: currentWhere as never }),
      countByStatus(currentWhere),
      countByStatus(prevWhere),
      (prisma.inspectionRequest as unknown as { count: (a: unknown) => Promise<number> }).count({ where: prevWhere as never }),
    ]);
    const delta: Record<string, unknown> = {
      total: total - prevTotal,
      byStatus: Object.fromEntries(Object.keys(byStatus).map((k) => [k, (byStatus[k] ?? 0) - (prevByStatus[k] ?? 0)])),
    };
    return { total, byStatus, delta, window: { dateFrom, dateTo } };
  }

  async getStatusHistory(id: number) {
    const exists = await (prisma.inspectionRequest as unknown as { findUnique: (a: unknown) => Promise<{ id: number } | null> }).findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
    const logs = await (prisma.inspectionRequestStatusLog as unknown as { findMany: (a: unknown) => Promise<Array<Record<string, unknown>>> }).findMany({
      where: { inspectionRequestId: id },
      orderBy: { createdAt: 'asc' },
    });
    const actorIds = [...new Set(logs.map((l) => l.actorId as string).filter(Boolean))];
    let actorNames = new Map<string, string>();
    if (actorIds.length > 0) {
      const users = await (prisma.user as unknown as { findMany: (a: unknown) => Promise<Array<{ id: string; firstName: string; lastName: string }>> }).findMany({
        where: { id: { in: actorIds } },
        select: { id: true, firstName: true, lastName: true } as never,
      });
      users.forEach((u) => actorNames.set(u.id, `${u.lastName} ${u.firstName}`.trim()));
    }
    return logs.map((l) => ({ ...l, actorName: (l.actorId as string) ? (actorNames.get(l.actorId as string) ?? null) : null }));
  }
}

export default new InspectionRequestService();
