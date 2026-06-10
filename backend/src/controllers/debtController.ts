import { Request, Response, NextFunction } from 'express';
import debtService from '@services/debtService';
import { getFileUrl } from '../middlewares/upload';
import notificationService from '@services/notificationService';
import { NotificationEvent } from '@types';
import ExcelJS from 'exceljs';

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

export const getAllDebts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const debts = await debtService.getAll();
    res.json({ success: true, data: debts });
  } catch (error) {
    next(error);
  }
};

export const getDebtById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const debt = await debtService.getById(req.params.id);
    if (!debt) {
      res.status(404).json({ success: false, message: 'Không tìm thấy công nợ' });
      return;
    }
    res.json({ success: true, data: debt });
  } catch (error) {
    next(error);
  }
};

export const createDebt = async (req: RequestWithFile, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ngayPhatSinh, loaiChiPhi, maNhaCungCap, tenNhaCungCap, loaiCungCap, cungCap, noiDungChiCho, loaiHinh, soTienPhaiTra, soTienDaThanhToan, ngayHoachToan, ngayDenHan, soTaiKhoan, ghiChu } = req.body;

    if (!maNhaCungCap || !tenNhaCungCap || !ngayPhatSinh) {
      res.status(400).json({ success: false, message: 'Mã nhà cung cấp, tên nhà cung cấp và ngày phát sinh là bắt buộc' });
      return;
    }

    let fileDinhKem: string | undefined;
    if (req.file) {
      fileDinhKem = getFileUrl('debts', req.file.filename);
    }

    const debt = await debtService.create({
      ngayPhatSinh, loaiChiPhi, maNhaCungCap, tenNhaCungCap, loaiCungCap, cungCap,
      noiDungChiCho, loaiHinh, soTienPhaiTra: parseFloat(soTienPhaiTra) || 0,
      soTienDaThanhToan: parseFloat(soTienDaThanhToan) || 0,
      ngayHoachToan, ngayDenHan, soTaiKhoan, ghiChu, fileDinhKem,
    });

    res.status(201).json({ success: true, data: debt, message: 'Tạo công nợ thành công' });

    try {
      await notificationService.notify(NotificationEvent.DEBT_CREATED, {
        actorUserId: (req as any).user?.id,
        entityId: debt.id,
        metadata: { tenNhaCungCap, soTienPhaiTra: parseFloat(soTienPhaiTra) || 0 },
      });
    } catch {}
  } catch (error) {
    next(error);
  }
};

export const updateDebt = async (req: RequestWithFile, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.fileDinhKem = getFileUrl('debts', req.file.filename);
    }

    const debt = await debtService.update(req.params.id, updateData);
    res.json({ success: true, data: debt, message: 'Cập nhật công nợ thành công' });
  } catch (error) {
    next(error);
  }
};

export const deleteDebt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await debtService.delete(req.params.id);
    res.json({ success: true, message: 'Xóa công nợ thành công' });
  } catch (error) {
    next(error);
  }
};

export const exportDebtsToExcel = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await debtService.getAll();

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
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

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
  } catch (error) {
    next(error);
  }
};

export const getDebtSummary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const summary = await debtService.getSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};
