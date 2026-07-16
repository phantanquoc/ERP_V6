import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';

class HolidayService {
  async list() {
    return prisma.holiday.findMany({
      orderBy: { date: 'asc' },
    });
  }

  async listByYear(year: number) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);
    return prisma.holiday.findMany({
      where: { date: { gte: startOfYear, lte: endOfYear } },
      orderBy: { date: 'asc' },
    });
  }

  async create(data: { name: string; date: string; note?: string }) {
    if (!data.name || !data.name.trim()) {
      throw new ValidationError('Tên ngày nghỉ không được để trống');
    }
    if (!data.date) {
      throw new ValidationError('Ngày không hợp lệ');
    }
    const parsedDate = new Date(data.date);
    if (isNaN(parsedDate.getTime())) {
      throw new ValidationError('Ngày không hợp lệ');
    }
    return prisma.holiday.create({
      data: {
        name: data.name.trim(),
        date: parsedDate,
        note: data.note,
      },
    });
  }

  async update(id: string, data: { name?: string; date?: string; note?: string }) {
    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy ngày nghỉ');
    }
    const updateData: any = {};
    if (data.name !== undefined) {
      if (!data.name.trim()) throw new ValidationError('Tên ngày nghỉ không được để trống');
      updateData.name = data.name.trim();
    }
    if (data.date !== undefined) {
      const parsedDate = new Date(data.date);
      if (isNaN(parsedDate.getTime())) throw new ValidationError('Ngày không hợp lệ');
      updateData.date = parsedDate;
    }
    if (data.note !== undefined) {
      updateData.note = data.note;
    }
    return prisma.holiday.update({ where: { id }, data: updateData });
  }

  async delete(id: string) {
    const existing = await prisma.holiday.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy ngày nghỉ');
    }
    return prisma.holiday.delete({ where: { id } });
  }
}

export default new HolidayService();
