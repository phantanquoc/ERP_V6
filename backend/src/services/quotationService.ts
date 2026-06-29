import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import { advanceQuotationStatus, advanceQuotationRequestStatus } from '@utils/statusTransitions';
import { QuotationStatus, QuotationRequestStatus as PrismaQRStatus } from '@prisma/client';
import { recordAudit } from '@utils/auditLog';
import ExcelJS from 'exceljs';
import notificationService from '@services/notificationService';
import { NotificationEvent } from '@types';

// Statuses where a quotation is still "open" and age matters (task 7.1)
// Non-terminal = NOT IN { DA_DAT_HANG, KHONG_DAT_HANG, EXPIRED, REJECTED }
// SENT and APPROVED are confirmed enum members and are also non-terminal
const NON_TERMINAL_QUOTATION_STATUSES: QuotationStatus[] = [
  QuotationStatus.DRAFT,
  QuotationStatus.DANG_CHO_PHAN_HOI,
  QuotationStatus.DANG_CHO_GUI_DON_HANG,
  QuotationStatus.SENT,
  QuotationStatus.APPROVED,
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

class QuotationService {
  async generateQuotationCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.quotation.findFirst({
      where: { maBaoGia: yearlyCodeWhere('BG', year) },
      orderBy: { maBaoGia: 'desc' },
      select: { maBaoGia: true },
    });
    return nextYearlyCode(last?.maBaoGia ?? null, 'BG', year);
  }

  /**
   * Get all quotations with pagination
   */
  async getAllQuotations(page: number, limit: number, search?: string, customerType?: string, status?: string, dateFrom?: string, dateTo?: string): Promise<any> {
    const { skip } = getPaginationParams(page, limit);

    const where: any = {};

    // Filter by customerType (Quốc tế / Nội địa)
    if (customerType === 'Quốc tế') {
      where.customer = { quocGia: { not: null } };
    } else if (customerType === 'Nội địa') {
      where.customer = { tinhThanh: { not: null } };
    }

    // Filter by status
    if (status) {
      where.tinhTrang = status as QuotationStatus;
    }

    // Filter by date range (createdAt)
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    if (search) {
      where.OR = [
        { maBaoGia: { contains: search, mode: 'insensitive' } },
        { maYeuCauBaoGia: { contains: search, mode: 'insensitive' } },
        { tenKhachHang: { contains: search, mode: 'insensitive' } },
        { tenSanPham: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          quotationRequest: {
            include: {
              items: true,
              calculator: {
                include: {
                  products: {
                    include: {
                      byProducts: true,
                    },
                  },
                },
              },
            },
          },
          items: true,
        },
      }),
      prisma.quotation.count({ where }),
    ]);

    const totalPages = calculateTotalPages(total, limit);

    // Compute daysOpen for non-terminal rows (task 7.2)
    const now = Date.now();
    const enrichedQuotations = quotations.map((q) => {
      const isNonTerminal = NON_TERMINAL_QUOTATION_STATUSES.includes(q.tinhTrang as QuotationStatus);
      return {
        ...q,
        daysOpen: isNonTerminal
          ? Math.floor((now - new Date(q.createdAt).getTime()) / MS_PER_DAY)
          : undefined,
      };
    });

    return {
      data: enrichedQuotations,
      page,
      limit,
      total,
      totalPages,
    };
  }

  /**
   * Get quotation by ID
   */
  async getQuotationById(id: string): Promise<any> {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        quotationRequest: {
          include: {
            items: true,
          },
        },
        items: true,
      },
    });

    if (!quotation) {
      throw new NotFoundError('Quotation not found');
    }

    return quotation;
  }

  /**
   * Create quotation
   */
  async createQuotation(data: any, actorId?: string, actorRole?: string): Promise<any> {
    // Get quotation request info
    const quotationRequest = await prisma.quotationRequest.findUnique({
      where: { id: data.quotationRequestId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotationRequest) {
      throw new NotFoundError('Quotation request not found');
    }

    // Generate quotation code if not provided
    if (!data.maBaoGia) {
      data.maBaoGia = await this.generateQuotationCode();
    }

    // Check if quotation code already exists
    const existingQuotation = await prisma.quotation.findUnique({
      where: { maBaoGia: data.maBaoGia },
    });

    if (existingQuotation) {
      throw new ValidationError('Quotation code already exists');
    }

    // Get material standard info if provided
    let materialStandard = null;
    if (data.materialStandardId) {
      materialStandard = await prisma.materialStandard.findUnique({
        where: { id: data.materialStandardId },
        include: {
          items: true,
        },
      });

      if (!materialStandard) {
        throw new NotFoundError('Material standard not found');
      }
    }

    // Use first item from quotation request for product info
    const firstItem = quotationRequest.items[0];
    if (!firstItem) {
      throw new ValidationError('Quotation request has no items');
    }

    // Prepare quotation items data
    const quotationItemsData = data.items?.map((item: any) => ({
      tenThanhPham: item.tenThanhPham,
      tiLe: parseFloat(item.tiLe),
      khoiLuongTuongUng: item.khoiLuongTuongUng ? parseFloat(item.khoiLuongTuongUng) : null,
    })) || [];

    // Create quotation
    const quotation = await prisma.quotation.create({
      data: {
        maBaoGia: data.maBaoGia,
        quotationRequestId: data.quotationRequestId,
        maYeuCauBaoGia: quotationRequest.maYeuCauBaoGia,
        customerId: quotationRequest.customerId,
        maKhachHang: quotationRequest.maKhachHang,
        tenKhachHang: quotationRequest.tenKhachHang,
        productId: firstItem.productId,
        tenSanPham: firstItem.tenSanPham,
        khoiLuong: firstItem.soLuong,
        donViTinh: firstItem.donViTinh,
        materialStandardId: data.materialStandardId || null,
        maDinhMuc: materialStandard?.maDinhMuc || null,
        tenDinhMuc: materialStandard?.tenDinhMuc || null,
        tiLeThuHoi: data.tiLeThuHoi ? parseFloat(data.tiLeThuHoi) : null,
        sanPhamDauRa: data.sanPhamDauRa || null,
        thanhPhamTonKho: data.thanhPhamTonKho ? parseFloat(data.thanhPhamTonKho) : null,
        tongThanhPhamCanSxThem: data.tongThanhPhamCanSxThem ? parseFloat(data.tongThanhPhamCanSxThem) : null,
        tongNguyenLieuCanSanXuat: data.tongNguyenLieuCanSanXuat ? parseFloat(data.tongNguyenLieuCanSanXuat) : null,
        nguyenLieuTonKho: data.nguyenLieuTonKho ? parseFloat(data.nguyenLieuTonKho) : null,
        nguyenLieuCanNhapThem: data.nguyenLieuCanNhapThem ? parseFloat(data.nguyenLieuCanNhapThem) : null,
        tinhTrang: data.tinhTrang || 'DRAFT',
        ghiChu: data.ghiChu || null,
        items: quotationItemsData.length > 0 ? {
          create: quotationItemsData,
        } : undefined,
      },
      include: {
        quotationRequest: {
          include: {
            items: true,
          },
        },
        items: true,
      },
    });

    // Advance the linked quotation request to DA_BAO_GIA (task 2.5)
    // bypass: true — quotation creation is the authoritative event; skip forward-only enforcement
    // so CHO_XU_LY → DA_BAO_GIA (a 2-step jump) is allowed here
    try {
      advanceQuotationRequestStatus(
        quotationRequest.status as any,
        'DA_BAO_GIA',
        { bypass: true }
      );
      await prisma.quotationRequest.update({
        where: { id: data.quotationRequestId },
        data: { status: PrismaQRStatus.DA_BAO_GIA },
      });
    } catch {
      // If transition is invalid (e.g. already HUY), log but don't fail quotation creation
    }

    // Fire-and-forget: audit log (task 5.5)
    recordAudit({
      entityType: 'Quotation',
      entityId: quotation.id,
      action: 'CREATE',
      actorId: actorId ?? 'system',
      actorRole: actorRole ?? 'UNKNOWN',
      after: quotation,
    });

    return quotation;
  }
  async updateQuotation(id: string, data: any, actorRole?: string, actorId?: string): Promise<any> {
    // Fetch current quotation + items outside transaction first (for snapshot)
    const current = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!current) {
      throw new NotFoundError('Quotation not found');
    }

    // ── Price lock guard (task 4.4) ────────────────────────────────────────────
    const PRICE_FIELDS = new Set(['donGia', 'soLuong', 'thanhTien', 'vat', 'totalAmount', 'giaBaoKhach']);
    const ITEM_PRICE_FIELDS = new Set(['donGia', 'soLuong', 'thanhTien']);

    const touchesPriceField = PRICE_FIELDS.has.bind(PRICE_FIELDS);
    const hasPriceEdit = Object.keys(data).some(k => touchesPriceField(k))
      || (Array.isArray(data.items) && data.items.some((item: any) =>
          Object.keys(item).some(k => ITEM_PRICE_FIELDS.has(k))
        ));

    if (current.priceLocked) {
      const isAdmin = actorRole === 'ADMIN';

      if (isAdmin && hasPriceEdit) {
        // ADMIN implicitly unlocks when editing price on a locked quotation.
        // The PRICE_UNLOCK audit entry is recorded after the transaction below.
        data._clearLock = true;
      } else if (hasPriceEdit) {
        throw new ValidationError(
          'Báo giá đã khóa giá, không thể sửa giá. Hãy tạo phiên bản mới hoặc liên hệ ADMIN để mở khóa.'
        );
      }
    }

    // Get material standard info if materialStandardId is being updated
    let materialStandard = null;
    if (data.materialStandardId) {
      materialStandard = await prisma.materialStandard.findUnique({
        where: { id: data.materialStandardId },
        include: { items: true },
      });

      if (!materialStandard) {
        throw new NotFoundError('Material standard not found');
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (data.materialStandardId !== undefined) {
      updateData.materialStandardId = data.materialStandardId;
      updateData.maDinhMuc = materialStandard?.maDinhMuc || null;
      updateData.tenDinhMuc = materialStandard?.tenDinhMuc || null;
    }

    if (data.tiLeThuHoi !== undefined) updateData.tiLeThuHoi = data.tiLeThuHoi ? parseFloat(data.tiLeThuHoi) : null;
    if (data.sanPhamDauRa !== undefined) updateData.sanPhamDauRa = data.sanPhamDauRa;
    if (data.thanhPhamTonKho !== undefined) updateData.thanhPhamTonKho = data.thanhPhamTonKho ? parseFloat(data.thanhPhamTonKho) : null;
    if (data.tongThanhPhamCanSxThem !== undefined) updateData.tongThanhPhamCanSxThem = data.tongThanhPhamCanSxThem ? parseFloat(data.tongThanhPhamCanSxThem) : null;
    if (data.tongNguyenLieuCanSanXuat !== undefined) updateData.tongNguyenLieuCanSanXuat = data.tongNguyenLieuCanSanXuat ? parseFloat(data.tongNguyenLieuCanSanXuat) : null;
    if (data.nguyenLieuTonKho !== undefined) updateData.nguyenLieuTonKho = data.nguyenLieuTonKho ? parseFloat(data.nguyenLieuTonKho) : null;
    if (data.nguyenLieuCanNhapThem !== undefined) updateData.nguyenLieuCanNhapThem = data.nguyenLieuCanNhapThem ? parseFloat(data.nguyenLieuCanNhapThem) : null;
    if (data.giaBaoKhach !== undefined) updateData.giaBaoKhach = data.giaBaoKhach ? parseFloat(data.giaBaoKhach) : null;
    if (data.thoiGianGiaoHang !== undefined) updateData.thoiGianGiaoHang = data.thoiGianGiaoHang ? parseInt(data.thoiGianGiaoHang) : null;
    if (data.hieuLucBaoGia !== undefined) updateData.hieuLucBaoGia = data.hieuLucBaoGia ? parseInt(data.hieuLucBaoGia) : null;

    // Route status change through forward-only helper
    if (data.tinhTrang !== undefined) {
      const nextStatus = advanceQuotationStatus(
        current.tinhTrang,
        data.tinhTrang as QuotationStatus,
        { bypass: actorRole === 'ADMIN' }
      );
      updateData.tinhTrang = nextStatus;

      // Auto-lock when transitioning into DANG_CHO_PHAN_HOI (task 4.3).
      // ADMIN is exempt — they bypass the lock entirely (no DB lock, no badge).
      if (
        nextStatus === QuotationStatus.DANG_CHO_PHAN_HOI &&
        !current.priceLocked &&
        actorRole !== 'ADMIN'
      ) {
        updateData.priceLocked = true;
        updateData.priceLockedAt = new Date();
        updateData.priceLockedBy = actorId ?? null;
      }
    }

    // ADMIN force-unlock: clear lock fields (task 4.5)
    if (data._clearLock) {
      updateData.priceLocked = false;
      updateData.priceLockedAt = null;
      updateData.priceLockedBy = null;
    }

    if (data.ghiChu !== undefined) updateData.ghiChu = data.ghiChu;

    // Prepare items for delete-then-recreate inside transaction
    const newItems = data.items && Array.isArray(data.items)
      ? data.items.map((item: any) => ({
          tenThanhPham: item.tenThanhPham,
          tiLe: parseFloat(item.tiLe),
          khoiLuongTuongUng: item.khoiLuongTuongUng ? parseFloat(item.khoiLuongTuongUng) : null,
        }))
      : null;

    // Execute in transaction: snapshot → delete items → update quotation
    const updatedQuotation = await prisma.$transaction(async (tx) => {
      // 1. Compute next revision number
      const maxRevision = await tx.quotationRevision.aggregate({
        where: { quotationId: id },
        _max: { revisionNumber: true },
      });
      const nextRevisionNumber = (maxRevision._max.revisionNumber ?? 0) + 1;

      // 2. Insert snapshot of current state before the update
      await tx.quotationRevision.create({
        data: {
          quotationId: id,
          revisionNumber: nextRevisionNumber,
          snapshot: current as any,
          createdBy: actorId ?? 'system',
          note: data.revisionNote ?? null,
        },
      });

      // 3. Delete existing items if replacing
      if (newItems !== null) {
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
        updateData.items = { create: newItems };
      }

      // 4. Apply update
      return tx.quotation.update({
        where: { id },
        data: updateData,
        include: {
          quotationRequest: { include: { items: true } },
          items: true,
        },
      });
    });

    // Fire-and-forget: audit + notifications after transaction commits (task 5.5, 6.3, 4.5)
    const newStatus = updatedQuotation.tinhTrang;
    const wasStatusChange = data.tinhTrang !== undefined && data.tinhTrang !== current.tinhTrang;
    const wasPriceUnlock = data._clearLock === true;

    recordAudit({
      entityType: 'Quotation',
      entityId: id,
      action: wasPriceUnlock ? 'PRICE_UNLOCK' : wasStatusChange ? 'STATUS_CHANGE' : 'UPDATE',
      actorId: actorId ?? 'system',
      actorRole: actorRole ?? 'UNKNOWN',
      before: current,
      after: updatedQuotation,
    });

    if (wasStatusChange) {
      // Win notification: Quotation status → DA_DAT_HANG
      if (newStatus === QuotationStatus.DA_DAT_HANG) {
        try {
          const creatorEmployeeId = updatedQuotation.employeeId;
          if (creatorEmployeeId) {
            await notificationService.notify(NotificationEvent.QUOTATION_WON, {
              entityId: id,
              actorUserId: actorId,
              targetEmployeeIds: [creatorEmployeeId],
              metadata: { soBaoGia: updatedQuotation.maBaoGia },
            });
          }
        } catch {}
      }

      // Loss notification: Quotation status → KHONG_DAT_HANG
      if (newStatus === QuotationStatus.KHONG_DAT_HANG) {
        try {
          const targets: string[] = [];
          if (updatedQuotation.employeeId) targets.push(updatedQuotation.employeeId);
          // Also notify all DEPARTMENT_HEAD employees
          const deptHeads = await prisma.employee.findMany({
            where: { status: 'ACTIVE', user: { role: 'DEPARTMENT_HEAD', isActive: true } },
            select: { id: true },
          });
          deptHeads.forEach(e => targets.push(e.id));
          await notificationService.notify(NotificationEvent.QUOTATION_LOST, {
            entityId: id,
            actorUserId: actorId,
            targetEmployeeIds: [...new Set(targets)],
            metadata: { soBaoGia: updatedQuotation.maBaoGia },
          });
        } catch {}
      }
    }

    // Price unlock notification (task 6.5)
    if (wasPriceUnlock) {
      try {
        const targets: string[] = [];
        if (updatedQuotation.employeeId) targets.push(updatedQuotation.employeeId);
        const deptHeads = await prisma.employee.findMany({
          where: { status: 'ACTIVE', user: { role: 'DEPARTMENT_HEAD', isActive: true } },
          select: { id: true },
        });
        deptHeads.forEach(e => targets.push(e.id));
        // Get actor name for message
        const actor = actorId ? await prisma.user.findUnique({
          where: { id: actorId },
          select: { firstName: true, lastName: true },
        }) : null;
        await notificationService.notify(NotificationEvent.QUOTATION_PRICE_UNLOCKED, {
          entityId: id,
          actorUserId: actorId,
          targetEmployeeIds: [...new Set(targets)],
          metadata: {
            soBaoGia: updatedQuotation.maBaoGia,
            tenAdmin: actor ? `${actor.lastName} ${actor.firstName}` : actorId,
          },
        });
      } catch {}
    }

    return updatedQuotation;
  }

  /**
   * Delete quotation
   */
  async deleteQuotation(id: string, actorId?: string, actorRole?: string): Promise<void> {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      throw new NotFoundError('Quotation not found');
    }

    await prisma.quotation.delete({
      where: { id },
    });

    // Fire-and-forget: audit log (task 5.5)
    recordAudit({
      entityType: 'Quotation',
      entityId: id,
      action: 'DELETE',
      actorId: actorId ?? 'system',
      actorRole: actorRole ?? 'UNKNOWN',
      before: quotation,
    });
  }

  /**
   * List quotations with age >= threshold, grouped by color band (task 7.3)
   * Fixed bands per spec: yellow = [threshold, 14), red = >= 14 (regardless of threshold value)
   */
  async listAgingWarnings(threshold: number = 7): Promise<{
    data: Array<{ id: string; maBaoGia: string; tinhTrang: string; createdAt: Date; daysOpen: number; band: 'yellow' | 'red' }>;
    warningBands: { yellow: number; red: number };
  }> {
    const quotations = await prisma.quotation.findMany({
      where: { tinhTrang: { in: NON_TERMINAL_QUOTATION_STATUSES } },
      select: { id: true, maBaoGia: true, tinhTrang: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const now = Date.now();
    // Fixed red boundary: >= 14 days; yellow: [threshold, 14)
    const aged = quotations
      .map((q) => ({
        ...q,
        daysOpen: Math.floor((now - new Date(q.createdAt).getTime()) / MS_PER_DAY),
      }))
      .filter((q) => q.daysOpen >= threshold)
      .map((q) => ({
        ...q,
        band: (q.daysOpen >= 14 ? 'red' : 'yellow') as 'yellow' | 'red',
      }))
      .sort((a, b) => b.daysOpen - a.daysOpen);

    const warningBands = {
      yellow: aged.filter((q) => q.band === 'yellow').length,
      red: aged.filter((q) => q.band === 'red').length,
    };

    return { data: aged, warningBands };
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { maBaoGia: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const data = await prisma.quotation.findMany({
      where,
      include: { quotationRequest: true },
      orderBy: { createdAt: 'desc' },
    });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách báo giá');
    worksheet.columns = [
      { header: 'Mã báo giá', key: 'maBaoGia', width: 15 },
      { header: 'Mã YCBG', key: 'maYeuCau', width: 15 },
      { header: 'Ngày báo giá', key: 'ngayBaoGia', width: 20 },
      { header: 'Tổng tiền', key: 'tongTien', width: 20 },
      { header: 'Trạng thái', key: 'trangThai', width: 15 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
    ];
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    data.forEach((q) => {
      worksheet.addRow({
        maBaoGia: q.maBaoGia,
        maYeuCau: q.quotationRequest?.maYeuCauBaoGia || '',
        ngayBaoGia: q.ngayBaoGia ? new Date(q.ngayBaoGia).toLocaleDateString('vi-VN') : '',
        tongTien: (q as any).tongTien?.toLocaleString('vi-VN') || '0',
        trangThai: q.tinhTrang || '',
        createdAt: new Date(q.createdAt).toLocaleDateString('vi-VN'),
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new QuotationService();

