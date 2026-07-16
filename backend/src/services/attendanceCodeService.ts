import prisma from '@config/database';
import { ConflictError, NotFoundError } from '@utils/errors';

class AttendanceCodeService {
  async list() {
    return prisma.attendanceCode.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listActive() {
    return prisma.attendanceCode.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(data: { code: string; label: string; description?: string; sortOrder?: number }) {
    const existing = await prisma.attendanceCode.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new ConflictError('Mã chấm công đã tồn tại');
    }
    return prisma.attendanceCode.create({
      data: {
        code: data.code,
        label: data.label,
        description: data.description,
        sortOrder: data.sortOrder ?? 0,
        isActive: true,
      },
    });
  }

  async update(id: string, data: { code?: string; label?: string; description?: string; sortOrder?: number; isActive?: boolean }) {
    const existing = await prisma.attendanceCode.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy mã chấm công');
    }
    if (data.code && data.code !== existing.code) {
      const dup = await prisma.attendanceCode.findUnique({ where: { code: data.code } });
      if (dup) {
        throw new ConflictError('Mã chấm công đã tồn tại');
      }
    }
    return prisma.attendanceCode.update({ where: { id }, data });
  }

  async delete(id: string) {
    const existing = await prisma.attendanceCode.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy mã chấm công');
    }
    return prisma.attendanceCode.delete({ where: { id } });
  }
}

export default new AttendanceCodeService();
