import prisma from '@config/database';
import { NotFoundError, ValidationError, ConflictError } from '@utils/errors';
import ExcelJS from 'exceljs';

const WEIGHT_EPSILON = 0.001;

/**
 * Validate that the sum of weights for a position equals 100 (within epsilon).
 * Called inside a transaction so the check reflects the post-write state.
 */
async function validateWeightSum(tx: any, positionId: string): Promise<void> {
  const responsibilities = await tx.positionResponsibility.findMany({
    where: { positionId },
    select: { weight: true },
  });

  const sum = responsibilities.reduce((s: number, r: { weight: number }) => s + r.weight, 0);

  if (Math.abs(sum - 100) > WEIGHT_EPSILON) {
    throw new ValidationError(
      `Tổng trọng số của chức vụ phải bằng 100. Hiện tại: ${sum.toFixed(3)}`
    );
  }
}

export class PositionResponsibilityService {
  async getAllResponsibilities(positionId: string): Promise<any[]> {
    // Verify position exists
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    return await prisma.positionResponsibility.findMany({
      where: { positionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getResponsibilityById(id: string): Promise<any> {
    const responsibility = await prisma.positionResponsibility.findUnique({
      where: { id },
    });

    if (!responsibility) {
      throw new NotFoundError('Responsibility not found');
    }

    return responsibility;
  }

  async createResponsibility(positionId: string, data: any): Promise<any> {
    // Verify position exists
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    return await prisma.$transaction(async (tx) => {
      const created = await tx.positionResponsibility.create({
        data: {
          positionId,
          title: data.title,
          description: data.description,
          weight: data.weight || 0,
        },
      });

      await validateWeightSum(tx, positionId);

      return created;
    });
  }

  async updateResponsibility(id: string, data: any): Promise<any> {
    const responsibility = await prisma.positionResponsibility.findUnique({
      where: { id },
    });

    if (!responsibility) {
      throw new NotFoundError('Responsibility not found');
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.positionResponsibility.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description && { description: data.description }),
          ...(data.weight !== undefined && { weight: data.weight }),
        },
      });

      await validateWeightSum(tx, responsibility.positionId);

      return updated;
    });
  }

  async deleteResponsibility(id: string): Promise<void> {
    const responsibility = await prisma.positionResponsibility.findUnique({
      where: { id },
    });

    if (!responsibility) {
      throw new NotFoundError('Responsibility not found');
    }

    const positionId = responsibility.positionId;

    await prisma.$transaction(async (tx) => {
      await tx.positionResponsibility.delete({ where: { id } });

      // Only enforce weight sum if there are remaining responsibilities
      const remaining = await tx.positionResponsibility.count({ where: { positionId } });
      if (remaining > 0) {
        await validateWeightSum(tx, positionId);
      }
    });
  }

  /**
   * Copy all responsibilities from sourcePositionId into targetPositionId.
   * Fails with ConflictError if target already has any responsibilities.
   * Uses a single transaction and re-validates weight sum post-copy.
   */
  async copyResponsibilitiesFrom(
    targetPositionId: string,
    sourcePositionId: string
  ): Promise<any[]> {
    const [target, source] = await Promise.all([
      prisma.position.findUnique({ where: { id: targetPositionId } }),
      prisma.position.findUnique({ where: { id: sourcePositionId } }),
    ]);

    if (!target) throw new NotFoundError('Chức vụ đích không tồn tại');
    if (!source) throw new NotFoundError('Chức vụ nguồn không tồn tại');

    return await prisma.$transaction(async (tx) => {
      const existingCount = await tx.positionResponsibility.count({
        where: { positionId: targetPositionId },
      });

      if (existingCount > 0) {
        throw new ConflictError(
          'Chức vụ đích đã có tiêu chí đánh giá. Không thể sao chép đè lên dữ liệu hiện có.'
        );
      }

      const sourceItems = await tx.positionResponsibility.findMany({
        where: { positionId: sourcePositionId },
        orderBy: { createdAt: 'asc' },
      });

      if (sourceItems.length === 0) {
        return [];
      }

      const created = await Promise.all(
        sourceItems.map((item: any) =>
          tx.positionResponsibility.create({
            data: {
              positionId: targetPositionId,
              title: item.title,
              description: item.description,
              weight: item.weight,
            },
          })
        )
      );

      // Verify weight sum post-copy (should always be valid since source was valid)
      await validateWeightSum(tx, targetPositionId);

      return created;
    });
  }

  async rescaleResponsibilityWeights(positionId: string): Promise<any[]> {
    const position = await prisma.position.findUnique({ where: { id: positionId } });
    if (!position) throw new NotFoundError('Chức vụ không tồn tại');

    return await prisma.$transaction(async (tx) => {
      const items = await tx.positionResponsibility.findMany({
        where: { positionId },
        orderBy: { createdAt: 'asc' },
      });

      if (items.length === 0) {
        throw new ValidationError('Chức vụ chưa có tiêu chí nào');
      }

      const totalWeight = items.reduce((s: number, r: any) => s + r.weight, 0);
      if (Math.abs(totalWeight - 100) < 0.001) {
        return items; // Already balanced
      }

      // Compute proportional weights rounded to 2 decimal places
      const rescaled = items.map((r: any) => ({
        id: r.id,
        weight: totalWeight > 0
          ? Math.round(r.weight * (100 / totalWeight) * 100) / 100
          : Math.round((100 / items.length) * 100) / 100,
      }));

      // Fix residual on largest-weight item so sum is exactly 100
      const computedSum = rescaled.reduce((s: number, r: any) => s + r.weight, 0);
      const residual = Math.round((100 - computedSum) * 100) / 100;
      if (Math.abs(residual) > 0.0001 && rescaled.length > 0) {
        const largest = rescaled.reduce((max: any, r: any) => (r.weight >= max.weight ? r : max), rescaled[0]);
        largest.weight = Math.round((largest.weight + residual) * 100) / 100;
      }

      // Apply all updates within the transaction
      const updated: any[] = [];
      for (const r of rescaled) {
        const u = await tx.positionResponsibility.update({
          where: { id: r.id },
          data: { weight: r.weight },
        });
        updated.push(u);
      }

      // Verify final sum = 100
      const finalSum = updated.reduce((s: number, r: any) => s + r.weight, 0);
      if (Math.abs(finalSum - 100) > 0.01) {
        throw new ValidationError(`Tổng trọng số sau chuẩn hóa không đúng: ${finalSum.toFixed(3)}`);
      }

      return updated;
    });
  }

  async getResponsibilityUsage(id: string): Promise<any> {
    const responsibility = await prisma.positionResponsibility.findUnique({
      where: { id },
      include: {
        _count: { select: { evaluationDetails: true } },
      },
    });
    if (!responsibility) throw new NotFoundError('Không tìm thấy tiêu chí');
    return { evaluationDetailCount: responsibility._count.evaluationDetails };
  }

  async exportResponsibilities(positionId?: string): Promise<any> {
    const where = positionId ? { positionId } : {};

    const responsibilities = await prisma.positionResponsibility.findMany({
      where,
      include: { position: { select: { code: true, name: true } } },
      orderBy: [{ position: { name: 'asc' } }, { createdAt: 'asc' }],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tiêu chí đánh giá');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã vị trí', key: 'positionCode', width: 15 },
      { header: 'Vị trí', key: 'positionName', width: 25 },
      { header: 'Tiêu chí', key: 'title', width: 35 },
      { header: 'Mô tả', key: 'description', width: 45 },
      { header: 'Trọng số (%)', key: 'weight', width: 15 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    responsibilities.forEach((r, idx) => {
      const row = worksheet.addRow({
        stt: idx + 1,
        positionCode: r.position?.code ?? '',
        positionName: r.position?.name ?? '',
        title: r.title,
        description: r.description ?? '',
        weight: r.weight,
      });
      const weightCell = row.getCell('weight');
      weightCell.numFmt = '0.0"%"';
    });

    return workbook.xlsx.writeBuffer();
  }
}

export default new PositionResponsibilityService();


