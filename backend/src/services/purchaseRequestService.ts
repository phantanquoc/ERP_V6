import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError, AuthorizationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import ExcelJS from 'exceljs';
import supplyRequestService from './supplyRequestService';
import notificationService from './notificationService';
import { NotificationEvent } from '@types';
import { normalizeBoPhan } from '@utils/normalizeBoPhan';

interface PurchaseRequestItemInput {
  phanLoai: string;
  tenHangHoa: string;
  soLuong: number;
  donViTinh: string;
  nhaCungCapId?: string;
  giaDuKien?: number;
}

interface CreatePurchaseRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  items: PurchaseRequestItemInput[];
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  fileKemTheo?: string;
  supplyRequestId?: string;
  nhaCungCapId?: string;
  giaDuKien?: number;
  ghiChuMuaHang?: string;
  isQuickPurchase?: boolean;
  // 'MANUAL' | 'SHORTAGE' | 'REORDER' | 'QUICK'
  sourceType?: string;
  ngayDuKienNhap?: string | Date | null;
  warehouseId?: string | null;
  ghiChuVanChuyen?: string | null;
}

// 3.1 — strict allowlist: every transition must be explicitly listed.
// Keep legacy `Chờ duyệt` paths for migration, but block shortcuts.
// Direct Chờ báo giá → Đã duyệt and any *→Hoàn thành except Đã duyệt→Hoàn thành are rejected.
// FIXME: if a status outside this map is introduced, add it here intentionally — no wildcard.
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  // purchasing quotation stage → awaiting approval
  'Chờ báo giá': ['Chờ duyệt'],
  // approval
  'Chờ duyệt': ['Đã duyệt', 'Từ chối'],
  // rejected is terminal — no further transition (also covers blocked *→Hoàn thành)
  'Từ chối': [],
  // approved → completed
  'Đã duyệt': ['Hoàn thành'],
  // completed is terminal
  'Hoàn thành': [],
  // cancelled by cancelPurchaseRequest — terminal, and never reachable via PUT {trangThai}
  'Đã hủy': [],
};

class PurchaseRequestService {
  private async generatePurchaseRequestCode(tx?: any): Promise<string> {
    const year = new Date().getFullYear();
    const client = tx ?? prisma;
    const last = await client.purchaseRequest.findFirst({
      where: { maYeuCau: yearlyCodeWhere('YC-MH', year) },
      orderBy: { maYeuCau: 'desc' },
      select: { maYeuCau: true },
    });
    return nextYearlyCode(last?.maYeuCau ?? null, 'YC-MH', year);
  }

