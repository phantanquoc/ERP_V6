import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all debts
export const getAllDebts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const debts = await prisma.debt.findMany({
      orderBy: { ngayPhatSinh: 'desc' },
    });

    res.json({
      success: true,
      data: debts,
    });
  } catch (error: any) {
    console.error('Error fetching debts:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách công nợ',
      error: error.message,
    });
  }
};

// Get debt by ID
export const getDebtById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const debt = await prisma.debt.findUnique({
      where: { id },
    });

    if (!debt) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy công nợ',
      });
      return;
    }

    res.json({
      success: true,
      data: debt,
    });
  } catch (error: any) {
    console.error('Error fetching debt:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin công nợ',
      error: error.message,
    });
  }
};

// Create debt
export const createDebt = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      ngayPhatSinh,
      loaiChiPhi,
      maNhaCungCap,
      tenNhaCungCap,
      loaiCungCap,
      cungCap,
      noiDungChiCho,
      loaiHinh,
      soTienPhaiTra,
      soTienDaThanhToan,
      ngayHoachToan,
      ngayDenHan,
      soTaiKhoan,
      ghiChu,
      fileDinhKem,
    } = req.body;

    if (!maNhaCungCap || !tenNhaCungCap || !ngayPhatSinh) {
      res.status(400).json({
        success: false,
        message: 'Mã nhà cung cấp, tên nhà cung cấp và ngày phát sinh là bắt buộc',
      });
      return;
    }

    const debt = await prisma.debt.create({
      data: {
        ngayPhatSinh: new Date(ngayPhatSinh),
        loaiChiPhi,
        maNhaCungCap,
        tenNhaCungCap,
        loaiCungCap,
        cungCap,
        noiDungChiCho,
        loaiHinh,
        soTienPhaiTra: parseFloat(soTienPhaiTra) || 0,
        soTienDaThanhToan: parseFloat(soTienDaThanhToan) || 0,
        ngayHoachToan: ngayHoachToan ? new Date(ngayHoachToan) : null,
        ngayDenHan: ngayDenHan ? new Date(ngayDenHan) : null,
        soTaiKhoan,
        ghiChu,
        fileDinhKem,
      },
    });

    res.status(201).json({
      success: true,
      data: debt,
      message: 'Tạo công nợ thành công',
    });
  } catch (error: any) {
    console.error('Error creating debt:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo công nợ',
      error: error.message,
    });
  }
};

// Update debt
export const updateDebt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Convert date strings to Date objects
    if (updateData.ngayPhatSinh) {
      updateData.ngayPhatSinh = new Date(updateData.ngayPhatSinh);
    }
    if (updateData.ngayHoachToan) {
      updateData.ngayHoachToan = new Date(updateData.ngayHoachToan);
    }
    if (updateData.ngayDenHan) {
      updateData.ngayDenHan = new Date(updateData.ngayDenHan);
    }
    if (updateData.soTienPhaiTra) {
      updateData.soTienPhaiTra = parseFloat(updateData.soTienPhaiTra);
    }
    if (updateData.soTienDaThanhToan) {
      updateData.soTienDaThanhToan = parseFloat(updateData.soTienDaThanhToan);
    }

    const debt = await prisma.debt.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: debt,
      message: 'Cập nhật công nợ thành công',
    });
  } catch (error: any) {
    console.error('Error updating debt:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật công nợ',
      error: error.message,
    });
  }
};

// Delete debt
export const deleteDebt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.debt.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Xóa công nợ thành công',
    });
  } catch (error: any) {
    console.error('Error deleting debt:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa công nợ',
      error: error.message,
    });
  }
};

// Get debt summary
export const getDebtSummary = async (_req: Request, res: Response): Promise<void> => {
  try {
    const debts = await prisma.debt.findMany();

    const summary = {
      tongPhaiTra: debts.reduce((sum, debt) => sum + debt.soTienPhaiTra, 0),
      daThanhToan: debts.reduce((sum, debt) => sum + debt.soTienDaThanhToan, 0),
      conNo: debts.reduce((sum, debt) => sum + (debt.soTienPhaiTra - debt.soTienDaThanhToan), 0),
      soLuongCongNo: debts.length,
      chuaThanhToan: debts.filter(d => d.soTienDaThanhToan === 0 && d.soTienPhaiTra > 0).length,
      daThanhToanHet: debts.filter(d => d.soTienDaThanhToan >= d.soTienPhaiTra && d.soTienPhaiTra > 0).length,
    };

    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('Error getting debt summary:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy tổng hợp công nợ',
      error: error.message,
    });
  }
};

