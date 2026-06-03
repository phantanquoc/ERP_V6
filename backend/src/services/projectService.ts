import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, AuthorizationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import ExcelJS from 'exceljs';

interface CreateProjectData {
  tenDuAn: string;
  moTa?: string;
  ngayBatDau: Date;
  ngayKetThuc?: Date;
  trangThai?: string;
  nguoiTaoId: string;
  fileDinhKem?: string;
  memberIds?: string[];
}

interface UpdateProjectData {
  tenDuAn?: string;
  moTa?: string;
  ngayBatDau?: Date;
  ngayKetThuc?: Date;
  trangThai?: string;
  fileDinhKem?: string;
}

interface CreateTaskData {
  tieuDe: string;
  moTa?: string;
  nguoiPhuTrach?: string;
  deadline?: Date;
  trangThai?: string;
  thuTu?: number;
}

class ProjectService {
  async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.project.findFirst({
      where: { maDuAn: yearlyCodeWhere('DA', year) },
      orderBy: { maDuAn: 'desc' },
      select: { maDuAn: true },
    });
    return nextYearlyCode(last?.maDuAn ?? null, 'DA', year);
  }

  async getAll(page = 1, limit = 10, search?: string, trangThai?: string, userId?: string, role?: string) {
    const { skip, limit: lim } = getPaginationParams(page, limit);
    const where: Record<string, unknown> = {};

    if (trangThai) where.trangThai = trangThai;
    if (search) {
      where.OR = [
        { maDuAn: { contains: search, mode: 'insensitive' } },
        { tenDuAn: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Non-admins only see projects they created or are a member of
    if (role !== 'ADMIN' && userId) {
      where.OR = [
        ...(Array.isArray(where.OR) ? where.OR : []),
        { nguoiTaoId: userId },
        { members: { some: { userId } } },
      ] as unknown[];
    }

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: lim,
        orderBy: { createdAt: 'desc' },
        include: {
          members: true,
          tasks: { orderBy: { thuTu: 'asc' } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return { data, pagination: { page, limit: lim, total, totalPages: Math.ceil(total / lim) } };
  }

  async getById(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: { members: true, tasks: { orderBy: { thuTu: 'asc' } } },
    });
    if (!project) throw new NotFoundError('Không tìm thấy dự án');
    return project;
  }

  async create(data: CreateProjectData) {
    const maDuAn = await this.generateCode();
    return prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          maDuAn,
          tenDuAn: data.tenDuAn,
          moTa: data.moTa,
          ngayBatDau: data.ngayBatDau,
          ngayKetThuc: data.ngayKetThuc,
          trangThai: data.trangThai ?? 'Lên kế hoạch',
          nguoiTaoId: data.nguoiTaoId,
          fileDinhKem: data.fileDinhKem,
        },
      });

      // Add creator as manager
      await tx.projectMember.create({
        data: { projectId: project.id, userId: data.nguoiTaoId, vaiTro: 'Quản lý' },
      });

      // Add additional members
      if (data.memberIds && data.memberIds.length > 0) {
        const extraMembers = data.memberIds
          .filter((uid) => uid !== data.nguoiTaoId)
          .map((uid) => ({ projectId: project.id, userId: uid, vaiTro: 'Thành viên' }));
        if (extraMembers.length > 0) {
          await tx.projectMember.createMany({ data: extraMembers });
        }
      }

      return tx.project.findUnique({
        where: { id: project.id },
        include: { members: true, tasks: { orderBy: { thuTu: 'asc' } } },
      });
    });
  }

  async update(id: string, data: UpdateProjectData, userId: string, role: string) {
    const project = await this.getById(id);
    if (role !== 'ADMIN' && project.nguoiTaoId !== userId) {
      throw new AuthorizationError('Bạn không có quyền chỉnh sửa dự án này');
    }
    return prisma.project.update({
      where: { id },
      data,
      include: { members: true, tasks: { orderBy: { thuTu: 'asc' } } },
    });
  }

  async delete(id: string, userId: string, role: string) {
    const project = await this.getById(id);
    if (role !== 'ADMIN' && project.nguoiTaoId !== userId) {
      throw new AuthorizationError('Bạn không có quyền xóa dự án này');
    }
    return prisma.project.delete({ where: { id } });
  }

  // ── Members ──────────────────────────────────────────────────────────────
  async addMember(projectId: string, userId: string, vaiTro: string, actorId: string, role: string) {
    const project = await this.getById(projectId);
    if (role !== 'ADMIN' && project.nguoiTaoId !== actorId) {
      throw new AuthorizationError('Chỉ người tạo dự án mới có thể thêm thành viên');
    }
    return prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, vaiTro },
      update: { vaiTro },
    });
  }

  async removeMember(projectId: string, userId: string, actorId: string, role: string) {
    const project = await this.getById(projectId);
    if (role !== 'ADMIN' && project.nguoiTaoId !== actorId) {
      throw new AuthorizationError('Chỉ người tạo dự án mới có thể xóa thành viên');
    }
    if (project.nguoiTaoId === userId) {
      throw new AuthorizationError('Không thể xóa người tạo dự án khỏi thành viên');
    }
    return prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  async addTask(projectId: string, data: CreateTaskData) {
    await this.getById(projectId);
    return prisma.projectTask.create({
      data: {
        projectId,
        tieuDe: data.tieuDe,
        moTa: data.moTa,
        nguoiPhuTrach: data.nguoiPhuTrach,
        deadline: data.deadline,
        trangThai: data.trangThai ?? 'Chưa bắt đầu',
        thuTu: data.thuTu ?? 0,
      },
    });
  }

  async updateTask(
    projectId: string,
    taskId: string,
    data: Partial<CreateTaskData>,
    actorId: string,
    _role: string,
  ) {
    const oldTask = await prisma.projectTask.findUnique({ where: { id: taskId } });
    if (!oldTask || oldTask.projectId !== projectId) throw new NotFoundError('Không tìm thấy công việc');

    const task = await prisma.projectTask.update({ where: { id: taskId }, data });

    // Notify when trangThai changes
    if (data.trangThai && data.trangThai !== oldTask.trangThai) {
      try {
        const project = await prisma.project.findUnique({ where: { id: projectId }, select: { nguoiTaoId: true, tenDuAn: true } });
        if (project && project.nguoiTaoId !== actorId) {
          const ownerEmployee = await prisma.employee.findFirst({
            where: { userId: project.nguoiTaoId },
            select: { id: true },
          });
          if (ownerEmployee) {
            await prisma.notification.create({
              data: {
                employeeId: ownerEmployee.id,
                title: 'Cập nhật công việc',
                message: `Công việc "${oldTask.tieuDe}" trong dự án "${project.tenDuAn}" đã chuyển sang trạng thái "${data.trangThai}"`,
                type: 'PROJECT_TASK',
              },
            });
          }
        }
      } catch (_e) {
        // Notification failure must not break the main operation
      }
    }

    return task;
  }

  async deleteTask(projectId: string, taskId: string) {
    const task = await prisma.projectTask.findUnique({ where: { id: taskId } });
    if (!task || task.projectId !== projectId) throw new NotFoundError('Không tìm thấy công việc');
    return prisma.projectTask.delete({ where: { id: taskId } });
  }

  async exportToExcel(filters?: { search?: string; trangThai?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.trangThai) where.trangThai = filters.trangThai;
    if (filters?.search) {
      where.OR = [
        { maDuAn: { contains: filters.search, mode: 'insensitive' } },
        { tenDuAn: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const data = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { tasks: true, members: true } } },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách dự án');

    sheet.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã dự án', key: 'maDuAn', width: 15 },
      { header: 'Tên dự án', key: 'tenDuAn', width: 35 },
      { header: 'Trạng thái', key: 'trangThai', width: 18 },
      { header: 'Ngày bắt đầu', key: 'ngayBatDau', width: 15 },
      { header: 'Ngày kết thúc', key: 'ngayKetThuc', width: 15 },
      { header: 'Số thành viên', key: 'soThanhVien', width: 14 },
      { header: 'Số công việc', key: 'soCongViec', width: 14 },
    ];

    data.forEach((item: (typeof data)[0], idx: number) => {
      sheet.addRow({
        stt: idx + 1,
        maDuAn: item.maDuAn,
        tenDuAn: item.tenDuAn,
        trangThai: item.trangThai,
        ngayBatDau: item.ngayBatDau.toLocaleDateString('vi-VN'),
        ngayKetThuc: item.ngayKetThuc ? item.ngayKetThuc.toLocaleDateString('vi-VN') : '',
        soThanhVien: item._count.members,
        soCongViec: item._count.tasks,
      });
    });

    return workbook;
  }
}

export default new ProjectService();
