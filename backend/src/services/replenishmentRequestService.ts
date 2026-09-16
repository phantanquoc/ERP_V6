import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError, ConflictError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import { bucketPhanLoai } from '@utils/phanLoaiBucket';
import ExcelJS from 'exceljs';
import notificationService from './notificationService';
import { NotificationEvent } from '@types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReplenishmentRequestItemInput {
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
  nhaCungCapId?: string;
  giaDuKien?: number;
}

export interface CreateReplenishmentRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  items: ReplenishmentRequestItemInput[];
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  supplyRequestId?: string;
  phanLoaiGroup?: string;
}

// ─── Allowed transitions (YCBS is thin: Chờ báo giá → Đã chuyển mua hàng / Đã hủy) ───

export const REPLENISHMENT_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'Chờ báo giá': ['Đã chuyển mua hàng', 'Đã hủy'],
  'Đã chuyển mua hàng': [],
  'Đã hủy': [],
};

// ────────────────────────────────────────────────────────────────────────────

class ReplenishmentRequestService {
  // ── Code generation ──────────────────────────────────────────────────────

  async generateReplenishmentRequestCode(tx?: any): Promise<string> {
    const year = new Date().getFullYear();
    const client = tx ?? prisma;
    const last = await client.replenishmentRequest.findFirst({
      where: { maYeuCau: yearlyCodeWhere('YC-BS', year) },
      orderBy: { maYeuCau: 'desc' },
      select: { maYeuCau: true },
    });
    return nextYearlyCode(last?.maYeuCau ?? null, 'YC-BS', year);
  }

  // ── Internal factory — only called from supplyRequestService tx ──────────
  //
  // Warehouse creates YCBS without price/supplier (those are for purchasing to
  // fill). Validates away any sneaked nhaCungCapId/giaDuKien — fail-closed.

  async createReplenishmentRequest(
    data: CreateReplenishmentRequestRequest,
    txClient?: any,
  ) {
    const tx = txClient ?? prisma;
    if (!data.items?.length) throw new ValidationError('Vui lòng nhập ít nhất một hàng hóa');

    for (const item of data.items) {
      if (!item.phanLoai?.trim() || !item.tenGoi?.trim() || !item.donViTinh?.trim())
        throw new ValidationError('Thiếu thông tin hàng hóa: phân loại, tên, đơn vị tính là bắt buộc');
      if (!Number.isFinite(item.soLuong) || item.soLuong <= 0)
        throw new ValidationError(`Số lượng phải > 0 cho "${item.tenGoi}"`);
      if (item.nhaCungCapId != null || item.giaDuKien != null)
        throw new ValidationError(`Không được điền giá/NCC khi tạo YCBS cho "${item.tenGoi}" — để thu mua bổ sung`);
    }

    if (data.supplyRequestId) {
      // The source request must exist; its link is how the SR bridges to "Chờ bổ sung"
      // and how the receipt modal prefills. Quantities are NOT capped at the source
      // request's remaining — the warehouse may deliberately stock extra (buffer,
      // price break), so any positive quantity is accepted as-is.
      const sr = await tx.supplyRequest.findUnique({
        where: { id: data.supplyRequestId },
        select: { id: true },
      });
      if (!sr) throw new ValidationError('Yêu cầu cung cấp nguồn không tồn tại');
    }

    // Compute phanLoaiGroup from bucket if not supplied
    const derivedGroup = (() => {
      if (data.phanLoaiGroup) return data.phanLoaiGroup;
      const buckets = new Set(data.items.map((it) => bucketPhanLoai(it.phanLoai)));
      if (buckets.size === 1) return [...buckets][0];
      return 'OTHER';
    })();

    const code = await this.generateReplenishmentRequestCode(txClient ? tx : undefined);
    const header = await tx.replenishmentRequest.create({
      data: {
        maYeuCau: code,
        employeeId: data.employeeId,
        maNhanVien: data.maNhanVien,
        tenNhanVien: data.tenNhanVien,
        mucDichYeuCau: data.mucDichYeuCau,
        mucDoUuTien: data.mucDoUuTien,
        ghiChu: data.ghiChu,
        supplyRequestId: data.supplyRequestId,
        phanLoaiGroup: derivedGroup,
        trangThai: 'Chờ báo giá',
      },
    });

    await tx.replenishmentRequestItem.createMany({
      data: data.items.map((it) => ({
        replenishmentRequestId: header.id,
        phanLoai: it.phanLoai,
        tenGoi: it.tenGoi,
        soLuong: it.soLuong,
        donViTinh: it.donViTinh,
        nhaCungCapId: null,
        giaDuKien: null,
      })),
    });

    return tx.replenishmentRequest.findUnique({
      where: { id: header.id },
      include: { items: { include: { supplier: true } }, supplyRequest: true, convertedPurchaseRequest: true },
    });
  }

