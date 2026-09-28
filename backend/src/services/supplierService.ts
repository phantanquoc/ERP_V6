import prisma from '@config/database';
import { Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import ExcelJS from 'exceljs';

interface CreateSupplierData {
  maNhaCungCap: string;
  tenNhaCungCap: string;
  loaiCungCap: string;
  quocGia: string;
  website?: string;
  nguoiLienHe: string;
  soDienThoai: string;
  emailLienHe: string;
  diaChi: string;
  khaNang?: string;
  loaiHinh: string;
  trangThai?: string;
  phanLoaiNCC?: string;
  doanhChi?: number;
  employeeId: string;
}

interface UpdateSupplierData {
  tenNhaCungCap?: string;
  loaiCungCap?: string;
  quocGia?: string;
  website?: string;
  nguoiLienHe?: string;
  soDienThoai?: string;
  emailLienHe?: string;
  diaChi?: string;
  khaNang?: string;
  loaiHinh?: string;
  trangThai?: string;
  doanhChi?: number;
}

export const supplierService = {
  // Get all suppliers with pagination and search
  async getAllSuppliers(page: number = 1, limit: number = 10, search?: string, phanLoaiNCC?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (phanLoaiNCC) {
      where.phanLoaiNCC = phanLoaiNCC;
    }
    if (search) {
      where.AND = [
        ...(where.phanLoaiNCC ? [{ phanLoaiNCC: where.phanLoaiNCC }] : []),
        {
          OR: [
            { maNhaCungCap: { contains: search, mode: 'insensitive' } },
            { tenNhaCungCap: { contains: search, mode: 'insensitive' } },
            { loaiCungCap: { contains: search, mode: 'insensitive' } },
            { nguoiLienHe: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
      delete where.phanLoaiNCC;
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            include: {
              user: true,
            },
          },
        },
      }),
      prisma.supplier.count({ where }),
    ]);

    return {
      data: suppliers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  // Get supplier by ID
  async getSupplierById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundError('Không tìm thấy nhà cung cấp');
    }

    return supplier;
  },

  // Create new supplier — code generation inside transaction + P2002 handling
  // doanhChi is derived (do NOT persist caller-supplied value; starts at 0 and is synced on PR Hoàn thành/confirmActualPrice)
  async createSupplier(data: CreateSupplierData) {
    const { doanhChi: _dropSpend, ...rest } = data as any;
    const clean: any = { ...rest, doanhChi: 0 };
    const suppliedCode = clean.maNhaCungCap?.trim() || null;
    if (suppliedCode) {
      const dup = await prisma.supplier.findUnique({ where: { maNhaCungCap: suppliedCode }, select: { id: true } });
      if (dup) throw new ValidationError('Mã nhà cung cấp đã tồn tại');
      try {
        return await prisma.supplier.create({
          data: { ...clean, maNhaCungCap: suppliedCode, trangThai: clean.trangThai || 'Đang cung cấp' },
          include: { employee: { include: { user: true } } },
        });
      } catch (e: unknown) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictError('Mã nhà cung cấp đã tồn tại');
        throw e;
      }
    }
    // Auto-generate code inside transaction to avoid race
    try {
      return await prisma.$transaction(async (tx) => {
        const maNhaCungCap = await this.generateSupplierCodeTx(tx as any, clean.phanLoaiNCC);
        return tx.supplier.create({
          data: { ...clean, maNhaCungCap, trangThai: clean.trangThai || 'Đang cung cấp' },
          include: { employee: { include: { user: true } } },
        });
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictError('Mã nhà cung cấp đã tồn tại, vui lòng thử lại');
      throw e;
    }
  },

  // Update supplier
  async updateSupplier(id: string, data: UpdateSupplierData) {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy nhà cung cấp');
    }

    // Drop immutable/system fields that must never be overwritten by an update payload
    // doanhChi is derived (sum of giaThucTe*soLuongThucTe for Đã duyệt/Hoàn thành), never user-editable
    const { maNhaCungCap: _dropCode, phanLoaiNCC: _dropClass, employeeId: _dropOwner, doanhChi: _dropSpend, ...rawUpdate } = data as any;
    const updateData: any = { ...rawUpdate };

    const supplier = await prisma.supplier.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    return supplier;
  },

  // Delete supplier
  async deleteSupplier(id: string) {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy nhà cung cấp');
    }
    const [prCount, rrCount, debtCount] = await Promise.all([
      prisma.purchaseRequest.count({ where: { OR: [{ nhaCungCapId: id }, { items: { some: { nhaCungCapId: id } } }] } }),
      (prisma as any).replenishmentRequest ? (prisma as any).replenishmentRequest.count({ where: { supplierId: id } }).catch(()=>0) : Promise.resolve(0),
      prisma.debt.count({ where: { supplierId: id } }),
    ]);
    if (prCount > 0 || rrCount > 0 || debtCount > 0) {
      throw new ConflictError('Không thể xóa nhà cung cấp đang được tham chiếu bởi yêu cầu mua hàng / yêu cầu bổ sung / công nợ');
    }

    await prisma.supplier.delete({ where: { id } });
    return { message: 'Xóa nhà cung cấp thành công' };
  },

  // Generate next supplier code — public preview; createSupplier uses Tx variant internally
  async generateSupplierCode(phanLoaiNCC?: string) {
    return this.generateSupplierCodeTx(prisma as any, phanLoaiNCC);
  },
  async generateSupplierCodeTx(tx: any, phanLoaiNCC?: string) {
    const prefix = phanLoaiNCC === 'Thiết bị' ? 'NCC-TB' : 'NCC';
    const all = await tx.supplier.findMany({
      where: { maNhaCungCap: { startsWith: `${prefix}-` } },
      select: { maNhaCungCap: true },
    });
    if (all.length === 0) return `${prefix}-001`;
    const maxNum = Math.max(...all.map((s: any) => parseInt(s.maNhaCungCap.split('-').pop() ?? '0', 10) || 0));
    return `${prefix}-${String((isNaN(maxNum) ? 0 : maxNum) + 1).padStart(3, '0')}`;
  },

  /**
   * Chuẩn tính tổng chi (spend) cho nhà cung cấp:
   * - Chỉ tính các PurchaseRequest đã qua mua thực tế: trangThai IN ('Đã duyệt','Hoàn thành')
   *   và loại trừ 'Đã hủy'/'Từ chối'/'Đã từ chối'. PR ở 'Chờ duyệt'/'Chờ báo giá' chưa phát sinh chi.
   * - Theo dòng hàng (item-level): sum( effectivePrice * effectiveQty ) với
   *   effectivePrice = giaThucTe ?? giaDuKien, effectiveQty = soLuongThucTe ?? soLuong.
   *   Đây là chuẩn kế toán mua hàng: ưu tiên giá/số lượng thực tế khi đã xác nhận.
   * - Dùng cấp item.nhaCungCapId (và fallback legacy PR.nhaCungCapId) để đúng khi 1 PR có nhiều NCC khác nhau.
   * - Không giới hạn take 50 khi tính tổng — chỉ giới hạn khi trả về recentOrders.
   */
  async getPurchaseStats(id: string) {
    const supplier = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
    if (!supplier) throw new NotFoundError('Không tìm thấy nhà cung cấp');
    const where: any = { OR: [{ nhaCungCapId: id }, { items: { some: { nhaCungCapId: id } } }] };
    const [statsPrs, recentPrs] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where,
        select: {
          id: true, trangThai: true, ngayYeuCau: true,
          items: { select: { nhaCungCapId: true, giaDuKien: true, giaThucTe: true, soLuong: true, soLuongThucTe: true } },
        },
        orderBy: { ngayYeuCau: 'desc' },
      }),
      prisma.purchaseRequest.findMany({
        where,
        select: { id: true, maYeuCau: true, trangThai: true, ngayYeuCau: true, mucDoUuTien: true, supplyRequestId: true, sourceType: true },
        orderBy: { ngayYeuCau: 'desc' },
        take: 10,
      }),
    ]);
    const EXCLUDED = new Set(['Đã hủy', 'Từ chối', 'Đã từ chối']);
    const COUNTABLE = new Set(['Đã duyệt', 'Hoàn thành']);
    const totalOrders = statsPrs.length;
    const totalSpend = statsPrs.reduce((sum, pr) => {
      if (EXCLUDED.has(pr.trangThai)) return sum;
      if (!COUNTABLE.has(pr.trangThai)) return sum;
      const prSum = pr.items.reduce((s, it) => {
        if (it.nhaCungCapId && it.nhaCungCapId !== id) return s;
        if (!it.nhaCungCapId && (pr as any).nhaCungCapId && (pr as any).nhaCungCapId !== id) return s;
        const price = (it as any).giaThucTe ?? it.giaDuKien ?? 0;
        const qty = (it as any).soLuongThucTe ?? it.soLuong ?? 0;
        return s + Number(price) * Number(qty);
      }, 0);
      return sum + prSum;
    }, 0);
    const pendingOrders = statsPrs.filter((pr) => !EXCLUDED.has(pr.trangThai) && pr.trangThai !== 'Hoàn thành').length;
    const lastOrderAt = statsPrs[0]?.ngayYeuCau ?? null;
    return { totalOrders, totalSpend, pendingOrders, lastOrderAt, recentOrders: recentPrs };
  },

  /** Tính lại doanhChi cho 1 NCC từ lịch sử mua thực tế (đồng bộ với getPurchaseStats). */
  async recomputeDoanhChi(supplierId: string, tx: any = prisma) {
    const prs: any[] = await tx.purchaseRequest.findMany({
      where: { OR: [{ nhaCungCapId: supplierId }, { items: { some: { nhaCungCapId: supplierId } } }] },
      select: { trangThai: true, nhaCungCapId: true, items: { select: { nhaCungCapId: true, giaDuKien: true, giaThucTe: true, soLuong: true, soLuongThucTe: true } } },
    });
    const EXCLUDED = new Set(['Đã hủy', 'Từ chối', 'Đã từ chối']);
    const COUNTABLE = new Set(['Đã duyệt', 'Hoàn thành']);
    let total = 0;
    for (const pr of prs) {
      if (EXCLUDED.has(pr.trangThai) || !COUNTABLE.has(pr.trangThai)) continue;
      for (const it of pr.items) {
        if (it.nhaCungCapId && it.nhaCungCapId !== supplierId) continue;
        const price = (it as any).giaThucTe ?? it.giaDuKien ?? 0;
        const qty = (it as any).soLuongThucTe ?? it.soLuong ?? 0;
        total += Number(price) * Number(qty);
      }
    }
    await tx.supplier.update({ where: { id: supplierId }, data: { doanhChi: total } });
    return total;
  },

  async recomputeDoanhChiForPurchaseRequest(purchaseRequestId: string, tx: any = prisma) {
    const pr: any = await tx.purchaseRequest.findUnique({
      where: { id: purchaseRequestId },
      select: { nhaCungCapId: true, items: { select: { nhaCungCapId: true } } },
    });
    if (!pr) return;
    const ids = new Set<string>();
    if (pr.nhaCungCapId) ids.add(pr.nhaCungCapId);
    for (const it of pr.items ?? []) if (it.nhaCungCapId) ids.add(it.nhaCungCapId);
    for (const sid of ids) await (this as any).recomputeDoanhChi(sid, tx);
  },

  async getPurchaseRequestsBySupplier(id: string, page = 1, limit = 10) {
    const supplier = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
    if (!supplier) throw new NotFoundError('Không tìm thấy nhà cung cấp');
    const skip = (page - 1) * limit;
    const where = { OR: [{ nhaCungCapId: id }, { items: { some: { nhaCungCapId: id } } }] };
    const [data, total] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where,
        skip, take: limit,
        orderBy: { ngayYeuCau: 'desc' },
        include: { items: { include: { supplier: true } }, supplyRequest: { select: { maYeuCau: true, id: true } } },
      }),
      prisma.purchaseRequest.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  },

  // Export suppliers to Excel
  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};

    if (filters?.phanLoaiNCC) {
      where.phanLoaiNCC = filters.phanLoaiNCC;
    }

    if (filters?.search) {
      where.AND = [
        ...(where.phanLoaiNCC ? [{ phanLoaiNCC: where.phanLoaiNCC }] : []),
        {
          OR: [
            { maNhaCungCap: { contains: filters.search, mode: 'insensitive' } },
            { tenNhaCungCap: { contains: filters.search, mode: 'insensitive' } },
            { loaiCungCap: { contains: filters.search, mode: 'insensitive' } },
            { nguoiLienHe: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      ];
      delete where.phanLoaiNCC;
    }

    const data = await prisma.supplier.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách nhà cung cấp');

    worksheet.columns = [
      { header: 'Mã NCC', key: 'maNhaCungCap', width: 15 },
      { header: 'Tên NCC', key: 'tenNhaCungCap', width: 30 },
      { header: 'Loại cung cấp', key: 'loaiCungCap', width: 20 },
      { header: 'Quốc gia', key: 'quocGia', width: 15 },
      { header: 'Người liên hệ', key: 'nguoiLienHe', width: 20 },
      { header: 'Số điện thoại', key: 'soDienThoai', width: 15 },
      { header: 'Email', key: 'emailLienHe', width: 25 },
      { header: 'Loại hình', key: 'loaiHinh', width: 15 },
      { header: 'Trạng thái', key: 'trangThai', width: 15 },
      { header: 'Doanh chi', key: 'doanhChi', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((item) => {
      worksheet.addRow({
        maNhaCungCap: item.maNhaCungCap,
        tenNhaCungCap: item.tenNhaCungCap,
        loaiCungCap: item.loaiCungCap,
        quocGia: item.quocGia,
        nguoiLienHe: item.nguoiLienHe,
        soDienThoai: item.soDienThoai,
        emailLienHe: item.emailLienHe,
        loaiHinh: item.loaiHinh,
        trangThai: item.trangThai,
        doanhChi: item.doanhChi || 0,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  },
};

