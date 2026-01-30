import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';

export class MaterialEvaluationService {
  async getAllMaterialEvaluations(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.materialEvaluation.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.materialEvaluation.count(),
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

  async getMaterialEvaluationById(id: string) {
    const evaluation = await prisma.materialEvaluation.findUnique({
      where: { id },
      include: {
        systemOperations: true,
      },
    });

    if (!evaluation) {
      throw new NotFoundError('Material evaluation not found');
    }

    return evaluation;
  }

  async getMaterialEvaluationByMaChien(maChien: string) {
    const evaluation = await prisma.materialEvaluation.findUnique({
      where: { maChien },
      include: {
        systemOperations: true,
      },
    });

    if (!evaluation) {
      throw new NotFoundError('Material evaluation not found');
    }

    return evaluation;
  }

  async generateMaChien(): Promise<string> {
    const lastEvaluation = await prisma.materialEvaluation.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!lastEvaluation) {
      return 'C001';
    }

    const lastNumber = parseInt(lastEvaluation.maChien.substring(1));
    const newNumber = lastNumber + 1;
    return `C${newNumber.toString().padStart(3, '0')}`;
  }

  async createMaterialEvaluation(data: any) {
    // Validate maChien uniqueness
    const existing = await prisma.materialEvaluation.findUnique({
      where: { maChien: data.maChien },
    });

    if (existing) {
      throw new ValidationError('Mã chiên đã tồn tại');
    }

    // Parse datetime from frontend
    // Frontend sends ISO string: "2026-01-17T03:30:00.000Z"
    // This ensures consistent timezone handling
    let thoiGianChien: Date;
    if (data.thoiGianChien) {
      thoiGianChien = new Date(data.thoiGianChien);
    } else {
      thoiGianChien = new Date();
    }

    const evaluation = await prisma.materialEvaluation.create({
      data: {
        maChien: data.maChien,
        thoiGianChien,
        tenHangHoa: data.tenHangHoa,
        soLoKien: data.soLoKien,
        khoiLuong: parseFloat(data.khoiLuong),
        soLanNgam: parseInt(data.soLanNgam),
        nhietDoNuocTruocNgam: parseFloat(data.nhietDoNuocTruocNgam),
        nhietDoNuocSauVot: parseFloat(data.nhietDoNuocSauVot),
        thoiGianNgam: parseInt(data.thoiGianNgam),
        brixNuocNgam: parseFloat(data.brixNuocNgam),
        danhGiaTruocNgam: data.danhGiaTruocNgam,
        danhGiaSauNgam: data.danhGiaSauNgam,
        fileDinhKem: data.fileDinhKem,
        nguoiThucHien: data.nguoiThucHien,
      },
    });

    return evaluation;
  }

  async updateMaterialEvaluation(id: string, data: any) {
    const existing = await prisma.materialEvaluation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Material evaluation not found');
    }

    // Parse datetime from frontend
    // Frontend sends ISO string: "2026-01-17T03:30:00.000Z"
    let thoiGianChien: Date | undefined;
    if (data.thoiGianChien) {
      thoiGianChien = new Date(data.thoiGianChien);
    }

    const evaluation = await prisma.materialEvaluation.update({
      where: { id },
      data: {
        thoiGianChien,
        tenHangHoa: data.tenHangHoa,
        soLoKien: data.soLoKien,
        khoiLuong: data.khoiLuong ? parseFloat(data.khoiLuong) : undefined,
        soLanNgam: data.soLanNgam ? parseInt(data.soLanNgam) : undefined,
        nhietDoNuocTruocNgam: data.nhietDoNuocTruocNgam ? parseFloat(data.nhietDoNuocTruocNgam) : undefined,
        nhietDoNuocSauVot: data.nhietDoNuocSauVot ? parseFloat(data.nhietDoNuocSauVot) : undefined,
        thoiGianNgam: data.thoiGianNgam ? parseInt(data.thoiGianNgam) : undefined,
        brixNuocNgam: data.brixNuocNgam ? parseFloat(data.brixNuocNgam) : undefined,
        danhGiaTruocNgam: data.danhGiaTruocNgam,
        danhGiaSauNgam: data.danhGiaSauNgam,
        fileDinhKem: data.fileDinhKem,
        nguoiThucHien: data.nguoiThucHien,
      },
    });

    return evaluation;
  }

  async deleteMaterialEvaluation(id: string) {
    const existing = await prisma.materialEvaluation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Material evaluation not found');
    }

    await prisma.materialEvaluation.delete({
      where: { id },
    });
  }
}

export default new MaterialEvaluationService();

