import { Request, Response } from 'express';
import prisma from '@config/database';
import { getFileUrl } from '../middlewares/upload';
import ExcelJS from 'exceljs';
import logger from '@config/logger';

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

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
    logger.error('Error fetching debts:', error);
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
    const id = req.params.id as string;

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
    logger.error('Error fetching debt:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin công nợ',
      error: error.message,
    });
  }
};

// Create debt
export const createDebt = async (req: RequestWithFile, res: Response): Promise<void> => {
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
    } = req.body;

    if (!maNhaCungCap || !tenNhaCungCap || !ngayPhatSinh) {
      res.status(400).json({
        success: false,
        message: 'Mã nhà cung cấp, tên nhà cung cấp và ngày phát sinh là bắt buộc',
      });
      return;
    }

    // Handle file upload
    let fileDinhKem: string | undefined;
    if (req.file) {
      fileDinhKem = getFileUrl('debts', req.file.filename);
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
    logger.error('Error creating debt:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo công nợ',
      error: error.message,
    });
  }
};

// Update debt
export const updateDebt = async (req: RequestWithFile, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updateData = req.body;

    // Handle file upload
    if (req.file) {
      updateData.fileDinhKem = getFileUrl('debts', req.file.filename);
    }

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
    logger.error('Error updating debt:', error);
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
    const id = req.params.id as string;

    await prisma.debt.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Xóa công nợ thành công',
    });
  } catch (error: any) {
    logger.error('Error deleting debt:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa công nợ',
      error: error.message,
    });
  }
};

// Export debts to Excel
export const exportDebtsToExcel = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await prisma.debt.findMany({
      orderBy: { ngayPhatSinh: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Quản lý công nợ');

    worksheet.columns = [
      { header: 'Ngày phát sinh', key: 'ngayPhatSinh', width: 18 },
      { header: 'Loại chi phí', key: 'loaiChiPhi', width: 18 },
      { header: 'Mã NCC', key: 'maNhaCungCap', width: 15 },
      { header: 'Tên nhà cung cấp', key: 'tenNhaCungCap', width: 25 },
      { header: 'Loại cung cấp', key: 'loaiCungCap', width: 18 },
      { header: 'Cung cấp', key: 'cungCap', width: 20 },
      { header: 'Nội dung chi cho', key: 'noiDungChiCho', width: 25 },
      { header: 'Loại hình', key: 'loaiHinh', width: 15 },
      { header: 'Số tiền phải trả', key: 'soTienPhaiTra', width: 20 },
      { header: 'Số tiền đã thanh toán', key: 'soTienDaThanhToan', width: 22 },
      { header: 'Còn nợ', key: 'conNo', width: 20 },
      { header: 'Ngày hoạch toán', key: 'ngayHoachToan', width: 18 },
      { header: 'Ngày đến hạn', key: 'ngayDenHan', width: 18 },
      { header: 'Số tài khoản', key: 'soTaiKhoan', width: 18 },
      { header: 'Ghi chú', key: 'ghiChu', width: 30 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((item) => {
      worksheet.addRow({
        ngayPhatSinh: new Date(item.ngayPhatSinh).toLocaleDateString('vi-VN'),
        loaiChiPhi: item.loaiChiPhi || '',
        maNhaCungCap: item.maNhaCungCap,
        tenNhaCungCap: item.tenNhaCungCap,
        loaiCungCap: item.loaiCungCap || '',
        cungCap: item.cungCap || '',
        noiDungChiCho: item.noiDungChiCho || '',
        loaiHinh: item.loaiHinh || '',
        soTienPhaiTra: item.soTienPhaiTra,
        soTienDaThanhToan: item.soTienDaThanhToan,
        conNo: item.soTienPhaiTra - item.soTienDaThanhToan,
        ngayHoachToan: item.ngayHoachToan ? new Date(item.ngayHoachToan).toLocaleDateString('vi-VN') : '',
        ngayDenHan: item.ngayDenHan ? new Date(item.ngayDenHan).toLocaleDateString('vi-VN') : '',
        soTaiKhoan: item.soTaiKhoan || '',
        ghiChu: item.ghiChu || '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=cong-no-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error: any) {
    logger.error('Error exporting debts to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xuất công nợ ra Excel',
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
    logger.error('Error getting debt summary:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy tổng hợp công nợ',
      error: error.message,
    });
  }
};

