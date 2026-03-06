import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import ExcelJS from 'exceljs';

export class QualityEvaluationService {
  async getAllQualityEvaluations(page: number = 1, limit: number = 10, tenMay?: string) {
    const skip = (page - 1) * limit;

    // Filter by machine name directly
    const whereClause = tenMay ? { tenMay } : {};

    const [data, total] = await Promise.all([
      prisma.qualityEvaluation.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          materialEvaluation: {
            select: {
              maChien: true,
              tenHangHoa: true,
              thoiGianChien: true,
            },
          },
          finishedProduct: {
            select: {
              id: true,
              maChien: true,
              tenHangHoa: true,
            },
          },
          machine: {
            select: {
              id: true,
              tenMay: true,
              maMay: true,
            },
          },
        },
      }),
      prisma.qualityEvaluation.count({ where: whereClause }),
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

  async getQualityEvaluationById(id: string) {
    const evaluation = await prisma.qualityEvaluation.findUnique({
      where: { id },
      include: {
        materialEvaluation: true,
        finishedProduct: true,
        machine: true,
      },
    });

    if (!evaluation) {
      throw new NotFoundError('Đánh giá chất lượng không tồn tại');
    }

    return evaluation;
  }

  async createQualityEvaluation(data: any, userId?: string) {
    // Validate required fields
    if (!data.maChien || !data.thoiGianChien || !data.tenHangHoa) {
      throw new ValidationError('Thiếu thông tin bắt buộc');
    }

    // Get user's full name if userId is provided
    let nguoiThucHien = data.nguoiThucHien || '';
    if (userId && !data.nguoiThucHien) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        nguoiThucHien = `${user.firstName} ${user.lastName}`.trim();
      }
    }

    const evaluation = await prisma.qualityEvaluation.create({
      data: {
        ...data,
        nguoiThucHien,
      },
    });

    return evaluation;
  }

  async updateQualityEvaluation(id: string, data: any, userId?: string) {
    const existingEvaluation = await prisma.qualityEvaluation.findUnique({
      where: { id },
      include: {
        finishedProduct: true,
      },
    });

    if (!existingEvaluation) {
      throw new NotFoundError('Đánh giá chất lượng không tồn tại');
    }

    // Get user's full name if userId is provided
    let nguoiThucHien = data.nguoiThucHien;
    if (userId && !data.nguoiThucHien) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        nguoiThucHien = `${user.firstName} ${user.lastName}`.trim();
      }
    }

    // Auto-fill percentage data from finished_product if available
    const updateData: any = { ...data };

    if (existingEvaluation.finishedProduct) {
      updateData.aTiLe = existingEvaluation.finishedProduct.aTiLe;
      updateData.bTiLe = existingEvaluation.finishedProduct.bTiLe;
      updateData.bDauTiLe = existingEvaluation.finishedProduct.bDauTiLe;
      updateData.cTiLe = existingEvaluation.finishedProduct.cTiLe;
      updateData.vunLonTiLe = existingEvaluation.finishedProduct.vunLonTiLe;
      updateData.vunNhoTiLe = existingEvaluation.finishedProduct.vunNhoTiLe;
      updateData.phePhamTiLe = existingEvaluation.finishedProduct.phePhamTiLe;
      updateData.uotTiLe = existingEvaluation.finishedProduct.uotTiLe;
    }

    // Only update nguoiThucHien if it's provided
    if (nguoiThucHien !== undefined) {
      updateData.nguoiThucHien = nguoiThucHien;
    }

    const evaluation = await prisma.qualityEvaluation.update({
      where: { id },
      data: updateData,
    });

    return evaluation;
  }

  async deleteQualityEvaluation(id: string) {
    const existingEvaluation = await prisma.qualityEvaluation.findUnique({
      where: { id },
    });

    if (!existingEvaluation) {
      throw new NotFoundError('Đánh giá chất lượng không tồn tại');
    }

    await prisma.qualityEvaluation.delete({
      where: { id },
    });

    return { message: 'Đã xóa đánh giá chất lượng thành công' };
  }
  async exportToExcel(_filters?: any): Promise<Buffer> {
    const data = await prisma.qualityEvaluation.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách đánh giá chất lượng');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã chiên', key: 'maChien', width: 15 },
      { header: 'Thời gian chiên', key: 'thoiGianChien', width: 20 },
      { header: 'Tên hàng hóa', key: 'tenHangHoa', width: 25 },
      { header: 'Màu sắc', key: 'mauSac', width: 12 },
      { header: 'A (%)', key: 'aTiLe', width: 10 },
      { header: 'B (%)', key: 'bTiLe', width: 10 },
      { header: "B' (%)", key: 'bDauTiLe', width: 10 },
      { header: 'C (%)', key: 'cTiLe', width: 10 },
      { header: 'Vụn lớn (%)', key: 'vunLonTiLe', width: 12 },
      { header: 'Vụn nhỏ (%)', key: 'vunNhoTiLe', width: 12 },
      { header: 'Phế phẩm (%)', key: 'phePhamTiLe', width: 12 },
      { header: 'Ướt (%)', key: 'uotTiLe', width: 10 },
      { header: 'Mùi hương', key: 'muiHuong', width: 15 },
      { header: 'Hương vị', key: 'huongVi', width: 15 },
      { header: 'Độ ngọt', key: 'doNgot', width: 12 },
      { header: 'Độ giòn', key: 'doGion', width: 12 },
      { header: 'Người thực hiện', key: 'nguoiThucHien', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((item, index) => {
      worksheet.addRow({
        stt: index + 1,
        maChien: item.maChien,
        thoiGianChien: item.thoiGianChien ? new Date(item.thoiGianChien).toLocaleString('vi-VN') : '',
        tenHangHoa: item.tenHangHoa,
        mauSac: item.mauSac,
        aTiLe: item.aTiLe,
        bTiLe: item.bTiLe,
        bDauTiLe: item.bDauTiLe,
        cTiLe: item.cTiLe,
        vunLonTiLe: item.vunLonTiLe,
        vunNhoTiLe: item.vunNhoTiLe,
        phePhamTiLe: item.phePhamTiLe,
        uotTiLe: item.uotTiLe,
        muiHuong: item.muiHuong,
        huongVi: item.huongVi,
        doNgot: item.doNgot,
        doGion: item.doGion,
        nguoiThucHien: item.nguoiThucHien,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new QualityEvaluationService();