  async getAllPurchaseRequests(
    page: number = 1,
    limit: number = 10,
    search?: string,
    departmentIds?: string[],
    month?: number,
    year?: number,
    phanLoaiFilter?: string | string[],
    extra?: { phanLoaiNCC?: string; sourceType?: string; trangThai?: string; supplyRequestBoPhan?: string | string[] },
  ) {
    const { skip } = getPaginationParams(page, limit);

    // Non-admin: show PR from own departments + PR created by admin (departmentId is null)
    const deptFilter = departmentIds?.length
      ? { employee: { user: { OR: [{ departmentId: { in: departmentIds } }, { departmentId: null }] } } }
      : {};

    // Date range filter by month/year on ngayYeuCau
    const dateFilter = (month && year)
      ? { ngayYeuCau: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } }
      : year
        ? { ngayYeuCau: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } }
        : {};

    // 5.3 — server-side phanLoai / phanLoaiNCC filter
    // phanLoaiNCC=NVL → MATERIALS bucket, Thiết bị → EQUIPMENT bucket (shared heuristic).
    // Supports paginated server-side filtering: builds a contains-OR that matches free-text variants.
    const phanLoaiWhere = (() => {
      const fromPhanLoai = (() => {
        if (!phanLoaiFilter) return null as string[] | null;
        const raw = Array.isArray(phanLoaiFilter) ? phanLoaiFilter : String(phanLoaiFilter).split(',');
        const vals = raw.map((s) => String(s).trim()).filter(Boolean);
        return vals.length ? vals : null;
      })();
      if (fromPhanLoai) {
        return { items: { some: { phanLoai: { in: fromPhanLoai } } } } as Record<string, unknown>;
      }
      const ncc = extra?.phanLoaiNCC ? String(extra.phanLoaiNCC).trim() : '';
      if (!ncc) return {} as Record<string, unknown>;
      const normalized = ncc.toLowerCase();
      if (normalized === 'nvl') {
        return {
          items: {
            some: {
              OR: [
                { phanLoai: { contains: 'nguyên', mode: 'insensitive' as const } },
                { phanLoai: { contains: 'vật tư', mode: 'insensitive' as const } },
                { phanLoai: { contains: 'vật liệu', mode: 'insensitive' as const } },
                { phanLoai: { contains: 'phụ liệu', mode: 'insensitive' as const } },
                { phanLoai: { contains: 'bao bì', mode: 'insensitive' as const } },
                { phanLoai: { contains: 'nhiên liệu', mode: 'insensitive' as const } },
                { phanLoai: { contains: 'thành phẩm', mode: 'insensitive' as const } },
              ],
            },
          },
        } as Record<string, unknown>;
      }
      if (normalized === 'thiết bị' || normalized === 'thiet bi') {
        return {
          items: {
            some: {
              OR: [
                { phanLoai: { contains: 'thiết bị', mode: 'insensitive' as const } },
                { phanLoai: { contains: 'công cụ', mode: 'insensitive' as const } },
                { phanLoai: { contains: 'dụng cụ', mode: 'insensitive' as const } },
              ],
            },
          },
        } as Record<string, unknown>;
      }
      return {} as Record<string, unknown>;
    })();
    const sourceTypeWhere = extra?.sourceType ? { sourceType: extra.sourceType } : {};
    const trangThaiWhere = (() => {
      const raw = extra?.trangThai ? String(extra.trangThai).trim() : '';
      if (!raw) return {} as Record<string, unknown>;
      const vals = raw.split(',').map((s) => s.trim()).filter(Boolean);
      if (vals.length <= 1) return { trangThai: raw } as Record<string, unknown>;
      return { trangThai: { in: vals } } as Record<string, unknown>;
    })();
    // SHORTAGE via phanLoaiNCC=SHORTAGE is handled as sourceType filter
    const effectiveSourceTypeWhere =
      extra?.phanLoaiNCC === 'SHORTAGE' ? { sourceType: 'SHORTAGE' } : sourceTypeWhere;
    // supplyRequestBoPhan: normalize then filter on supplyRequest.boPhan
    const supplyRequestBoPhanClauses: Record<string, unknown>[] = (() => {
      const raw = extra?.supplyRequestBoPhan;
      if (raw === undefined || raw === null || String(raw).trim() === '') return [];
      const arr = Array.isArray(raw) ? raw : String(raw).split(',');
      const normalized = arr.map((s) => normalizeBoPhan(String(s))).filter(Boolean);
      if (!normalized.length) return [];
      if (normalized.length === 1) {
        return [{ supplyRequest: { boPhan: { equals: normalized[0], mode: 'insensitive' as const } } } as Record<string, unknown>];
      }
      return [{ OR: normalized.map((v) => ({ supplyRequest: { boPhan: { equals: v, mode: 'insensitive' as const } } })) } as unknown as Record<string, unknown>];
    })();
    const classAndStageFilters = { ...phanLoaiWhere, ...effectiveSourceTypeWhere, ...trangThaiWhere };

    const andClauses: Record<string, unknown>[] = [deptFilter, dateFilter, classAndStageFilters, ...supplyRequestBoPhanClauses];
    const where = search
      ? {
          AND: [
            ...andClauses,
            {
              OR: [
                { maYeuCau: { contains: search, mode: 'insensitive' as const } },
                { tenNhanVien: { contains: search, mode: 'insensitive' as const } },
                { maNhanVien: { contains: search, mode: 'insensitive' as const } },
                {
                  items: {
                    some: {
                      OR: [
                        { tenHangHoa: { contains: search, mode: 'insensitive' as const } },
                        { phanLoai: { contains: search, mode: 'insensitive' as const } },
                      ],
                    },
                  },
                },
              ],
            },
          ],
        }
      : { AND: andClauses };

    const [data, total] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              user: { select: { firstName: true, lastName: true, email: true } },
              position: { select: { name: true } },
            },
          },
          supplyRequest: { select: { id: true, maYeuCau: true, trangThai: true, boPhan: true } },
          supplier: { select: { id: true, tenNhaCungCap: true, maNhaCungCap: true } },
          warehouse: { select: { id: true, tenKho: true, maKho: true } },
          inboundPlan: { include: { warehouse: { select: { id: true, tenKho: true, maKho: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 20 } } },
          items: { include: { supplier: true } },
        },
      }),
      prisma.purchaseRequest.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPurchaseRequestById(id: string) {
    const request = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        supplyRequest: true,
        supplier: true,
        warehouse: { select: { id: true, tenKho: true, maKho: true } },
        inboundPlan: { include: { warehouse: { select: { id: true, tenKho: true, maKho: true } }, logs: { orderBy: { createdAt: 'desc' } } } },
        items: { include: { supplier: true } },
        replenishmentRequest: { select: { id: true, maYeuCau: true, trangThai: true } },
        warehouseReceipts: { select: { id: true, maPhieuNhap: true } },
      },
    });

    if (!request) {
      throw new NotFoundError('Không tìm thấy yêu cầu mua hàng');
    }

    return request;
  }

  async createPurchaseRequest(data: CreatePurchaseRequestRequest) {
    // Shortage replenishment now goes through YCBS (ReplenishmentRequest) created
    // by the warehouse and converted by purchasing; direct SHORTAGE PR creation is rejected.
    // REORDER from reorderRuleService is still allowed.
    if (data.sourceType === 'SHORTAGE') {
      throw new ValidationError('Thiếu tồn kho nay đi qua YCBS (YC-BS) — kho tạo yêu cầu bổ sung, thu mua chuyển thành YCMH. Không tạo trực tiếp YCMH SHORTAGE.');
    }
    if (!data.items || data.items.length === 0) {
      throw new ValidationError('Vui lòng thêm ít nhất một hàng hóa');
    }
    // 3.2 — item + reference validation before any DB write
    for (let i = 0; i < data.items.length; i++) {
      const it = data.items[i] as PurchaseRequestItemInput;
      if (!it.tenHangHoa || !String(it.tenHangHoa).trim()) {
        throw new ValidationError(`Dòng ${i + 1}: tên hàng hóa không được để trống`);
      }
      if (!it.phanLoai || !String(it.phanLoai).trim()) {
        throw new ValidationError(`Dòng ${i + 1}: phân loại không được để trống`);
      }
      if (it.soLuong === undefined || it.soLuong === null) {
        throw new ValidationError(`Dòng ${i + 1}: số lượng không được để trống`);
      }
      const q = Number(it.soLuong);
      if (!Number.isFinite(q) || q <= 0) {
        throw new ValidationError(`Dòng ${i + 1}: số lượng phải lớn hơn 0 và là số hữu hạn`);
      }
    }
    if (data.supplyRequestId) {
      const sr = await prisma.supplyRequest.findUnique({ where: { id: data.supplyRequestId }, select: { id: true } });
      if (!sr) throw new ValidationError('Yêu cầu cung cấp liên kết không tồn tại');
    }
    const referencedSupplierIds = new Set<string>();
    for (const it of data.items) if (it.nhaCungCapId) referencedSupplierIds.add(String(it.nhaCungCapId));
    if (data.nhaCungCapId) referencedSupplierIds.add(String(data.nhaCungCapId));
    if (referencedSupplierIds.size > 0) {
      const suppliers = await prisma.supplier.findMany({
        where: { id: { in: [...referencedSupplierIds] } },
        select: { id: true, trangThai: true },
      });
      const byId = new Map(suppliers.map((s: any) => [s.id, s]));
      for (const sid of referencedSupplierIds) {
        const s = byId.get(sid) as any;
        if (!s) throw new ValidationError(`Nhà cung cấp không tồn tại: ${sid}`);
        const st: string = String(s.trangThai ?? '');
        if (st && st !== 'Đang cung cấp' && st !== 'ACTIVE' && st.toLowerCase() !== 'active') {
          throw new ValidationError(`Nhà cung cấp không còn hoạt động: ${sid}`);
        }
      }
    }
    // Validate ngayDuKienNhap / warehouseId trước khi tạo
    let ngayDuKienNhapValidated: Date | null = null;
    if (data.ngayDuKienNhap !== undefined && data.ngayDuKienNhap !== null && String(data.ngayDuKienNhap).trim() !== '') {
      const d = new Date(data.ngayDuKienNhap as string);
      if (isNaN(d.getTime())) throw new ValidationError('Ngày dự kiến nhập không hợp lệ');
      const ngayYeuCauRef = new Date(); ngayYeuCauRef.setHours(0, 0, 0, 0);
      const dDay = new Date(d); dDay.setHours(0, 0, 0, 0);
      if (dDay < ngayYeuCauRef) throw new ValidationError('Ngày dự kiến nhập phải >= ngày yêu cầu');
      ngayDuKienNhapValidated = d;
    }
    // Treat empty string warehouseId as null (no warehouse)
    const warehouseIdNorm = (() => {
      const v = (data as any).warehouseId;
      if (v === undefined || v === null || String(v).trim() === '') return null;
      return String(v).trim();
    })();
    if (warehouseIdNorm) {
      const wh = await prisma.warehouses.findUnique({ where: { id: warehouseIdNorm }, select: { id: true } });
      if (!wh) throw new ValidationError('Kho không tồn tại');
    }

    const purchaseRequest = await prisma.$transaction(async (tx) => {
      // 3.2 — maYeuCau is selected FOR the transaction, not before it
      const maYeuCau = await this.generatePurchaseRequestCode(tx);
      const isQuick = data.isQuickPurchase ?? false;
      const sourceType = data.sourceType ?? 'MANUAL';
      // Status matrix:
      // - QUICK: skip approval → 'Đã duyệt' immediately
      // - SHORTAGE / REORDER: auto-created, needs purchasing to quote → 'Chờ báo giá'
      // - MANUAL: user-submitted with all info → 'Chờ duyệt'
      let trangThai = 'Chờ duyệt';
      if (isQuick) {
        trangThai = 'Đã duyệt';
      } else if (sourceType === 'SHORTAGE' || sourceType === 'REORDER') {
        trangThai = 'Chờ báo giá';
      }
      const created = await tx.purchaseRequest.create({
        data: {
          maYeuCau,
          employeeId: data.employeeId,
          maNhanVien: data.maNhanVien,
          tenNhanVien: data.tenNhanVien,
          mucDichYeuCau: data.mucDichYeuCau,
          mucDoUuTien: data.mucDoUuTien,
          ghiChu: data.ghiChu,
          fileKemTheo: data.fileKemTheo,
          supplyRequestId: data.supplyRequestId || null,
          nhaCungCapId: data.nhaCungCapId || null,
          giaDuKien: data.giaDuKien ?? null,
          ghiChuMuaHang: data.ghiChuMuaHang,
          isQuickPurchase: isQuick,
          sourceType,
          trangThai,
          nguoiDuyet: isQuick ? 'Hệ thống (Tự động)' : undefined,
          ngayDuyet: isQuick ? new Date() : undefined,
          ngayDuKienNhap: ngayDuKienNhapValidated,
          warehouseId: warehouseIdNorm,
          ghiChuVanChuyen: (data.ghiChuVanChuyen ?? null) as string | null,
        },
      });

      if (data.items && data.items.length > 0) {
        await tx.purchaseRequestItem.createMany({
          data: data.items.map((item) => ({
            purchaseRequestId: created.id,
            phanLoai: item.phanLoai,
            tenHangHoa: item.tenHangHoa,
            soLuong: item.soLuong,
            donViTinh: item.donViTinh,
            nhaCungCapId: item.nhaCungCapId || null,
            giaDuKien: item.giaDuKien ?? null,
          })),
        });
      }

      return tx.purchaseRequest.findUnique({
        where: { id: created.id },
        include: {
          employee: {
            include: {
              user: true,
              position: true,
            },
          },
          supplyRequest: true,
          supplier: true,
          warehouse: { select: { id: true, tenKho: true, maKho: true } },
          inboundPlan: { include: { warehouse: { select: { id: true, tenKho: true, maKho: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 20 } } },
          items: { include: { supplier: true } },
        },
      });
    });

    // Trigger supply request status advancement
    if (data.supplyRequestId) {
      try {
        await supplyRequestService.onPurchaseRequestCreated(data.supplyRequestId);
      } catch (hookError) {
        console.error('Error in onPurchaseRequestCreated hook:', hookError);
      }
    }

    // Notify purchasing department about the new PR (registry handles recipients)
    // 4.2 — carry goods-class metadata for sub-department routing
    try {
      await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_CREATED, {
        metadata: {
          maYeuCau: purchaseRequest?.maYeuCau ?? (purchaseRequest as any)?.maYeuCau ?? '',
          purchaseRequestId: purchaseRequest?.id,
          supplyRequestId: data.supplyRequestId,
          sourceType: data.sourceType ?? 'MANUAL',
          employeeName: data.tenNhanVien,
          items: data.items.map((i) => ({ phanLoai: i.phanLoai, tenHangHoa: i.tenHangHoa })),
          phanLoaiGroup: (() => { const c = (data.items[0] as any)?.phanLoai; return typeof c === 'string' ? c : undefined; })(),
        },
      });
    } catch (notifError) {
      console.error('Error sending purchase request notifications:', notifError);
    }

    return purchaseRequest;
  }

  async getGeneratedCode() {
    return this.generatePurchaseRequestCode();
  }

  // 3.3 — tighten: remove universal TEAM_LEAD/DEPARTMENT_HEAD bypass, require
  // __actorUserId, restrict EMPLOYEE approvals to the pricing sub-department
  private async assertCanApprovePurchase(actorUserId?: string): Promise<void> {
    if (!actorUserId) throw new ValidationError('Thiếu thông tin người duyệt');
    const user = await prisma.user.findUnique({ where: { id: actorUserId } });
    if (!user) throw new ValidationError('Người duyệt không tồn tại');
    if (user.role === 'ADMIN') return;
    const secondary = await prisma.userSecondaryDepartment.findMany({
      where: { userId: user.id },
    }).then((rows: any[]) => rows.map((r) => ({ departmentId: r.departmentId, subDepartmentId: r.subDepartmentId, role: r.role })));
    const { isPricingApprover } = await import('@utils/isPricingApprover');
    const payload: any = {
      id: user.id,
      role: user.role,
      departmentId: user.departmentId,
      subDepartmentId: user.subDepartmentId,
      secondaryDepartments: secondary,
    };
    if (await isPricingApprover(payload)) return;
    throw new AuthorizationError('Không có quyền duyệt yêu cầu mua hàng');
  }

  /**
   * Confirm actual price — operational update, not approval.
   * Passes for ADMIN, any role in DEPT_PURCHASING (DB lookup by code), or GENERAL/pricing via isPricingApprover.
   */
  private async assertCanConfirmActualPrice(actorUserId?: string): Promise<void> {
    if (!actorUserId) throw new ValidationError('Thiếu thông tin người xác nhận');
    const user = await prisma.user.findUnique({ where: { id: actorUserId } });
    if (!user) throw new ValidationError('Người xác nhận không tồn tại');
    if (user.role === 'ADMIN') return;
    const secondary = await prisma.userSecondaryDepartment.findMany({
      where: { userId: user.id },
    }).then((rows: any[]) => rows.map((r) => ({ departmentId: r.departmentId, subDepartmentId: r.subDepartmentId, role: r.role })));
    // Check DEPT_PURCHASING membership (any role)
    const deptIds = [
      user.departmentId,
      ...secondary.map((s: any) => s.departmentId),
    ].filter(Boolean) as string[];
    if (deptIds.length > 0) {
      const depts = await prisma.department.findMany({ where: { id: { in: deptIds } }, select: { code: true } });
      if (depts.some((d) => d.code === 'DEPT_PURCHASING')) return;
    }
    // Backward-compat: GENERAL/pricing via isPricingApprover
    const { isPricingApprover } = await import('@utils/isPricingApprover');
    const payload: any = {
      id: user.id,
      role: user.role,
      departmentId: user.departmentId,
      subDepartmentId: user.subDepartmentId,
      secondaryDepartments: secondary,
    };
    if (await isPricingApprover(payload)) return;
    throw new AuthorizationError('Không có quyền xác nhận giá thực tế');
  }

  async updatePurchaseRequest(id: string, data: {
    phanLoai?: string;
    tenHangHoa?: string;
    soLuong?: number | string;
    donViTinh?: string;
    mucDichYeuCau?: string;
    mucDoUuTien?: string;
    ghiChu?: string;
    fileKemTheo?: string;
    trangThai?: string;
    nguoiDuyet?: string;
    ngayDuyet?: string;
    nhaCungCapId?: string;
    giaDuKien?: number;
    ghiChuMuaHang?: string;
    items?: PurchaseRequestItemInput[];
    ngayDuKienNhap?: string | Date | null;
    warehouseId?: string | null;
    ghiChuVanChuyen?: string | null;
  }) {
    const existingRequest = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: { supplyRequest: true },
    });

    if (!existingRequest) {
      throw new NotFoundError('Không tìm thấy yêu cầu mua hàng');
    }

    // 3.1 — ALLOWED_TRANSITIONS enforcement; also blocks Chờ báo giá→Đã duyệt
    // and *→Hoàn thành without prior Đã duyệt, enforced at the top before any write.
    if (data.trangThai !== undefined && data.trangThai !== existingRequest.trangThai) {
      const allowed = ALLOWED_TRANSITIONS[existingRequest.trangThai];
      if (!allowed || !allowed.includes(data.trangThai)) {
        throw new ValidationError(
          `Không thể chuyển trạng thái từ "${existingRequest.trangThai}" sang "${data.trangThai}"`
        );
      }
    }
    // 3.4 — block `* → Hoàn thành` unless prior was Đã duyệt (already blocked by map above,
    // kept as explicit second defence for audit/readability)
    if (data.trangThai === 'Hoàn thành' && existingRequest.trangThai !== 'Đã duyệt') {
      throw new ValidationError('Chỉ có thể chuyển sang Hoàn thành khi đang ở Đã duyệt');
    }
    // 3.1 — lock items and pricing after Hoàn thành ONLY. Đã duyệt is deliberately
    // editable now: purchasing must be able to correct giá dự kiến / NCC after
    // approval (e.g. supplier renegotiated before goods arrived). The actual-price
    // confirmation (confirmActualPrice) still gates on Đã duyệt, and the per-line
    // giaThucTe is preserved across an item re-write below so a post-approval edit
    // never wipes a cost basis that was already booked into the catalog.
    // Inbound scheduling fields (ngayDuKienNhap/warehouseId/ghiChuVanChuyen) are
    // editable even after Đã duyệt — only Hoàn thành/Đã hủy lock them (and items/pricing).
    const lockedStatuses = new Set(['Hoàn thành', 'Đã hủy']);
    if (lockedStatuses.has(existingRequest.trangThai)) {
      const touchesItems = data.items !== undefined;
      const touchesPricing =
        (data as any).nhaCungCapId !== undefined ||
        (data as any).giaDuKien !== undefined ||
        (data as any).phanLoai !== undefined ||
        (data as any).tenHangHoa !== undefined ||
        (data as any).soLuong !== undefined;
      const touchesSchedule =
        (data as any).ngayDuKienNhap !== undefined ||
        (data as any).warehouseId !== undefined ||
        (data as any).ghiChuVanChuyen !== undefined;
      if (touchesItems || touchesPricing || touchesSchedule) {
        throw new ValidationError('Không thể sửa yêu cầu đã hoàn thành hoặc đã hủy');
      }
      // still allow non-pricing/non-schedule header edits (ghiChu, mucDichYeuCau, etc.)
    }
    // Allow ngayDuKienNhap/warehouseId/ghiChuVanChuyen edits while in Đã duyệt (intentional exception)
    // Validate new schedule fields if provided
    let normalizedNgayDuKienNhap: Date | null | undefined = undefined; // undefined = not touched
    if ((data as any).ngayDuKienNhap !== undefined) {
      const raw = (data as any).ngayDuKienNhap;
      if (raw === null || raw === '' || (typeof raw === 'string' && raw.trim() === '')) {
        normalizedNgayDuKienNhap = null;
      } else {
        const d = new Date(raw as string);
        if (isNaN(d.getTime())) throw new ValidationError('Ngày dự kiến nhập không hợp lệ');
        const ngayYeuCauRef: Date = (existingRequest as any).ngayYeuCau ?? new Date();
        const refDay = new Date(ngayYeuCauRef); refDay.setHours(0, 0, 0, 0);
        const dDay = new Date(d); dDay.setHours(0, 0, 0, 0);
        if (dDay < refDay) throw new ValidationError('Ngày dự kiến nhập phải >= ngày yêu cầu');
        normalizedNgayDuKienNhap = d;
      }
    }
    let normalizedWarehouseId: string | null | undefined = undefined;
    if ((data as any).warehouseId !== undefined) {
      const raw = (data as any).warehouseId;
      if (raw === null || raw === '' || (typeof raw === 'string' && raw.trim() === '')) {
        normalizedWarehouseId = null;
      } else {
        const wid = String(raw).trim();
        const wh = await prisma.warehouses.findUnique({ where: { id: wid }, select: { id: true } });
        if (!wh) throw new ValidationError('Kho không tồn tại');
        normalizedWarehouseId = wid;
      }
    }

    // Guard: approval/rejection requires pricing approver (called via controller with actorId)
    // 3.3 — __actorUserId is required; no silent pass on undefined
    const _actorIdForGuard = (data as any).__actorUserId as string | undefined;
    if (data.trangThai === 'Đã duyệt' || data.trangThai === 'Từ chối') {
      await this.assertCanApprovePurchase(_actorIdForGuard);
    }
    // Server-derived approver identity (mirror cancelPurchaseRequest): ignore client
    // nguoiDuyet/ngayDuyet and derive from actor user. No validation on client fields.
    if (data.trangThai === 'Đã duyệt' || data.trangThai === 'Từ chối') {
      const actorId = _actorIdForGuard as string | undefined;
      if (actorId) {
        const actor = await prisma.user.findUnique({
          where: { id: actorId },
          select: { firstName: true, lastName: true, email: true },
        });
        if (actor) {
          const derived = `${actor.lastName ?? ''} ${actor.firstName ?? ''}`.trim() || actor.email || '';
          (data as any).nguoiDuyet = derived;
          (data as any).ngayDuyet = new Date();
        }
      }
    }

    // Parse soLuong to float if it's a string (from FormData)
    const { items, ...updateData } = data as any;
    // Strip internal actor field before Prisma — unknown field causes P2000/P2011
    delete (updateData as any).__actorUserId;
    // Inject normalized schedule fields (undefined = not touched, null = clear)
    if (normalizedNgayDuKienNhap !== undefined) updateData.ngayDuKienNhap = normalizedNgayDuKienNhap;
    if (normalizedWarehouseId !== undefined) updateData.warehouseId = normalizedWarehouseId;
    // ghiChuVanChuyen: normalize empty string → null, but only if caller touched it
    if ((data as any).ghiChuVanChuyen !== undefined) {
      const gcv = (data as any).ghiChuVanChuyen;
      updateData.ghiChuVanChuyen = (gcv === null || gcv === '' || (typeof gcv === 'string' && gcv.trim() === '')) ? null : String(gcv);
    }
    if (updateData.soLuong !== undefined && updateData.soLuong !== null) {
      updateData.soLuong = parseFloat(updateData.soLuong.toString());
    }
    if (updateData.ngayDuyet) {
      updateData.ngayDuyet = new Date(updateData.ngayDuyet);
    }
    // Sanitize empty-string foreign keys → null (Prisma throws P2003 otherwise)
    if (updateData.nhaCungCapId === '') updateData.nhaCungCapId = null;
    if (updateData.supplyRequestId === '') updateData.supplyRequestId = null;
    // empty warehouseId already handled via normalizedWarehouseId; catch stray '' in updateData
    if (updateData.warehouseId === '') updateData.warehouseId = null;
    if (updateData.ngayDuKienNhap === '') updateData.ngayDuKienNhap = null;
    if (typeof updateData.ngayDuKienNhap === 'string' && updateData.ngayDuKienNhap) {
      const d = new Date(updateData.ngayDuKienNhap);
      if (!isNaN(d.getTime())) updateData.ngayDuKienNhap = d;
    }
    // Coerce numeric fields sent as strings from FormData
    if (typeof updateData.giaDuKien === 'string') {
      updateData.giaDuKien = updateData.giaDuKien === '' ? null : parseFloat(updateData.giaDuKien);
    }

    let purchaseRequest;
    // Snapshot prior schedule values to detect InboundPlan reschedule after the write
    const priorNgayDuKienNhap: Date | null = (existingRequest as any).ngayDuKienNhap ?? null;
    const priorWarehouseId: string | null = (existingRequest as any).warehouseId ?? null;

    if (items && Array.isArray(items)) {
      purchaseRequest = await prisma.$transaction(async (tx) => {
        // Preserve confirmed actual price across the delete-then-recreate: an
        // edit after Đã duyệt must never wipe a giaThucTe that already fed the
        // catalog cost basis. Keyed by the incoming item's id (the row being
        // replaced); name is the fallback for legacy single-row edits without id.
        const prior = await tx.purchaseRequestItem.findMany({
          where: { purchaseRequestId: id },
          select: { id: true, tenHangHoa: true, giaThucTe: true },
        });
        const giaThucTeById = new Map(prior.map((p) => [p.id, p.giaThucTe]));
        const giaThucTeByName = new Map(prior.map((p) => [p.tenHangHoa.toLowerCase(), p.giaThucTe]));
        await tx.purchaseRequestItem.deleteMany({ where: { purchaseRequestId: id } });
        await tx.purchaseRequestItem.createMany({
          data: items.map((item: PurchaseRequestItemInput) => {
            const rawGia = (item as any).giaDuKien;
            const giaDuKien =
              rawGia === '' || rawGia === undefined || rawGia === null
                ? null
                : typeof rawGia === 'string'
                ? parseFloat(rawGia) || null
                : rawGia;
            const itemId = (item as any).id as string | undefined;
            const carriedGiaThucTe =
              (itemId ? giaThucTeById.get(itemId) : undefined) ??
              giaThucTeByName.get(item.tenHangHoa.toLowerCase()) ??
              null;
            return {
              purchaseRequestId: id,
              phanLoai: item.phanLoai,
              tenHangHoa: item.tenHangHoa,
              soLuong: typeof item.soLuong === 'string' ? parseFloat(item.soLuong) : item.soLuong,
              donViTinh: item.donViTinh,
              nhaCungCapId: item.nhaCungCapId || null,
              giaDuKien,
              giaThucTe: carriedGiaThucTe,
            };
          }),
        });
        return tx.purchaseRequest.update({
          where: { id },
          data: updateData,
          include: {
            employee: { include: { user: true, position: true } },
            supplyRequest: true,
            supplier: true,
            warehouse: { select: { id: true, tenKho: true, maKho: true } },
            inboundPlan: { include: { warehouse: { select: { id: true, tenKho: true, maKho: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 20 } } },
            items: { include: { supplier: true } },
          },
        });
      });
    } else {
      purchaseRequest = await prisma.purchaseRequest.update({
        where: { id },
        data: updateData,
        include: {
          employee: { include: { user: true, position: true } },
          supplyRequest: true,
          supplier: true,
          warehouse: { select: { id: true, tenKho: true, maKho: true } },
          inboundPlan: { include: { warehouse: { select: { id: true, tenKho: true, maKho: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 20 } } },
          items: { include: { supplier: true } },
        },
      });
    }
    // ── Reschedule InboundPlan when ngayDuKienNhap or warehouseId changed after a plan already exists ──
    if ((normalizedNgayDuKienNhap !== undefined || normalizedWarehouseId !== undefined) && purchaseRequest) {
      const existingPlan = (purchaseRequest as any).inboundPlan ?? await prisma.inboundPlan.findUnique({ where: { purchaseRequestId: id } });
      if (existingPlan) {
        const newNgay = normalizedNgayDuKienNhap !== undefined ? normalizedNgayDuKienNhap : null;
        const newWhId = normalizedWarehouseId !== undefined ? normalizedWarehouseId : null;
        const dateChanged = newNgay !== undefined && newNgay !== null && priorNgayDuKienNhap?.getTime() !== (newNgay as Date)?.getTime();
        const whChanged = newWhId !== undefined && newWhId !== null && priorWarehouseId !== newWhId;
        // Date reschedule: update InboundPlan.ngayDuKien + log
        if (dateChanged && newNgay) {
          const oldDate: Date | null = existingPlan.ngayDuKien ?? priorNgayDuKienNhap;
          const actorLabel = (updateData as any).nguoiDuyet ?? (purchaseRequest as any).nguoiDuyet ?? 'Hệ thống';
          await prisma.$transaction(async (tx) => {
            await tx.inboundPlan.update({ where: { id: existingPlan.id }, data: { ngayDuKien: newNgay as Date, ...(newWhId !== undefined && newWhId !== null ? { warehouseId: newWhId } : {}) } });
            await tx.inboundPlanLog.create({ data: { inboundPlanId: existingPlan.id, hanhDong: 'Đổi ngày dự kiến', ngayCu: oldDate, ngayMoi: newNgay as Date, nguoiThucHien: actorLabel } });
          });
          // also sync warehouse if it changed at same time but date log already covers warehouse update
          if (whChanged && newWhId) {
            // warehouse already updated in the same tx above; nothing extra
          }
        } else if (whChanged && newWhId) {
          await prisma.inboundPlan.update({ where: { id: existingPlan.id }, data: { warehouseId: newWhId } });
        } else if (newNgay === null && existingPlan) {
          // clearing date is not propagated to plan — keep plan date as-is
        }
      }
    }
    // ── Auto-create InboundPlan when transitioning to Hoàn thành (idempotent) ──
    if (updateData.trangThai === 'Hoàn thành' && existingRequest.trangThai !== 'Hoàn thành') {
      const existingPlan = await prisma.inboundPlan.findUnique({ where: { purchaseRequestId: id } });
      if (!existingPlan) {
        // Resolve ngayDuKien: ngayDuKienNhap ?? ngayDuyet ?? now+7d
        const prForPlan = (purchaseRequest as any) ?? await prisma.purchaseRequest.findUnique({ where: { id } });
        const ngayDuyetVal: Date | null = prForPlan?.ngayDuyet ?? (existingRequest as any).ngayDuyet ?? null;
        const ngayHen: Date | null = prForPlan?.ngayDuKienNhap ?? (existingRequest as any).ngayDuKienNhap ?? null;
        let ngayDuKien: Date;
        if (ngayHen) ngayDuKien = new Date(ngayHen);
        else if (ngayDuyetVal) ngayDuKien = new Date(ngayDuyetVal);
        else { const d = new Date(); d.setDate(d.getDate() + 7); ngayDuKien = d; }
        const whId: string | null = prForPlan?.warehouseId ?? (existingRequest as any).warehouseId ?? null;
        await prisma.$transaction(async (tx) => {
          // Double-check idempotency inside tx
          const already = await tx.inboundPlan.findUnique({ where: { purchaseRequestId: id } });
          if (already) return;
          const year = new Date().getFullYear();
          const lastPlan = await tx.inboundPlan.findFirst({ where: { maKeHoach: yearlyCodeWhere('KH-NH', year) }, orderBy: { maKeHoach: 'desc' }, select: { maKeHoach: true } });
          const maKeHoach = nextYearlyCode(lastPlan?.maKeHoach ?? null, 'KH-NH', year);
          await tx.inboundPlan.create({ data: { maKeHoach, purchaseRequestId: id, ngayDuKien, warehouseId: whId, trangThai: 'Chờ nhập' } });
        });
      }
      // Warehouse notification for the inbound plan is covered by the existing
      // "Hoàn thành → notify warehouse" block below (SUPPLY_REQUEST_APPROVED to SUBDEPT_PRODUCTION_WAREHOUSE),
      // so no duplicate notify here — plan existence is still refreshed for the response.
      // Refresh purchaseRequest to include the newly created plan for the response
      try {
        const refreshed = await prisma.purchaseRequest.findUnique({
          where: { id },
          include: {
            employee: { include: { user: true, position: true } },
            supplyRequest: true,
            supplier: true,
            warehouse: { select: { id: true, tenKho: true, maKho: true } },
            inboundPlan: { include: { warehouse: { select: { id: true, tenKho: true, maKho: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 20 } } },
            items: { include: { supplier: true } },
          },
        });
        if (refreshed) purchaseRequest = refreshed as any;
      } catch {}
    }

    // Trigger supply request status advancement when purchase request is approved
    if (
      updateData.trangThai === 'Đã duyệt' &&
      existingRequest.supplyRequestId
    ) {
      try {
        await supplyRequestService.onPurchaseRequestApproved(existingRequest.supplyRequestId);
      } catch (hookError) {
        console.error('Error in onPurchaseRequestApproved hook:', hookError);
      }
    }

    // Notify requester when approved
    if (updateData.trangThai === 'Đã duyệt' && existingRequest.employeeId) {
      try {
        await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_APPROVED, {
          targetEmployeeIds: [existingRequest.employeeId],
          metadata: {
            maYeuCau: existingRequest.maYeuCau,
            purchaseRequestId: id,
            nguoiDuyet: updateData.nguoiDuyet ?? '',
          },
        });
      } catch (notifError) {
        console.error('Error sending purchase request approved notification:', notifError);
      }
    }

    // Notify requester when rejected
    if (updateData.trangThai === 'Từ chối' && existingRequest.employeeId) {
      try {
        await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_REJECTED, {
          targetEmployeeIds: [existingRequest.employeeId],
          metadata: {
            maYeuCau: existingRequest.maYeuCau,
            purchaseRequestId: id,
            lyDo: updateData.ghiChuMuaHang ?? '',
          },
        });
      } catch (notifError) {
        console.error('Error sending purchase request rejected notification:', notifError);
      }
    }

    // Notify warehouse when purchasing marks as "Hoàn thành" (goods purchased, ready for intake)
    if (updateData.trangThai === 'Hoàn thành') {
      // Advance supply request status to "Đã mua hàng"
      if (existingRequest.supplyRequestId) {
        try {
          await supplyRequestService.onPurchaseRequestCompleted(existingRequest.supplyRequestId);
        } catch (hookError) {
          console.error('Error in onPurchaseRequestCompleted hook:', hookError);
        }
      }

      try {
        const warehouseEmployees = await prisma.employee.findMany({
          where: {
            subDepartment: {
              code: 'SUBDEPT_PRODUCTION_WAREHOUSE',
            },
          },
          select: { id: true },
        });

        const requestDetail = await prisma.purchaseRequest.findUnique({
          where: { id },
          include: { items: true },
        });

        if (warehouseEmployees.length > 0 && requestDetail) {
          await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_APPROVED, {
            targetEmployeeIds: warehouseEmployees.map((emp) => emp.id),
            metadata: { maYeuCau: requestDetail.maYeuCau, supplyRequestId: existingRequest.supplyRequestId },
          });
        }
      } catch (notifError) {
        console.error('Error sending warehouse notification:', notifError);
      }

      // Notify requester that their purchase request is completed
      if (existingRequest.employeeId) {
        try {
          await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_COMPLETED, {
            targetEmployeeIds: [existingRequest.employeeId],
            metadata: {
              maYeuCau: existingRequest.maYeuCau,
              purchaseRequestId: id,
            },
          });
        } catch (notifError) {
          console.error('Error sending purchase request completed notification:', notifError);
        }
      }
    }

    return purchaseRequest;
  }

  async deletePurchaseRequest(id: string) {
    const existingRequest = await prisma.purchaseRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      throw new NotFoundError('Không tìm thấy yêu cầu mua hàng');
    }

    // 3.4 — block deletion of Đã duyệt / Hoàn thành (approved/completed) PRs
    if (existingRequest.trangThai === 'Đã duyệt' || existingRequest.trangThai === 'Hoàn thành') {
      throw new ValidationError('Không thể xóa yêu cầu đã duyệt hoặc đã hoàn thành');
    }
    // Deleting a SHORTAGE "Chờ báo giá" PR would orphan its parent SR at "Chờ bổ sung"
    // with a nulled decision link (via SetNull), so treat it as a soft error that
    // prompts the caller to fix the source shortage via fulfillment instead.
    if (existingRequest.sourceType === 'SHORTAGE' && existingRequest.trangThai === 'Chờ báo giá') {
      throw new ValidationError(
        'Không thể xóa yêu cầu bổ sung đang chờ báo giá. Hãy xử lý yêu cầu qua cung cấp lại cho kho trước.'
      );
    }
    if ((existingRequest as any).trangThai === 'Từ chối') {
      // Deleting a rejected PR is allowed, but keep the branch explicit for auditing
    }

    await prisma.purchaseRequest.delete({
      where: { id },
    });

    return { message: 'Xóa yêu cầu mua hàng thành công' };
  }

  /**
   * Cancel a YCMH before it has been approved. Deliberately narrower than "Từ chối":
   * rejection is the approver's decision on a ticket that reached Chờ duyệt, while
   * cancel is the requester/purchasing withdrawing a ticket that has not produced any
   * supplier commitment yet — once Đã duyệt, the quote is settled and the ticket must
   * go through "Đã mua xong" (Hoàn thành) instead.
   *
   * Does not run through `updatePurchaseRequest`/ALLOWED_TRANSITIONS: a cancel carries
   * its own required reason + audit columns and must not be reachable by a plain
   * `PUT {trangThai}` (the same reason cancelSupplyRequest is its own method).
   */
  async cancelPurchaseRequest(
    id: string,
    opts?: { lyDoHuy?: string; nguoiHuy?: string },
  ) {
    const existing = await prisma.purchaseRequest.findUnique({
      where: { id },
      select: {
        id: true,
        maYeuCau: true,
        trangThai: true,
        employeeId: true,
        supplyRequestId: true,
        replenishmentRequest: { select: { id: true, maYeuCau: true, trangThai: true } },
      },
    });
    if (!existing) throw new NotFoundError('Không tìm thấy yêu cầu mua hàng');

    const cancellable = ['Chờ báo giá', 'Chờ duyệt'];
    if (!cancellable.includes(existing.trangThai)) {
      throw new ValidationError(
        `Không thể hủy YCMH ở trạng thái "${existing.trangThai}" — đã duyệt rồi thì dùng "Đã mua xong", hoặc người duyệt "Từ chối"`,
      );
    }

    const lyDoHuy = opts?.lyDoHuy?.trim();
    if (!lyDoHuy) throw new ValidationError('Vui lòng nhập lý do hủy');

    // A YCMH born from a YCBS must hand the shortage back to purchasing's queue:
    // "Đã chuyển mua hàng" is terminal on the YCBS, so without this revert the parent
    // would stay dead while its only child YCMH is now cancelled. The link itself uses
    // onDelete:SetNull, so leaving it non-null while pointing at a cancelled YCMH would
    // mislead the UI into rendering a live chain.
    //
    // The cancel and the revert run in ONE transaction, and the header write is a
    // guarded updateMany: the status check lives in the WHERE, so a concurrent cancel
    // or approve racing this statement matches zero rows instead of producing a ticket
    // half-cancelled (header cancelled, parent YCBS reverted, or vice-versa). If the
    // revert throws, the whole transaction rolls back.
    let parentYbsId: string | null = null;

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.purchaseRequest.updateMany({
        where: { id, trangThai: { in: ['Chờ báo giá', 'Chờ duyệt'] } },
        data: {
          trangThai: 'Đã hủy',
          lyDoHuy,
          ngayHuy: new Date(),
          ...(opts?.nguoiHuy ? { nguoiHuy: opts.nguoiHuy } : {}),
        },
      });

      if (claimed.count === 0) {
        // Re-read inside the tx only to report the accurate reason; never rewrite.
        const current = await tx.purchaseRequest.findUnique({
          where: { id },
          select: { trangThai: true },
        });
        throw new ValidationError(
          `Không thể hủy YCMH ở trạng thái "${current?.trangThai ?? existing.trangThai}" — đã duyệt rồi thì dùng "Đã mua xong", hoặc người duyệt "Từ chối"`,
        );
      }

      const parent = await tx.replenishmentRequest.findFirst({
        where: { convertedPurchaseRequestId: id },
        select: { id: true, supplyRequestId: true },
      });
      if (parent) {
        parentYbsId = parent.id;
        await tx.replenishmentRequest.update({
          where: { id: parent.id },
          data: { trangThai: 'Chờ báo giá', convertedPurchaseRequestId: null },
        });
      }
      // Nếu đã có InboundPlan ở Chờ nhập/Quá hạn thì hủy plan
      const plan = await tx.inboundPlan.findUnique({ where: { purchaseRequestId: id }, select: { id: true, trangThai: true } });
      if (plan && (plan.trangThai === 'Chờ nhập' || plan.trangThai === 'Quá hạn')) {
        await tx.inboundPlan.update({ where: { id: plan.id }, data: { trangThai: 'Đã hủy' } });
        await tx.inboundPlanLog.create({ data: { inboundPlanId: plan.id, hanhDong: 'Hủy kế hoạch do hủy YCMH', lyDo: lyDoHuy, nguoiThucHien: opts?.nguoiHuy ?? null } });
      }
    });

    const updated = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: { items: true },
    });

    // Notify the requester. The YCBS revert is silent on purpose: purchasing sees it
    // reappear in their own queue, and the YCCB stays at "Chờ bổ sung".
    try {
      await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_CANCELLED, {
        targetEmployeeIds: [existing.employeeId],
        entityId: id,
        metadata: {
          maYeuCau: existing.maYeuCau,
          purchaseRequestId: id,
          replenishmentRequestId: parentYbsId ?? '',
          lyDo: lyDoHuy,
        },
      });
    } catch (notifError) {
      console.error('Error sending cancel notification:', notifError);
    }

    return updated;
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};
    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.departmentId) where.employee = { user: { departmentId: filters.departmentId } };

    if (filters?.search) {
      where.OR = [
        { maYeuCau: { contains: filters.search, mode: 'insensitive' as const } },
        { tenNhanVien: { contains: filters.search, mode: 'insensitive' as const } },
        { maNhanVien: { contains: filters.search, mode: 'insensitive' as const } },
        {
          items: {
            some: {
              OR: [
                { tenHangHoa: { contains: filters.search, mode: 'insensitive' as const } },
                { phanLoai: { contains: filters.search, mode: 'insensitive' as const } },
              ],
            },
          },
        },
      ];
    }

    const data = await prisma.purchaseRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        supplyRequest: true,
        items: { include: { supplier: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách yêu cầu mua hàng');

    worksheet.columns = [
      { header: 'Ngày yêu cầu', key: 'ngayYeuCau', width: 15 },
      { header: 'Mã yêu cầu', key: 'maYeuCau', width: 15 },
      { header: 'Nhân viên', key: 'tenNhanVien', width: 25 },
      { header: 'Phân loại', key: 'phanLoai', width: 15 },
      { header: 'Tên hàng hóa', key: 'tenHangHoa', width: 25 },
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

    data.forEach((request) => {
      if (request.items && request.items.length > 0) {
        request.items.forEach((item) => {
          worksheet.addRow({
            ngayYeuCau: new Date(request.createdAt).toLocaleDateString('vi-VN'),
            maYeuCau: request.maYeuCau,
            tenNhanVien: request.tenNhanVien,
            phanLoai: item.phanLoai,
            tenHangHoa: item.tenHangHoa,
            soLuong: item.soLuong,
            donViTinh: item.donViTinh,
            mucDoUuTien: request.mucDoUuTien,
            trangThai: request.trangThai,
          });
        });
      } else {
        worksheet.addRow({
          ngayYeuCau: new Date(request.createdAt).toLocaleDateString('vi-VN'),
          maYeuCau: request.maYeuCau,
          tenNhanVien: request.tenNhanVien,
          phanLoai: '',
          tenHangHoa: '',
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

  /**
   * Purchasing submits a "Chờ báo giá" PR for admin approval.
   * Validates that every item has supplier + unit price, changes status to "Chờ duyệt",
   * and notifies admins.
   */
  async submitForApproval(id: string) {
    const request = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: { items: { include: { supplier: true } } },
    });

    if (!request) {
      throw new NotFoundError('Không tìm thấy yêu cầu mua hàng');
    }

    if (request.trangThai !== 'Chờ báo giá') {
      throw new ValidationError(
        `Chỉ có thể gửi duyệt yêu cầu ở trạng thái "Chờ báo giá". Trạng thái hiện tại: ${request.trangThai}`
      );
    }

    const missing = request.items.filter(
      (it) => !it.nhaCungCapId || it.giaDuKien === null || it.giaDuKien === undefined || it.giaDuKien <= 0
    );
    if (missing.length > 0) {
      throw new ValidationError(
        `Vui lòng nhập nhà cung cấp và đơn giá cho ${missing.length} hàng hóa trước khi gửi duyệt`
      );
    }

    // 3.4 — TOCTOU-safe flip: only one concurrent caller wins; second gets 0 rows → 409-like
    const res = await prisma.purchaseRequest.updateMany({
      where: { id, trangThai: 'Chờ báo giá' },
      data: { trangThai: 'Chờ duyệt' },
    });
    if (res.count === 0) {
      // Either not in Chờ báo giá anymore (concurrent submit) or deleted
      const fresh = await prisma.purchaseRequest.findUnique({ where: { id }, select: { trangThai: true } });
      throw new ValidationError(
        fresh
          ? `Yêu cầu đã rời trạng thái "Chờ báo giá" (hiện tại: ${fresh.trangThai})`
          : 'Yêu cầu mua hàng không tồn tại'
      );
    }
    const updated = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: { items: { include: { supplier: true } } },
    });
    if (!updated) throw new NotFoundError('Không tìm thấy yêu cầu mua hàng');

    const tongTien = request.items.reduce(
      (sum, it) => sum + (it.soLuong ?? 0) * (it.giaDuKien ?? 0),
      0
    );

    try {
      await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_SUBMITTED_FOR_APPROVAL, {
        metadata: {
          maYeuCau: request.maYeuCau,
          purchaseRequestId: id,
          tongTien: tongTien.toLocaleString('vi-VN') + ' đ',
        },
      });
    } catch (notifError) {
      console.error('Error sending submit-for-approval notification:', notifError);
    }

    return updated;
  }

  /**
   * Purchasing confirms what was actually paid per line, once the YCMH is approved
   * (`Đã duyệt`) and the goods are known. Each line defaults to its estimate
   * (`giaDuKien`) when the client omits it, so the common case is one click, not
   * re-keying the whole table.
   *
   * Confirming also writes the price into the commodity catalog:
   * InternationalProduct.giaThanh becomes the weighted average of what is on hand
   * and what was just bought — not a blind overwrite — so a small buffer purchase
   * cannot wipe the cost basis of existing stock, and `InventoryOverview` (which
   * prices tồn by `LotProduct.giaThanh`, falling back to the catalog) reflects a
   * realistic value immediately.
   *
   * Does NOT change `trangThai`: Hoàn thành stays a separate, later action and is
   * deliberately not gated on this step (an already-approved YCMH can be completed
   * without a price re-confirmation).
   */
  async confirmActualPrice(
    id: string,
    items: Array<{ id: string; giaThucTe?: number | null }>,
    actorUserId?: string,
  ) {
    await this.assertCanConfirmActualPrice(actorUserId);

    const request = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!request) throw new NotFoundError('Không tìm thấy yêu cầu mua hàng');
    if (request.trangThai !== 'Đã duyệt') {
      throw new ValidationError(
        `Chỉ xác nhận giá thực tế khi yêu cầu ở trạng thái "Đã duyệt" (hiện tại: ${request.trangThai})`,
      );
    }

    // Client may send a subset; a line it omits keeps its existing actual price
    // (so "confirm everything at once" and "re-confirm one corrected line" both work).
    const submitted = new Map((items ?? []).map((it) => [String(it.id), it.giaThucTe]));
    const plan: Array<{ item: { id: string; tenHangHoa: string; soLuong: number }; giaThucTe: number }> = [];
    for (const line of request.items) {
      const provided = submitted.get(line.id);
      const chosen = provided === undefined || provided === null ? line.giaThucTe ?? line.giaDuKien : provided;
      if (chosen === null || chosen === undefined) {
        throw new ValidationError(`Dòng "${line.tenHangHoa}" chưa có giá thực tế và không có giá dự kiến để lấy làm mặc định`);
      }
      const n = Number(chosen);
      if (!Number.isFinite(n) || n <= 0) {
        throw new ValidationError(`Giá thực tế của "${line.tenHangHoa}" phải lớn hơn 0`);
      }
      plan.push({ item: line, giaThucTe: n });
    }

    return prisma.$transaction(async (tx) => {
      // Sequential per line: two lines can name the same commodity, and the average
      // for the second must see the stock/price the first already wrote. Doing them
      // in one batched read would price both against the stale opening balance.
      const avgByCatalogId = new Map<string, number>();
      for (const entry of plan) {
        await tx.purchaseRequestItem.update({
          where: { id: entry.item.id },
          data: { giaThucTe: entry.giaThucTe },
        });

        const product = await tx.internationalProduct.findFirst({
          where: { tenSanPham: { equals: entry.item.tenHangHoa, mode: 'insensitive' } },
          select: { id: true, giaThanh: true },
        });
        if (!product) continue; // unknown commodity: catalog has nothing to reprice

        const onHand = await tx.lotProduct.aggregate({
          where: { internationalProductId: product.id },
          _sum: { soLuong: true },
        });
        const stockBefore = onHand._sum.soLuong ?? 0;
        const priceBefore = avgByCatalogId.get(product.id) ?? product.giaThanh ?? 0;

        const boughtQty = Number(entry.item.soLuong ?? 0);
        // Nothing on hand yet, or no prior basis: the purchase IS the price.
        const nextPrice = stockBefore > 0 && priceBefore > 0
          ? (priceBefore * stockBefore + entry.giaThucTe * boughtQty) / (stockBefore + boughtQty)
          : entry.giaThucTe;
        avgByCatalogId.set(product.id, nextPrice);
        await tx.internationalProduct.update({
          where: { id: product.id },
          data: { giaThanh: Number(nextPrice.toFixed(2)) },
        });
      }

      // Same TOCTOU shape as submitForApproval: a concurrent status flip loses.
      // Touch updatedAt only — the header's legacy `giaDuKien` stays the estimate,
      // overwriting it with the actual total would silently destroy the baseline
      // that the estimate-vs-actual comparison depends on.
      const marked = await tx.purchaseRequest.updateMany({
        where: { id, trangThai: 'Đã duyệt' },
        data: { updatedAt: new Date() },
      });
      if (marked.count === 0) {
        throw new ValidationError('Yêu cầu đã rời trạng thái "Đã duyệt" trong lúc xác nhận, vui lòng thử lại');
      }

      return tx.purchaseRequest.findUnique({
        where: { id },
        include: { items: { include: { supplier: true } } },
      });
    });
  }
}

export default new PurchaseRequestService();