  /**
   * Public entry point for a manually created YCBS — the "Tạo yêu cầu bổ sung" button
   * in the supply-request detail modal (warehouse deciding to route the remaining
   * shortage to purchasing by hand, instead of through partialFulfill).
   *
   * The parent SR bridge runs INSIDE the same transaction as the YCBS insert, so the
   * two can never disagree: previously the advance was a follow-up call wrapped in
   * try/catch, which left the SR reading "Chưa cung cấp" behind a real YCBS whenever
   * that call threw. Only the notification is deferred and best-effort — alerting
   * purchasing must never roll back a YCBS the warehouse just filed.
   */
  async createFromSupplyRequest(data: CreateReplenishmentRequestRequest) {
    const created = await prisma.$transaction(async (tx) => {
      const row = await this.createReplenishmentRequest(data, tx);
      if (data.supplyRequestId) {
        // Lazy import: supplyRequestService and this module reference each other.
        const supplyRequestService = (await import('./supplyRequestService')).default;
        await supplyRequestService.advanceStatusTx(tx, data.supplyRequestId, 'Chờ bổ sung');
      }
      return row;
    });

    try {
      await notificationService.notify(NotificationEvent.REPLENISHMENT_REQUEST_CREATED, {
        entityId: created?.id,
        metadata: {
          maYeuCau: created?.maYeuCau,
          maYeuCauCC: (created?.supplyRequest as { maYeuCau?: string } | null)?.maYeuCau ?? '',
          replenishmentRequestId: created?.id,
          supplyRequestId: data.supplyRequestId,
          tenGoi: data.items[0]?.tenGoi ?? '',
          items: data.items.map((it) => ({ phanLoai: it.phanLoai })),
          phanLoaiGroup: created?.phanLoaiGroup,
        },
      });
    } catch (e) {
      console.error('[replenishment] failed to notify purchasing:', e);
    }

    return created;
  }

  // ── Read ─────────────────────────────────────────────────────────────────

