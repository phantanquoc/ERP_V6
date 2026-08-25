import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError, AuthorizationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import ExcelJS from 'exceljs';
import supplyRequestService from './supplyRequestService';
import notificationService from './notificationService';
import { NotificationEvent } from '@types';

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
    extra?: { phanLoaiNCC?: string; sourceType?: string; trangThai?: string },
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
    const phanLoaiList = (() => {
      const fromPhanLoai = (() => {
        if (!phanLoaiFilter) return null as string[] | null;
        const raw = Array.isArray(phanLoaiFilter) ? phanLoaiFilter : String(phanLoaiFilter).split(',');
        const vals = raw.map((s) => String(s).trim()).filter(Boolean);
        return vals.length ? vals : null;
      })();
      if (fromPhanLoai) return fromPhanLoai;
      const ncc = extra?.phanLoaiNCC ? String(extra.phanLoaiNCC).trim() : '';
      if (!ncc) return null;
      if (ncc.toUpperCase() === 'NVL') return ['Nguyên liệu', 'Bao bì', 'Nguyên vật liệu'];
      if (ncc === 'Thiết bị' || ncc.toLowerCase() === 'thiet bi') return ['Thiết bị'];
      return null;
    })();
    const phanLoaiWhere = phanLoaiList ? { items: { some: { phanLoai: { in: phanLoaiList } } } } : {};
    const sourceTypeWhere = extra?.sourceType ? { sourceType: extra.sourceType } : {};
    const trangThaiWhere = extra?.trangThai ? { trangThai: extra.trangThai } : {};
    // SHORTAGE via phanLoaiNCC=SHORTAGE is handled as sourceType filter
    const effectiveSourceTypeWhere =
      extra?.phanLoaiNCC === 'SHORTAGE' ? { sourceType: 'SHORTAGE' } : sourceTypeWhere;
    const classAndStageFilters = { ...phanLoaiWhere, ...effectiveSourceTypeWhere, ...trangThaiWhere };

    const where = search
      ? {
          AND: [
            deptFilter,
            dateFilter,
            classAndStageFilters,
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
      : { AND: [deptFilter, dateFilter, classAndStageFilters] };

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
          supplyRequest: { select: { id: true, maYeuCau: true, trangThai: true } },
          supplier: { select: { id: true, tenNhaCungCap: true, maNhaCungCap: true } },
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
        items: { include: { supplier: true } },
      },
    });

    if (!request) {
      throw new NotFoundError('Không tìm thấy yêu cầu mua hàng');
    }

    return request;
  }

  async createPurchaseRequest(data: CreatePurchaseRequestRequest) {
    if (!data.items || data.items.length === 0) {
      throw new ValidationError('Vui lòng thêm ít nhất một sản phẩm');
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
    // 3.1 — lock items and pricing fields after Đã duyệt / Hoàn thành (and optionally Từ chối)
    const lockedStatuses = new Set(['Đã duyệt', 'Hoàn thành']);
    if (lockedStatuses.has(existingRequest.trangThai)) {
      const touchesItems = data.items !== undefined;
      const touchesPricing =
        (data as any).nhaCungCapId !== undefined ||
        (data as any).giaDuKien !== undefined ||
        (data as any).phanLoai !== undefined ||
        (data as any).tenHangHoa !== undefined ||
        (data as any).soLuong !== undefined;
      if (touchesItems || touchesPricing) {
        throw new ValidationError('Không thể sửa mặt hàng/đơn giá sau khi đã duyệt hoặc hoàn thành');
      }
      // still allow non-pricing header edits (ghiChu, mucDichYeuCau, etc.) — only pricing/items are locked
    }

    // Guard: approval/rejection requires pricing approver (called via controller with actorId)
    // 3.3 — __actorUserId is required; no silent pass on undefined
    const _actorIdForGuard = (data as any).__actorUserId as string | undefined;
    if (data.trangThai === 'Đã duyệt' || data.trangThai === 'Từ chối') {
      await this.assertCanApprovePurchase(_actorIdForGuard);
    }
    // Validate approval fields
    if (data.trangThai === 'Đã duyệt') {
      const errors: string[] = [];
      if (!data.nguoiDuyet || !(data.nguoiDuyet as string).trim()) {
        errors.push('Người duyệt không được để trống khi duyệt yêu cầu');
      }
      if (!data.ngayDuyet) {
        errors.push('Ngày duyệt không được để trống khi duyệt yêu cầu');
      }
      if (errors.length > 0) {
        throw new ValidationError(errors.join('; '));
      }
    }

    // Parse soLuong to float if it's a string (from FormData)
    const { items, ...updateData } = data as any;
    // Strip internal actor field before Prisma — unknown field causes P2000/P2011
    delete (updateData as any).__actorUserId;
    if (updateData.soLuong !== undefined && updateData.soLuong !== null) {
      updateData.soLuong = parseFloat(updateData.soLuong.toString());
    }
    if (updateData.ngayDuyet) {
      updateData.ngayDuyet = new Date(updateData.ngayDuyet);
    }
    // Sanitize empty-string foreign keys → null (Prisma throws P2003 otherwise)
    if (updateData.nhaCungCapId === '') updateData.nhaCungCapId = null;
    if (updateData.supplyRequestId === '') updateData.supplyRequestId = null;
    // Coerce numeric fields sent as strings from FormData
    if (typeof updateData.giaDuKien === 'string') {
      updateData.giaDuKien = updateData.giaDuKien === '' ? null : parseFloat(updateData.giaDuKien);
    }

    let purchaseRequest;

    if (items && Array.isArray(items)) {
      purchaseRequest = await prisma.$transaction(async (tx) => {
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
            return {
              purchaseRequestId: id,
              phanLoai: item.phanLoai,
              tenHangHoa: item.tenHangHoa,
              soLuong: typeof item.soLuong === 'string' ? parseFloat(item.soLuong) : item.soLuong,
              donViTinh: item.donViTinh,
              nhaCungCapId: item.nhaCungCapId || null,
              giaDuKien,
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
          items: { include: { supplier: true } },
        },
      });
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
    if ((existingRequest as any).trangThai === 'Từ chối') {
      // Deleting a rejected PR is allowed, but keep the branch explicit for auditing
    }

    await prisma.purchaseRequest.delete({
      where: { id },
    });

    return { message: 'Xóa yêu cầu mua hàng thành công' };
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
        `Vui lòng nhập nhà cung cấp và đơn giá cho ${missing.length} sản phẩm trước khi gửi duyệt`
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
}

export default new PurchaseRequestService();
