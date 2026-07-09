import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import ExcelJS from 'exceljs';

const VALID_POSITION_CATEGORIES = ['PRODUCTION', 'OFFICE', 'MANAGEMENT'] as const;
type PositionCategory = typeof VALID_POSITION_CATEGORIES[number];

function validateCategory(category: unknown): PositionCategory {
  if (!VALID_POSITION_CATEGORIES.includes(category as PositionCategory)) {
    throw new ValidationError(
      `Loại chức vụ không hợp lệ. Phải là một trong: ${VALID_POSITION_CATEGORIES.join(', ')}`
    );
  }
  return category as PositionCategory;
}

export class PositionService {
  async getAllPositions(): Promise<any[]> {
    return await prisma.position.findMany({
      include: {
        employees: {
          select: {
            id: true,
            employeeCode: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        responsibilities: {
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { levels: true, responsibilities: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getPositionById(id: string): Promise<any> {
    const position = await prisma.position.findUnique({
      where: { id },
      include: {
        employees: true,
        responsibilities: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    return position;
  }

  async createPosition(data: any): Promise<any> {
    if (data.category !== undefined) {
      validateCategory(data.category);
    }

    return await prisma.position.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        ...(data.category !== undefined && { category: data.category as PositionCategory }),
      },
    });
  }

  async updatePosition(id: string, data: any): Promise<any> {
    const position = await prisma.position.findUnique({ where: { id } });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    if (data.category !== undefined) {
      validateCategory(data.category);
    }

    return await prisma.position.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.category !== undefined && { category: data.category as PositionCategory }),
      },
    });
  }

  async deletePosition(id: string): Promise<void> {
    const position = await prisma.position.findUnique({ where: { id } });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    await prisma.position.delete({ where: { id } });
  }

  async bulkUpdateCategory(positionIds: string[], category: string): Promise<number> {
    validateCategory(category);
    const result = await prisma.position.updateMany({
      where: { id: { in: positionIds } },
      data: { category: category as PositionCategory },
    });
    return result.count;
  }

  async getPositionUsage(id: string): Promise<any> {
    const position = await prisma.position.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true,
            levels: true,
            responsibilities: true,
          },
        },
      },
    });
    if (!position) throw new NotFoundError('Không tìm thấy vị trí');
    return {
      employeeCount: position._count.employees,
      levelCount: position._count.levels,
      responsibilityCount: position._count.responsibilities,
    };
  }

  async exportPositions(): Promise<any> {
    const positions = await prisma.position.findMany({
      include: {
        _count: { select: { employees: true, levels: true, responsibilities: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Vị trí công việc');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã', key: 'code', width: 15 },
      { header: 'Tên vị trí', key: 'name', width: 30 },
      { header: 'Loại', key: 'category', width: 15 },
      { header: 'Mô tả', key: 'description', width: 40 },
      { header: 'Số NV', key: 'employeeCount', width: 12 },
      { header: 'Số tiêu chí', key: 'responsibilityCount', width: 15 },
      { header: 'Số bậc lương', key: 'levelCount', width: 15 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    const categoryLabel: Record<string, string> = {
      PRODUCTION: 'Sản xuất',
      OFFICE: 'Văn phòng',
      MANAGEMENT: 'Quản lý',
    };

    positions.forEach((pos, idx) => {
      worksheet.addRow({
        stt: idx + 1,
        code: pos.code,
        name: pos.name,
        category: categoryLabel[pos.category ?? ''] ?? (pos.category ?? ''),
        description: pos.description ?? '',
        employeeCount: pos._count.employees,
        responsibilityCount: pos._count.responsibilities,
        levelCount: pos._count.levels,
      });
    });

    return workbook.xlsx.writeBuffer();
  }
}

export default new PositionService();

