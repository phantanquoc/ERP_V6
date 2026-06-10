import prisma from '@config/database';

interface CreateDebtInput {
  ngayPhatSinh: string;
  loaiChiPhi?: string;
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
  fileDinhKem?: string;
}

class DebtService {
  async getAll() {
    return prisma.debt.findMany({ orderBy: { ngayPhatSinh: 'desc' } });
  }

  async getById(id: string) {
    return prisma.debt.findUnique({ where: { id } });
  }

  async create(input: CreateDebtInput) {
    return prisma.debt.create({
      data: {
        ngayPhatSinh: new Date(input.ngayPhatSinh),
        loaiChiPhi: input.loaiChiPhi,
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
        fileDinhKem: input.fileDinhKem,
      },
    });
  }

  async update(id: string, updateData: Record<string, any>) {
    if (updateData.ngayPhatSinh) updateData.ngayPhatSinh = new Date(updateData.ngayPhatSinh);
    if (updateData.ngayHoachToan) updateData.ngayHoachToan = new Date(updateData.ngayHoachToan);
    if (updateData.ngayDenHan) updateData.ngayDenHan = new Date(updateData.ngayDenHan);
    if (updateData.soTienPhaiTra) updateData.soTienPhaiTra = parseFloat(updateData.soTienPhaiTra);
    if (updateData.soTienDaThanhToan) updateData.soTienDaThanhToan = parseFloat(updateData.soTienDaThanhToan);

    return prisma.debt.update({ where: { id }, data: updateData });
  }

  async delete(id: string) {
    await prisma.debt.delete({ where: { id } });
  }

  async getSummary() {
    const debts = await prisma.debt.findMany();
    return {
      tongPhaiTra: debts.reduce((sum, debt) => sum + debt.soTienPhaiTra, 0),
      daThanhToan: debts.reduce((sum, debt) => sum + debt.soTienDaThanhToan, 0),
      conNo: debts.reduce((sum, debt) => sum + (debt.soTienPhaiTra - debt.soTienDaThanhToan), 0),
      soLuongCongNo: debts.length,
      chuaThanhToan: debts.filter(d => d.soTienDaThanhToan === 0 && d.soTienPhaiTra > 0).length,
      daThanhToanHet: debts.filter(d => d.soTienDaThanhToan >= d.soTienPhaiTra && d.soTienPhaiTra > 0).length,
    };
  }
}

export default new DebtService();