  async getAllReplenishmentRequests(
    page: number = 1,
    limit: number = 10,
    search?: string,
    departmentIds?: string[],
    month?: number,
    year?: number,
    extra?: { phanLoaiGroup?: string; trangThai?: string | string[]; supplyRequestId?: string },
  ) {
    const { skip } = getPaginationParams(page, limit);

    const deptFilter = departmentIds?.length
      ? { employee: { user: { OR: [{ departmentId: { in: departmentIds } }, { departmentId: null }] } } }
      : {};

    const dateFilter = month && year
      ? { ngayYeuCau: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } }
      : year
        ? { ngayYeuCau: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } }
        : {};

    const where: Record<string, unknown> = { ...deptFilter, ...dateFilter };
    if (search?.trim()) {
      where.OR = [
        { maYeuCau: { contains: search.trim(), mode: 'insensitive' as const } },
        { tenNhanVien: { contains: search.trim(), mode: 'insensitive' as const } },
        { mucDichYeuCau: { contains: search.trim(), mode: 'insensitive' as const } },
      ];
    }
    if (extra?.phanLoaiGroup) where.phanLoaiGroup = extra.phanLoaiGroup;
    // A single status filters by equality; an array uses `in` — the purchasing queue
    // passes ['Chờ báo giá','Đã hủy'] so a cancelled YCBS stays visible (carrying its
    // reason) instead of vanishing the moment it is cancelled.
    if (Array.isArray(extra?.trangThai)) where.trangThai = { in: extra.trangThai };
    else if (extra?.trangThai) where.trangThai = extra.trangThai;
    if (extra?.supplyRequestId) where.supplyRequestId = extra.supplyRequestId;

    const [data, total] = await Promise.all([
      prisma.replenishmentRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { supplier: true } }, supplyRequest: true, convertedPurchaseRequest: true, employee: { select: { id: true, employeeCode: true } } },
      }),
      prisma.replenishmentRequest.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { data, pagination: { page, limit, total, totalPages } };
  }

  async getReplenishmentRequestById(id: string) {
    const row = await prisma.replenishmentRequest.findUnique({
      where: { id },
      include: { items: { include: { supplier: true } }, supplyRequest: true, convertedPurchaseRequest: true },
    });
    if (!row) throw new NotFoundError('Không tìm thấy yêu cầu bổ sung');
    return row;
  }

  // ── Update — only Chờ báo giá, only fills giá+NCC/ghi chú, never changes phanLoai/soLuong ─

  async updateReplenishmentRequest(
    id: string,
    data: { items?: ReplenishmentRequestItemInput[]; ghiChu?: string; mucDoUuTien?: string; ghiChuMuaHang?: string; [k: string]: unknown },
  ) {
    const existing = await prisma.replenishmentRequest.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) throw new NotFoundError('Không tìm thấy yêu cầu bổ sung');

    // Only Chờ báo giá can be updated; converted/cancelled are terminal
    if (existing.trangThai !== 'Chờ báo giá')
      throw new ValidationError(`Không thể sửa yêu cầu ở trạng thái "${existing.trangThai}"`);

    // Explicit status transition through this endpoint is not allowed — use convert/cancel
    if (data.trangThai != null && String(data.trangThai) !== existing.trangThai)
      throw new ValidationError('Không thể đổi trạng thái qua cập nhật thông thường — dùng "Chuyển thành YCMH" hoặc "Hủy"');

    // Forbid quantity/type edits (kho's domain); only pricing/supplier per item
    const nextItems = data.items as ReplenishmentRequestItemInput[] | undefined;
    if (nextItems !== undefined) {
      if (nextItems.length !== existing.items.length)
        throw new ValidationError('Không thể thêm/bớt dòng hàng hóa sau khi tạo YCBS');
      for (let i = 0; i < nextItems.length; i++) {
        const cur = existing.items[i];
        const nxt = nextItems[i];
        if (nxt.phanLoai !== cur.phanLoai || nxt.tenGoi !== cur.tenGoi || Number(nxt.soLuong) !== Number(cur.soLuong) || nxt.donViTinh !== cur.donViTinh)
          throw new ValidationError(`Không thể đổi phân loại/tên/số lượng/ĐVT dòng "${cur.tenGoi}" — tạo YCBS mới nếu cần`);
        if (nxt.nhaCungCapId) {
          const sup = await prisma.supplier.findUnique({ where: { id: nxt.nhaCungCapId }, select: { trangThai: true } });
          if (!sup) throw new ValidationError(`Nhà cung cấp "${nxt.nhaCungCapId}" không tồn tại`);
          if (sup.trangThai !== 'Đang cung cấp') throw new ValidationError('Nhà cung cấp đã ngừng cung cấp');
        }
        if (nxt.giaDuKien != null && (!Number.isFinite(Number(nxt.giaDuKien)) || Number(nxt.giaDuKien) <= 0))
          throw new ValidationError(`Giá dự kiến phải > 0 cho "${nxt.tenGoi}"`);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Header patch
      const headerPatch: Record<string, unknown> = {};
      if ((data as Record<string, unknown>).mucDoUuTien != null) headerPatch.mucDoUuTien = (data as Record<string, unknown>).mucDoUuTien;
      if ((data as Record<string, unknown>).ghiChu != null) headerPatch.ghiChu = (data as Record<string, unknown>).ghiChu;
      if ((data as Record<string, unknown>).ghiChuMuaHang != null) headerPatch.ghiChu = (data as Record<string, unknown>).ghiChuMuaHang; // alias
      if (Object.keys(headerPatch).length) {
        await tx.replenishmentRequest.update({ where: { id }, data: headerPatch });
      }

      if (nextItems !== undefined) {
        // Replace items that have pricing fields; keep line identity stable by delete+createMany
        await tx.replenishmentRequestItem.deleteMany({ where: { replenishmentRequestId: id } });
        await tx.replenishmentRequestItem.createMany({
          data: nextItems.map((it) => ({
            replenishmentRequestId: id,
            phanLoai: it.phanLoai,
            tenGoi: it.tenGoi,
            soLuong: Number(it.soLuong),
            donViTinh: it.donViTinh,
            nhaCungCapId: it.nhaCungCapId || null,
            giaDuKien: it.giaDuKien != null ? Number(it.giaDuKien) : null,
          })),
        });
      }

      return tx.replenishmentRequest.findUnique({
        where: { id },
        include: { items: { include: { supplier: true } }, supplyRequest: true, convertedPurchaseRequest: true },
      });
    });

    return result!;
  }

  // ── Convert YCBS → YCMH — the split point ────────────────────────────────
  //
  // Inside one tx:
  //   - creates PurchaseRequest { sourceType=MANUAL, YC-MH-… } with items copied
  //     from YCBS (NCC/giaDuKien always carried over — never dropped).
  //   - fully quoted → trangThai=Chờ duyệt (convert doubles as submit-for-approval)
  //   - partially quoted → trangThai=Chờ báo giá (finish quoting on the YCMH via
  //     purchaseRequest update + submitForApproval)
  //   - marks YCBS trangThai='Đã chuyển mua hàng', convertedPurchaseRequestId = new PR id

  async convertToPurchaseRequest(id: string, actorEmployeeId?: string) {
    // Pre-read for fast-fail on the common path. The definitive guard is inside
    // the transaction below (updateMany on trangThai+convertedPurchaseRequestId),
    // so two concurrent converts cannot both succeed there.
    const ybs = await prisma.replenishmentRequest.findUnique({
      where: { id },
      include: { items: { include: { supplier: true } }, supplyRequest: true },
    });
    if (!ybs) throw new NotFoundError('Không tìm thấy yêu cầu bổ sung');
    if (ybs.trangThai !== 'Chờ báo giá')
      throw new ValidationError(`YCBS ở trạng thái "${ybs.trangThai}" không thể chuyển thành YCMH`);
    if (ybs.convertedPurchaseRequestId)
      throw new ValidationError('YCBS này đã được chuyển thành YCMH trước đó');

    const result = await prisma.$transaction(async (tx) => {
      // Atomic claim: even if two requests both pass the checks above, only one
      // `updateMany` matches — the loser sees count === 0 and bails before
      // leaving an orphan YCMH.
      const claimed = await tx.replenishmentRequest.updateMany({
        where: { id, trangThai: 'Chờ báo giá', convertedPurchaseRequestId: null },
        data: { trangThai: 'Đã chuyển mua hàng' },
      });
      if (claimed.count === 0) {
        throw new ConflictError('Yêu cầu bổ sung này đã được chuyển thành YCMH bởi một thao tác khác');
      }

      // Re-read the freshest items inside the tx, so a price/NCC edit that
      // landed between the outer read and the claim is not lost.
      const ybsFresh = await tx.replenishmentRequest.findUnique({
        where: { id },
        include: { items: true },
      });
      const useItems = ybsFresh?.items?.length ? ybsFresh.items : ybs.items;

      // Generate PR code inside tx
      const year = new Date().getFullYear();
      const last = await tx.purchaseRequest.findFirst({
        where: { maYeuCau: yearlyCodeWhere('YC-MH', year) },
        orderBy: { maYeuCau: 'desc' },
        select: { maYeuCau: true },
      });
      const maYeuCau = nextYearlyCode(last?.maYeuCau ?? null, 'YC-MH', year);

      // NCC + price are copied from YCBS. If purchasing already quoted every line
      // here, the YCMH skips its own Chờ báo giá stage and lands at Chờ duyệt —
      // one click converts AND submits for approval, so purchasing does not have to
      // open the purchase-request list and press "Gửi duyệt" a second time. Partial
      // pricing keeps the old shape: Chờ báo giá, finish quoting on the YCMH.
      const allPriced = useItems.length > 0 && useItems.every(
        (it) => !!it.nhaCungCapId && it.giaDuKien != null && Number(it.giaDuKien) > 0,
      );

      const pr = await tx.purchaseRequest.create({
        data: {
          maYeuCau,
          employeeId: ybs.employeeId,
          maNhanVien: ybs.maNhanVien,
          tenNhanVien: ybs.tenNhanVien,
          mucDichYeuCau: ybs.mucDichYeuCau,
          mucDoUuTien: ybs.mucDoUuTien,
          ghiChu: ybs.ghiChu,
          supplyRequestId: ybs.supplyRequestId,
          trangThai: allPriced ? 'Chờ duyệt' : 'Chờ báo giá',
          sourceType: 'MANUAL',
          fileKemTheo: ybs.fileKemTheo,
        },
      });

      // Prefill only: YCMH's own submitForApproval enforces NCC+giaDuKien per line,
      // so anything the YCBS didn't price stays null here and must be quoted there.
      await tx.purchaseRequestItem.createMany({
        data: useItems.map((it) => ({
          purchaseRequestId: pr.id,
          phanLoai: it.phanLoai,
          tenHangHoa: it.tenGoi,
          soLuong: Number(it.soLuong),
          donViTinh: it.donViTinh,
          nhaCungCapId: it.nhaCungCapId,
          giaDuKien: it.giaDuKien != null ? Number(it.giaDuKien) : null,
        })),
      });

      await tx.replenishmentRequest.update({
        where: { id },
        data: { convertedPurchaseRequestId: pr.id },
      });

      return { prId: pr.id, maYeuCau, submitted: allPriced };
    });

    // Notifications — best-effort, never fail the tx
    try {
      const prRow = await prisma.purchaseRequest.findUnique({
        where: { id: result.prId },
        include: { items: true },
      });
      if (prRow) {
        if (result.submitted) {
          // Fully quoted at convert time: skip the quoting notification. The YCMH is
          // already Chờ duyệt, so tell approvers directly (same event submitForApproval
          // would have sent) instead of asking purchasing to quote it again.
          const tongTien = prRow.items.reduce(
            (sum, it) => sum + Number(it.soLuong ?? 0) * Number(it.giaDuKien ?? 0),
            0,
          );
          notificationService
            .notify(NotificationEvent.PURCHASE_REQUEST_SUBMITTED_FOR_APPROVAL, {
              actorUserId: actorEmployeeId,
              entityId: prRow.id,
              metadata: {
                maYeuCau: prRow.maYeuCau,
                purchaseRequestId: prRow.id,
                tongTien: tongTien.toLocaleString('vi-VN') + ' đ',
              },
            })
            .catch(() => { /* best-effort */ });
        } else {
          // Partial pricing: a fresh YCMH needs quoting (it lands in Chờ báo giá).
          // The YCBS notification (REPLENISHMENT_REQUEST_CREATED) already reached
          // purchasing at creation time; this one tracks the new YCMH id for the
          // deep-link. Best-effort — a failure never fails an already-committed convert.
          notificationService
            .notify(NotificationEvent.PURCHASE_REQUEST_CREATED, {
              actorUserId: actorEmployeeId,
              entityId: prRow.id,
              metadata: {
                maYeuCau: prRow.maYeuCau,
                purchaseRequestId: prRow.id,
                sourceType: prRow.sourceType,
                replenishmentRequestId: id,
                phanLoaiGroup: ybs.phanLoaiGroup,
                items: prRow.items.map((it) => ({ phanLoai: it.phanLoai })),
              },
            })
            .catch(() => { /* best-effort */ });
        }
      }
    } catch { /* reload after successful convert; notification failure must not reject the flow */ }

    return prisma.replenishmentRequest.findUnique({
      where: { id },
      include: { items: { include: { supplier: true } }, supplyRequest: true, convertedPurchaseRequest: { include: { items: true } } },
    });
  }

  // ── Cancel / Delete ───────────────────────────────────────────────────────

  async cancelReplenishmentRequest(
    id: string,
    opts?: { lyDoHuy?: string; nguoiHuy?: string },
  ) {
    const ybs = await prisma.replenishmentRequest.findUnique({ where: { id } });
    if (!ybs) throw new NotFoundError('Không tìm thấy yêu cầu bổ sung');
    if (ybs.trangThai !== 'Chờ báo giá')
      throw new ValidationError(`Không thể hủy YCBS ở trạng thái "${ybs.trangThai}"`);

    const lyDoHuy = opts?.lyDoHuy?.trim();
    if (!lyDoHuy) throw new ValidationError('Vui lòng nhập lý do hủy');

    // TOCTOU-safe claim, and the exact mirror of convertToPurchaseRequest's atomic
    // claim (which matches on trangThai='Chờ báo giá' AND convertedPurchaseRequestId IS
    // NULL). Because both statements carry the same two-field guard, a cancel and a
    // convert racing on the same YCBS can never both succeed: whichever updateMany
    // commits first flips trangThai, so the loser sees count === 0. Without the
    // convertedPurchaseRequestId term here, a cancel landing after a convert would
    // destroy a live YCMH's parent link.
    const claimed = await prisma.replenishmentRequest.updateMany({
      where: { id, trangThai: 'Chờ báo giá', convertedPurchaseRequestId: null },
      data: {
        trangThai: 'Đã hủy',
        lyDoHuy,
        ngayHuy: new Date(),
        ...(opts?.nguoiHuy ? { nguoiHuy: opts.nguoiHuy } : {}),
      },
    });

    if (claimed.count === 0) {
      // Re-read only to report the accurate reason; never rewrite.
      const current = await prisma.replenishmentRequest.findUnique({
        where: { id },
        select: { trangThai: true, convertedPurchaseRequestId: true },
      });
      if (!current) throw new NotFoundError('Không tìm thấy yêu cầu bổ sung');
      throw new ConflictError(
        `Không thể hủy YCBS: yêu cầu đã được chuyển thành YCMH hoặc đã hủy bởi một thao tác khác (trạng thái "${current.trangThai}")`,
      );
    }

    const updated = await prisma.replenishmentRequest.findUnique({ where: { id } });

    // The parent YCCB was bridged to "Chờ bổ sung" when this YCBS was filed. If it
    // is the last live replenishment request on that ticket, pull the YCCB back to
    // "Đang xử lý" so the warehouse sees the shortage is open again and can re-file.
    // Deliberately a direct write (not advanceStatusTx): that helper is forward-only
    // and cannot express a regression. Guarded on the YCCB still being at
    // "Chờ bổ sung" so a ticket already past that point is never rewound.
    if (ybs.supplyRequestId) {
      try {
        const supplyRequestService = (await import('./supplyRequestService')).default;
        await supplyRequestService.onReplenishmentRequestCancelled(ybs.supplyRequestId);
      } catch (e) {
        console.error('[replenishment] failed to reopen parent supply request:', e);
      }
    }

    // Notify the original requester — a cancelled YCBS otherwise vanishes from the
    // purchasing queue in silence, which reads to the warehouse as "lost paperwork".
    try {
      await notificationService.notify(NotificationEvent.REPLENISHMENT_REQUEST_CANCELLED, {
        targetEmployeeIds: [ybs.employeeId],
        entityId: id,
        metadata: {
          maYeuCau: ybs.maYeuCau,
          replenishmentRequestId: id,
          supplyRequestId: ybs.supplyRequestId ?? '',
          lyDo: lyDoHuy,
        },
      });
    } catch (e) {
      console.error('[replenishment] failed to send cancel notification:', e);
    }

    return updated;
  }

  async deleteReplenishmentRequest(id: string) {
    const ybs = await prisma.replenishmentRequest.findUnique({ where: { id } });
    if (!ybs) throw new NotFoundError('Không tìm thấy yêu cầu bổ sung');
    if (ybs.trangThai === 'Đã chuyển mua hàng')
      throw new ValidationError('Không thể xóa YCBS đã chuyển thành YCMH');
    if (ybs.trangThai === 'Đã hủy')
      throw new ValidationError('Không thể xóa YCBS đã hủy — liên hệ quản trị');
    // Cascades to items via onDelete:Cascade
    await prisma.replenishmentRequest.delete({ where: { id } });
    return { success: true };
  }

  // ── Excel export ──────────────────────────────────────────────────────────

  async exportToExcel(
    search?: string,
    departmentIds?: string[],
    month?: number,
    year?: number,
    extra?: { phanLoaiGroup?: string; trangThai?: string | string[]; supplyRequestId?: string },
  ) {
    // Same filters as getAllReplenishmentRequests so the export matches the on-screen list.
    const where: Record<string, unknown> = {};
    if (departmentIds?.length) {
      where.employee = { user: { OR: [{ departmentId: { in: departmentIds } }, { departmentId: null }] } };
    }
    if (month && year) {
      where.ngayYeuCau = { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
    } else if (year) {
      where.ngayYeuCau = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
    }
    if (search?.trim()) {
      where.OR = [
        { maYeuCau: { contains: search.trim(), mode: 'insensitive' as const } },
        { tenNhanVien: { contains: search.trim(), mode: 'insensitive' as const } },
      ];
    }
    if (extra?.phanLoaiGroup) where.phanLoaiGroup = extra.phanLoaiGroup;
    if (Array.isArray(extra?.trangThai)) where.trangThai = { in: extra.trangThai };
    else if (extra?.trangThai) where.trangThai = extra.trangThai;
    if (extra?.supplyRequestId) where.supplyRequestId = extra.supplyRequestId;

    const rows = await prisma.replenishmentRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('YCBS');
    ws.columns = [
      { header: 'Mã YCBS', key: 'maYeuCau', width: 16 },
      { header: 'Ngày', key: 'ngayYeuCau', width: 12 },
      { header: 'Người yêu cầu', key: 'tenNhanVien', width: 18 },
      { header: 'Mục đích', key: 'mucDichYeuCau', width: 28 },
      { header: 'Trạng thái', key: 'trangThai', width: 16 },
      { header: 'Nhóm', key: 'phanLoaiGroup', width: 12 },
      { header: 'Nguồn YC-CC', key: 'supplyRequestId', width: 16 },
      { header: 'YCMH', key: 'convertedPurchaseRequestId', width: 16 },
    ];
    for (const r of rows) {
      ws.addRow({
        maYeuCau: (r as Record<string, unknown>).maYeuCau,
        ngayYeuCau: (r as Record<string, unknown>).ngayYeuCau,
        tenNhanVien: (r as Record<string, unknown>).tenNhanVien,
        mucDichYeuCau: (r as Record<string, unknown>).mucDichYeuCau,
        trangThai: (r as Record<string, unknown>).trangThai,
        phanLoaiGroup: (r as Record<string, unknown>).phanLoaiGroup,
        supplyRequestId: (r as Record<string, unknown>).supplyRequestId,
        convertedPurchaseRequestId: (r as Record<string, unknown>).convertedPurchaseRequestId,
      });
    }
    return wb;
  }
}

export default new ReplenishmentRequestService();
