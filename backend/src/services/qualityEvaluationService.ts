import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { parseLocalDateTimeAsAppTz } from '@utils/productionDay';
import ExcelJS from 'exceljs';

export class QualityEvaluationService {
  async getAllQualityEvaluations(
    page: number = 1,
    limit: number = 10,
    machineSystemId?: string,
    dateRange?: { thoiGianChienFrom?: string; thoiGianChienTo?: string },
  ) {
    const skip = (page - 1) * limit;

    // Filter by machine system
    const whereClause: any = machineSystemId ? { machineSystemId } : {};

    // Filter by thoiGianChien date range (stored as UTC ISO string).
    // Use parseLocalDateTimeAsAppTz to interpret naive datetime strings as APP_TZ,
    // then convert to UTC ISO for lexicographic comparison against stored values.
    // This makes the filter TZ-independent (correct regardless of server's TZ env var).
    if (dateRange?.thoiGianChienFrom || dateRange?.thoiGianChienTo) {
      const thoiGianChienFilter: any = {};
      if (dateRange.thoiGianChienFrom) {
        const d = parseLocalDateTimeAsAppTz(dateRange.thoiGianChienFrom);
        if (!isNaN(d.getTime())) thoiGianChienFilter.gte = d.toISOString();
      }
      if (dateRange.thoiGianChienTo) {
        const d = parseLocalDateTimeAsAppTz(dateRange.thoiGianChienTo);
        if (!isNaN(d.getTime())) thoiGianChienFilter.lt = d.toISOString();
      }
      if (Object.keys(thoiGianChienFilter).length > 0) {
        whereClause.thoiGianChien = thoiGianChienFilter;
      }
    }

    const [data, total] = await Promise.all([
      prisma.qualityEvaluation.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [
          { maChien: 'desc' },
          { machineSystem: { maHeThong: 'asc' } },
        ],
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
          machineSystem: {
            select: {
              id: true,
              tenHeThong: true,
              maHeThong: true,
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
        machineSystem: true,
      },
    });

    if (!evaluation) {
      throw new NotFoundError('Đánh giá chất lượng không tồn tại');
    }

    return evaluation;
  }

  // Whitelist to prevent mass-assignment via ...data spread
  private static readonly ALLOWED_CREATE_FIELDS = new Set([
    'maChien', 'thoiGianChien', 'tenHangHoa', 'mauSac',
    'machineSystemId', 'finishedProductId', 'materialEvaluationId',
    'muiHuong', 'huongVi', 'doNgot', 'doGion',
    'danhGiaTongQuan', 'deXuatDieuChinh', 'fileDinhKem',
    'nguoiThucHien',
    // tiLe fields — explicitly allowed so caller can set them; no silent overwrite
    'aTiLe', 'bTiLe', 'bDauTiLe', 'cTiLe', 'vunLonTiLe', 'vunNhoTiLe', 'phePhamTiLe', 'uotTiLe',
  ]);

  private pickAllowed(data: any, allowed: Set<string>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const k of allowed) if (data[k] !== undefined) out[k] = data[k];
    return out;
  }

  async createQualityEvaluation(data: any, userId?: string) {
    if (!data.maChien || !data.thoiGianChien || !data.tenHangHoa) {
      throw new ValidationError('Thiếu thông tin bắt buộc');
    }

    let nguoiThucHien = data.nguoiThucHien || '';
    if (userId && !data.nguoiThucHien) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        nguoiThucHien = `${user.lastName} ${user.firstName}`.trim();
      }
    }

    const picked = this.pickAllowed(data, QualityEvaluationService.ALLOWED_CREATE_FIELDS);

    const evaluation = await prisma.qualityEvaluation.create({
      data: {
        ...(picked as any),
        nguoiThucHien,
        createdById: userId ?? null,
      } as any,
    });

    return evaluation;
  }

  private static readonly ALLOWED_UPDATE_FIELDS = new Set([
    'mauSac', 'muiHuong', 'huongVi', 'doNgot', 'doGion',
    'danhGiaTongQuan', 'deXuatDieuChinh', 'fileDinhKem',
    'nguoiThucHien', 'tenHangHoa', 'thoiGianChien',
    'machineSystemId', 'finishedProductId', 'materialEvaluationId',
    // tiLe fields — caller must explicitly provide; no silent overwrite from FinishedProduct
    'aTiLe', 'bTiLe', 'bDauTiLe', 'cTiLe', 'vunLonTiLe', 'vunNhoTiLe', 'phePhamTiLe', 'uotTiLe',
  ]);

  async updateQualityEvaluation(id: string, data: any, userId?: string) {
    const existingEvaluation = await prisma.qualityEvaluation.findUnique({
      where: { id },
    });

    if (!existingEvaluation) {
      throw new NotFoundError('Đánh giá chất lượng không tồn tại');
    }

    let nguoiThucHien = data.nguoiThucHien;
    if (userId && !data.nguoiThucHien) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        nguoiThucHien = `${user.lastName} ${user.firstName}`.trim();
      }
    }

    // Whitelist — drop any unexpected keys (prevents mass-assignment)
    const updateData: any = this.pickAllowed(data, QualityEvaluationService.ALLOWED_UPDATE_FIELDS);

    if (nguoiThucHien !== undefined) {
      updateData.nguoiThucHien = nguoiThucHien;
    }

    // Wrap read+write in a transaction to avoid TOCTOU on concurrent updates
    const evaluation = await prisma.$transaction(async (tx) => {
      return tx.qualityEvaluation.update({
        where: { id },
        data: updateData,
      });
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

