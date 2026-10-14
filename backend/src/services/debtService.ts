import prisma from '@config/database';

interface CreateDebtInput {
  ngayPhatSinh: string;
  loaiChiPhi?: string;
  purchaseRequestId?: string | null;
  invoiceId?: string | null;
  supplierId: string;
  maNhaCungCap: string;
  tenNhaCungCap: string;
  loaiCungCap?: string;
  cungCap?: string;
  noiDungChiCho?: string;
  loaiHinh?: string;
  soTienPhaiTra: number;
  soTienDaThanhToan: number;
  ngayHoachToan?: string | null;
  ngayDenHan?: string | null;
  soTaiKhoan?: string;
  ghiChu?: string;
  files?: string[];
}

class DebtService {
  async getAll(month?: number, year?: number, page = 1, limit = 20, purchaseRequestId?: string) {
    const take = Math.min(Math.max(limit, 1), 500);
    const skip = (Math.max(page, 1) - 1) * take;
    const where: any = {};
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      where.ngayPhatSinh = { gte: start, lt: end };
    }
    if (purchaseRequestId) where.purchaseRequestId = purchaseRequestId;
    const [data, total] = await Promise.all([
      prisma.debt.findMany({ where, orderBy: { ngayPhatSinh: 'desc' }, skip, take }),
      prisma.debt.count({ where }),
    ]);
    return { data, total, page, limit: take, totalPages: Math.ceil(total / take) };
  }

  async getById(id: string) {
    return prisma.debt.findUnique({ where: { id } });
  }

  async create(input: CreateDebtInput) {
    if (input.purchaseRequestId) {
      const pr = await prisma.purchaseRequest.findUnique({ where: { id: String(input.purchaseRequestId) }, select: { id: true } });
      if (!pr) throw new Error('Yêu cầu mua hàng không tồn tại');
    }
    if (input.invoiceId) {
      const inv = await prisma.invoice.findUnique({ where: { id: String(input.invoiceId) }, select: { id: true } });
      if (!inv) throw new Error('Hóa đơn không tồn tại');
    }
    return (prisma.debt.create as any)({
      data: {
        ngayPhatSinh: new Date(input.ngayPhatSinh),
        loaiChiPhi: input.loaiChiPhi,
        purchaseRequestId: input.purchaseRequestId || null,
        invoiceId: input.invoiceId || null,
        supplierId: input.supplierId,
        maNhaCungCap: input.maNhaCungCap,
        tenNhaCungCap: input.tenNhaCungCap,
        loaiCungCap: input.loaiCungCap,
        cungCap: input.cungCap,
        noiDungChiCho: input.noiDungChiCho,
        loaiHinh: input.loaiHinh,
        soTienPhaiTra: input.soTienPhaiTra,
        soTienDaThanhToan: input.soTienDaThanhToan,
        ngayHoachToan: input.ngayHoachToan ? new Date(input.ngayHoachToan) : null,
        ngayDenHan: input.ngayDenHan ? new Date(input.ngayDenHan) : null,
        soTaiKhoan: input.soTaiKhoan,
        ghiChu: input.ghiChu,
        files: input.files || [],
      },
    });
  }

  async update(id: string, updateData: Record<string, any>) {
    if (updateData.purchaseRequestId !== undefined) {
      if (updateData.purchaseRequestId) {
        const pr = await prisma.purchaseRequest.findUnique({ where: { id: String(updateData.purchaseRequestId) }, select: { id: true } });
        if (!pr) throw new Error('Yêu cầu mua hàng không tồn tại');
      } else updateData.purchaseRequestId = null;
    }
    if (updateData.invoiceId !== undefined) {
      if (updateData.invoiceId) {
        const inv = await prisma.invoice.findUnique({ where: { id: String(updateData.invoiceId) }, select: { id: true } });
        if (!inv) throw new Error('Hóa đơn không tồn tại');
      } else updateData.invoiceId = null;
    }
    if (updateData.ngayPhatSinh) updateData.ngayPhatSinh = new Date(updateData.ngayPhatSinh);
    if (updateData.ngayHoachToan) updateData.ngayHoachToan = new Date(updateData.ngayHoachToan);
    if (updateData.ngayDenHan) updateData.ngayDenHan = new Date(updateData.ngayDenHan);
    if (updateData.soTienPhaiTra) updateData.soTienPhaiTra = parseFloat(updateData.soTienPhaiTra);
    if (updateData.soTienDaThanhToan) updateData.soTienDaThanhToan = parseFloat(updateData.soTienDaThanhToan);

    return (prisma.debt.update as any)({ where: { id }, data: updateData });
  }

  async delete(id: string) {
    await prisma.debt.delete({ where: { id } });
  }

  async getSummary(month?: number, year?: number) {
    const where: any = {};
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      where.ngayPhatSinh = { gte: start, lt: end };
    }
    const [aggPhaiTra, aggDaTra, soLuongCongNo, chuaThanhToan] = await Promise.all([
      prisma.debt.aggregate({ where, _sum: { soTienPhaiTra: true } }),
      prisma.debt.aggregate({ where, _sum: { soTienDaThanhToan: true } }),
      prisma.debt.count({ where }),
      prisma.debt.count({ where: { ...where, soTienDaThanhToan: 0, soTienPhaiTra: { gt: 0 } } }),
    ]);
    const tongPhaiTra = Number((aggPhaiTra._sum as any).soTienPhaiTra ?? 0);
    const daThanhToan = Number((aggDaTra._sum as any).soTienDaThanhToan ?? 0);
    // daThanhToanHet needs column-to-column comparison; fetch filtered rows for that one metric only
    const candidates = await prisma.debt.findMany({ where, select: { soTienPhaiTra: true, soTienDaThanhToan: true } });
    const daThanhToanHet = candidates.filter(d => (d.soTienDaThanhToan ?? 0) >= (d.soTienPhaiTra ?? 0) && (d.soTienPhaiTra ?? 0) > 0).length;
    return { tongPhaiTra, daThanhToan, conNo: tongPhaiTra - daThanhToan, soLuongCongNo, chuaThanhToan, daThanhToanHet };
  }
}

export default new DebtService();
