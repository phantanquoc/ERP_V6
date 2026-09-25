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

    // MANUAL YCMH lands directly at "Chờ duyệt" (already quoted) — also notify admin
    // with the "chờ phê duyệt" event so it appears as "cần duyệt" rather than "cần báo giá".
    // This mirrors convertToPurchaseRequest (allPriced) and submitForApproval.
    if ((purchaseRequest as any)?.trangThai === 'Chờ duyệt') {
      try {
        const tongTien = data.items.reduce((s: number, it: any) => s + (Number(it.soLuong) || 0) * (Number(it.giaDuKien) || 0), 0);
        await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_SUBMITTED_FOR_APPROVAL, {
          metadata: {
            maYeuCau: (purchaseRequest as any)?.maYeuCau ?? '',
            purchaseRequestId: (purchaseRequest as any)?.id,
            tongTien: tongTien.toLocaleString('vi-VN') + ' đ',
          },
        });
      } catch (e) { console.error('Error sending submit-for-approval on create:', e); }
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
    lyDoChenhLech?: string | null;
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

    // 3.1-3.2 — Gate Đã duyệt→Hoàn thành: every item needs giaThucTe>0 && soLuongThucTe>0,
    // and when any soLuongThucTe != soLuong require lyDoChenhLech (effective submitted or stored).
    // Must reject 400 BEFORE any write.
    if (data.trangThai === 'Hoàn thành' && existingRequest.trangThai === 'Đã duyệt') {
      const priorItemsForGate = await prisma.purchaseRequestItem.findMany({
        where: { purchaseRequestId: id },
        select: { id: true, tenHangHoa: true, soLuong: true, giaThucTe: true, soLuongThucTe: true },
      });
      const gateGiaById = new Map(priorItemsForGate.map((p) => [p.id, p.giaThucTe]));
      const gateGiaByName = new Map(priorItemsForGate.map((p) => [p.tenHangHoa.toLowerCase(), p.giaThucTe]));
      const gateQtyById = new Map(priorItemsForGate.map((p) => [p.id, p.soLuongThucTe]));
      const gateQtyByName = new Map(priorItemsForGate.map((p) => [p.tenHangHoa.toLowerCase(), p.soLuongThucTe]));

      // Build effective item list to validate
      const effectiveForGate: Array<{ tenHangHoa: string; soLuong: number; giaThucTe: number | null; soLuongThucTe: number | null }> = [];
      const incomingItems = (data as any).items as Array<any> | undefined;
      if (incomingItems && Array.isArray(incomingItems) && incomingItems.length > 0) {
        for (const it of incomingItems) {
          const plannedQty = typeof it.soLuong === 'string' ? parseFloat(it.soLuong) : Number(it.soLuong);
          const rawGiaEff = (it as any).giaThucTe;
          const rawQtyEff = (it as any).soLuongThucTe;
          const itemId = (it as any).id as string | undefined;
          const carriedGia = rawGiaEff !== undefined && rawGiaEff !== null && rawGiaEff !== ''
            ? (typeof rawGiaEff === 'string' ? parseFloat(rawGiaEff) : Number(rawGiaEff))
            : (itemId ? gateGiaById.get(itemId) : undefined) ?? gateGiaByName.get(String(it.tenHangHoa ?? '').toLowerCase()) ?? null;
          const carriedQty = rawQtyEff !== undefined && rawQtyEff !== null && rawQtyEff !== ''
            ? (typeof rawQtyEff === 'string' ? parseFloat(rawQtyEff) : Number(rawQtyEff))
            : (itemId ? gateQtyById.get(itemId) : undefined) ?? gateQtyByName.get(String(it.tenHangHoa ?? '').toLowerCase()) ?? null;
          effectiveForGate.push({
            tenHangHoa: String(it.tenHangHoa ?? ''),
            soLuong: Number.isFinite(plannedQty) ? plannedQty : 0,
            giaThucTe: carriedGia as number | null,
            soLuongThucTe: carriedQty as number | null,
          });
        }
      } else {
        for (const p of priorItemsForGate) {
          effectiveForGate.push({
            tenHangHoa: p.tenHangHoa,
            soLuong: p.soLuong,
            giaThucTe: p.giaThucTe as number | null,
            soLuongThucTe: p.soLuongThucTe as number | null,
          });
        }
      }

      if (effectiveForGate.length === 0) {
        throw new ValidationError('Không thể hoàn thành yêu cầu không có hàng hóa');
      }
      for (const eff of effectiveForGate) {
        const g = eff.giaThucTe;
        if (g === null || g === undefined || !Number.isFinite(Number(g)) || Number(g) <= 0) {
          throw new ValidationError(`Dòng "${eff.tenHangHoa}" chưa có giá thực tế — cần xác nhận giá trước khi hoàn thành`);
        }
        const q = eff.soLuongThucTe;
        if (q === null || q === undefined || !Number.isFinite(Number(q)) || Number(q) <= 0) {
          throw new ValidationError(`Dòng "${eff.tenHangHoa}" chưa có số lượng thực tế — cần xác nhận số lượng trước khi hoàn thành`);
        }
      }
      const hasQtyDiff = effectiveForGate.some((e) => Math.abs(Number(e.soLuongThucTe) - Number(e.soLuong)) > 1e-9);
      if (hasQtyDiff) {
        const submittedReason = (data as any).lyDoChenhLech;
        const storedReason = (existingRequest as any).lyDoChenhLech as string | null | undefined;
        const effectiveReason = submittedReason !== undefined && submittedReason !== null
          ? String(submittedReason).trim()
          : (storedReason ? String(storedReason).trim() : '');
        if (!effectiveReason) {
          throw new ValidationError('Vui lòng nhập lý do chênh lệch khi thực tế khác kế hoạch.');
        }
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

    // Capture actor before stripping — service resolves display name via prisma.user like cancel does
    const __actorUserId = (data as any).__actorUserId as string | undefined;
    let normalizedGhiChuVanChuyen: string | null | undefined = undefined;
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
      const normGcv = (gcv === null || gcv === '' || (typeof gcv === 'string' && gcv.trim() === '')) ? null : String(gcv);
      normalizedGhiChuVanChuyen = normGcv;
      updateData.ghiChuVanChuyen = normGcv;
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
    // lyDoChenhLech: only touch when caller explicitly sent it; normalize ''/whitespace -> null, keep string trim
    if ((data as any).lyDoChenhLech !== undefined) {
      const rawR = (data as any).lyDoChenhLech;
      if (rawR === null || rawR === '' || (typeof rawR === 'string' && rawR.trim() === '')) {
        // For Đã duyệt→Hoàn thành with diff the gate above would already have rejected empty;
        // for other transitions an explicit empty means "clear" -> null. To preserve when
        // caller omitted we never enter this branch (undefined).
        updateData.lyDoChenhLech = null;
      } else {
        updateData.lyDoChenhLech = String(rawR).trim();
      }
    }
    // If caller omitted lyDoChenhLech entirely (undefined) we leave updateData without the key,
    // so Prisma does not overwrite stored value — this satisfies "preserve when caller omits and no new diff".
    // (When there IS a new diff and caller omitted, gate above already validated effective stored non-empty,
    // and leaving key absent keeps stored value.)

    // Coerce numeric fields sent as strings from FormData
    if (typeof updateData.giaDuKien === 'string') {
      updateData.giaDuKien = updateData.giaDuKien === '' ? null : parseFloat(updateData.giaDuKien);
    }

    let purchaseRequest: any;
    // Snapshot prior schedule values to detect InboundPlan reschedule after the write
    const priorNgayDuKienNhap: Date | null = (existingRequest as any).ngayDuKienNhap ?? null;
    const priorWarehouseId: string | null = (existingRequest as any).warehouseId ?? null;
    const priorGhiChuVanChuyen: string | null = (existingRequest as any).ghiChuVanChuyen ?? null;

    if (items && Array.isArray(items)) {
      purchaseRequest = await prisma.$transaction(async (tx) => {
        // Preserve confirmed actual price/qty across the delete-then-recreate: an
        // edit after Đã duyệt must never wipe giaThucTe/soLuongThucTe that confirmActualPrice booked.
        // Keyed by the incoming item's id (the row being replaced); name is the fallback.
        const prior = await tx.purchaseRequestItem.findMany({
          where: { purchaseRequestId: id },
          select: { id: true, tenHangHoa: true, giaThucTe: true, soLuongThucTe: true },
        });
        const giaThucTeById = new Map(prior.map((p) => [p.id, p.giaThucTe]));
        const giaThucTeByName = new Map(prior.map((p) => [p.tenHangHoa.toLowerCase(), p.giaThucTe]));
        const soLuongThucTeById = new Map(prior.map((p) => [p.id, (p as any).soLuongThucTe]));
        const soLuongThucTeByName = new Map(prior.map((p) => [p.tenHangHoa.toLowerCase(), (p as any).soLuongThucTe]));
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
            const rawGiaThucTe = (item as any).giaThucTe;
            const rawSoLuongThucTe = (item as any).soLuongThucTe;
            const carriedGiaThucTe =
              rawGiaThucTe !== undefined && rawGiaThucTe !== null && rawGiaThucTe !== ''
                ? (typeof rawGiaThucTe === 'string' ? parseFloat(rawGiaThucTe) : Number(rawGiaThucTe))
                : (itemId ? giaThucTeById.get(itemId) : undefined) ??
                  giaThucTeByName.get(item.tenHangHoa.toLowerCase()) ??
                  null;
            const carriedSoLuongThucTe =
              rawSoLuongThucTe !== undefined && rawSoLuongThucTe !== null && rawSoLuongThucTe !== ''
                ? (typeof rawSoLuongThucTe === 'string' ? parseFloat(rawSoLuongThucTe) : Number(rawSoLuongThucTe))
                : (itemId ? soLuongThucTeById.get(itemId) : undefined) ??
                  soLuongThucTeByName.get(String(item.tenHangHoa ?? '').toLowerCase()) ??
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
              soLuongThucTe: carriedSoLuongThucTe,
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
    // ── InboundPlan: reschedule if exists, otherwise auto-create draft when schedule is provided ──
    // Covers the new "Cập nhật" flow: user edits ngayDuKienNhap/warehouseId/ghiChuVanChuyen while Đã duyệt,
    // before the plan normally appears at Hoàn thành. Without this branch the update
    // silently wrote only purchaseRequest fields — no plan, no warehouse notification.
    // Resolve actor display name for audit logs (like cancelPurchaseRequest pattern)
    let actorDisplayName: string | null = null;
    if (__actorUserId) {
      try {
        const actorUser = await prisma.user.findUnique({ where: { id: __actorUserId }, select: { firstName: true, lastName: true, email: true } });
        if (actorUser) actorDisplayName = `${actorUser.lastName ?? ''} ${actorUser.firstName ?? ''}`.trim() || actorUser.email || null;
      } catch {}
    }
    const actorLabel = actorDisplayName ?? (updateData as any).nguoiDuyet ?? (purchaseRequest as any)?.nguoiDuyet ?? 'Hệ thống';
    // Determine if any schedule-related field was touched (date/warehouse/note)
    const shouldCheckInboundPlan = (normalizedNgayDuKienNhap !== undefined || normalizedWarehouseId !== undefined || normalizedGhiChuVanChuyen !== undefined) && !!purchaseRequest;
    if (shouldCheckInboundPlan) {
      const existingPlan = (purchaseRequest as any).inboundPlan ?? await prisma.inboundPlan.findUnique({ where: { purchaseRequestId: id } });
      if (existingPlan) {
        // Guard terminal plans — no reschedule (task 1.4)
        if (existingPlan.trangThai === 'Đã nhập' || existingPlan.trangThai === 'Đã hủy') {
          // No reschedule, but still allow purchaseRequest field update (already done)
        } else {
        const newNgay = normalizedNgayDuKienNhap !== undefined ? normalizedNgayDuKienNhap : null;
        const newWhId = normalizedWarehouseId !== undefined ? normalizedWarehouseId : null;
        const newGhiChu = normalizedGhiChuVanChuyen !== undefined ? normalizedGhiChuVanChuyen : null;
        // Compare against prior values (or existingPlan for warehouse fallback)
        const priorWhForCompare = existingPlan.warehouseId ?? priorWarehouseId ?? null;
        const newWhIdStr = newWhId ? String(newWhId).trim() : null;
        const priorWhStr = priorWhForCompare ? String(priorWhForCompare).trim() : null;
        const dateChanged = newNgay !== null && priorNgayDuKienNhap?.getTime() !== (newNgay as Date)?.getTime();
        // Also detect date change vs existingPlan.ngayDuKien when priorNgayDuKienNhap is null
        const dateChangedVsPlan = newNgay !== null && existingPlan.ngayDuKien?.getTime() !== (newNgay as Date)?.getTime();
        const effectiveDateChanged = dateChanged || dateChangedVsPlan;
        const whChanged = normalizedWarehouseId !== undefined && newWhIdStr !== priorWhStr && newWhId !== undefined;
        const ghiChuChanged = normalizedGhiChuVanChuyen !== undefined && (newGhiChu ?? null) !== (priorGhiChuVanChuyen ?? null);
        const anyChange = (effectiveDateChanged && newNgay) || whChanged || ghiChuChanged;
        // Build new plan data and logs
        if (anyChange) {
          const oldDate: Date | null = existingPlan.ngayDuKien ?? priorNgayDuKienNhap;
          await prisma.$transaction(async (tx) => {
            const planUpdate: Record<string, unknown> = {};
            if (effectiveDateChanged && newNgay) planUpdate.ngayDuKien = newNgay as Date;
            if (whChanged && newWhIdStr !== null) planUpdate.warehouseId = newWhIdStr;
            else if (whChanged && newWhIdStr === null) planUpdate.warehouseId = null;
            if (Object.keys(planUpdate).length > 0) {
              await tx.inboundPlan.update({ where: { id: existingPlan.id }, data: planUpdate as any });
            }
            if (effectiveDateChanged && newNgay) {
              await tx.inboundPlanLog.create({ data: { inboundPlanId: existingPlan.id, hanhDong: 'Đổi ngày dự kiến', ngayCu: oldDate, ngayMoi: newNgay as Date, nguoiThucHien: actorLabel } });
            }
            if (whChanged) {
              await tx.inboundPlanLog.create({ data: { inboundPlanId: existingPlan.id, hanhDong: 'Đổi kho đích', lyDo: newWhIdStr ? `Kho: ${newWhIdStr}` : 'Đã xóa kho đích', nguoiThucHien: actorLabel } });
            }
            if (ghiChuChanged) {
              await tx.inboundPlanLog.create({ data: { inboundPlanId: existingPlan.id, hanhDong: 'Đổi ghi chú vận chuyển', lyDo: newGhiChu ?? '', nguoiThucHien: actorLabel } });
            }
          });
        }
        // GAP-16: notify warehouse about rescheduled inbound plan
        let _rescheduleWIds: string[] = [];
        if (anyChange) {
          try {
            const warehouseEmployees = await prisma.employee.findMany({
              where: { subDepartment: { code: 'SUBDEPT_PRODUCTION_WAREHOUSE' }, status: 'ACTIVE' },
              select: { id: true },
            });
            const wIds = warehouseEmployees.map((e) => e.id);
            _rescheduleWIds = wIds;
            if (wIds.length > 0) {
              await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_PURCHASED, {
                targetEmployeeIds: wIds,
                entityId: id,
                metadata: { maYeuCau: existingRequest.maYeuCau, purchaseRequestId: id, ngayDuKien: (newNgay as Date)?.toISOString?.() ?? '', warehouseId: newWhIdStr ?? undefined },
              });
            }
          } catch (e) { console.error('Error sending reschedule notify:', e); }
          try {
            const adminUsers = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { employees: { select: { id: true } } } });
            const adminIds = adminUsers.filter((u: any) => u.employees).map((u: any) => u.employees.id).filter((id: string) => !_rescheduleWIds.includes(id));
            if (adminIds.length > 0) {
              await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_PURCHASED, { targetEmployeeIds: adminIds, entityId: id, metadata: { maYeuCau: existingRequest.maYeuCau, purchaseRequestId: id, ngayDuKien: (newNgay as Date)?.toISOString?.() ?? '', warehouseId: newWhIdStr ?? undefined } });
            }
          } catch (e) { console.error('admin notify failed', e); }
        }
        } // end non-terminal plan branch
      } else {
        // No plan yet — create a draft InboundPlan so Kho sees it immediately.
        // Only create when at least one schedule signal is present and PR is not terminal.
        const isTerminalPR = (existingRequest as any).trangThai === 'Hoàn thành' || (existingRequest as any).trangThai === 'Đã hủy';
        const hasScheduleSignal = (normalizedNgayDuKienNhap !== undefined && normalizedNgayDuKienNhap !== null) || (normalizedWarehouseId !== undefined && normalizedWarehouseId !== null && String(normalizedWarehouseId).trim() !== '');
        if (!isTerminalPR && hasScheduleSignal) {
          // Resolve ngayDuKien for the new plan
          let ngayDuKienForNewPlan: Date | null = null;
          if (normalizedNgayDuKienNhap !== undefined && normalizedNgayDuKienNhap !== null) {
            ngayDuKienForNewPlan = normalizedNgayDuKienNhap as Date;
          } else if ((purchaseRequest as any)?.ngayDuKienNhap) {
            ngayDuKienForNewPlan = new Date((purchaseRequest as any).ngayDuKienNhap);
          } else if ((purchaseRequest as any)?.ngayDuyet) {
            ngayDuKienForNewPlan = new Date((purchaseRequest as any).ngayDuyet);
          } else {
            const d = new Date(); d.setDate(d.getDate() + 7); ngayDuKienForNewPlan = d;
          }
          const whIdForNewPlan: string | null = (normalizedWarehouseId !== undefined ? (normalizedWarehouseId as string | null) : null) ?? (purchaseRequest as any)?.warehouseId ?? (existingRequest as any)?.warehouseId ?? null;
          let createdPlanId: string | null = null;
          await prisma.$transaction(async (tx) => {
            const already = await tx.inboundPlan.findUnique({ where: { purchaseRequestId: id } });
            if (already) { createdPlanId = already.id; return; }
            const year = new Date().getFullYear();
            const lastPlan = await tx.inboundPlan.findFirst({ where: { maKeHoach: yearlyCodeWhere('KH-NH', year) }, orderBy: { maKeHoach: 'desc' }, select: { maKeHoach: true } });
            const maKeHoach = nextYearlyCode(lastPlan?.maKeHoach ?? null, 'KH-NH', year);
            const created = await tx.inboundPlan.create({ data: { maKeHoach, purchaseRequestId: id, ngayDuKien: ngayDuKienForNewPlan as Date, warehouseId: whIdForNewPlan, trangThai: 'Chờ nhập' } });
            createdPlanId = created.id;
            await tx.inboundPlanLog.create({ data: { inboundPlanId: created.id, hanhDong: 'Tạo kế hoạch từ cập nhật đơn hàng', ngayMoi: ngayDuKienForNewPlan as Date, nguoiThucHien: actorLabel } });
          });
          // Notify warehouse about the newly created inbound plan
          try {
            const warehouseEmployees = await prisma.employee.findMany({ where: { subDepartment: { code: 'SUBDEPT_PRODUCTION_WAREHOUSE' }, status: 'ACTIVE' }, select: { id: true } });
            const wIds = warehouseEmployees.map((e) => e.id);
            if (wIds.length > 0) {
              await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_PURCHASED, {
                targetEmployeeIds: wIds,
                entityId: id,
                metadata: { maYeuCau: existingRequest.maYeuCau, purchaseRequestId: id, inboundPlanId: createdPlanId ?? undefined, ngayDuKien: (ngayDuKienForNewPlan as Date)?.toISOString?.() ?? '', warehouseId: whIdForNewPlan ?? undefined },
              });
            }
            const adminUsers = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { employees: { select: { id: true } } } });
            const adminIds = adminUsers.filter((u: any) => u.employees).map((u: any) => u.employees.id).filter((aid: string) => !wIds.includes(aid));
            if (adminIds.length > 0) {
              await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_PURCHASED, { targetEmployeeIds: adminIds, entityId: id, metadata: { maYeuCau: existingRequest.maYeuCau, purchaseRequestId: id, inboundPlanId: createdPlanId ?? undefined, ngayDuKien: (ngayDuKienForNewPlan as Date)?.toISOString?.() ?? '', warehouseId: whIdForNewPlan ?? undefined } });
            }
          } catch (e) { console.error('Error sending new-plan notify:', e); }
          // Refresh purchaseRequest so response includes the freshly created plan
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
      // GAP-8: also notify warehouse when YCMH approved (hook covers supplyRequest case, but MANUAL YCMH has no supplyRequestId)
      let _approvedWarehouseIds: string[] = [];
      if (!existingRequest.supplyRequestId) {
        try {
          const warehouseEmployees = await prisma.employee.findMany({
            where: { subDepartment: { code: 'SUBDEPT_PRODUCTION_WAREHOUSE' }, status: 'ACTIVE' },
            select: { id: true },
          });
          const warehouseIds = warehouseEmployees.map((e) => e.id).filter((wid) => wid !== existingRequest.employeeId);
          _approvedWarehouseIds = warehouseIds;
          if (warehouseIds.length > 0) {
            await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_APPROVED, {
              targetEmployeeIds: warehouseIds,
              metadata: { maYeuCau: existingRequest.maYeuCau, purchaseRequestId: id, nguoiDuyet: updateData.nguoiDuyet ?? '' },
            });
          }
        } catch (e) { console.error('Error sending warehouse approved notify:', e); }
      }
      try {
        const alreadyNotifiedIds = [existingRequest.employeeId, ..._approvedWarehouseIds];
        const adminUsers = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { employees: { select: { id: true } } } });
        const adminIds = adminUsers.filter((u: any) => u.employees).map((u: any) => u.employees.id).filter((id: string) => !alreadyNotifiedIds.includes(id));
        if (adminIds.length > 0) {
          await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_APPROVED, { targetEmployeeIds: adminIds, entityId: id, metadata: { maYeuCau: existingRequest.maYeuCau, purchaseRequestId: id, nguoiDuyet: updateData.nguoiDuyet ?? '' } });
        }
      } catch (e) { console.error('admin notify failed', e); }
      // GAP-15: if transition was Chờ báo giá → Chờ duyệt via PUT (bypass submitForApproval), also notify admins
      if (existingRequest.trangThai === 'Chờ báo giá' && (updateData as any).trangThai === 'Chờ duyệt') {
        try {
          await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_SUBMITTED_FOR_APPROVAL, {
            metadata: { maYeuCau: existingRequest.maYeuCau, purchaseRequestId: id },
          });
        } catch (e) { console.error('Error sending submit-for-approval notify via PUT:', e); }
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
      // GAP-9: also notify warehouse + purchasing when rejected
      let _rejectedExtraIds: string[] = [];
      try {
        const [warehouseEmployees, purchasingEmployees] = await Promise.all([
          prisma.employee.findMany({ where: { subDepartment: { code: 'SUBDEPT_PRODUCTION_WAREHOUSE' }, status: 'ACTIVE' }, select: { id: true } }),
          prisma.employee.findMany({ where: { subDepartment: { department: { code: 'DEPT_PURCHASING' } }, status: 'ACTIVE' }, select: { id: true } }),
        ]);
        const extraIds = [...new Set([...warehouseEmployees.map((e) => e.id), ...purchasingEmployees.map((e) => e.id)])].filter((wid) => wid !== existingRequest.employeeId);
        _rejectedExtraIds = extraIds;
        if (extraIds.length > 0) {
          await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_REJECTED, {
            targetEmployeeIds: extraIds,
            metadata: { maYeuCau: existingRequest.maYeuCau, purchaseRequestId: id, lyDo: updateData.ghiChuMuaHang ?? '' },
          });
        }
      } catch (e) { console.error('Error sending rejected extra notify:', e); }
      try {
        const alreadyNotifiedIds = [existingRequest.employeeId, ..._rejectedExtraIds];
        const adminUsers = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { employees: { select: { id: true } } } });
        const adminIds = adminUsers.filter((u: any) => u.employees).map((u: any) => u.employees.id).filter((id: string) => !alreadyNotifiedIds.includes(id));
        if (adminIds.length > 0) {
          await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_REJECTED, { targetEmployeeIds: adminIds, entityId: id, metadata: { maYeuCau: existingRequest.maYeuCau, purchaseRequestId: id, lyDo: updateData.ghiChuMuaHang ?? '' } });
        }
      } catch (e) { console.error('admin notify failed', e); }
    }

    // Notify warehouse when purchasing marks as "Hoàn thành" (goods purchased, ready for intake)
    if (updateData.trangThai === 'Hoàn thành') {
      let _purchasedWarehouseIds: string[] = [];
      // Advance supply request status to "Đã mua hàng" — hook now uses SUPPLY_REQUEST_PURCHASED
      if (existingRequest.supplyRequestId) {
        try {
          await supplyRequestService.onPurchaseRequestCompleted(existingRequest.supplyRequestId);
        } catch (hookError) {
          console.error('Error in onPurchaseRequestCompleted hook:', hookError);
        }
        try {
          const whEmps = await prisma.employee.findMany({ where: { subDepartment: { code: 'SUBDEPT_PRODUCTION_WAREHOUSE' }, status: 'ACTIVE' }, select: { id: true } });
          _purchasedWarehouseIds = whEmps.map((e) => e.id);
        } catch {}
      } else {
        // No linked supply request: still notify warehouse directly (GAP-10 for MANUAL YCMH)
        try {
          const warehouseEmployees = await prisma.employee.findMany({
            where: { subDepartment: { code: 'SUBDEPT_PRODUCTION_WAREHOUSE' }, status: 'ACTIVE' },
            select: { id: true },
          });
          const warehouseIds = warehouseEmployees.map((e) => e.id).filter((wid) => wid !== existingRequest.employeeId);
          _purchasedWarehouseIds = warehouseIds;
          if (warehouseIds.length > 0) {
            await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_PURCHASED, {
              targetEmployeeIds: warehouseIds,
              entityId: id,
              metadata: { maYeuCau: existingRequest.maYeuCau, purchaseRequestId: id },
            });
          }
        } catch (e) { console.error('Error sending warehouse purchased notify (no SR):', e); }
      }
      try {
        const adminUsers = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { employees: { select: { id: true } } } });
        const adminIds = adminUsers.filter((u: any) => u.employees).map((u: any) => u.employees.id).filter((id: string) => !_purchasedWarehouseIds.includes(id));
        if (adminIds.length > 0) {
          await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_PURCHASED, { targetEmployeeIds: adminIds, entityId: id, metadata: { maYeuCau: existingRequest.maYeuCau, purchaseRequestId: id } });
        }
      } catch (e) { console.error('admin notify failed', e); }

      // Notify requester that their purchase request is completed
      let _completedNotifiedIds: string[] = [];
      if (existingRequest.employeeId) {
        try {
          await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_COMPLETED, {
            targetEmployeeIds: [existingRequest.employeeId],
            metadata: {
              maYeuCau: existingRequest.maYeuCau,
              purchaseRequestId: id,
            },
          });
          _completedNotifiedIds.push(existingRequest.employeeId);
        } catch (notifError) {
          console.error('Error sending purchase request completed notification:', notifError);
        }
        // GAP-10: also notify supplyRequest owner if different from YCMH requester
        if (existingRequest.supplyRequestId) {
          try {
            const sr = await prisma.supplyRequest.findUnique({ where: { id: existingRequest.supplyRequestId }, select: { employeeId: true } });
            if (sr && sr.employeeId !== existingRequest.employeeId) {
              await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_COMPLETED, {
                targetEmployeeIds: [sr.employeeId],
                metadata: { maYeuCau: existingRequest.maYeuCau, purchaseRequestId: id },
              });
              _completedNotifiedIds.push(sr.employeeId);
            }
          } catch (e) { console.error('Error sending completed notify to SR owner:', e); }
        }
        try {
          const adminUsers = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { employees: { select: { id: true } } } });
          const adminIds = adminUsers.filter((u: any) => u.employees).map((u: any) => u.employees.id).filter((id: string) => !_completedNotifiedIds.includes(id));
          if (adminIds.length > 0) {
            await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_COMPLETED, { targetEmployeeIds: adminIds, entityId: id, metadata: { maYeuCau: existingRequest.maYeuCau, purchaseRequestId: id } });
          }
        } catch (e) { console.error('admin notify failed', e); }
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

    // GAP-11: also notify purchasing dept + admins when YCMH cancelled
    try {
      const [purchasingEmployees, adminUsers] = await Promise.all([
        prisma.employee.findMany({ where: { subDepartment: { department: { code: 'DEPT_PURCHASING' } }, status: 'ACTIVE' }, select: { id: true } }),
        prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { employees: { select: { id: true } } } }),
      ]);
      const adminIds = adminUsers.filter((u: any) => u.employees).map((u: any) => u.employees.id);
      const extraIds = [...new Set([...purchasingEmployees.map((e) => e.id), ...adminIds])].filter((eid) => eid !== existing.employeeId);
      if (extraIds.length > 0) {
        await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_CANCELLED, {
          targetEmployeeIds: extraIds,
          entityId: id,
          metadata: { maYeuCau: existing.maYeuCau, purchaseRequestId: id, lyDo: lyDoHuy },
        });
      }
    } catch (e) { console.error('Error sending cancel extra notify:', e); }

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
    items: Array<{ id: string; giaThucTe?: number | null; soLuongThucTe?: number | null }>,
    actorUserId?: string,
    lyDoChenhLech?: string | null,
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

    // Reject re-confirm when non-voided WarehouseReceipt exists for PR
    const existingReceipt = await prisma.warehouseReceipt.findFirst({
      where: { purchaseRequestId: id, isVoided: false },
      select: { id: true },
    });
    if (existingReceipt) {
      throw new ValidationError('Không thể xác nhận lại — đã có phiếu nhập kho cho yêu cầu này');
    }

    // Merge submitted subset with stored confirmed values; default soLuongThucTe to soLuong when still null
    const submittedMap = new Map((items ?? []).map((it) => [String(it.id), it]));
    const plan: Array<{ item: { id: string; tenHangHoa: string; soLuong: number }; giaThucTe: number; soLuongThucTe: number }> = [];
    for (const line of request.items) {
      const sub = submittedMap.get(line.id) as { giaThucTe?: number | null; soLuongThucTe?: number | null } | undefined;

      const providedGia = sub?.giaThucTe;
      const chosenGia = providedGia === undefined || providedGia === null ? (line as any).giaThucTe ?? (line as any).giaDuKien : providedGia;
      if (chosenGia === null || chosenGia === undefined) {
        throw new ValidationError(`Dòng "${line.tenHangHoa}" chưa có giá thực tế và không có giá dự kiến để lấy làm mặc định`);
      }
      const nGia = Number(chosenGia);
      if (!Number.isFinite(nGia) || nGia <= 0) {
        throw new ValidationError(`Giá thực tế của "${line.tenHangHoa}" phải lớn hơn 0`);
      }

      const providedQty = sub?.soLuongThucTe;
      const chosenQtyRaw = providedQty === undefined || providedQty === null ? (line as any).soLuongThucTe ?? line.soLuong : providedQty;
      if (chosenQtyRaw === null || chosenQtyRaw === undefined) {
        throw new ValidationError(`Dòng "${line.tenHangHoa}" chưa có số lượng thực tế`);
      }
      const nQty = Number(chosenQtyRaw);
      if (!Number.isFinite(nQty) || nQty <= 0) {
        throw new ValidationError(`Số lượng thực tế của "${line.tenHangHoa}" phải lớn hơn 0`);
      }

      plan.push({ item: line, giaThucTe: nGia, soLuongThucTe: nQty });
    }

    // When any soLuongThucTe != soLuong (epsilon 1e-9) require lyDoChenhLech.trim() non-empty (400)
    const hasDiff = plan.some((p) => Math.abs(p.soLuongThucTe - p.item.soLuong) > 1e-9);
    const trimmedReason = lyDoChenhLech != null ? String(lyDoChenhLech).trim() : '';
    if (hasDiff && !trimmedReason) {
      throw new ValidationError('Vui lòng nhập lý do chênh lệch khi thực tế khác kế hoạch.');
    }
    const headerLyDo = hasDiff ? trimmedReason : null;

    return prisma.$transaction(async (tx) => {
      // Sequential per line: two lines can name the same commodity, and the average
      // for the second must see the stock/price the first already wrote. Doing them
      // in one batched read would price both against the stale opening balance.
      const avgByCatalogId = new Map<string, number>();
      for (const entry of plan) {
        await tx.purchaseRequestItem.update({
          where: { id: entry.item.id },
          data: { giaThucTe: entry.giaThucTe, soLuongThucTe: entry.soLuongThucTe },
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

        const boughtQty = Number(entry.soLuongThucTe ?? 0);
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
      // Persist header lyDoChenhLech together with updatedAt in same transaction.
      const marked = await tx.purchaseRequest.updateMany({
        where: { id, trangThai: 'Đã duyệt' },
        data: { updatedAt: new Date(), lyDoChenhLech: headerLyDo },
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
