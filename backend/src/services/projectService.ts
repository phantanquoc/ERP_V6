import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, AuthorizationError, ConflictError, ValidationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import { NotificationEvent } from '@types';
import notificationService from '@services/notificationService';
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

interface CreateProjectUpdateData {
  ngay: Date;
  tieuDe: string;
  noiDung: string;
  tienDoHienTai: number;
  fileDinhKem?: string;
  nguoiCapNhat: string;
  nguoiCapNhatId: string;
  projectPhaseId?: string | null;
}

type UpdateProjectUpdateData = Partial<CreateProjectUpdateData>;

interface CreateProjectCostData {
  projectPhaseId?: string | null;
  projectTaskId?: string | null;
  loaiChiPhi: string;
  tenChiPhi?: string;
  donVi?: string;
  soLuongKeHoach?: number;
  giaKeHoach?: number;
  thanhTienKeHoach?: number;
  soLuongThucTe?: number;
  giaThucTe?: number;
  thanhTienThucTe?: number;
}

type UpdateProjectCostData = Partial<CreateProjectCostData>;

const COST_CATEGORIES = new Set(['Nhân công', 'Vật tư', 'Phụ liệu', 'Khác']);

interface CreateTaskData {
  tieuDe: string;
  moTa?: string;
  nguoiPhuTrach?: string;
  projectPhaseId?: string | null;
  tienDo?: number;
  ngayBatDau?: Date;
  ngayKetThuc?: Date;
  ngayBatDauThucTe?: Date;
  ngayHoanThanhThucTe?: Date;
  deadline?: Date;
  trangThai?: string;
  thuTu?: number;
  mucDoUuTien?: 'KHAN_CAP' | 'CAO' | 'TRUNG_BINH' | 'THAP' | null;
  laMilestone?: boolean;
  laPhatSinh?: boolean;
  ghiChu?: string;
}

interface CreateProjectPhaseData {
  tenGiaiDoan: string;
  moTa?: string;
  chuSoHuuId?: string;
  chuSoHuu?: string;
  nguoiPhuTrachId?: string;
  nguoiPhuTrach?: string;
  tienDo?: number;
  trangThai?: string;
  thuTu?: number;
  ngayBatDau?: Date;
  ngayKetThuc?: Date;
  nganSach?: number;
}

type UpdateProjectPhaseData = Partial<CreateProjectPhaseData>;

const PROJECT_PHASE_STATUSES = new Set(['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng']);
const PROJECT_TASK_STATUSES = new Set(['Chưa bắt đầu', 'Đang làm', 'Hoàn thành', 'Trễ']);

const projectInclude = {
  members: true,
  phases: {
    orderBy: { thuTu: 'asc' as const },
    include: { tasks: { orderBy: { thuTu: 'asc' as const }, include: { costs: { orderBy: { createdAt: 'asc' as const } } } } },
  },
  tasks: { orderBy: { thuTu: 'asc' as const }, include: { costs: { orderBy: { createdAt: 'asc' as const } } } },
  updates: { orderBy: { ngay: 'desc' as const } },
  costs: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.ProjectInclude;

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

    // Access control: non-admins only see projects they created or are a member of
    if (role !== 'ADMIN' && userId) {
      where.OR = [
        { nguoiTaoId: userId },
        { members: { some: { userId } } },
      ];
    }

    // Search filter: use AND to combine with access control
    if (search) {
      where.AND = [
        {
          OR: [
            { maDuAn: { contains: search, mode: 'insensitive' } },
            { tenDuAn: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: lim,
        orderBy: { createdAt: 'desc' },
        include: {
          members: true,
          phases: { orderBy: { thuTu: 'asc' } },
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
      include: projectInclude,
    });
    if (!project) throw new NotFoundError('Không tìm thấy dự án');

    const phasesWithAutoProgress = project.phases.map((phase) => {
      const tasks = phase.tasks ?? [];
      if (tasks.length === 0) return phase;
      const done = tasks.filter((t) => t.trangThai === 'Hoàn thành').length;
      return { ...phase, tienDo: Math.round((done / tasks.length) * 100) };
    });

    // Weighted progress: phases with more tasks count proportionally more
    const totalTaskCount = project.phases.reduce((sum, p) => sum + (p.tasks?.length ?? 0), 0);
    const tienDoTongThe = totalTaskCount === 0
      ? 0
      : Math.round(
          phasesWithAutoProgress.reduce((sum, p, i) => {
            const taskCount = project.phases[i].tasks?.length ?? 0;
            return sum + p.tienDo * taskCount;
          }, 0) / totalTaskCount
        );

    return {
      ...project,
      phases: phasesWithAutoProgress,
      tienDoTongThe,
      unphasedTasks: project.tasks.filter((task) => !task.projectPhaseId),
    };
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
        include: projectInclude,
      });
    });
  }

  async update(id: string, data: UpdateProjectData, userId: string, role: string) {
    const project = await this.getById(id);
    if (role !== 'ADMIN' && project.nguoiTaoId !== userId) {
      throw new AuthorizationError('Bạn không có quyền chỉnh sửa dự án này');
    }
    if (data.trangThai && data.trangThai !== project.trangThai) {
      if (role !== 'ADMIN' && project.nguoiTaoId !== userId) {
        throw new AuthorizationError('Chỉ admin hoặc người tạo mới được chuyển trạng thái dự án');
      }
      if (data.trangThai === 'Đang thực hiện' && (project.trangThai === 'Lên kế hoạch' || project.trangThai === 'Chờ duyệt')) {
        throw new ValidationError('Phải qua quy trình duyệt để chuyển sang Đang thực hiện');
      }
    }
    return prisma.project.update({
      where: { id },
      data,
      include: projectInclude,
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
  private validateProgress(value?: number): void {
    if (value === undefined) return;
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      throw new ValidationError('Tiến độ phải nằm trong khoảng 0 đến 100');
    }
  }

  private validatePhaseStatus(value?: string): void {
    if (value && !PROJECT_PHASE_STATUSES.has(value)) {
      throw new ValidationError('Trạng thái giai đoạn không hợp lệ');
    }
  }

  private validateTaskStatus(value?: string): void {
    if (value && !PROJECT_TASK_STATUSES.has(value)) {
      throw new ValidationError('Trạng thái công việc không hợp lệ');
    }
  }

  private async validatePhaseBelongsToProject(projectId: string, projectPhaseId?: string | null) {
    if (!projectPhaseId) return;
    const phase = await prisma.projectPhase.findUnique({ where: { id: projectPhaseId } });
    if (!phase || phase.projectId !== projectId) {
      throw new ValidationError('Giai đoạn không thuộc dự án đã chọn');
    }
  }

  async addTask(projectId: string, data: CreateTaskData) {
    await this.getById(projectId);
    this.validateProgress(data.tienDo);
    this.validateTaskStatus(data.trangThai);
    await this.validatePhaseBelongsToProject(projectId, data.projectPhaseId);

    if (data.ngayBatDau && data.ngayKetThuc) {
      if (new Date(data.ngayKetThuc) < new Date(data.ngayBatDau)) {
        throw new ValidationError('Ngày kết thúc phải sau ngày bắt đầu');
      }
    }
    if (data.ngayBatDau && data.deadline) {
      if (new Date(data.deadline) < new Date(data.ngayBatDau)) {
        throw new ValidationError('Deadline phải sau ngày bắt đầu');
      }
    }

    return prisma.projectTask.create({
      data: {
        projectId,
        projectPhaseId: data.projectPhaseId ?? null,
        tieuDe: data.tieuDe,
        moTa: data.moTa,
        nguoiPhuTrach: data.nguoiPhuTrach,
        tienDo: data.tienDo ?? 0,
        ngayBatDau: data.ngayBatDau,
        ngayKetThuc: data.ngayKetThuc,
        ngayBatDauThucTe: data.ngayBatDauThucTe,
        ngayHoanThanhThucTe: data.ngayHoanThanhThucTe,
        deadline: data.deadline,
        trangThai: data.trangThai ?? 'Chưa bắt đầu',
        thuTu: data.thuTu ?? 0,
        mucDoUuTien: data.mucDoUuTien ?? null,
        laMilestone: data.laMilestone ?? false,
        laPhatSinh: data.laPhatSinh ?? false,
        ghiChu: data.ghiChu,
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
    this.validateProgress(data.tienDo);
    this.validateTaskStatus(data.trangThai);
    if (data.projectPhaseId !== undefined) {
      await this.validatePhaseBelongsToProject(projectId, data.projectPhaseId);
    }

    const effectiveStart = data.ngayBatDau ?? oldTask.ngayBatDau;
    const effectiveEnd = data.ngayKetThuc ?? oldTask.ngayKetThuc;
    const effectiveDeadline = data.deadline ?? oldTask.deadline;
    if (effectiveStart && effectiveEnd) {
      if (new Date(effectiveEnd) < new Date(effectiveStart)) {
        throw new ValidationError('Ngày kết thúc phải sau ngày bắt đầu');
      }
    }
    if (effectiveStart && effectiveDeadline) {
      if (new Date(effectiveDeadline) < new Date(effectiveStart)) {
        throw new ValidationError('Deadline phải sau ngày bắt đầu');
      }
    }

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

  async reorderTasks(projectId: string, taskIds: string[], phaseId?: string | null) {
    await this.getById(projectId);
    const tasks = await prisma.projectTask.findMany({
      where: { projectId, projectPhaseId: phaseId ?? null },
      select: { id: true },
    });
    const existingIds = new Set(tasks.map((t) => t.id));
    if (taskIds.length !== tasks.length || taskIds.some((id) => !existingIds.has(id))) {
      throw new ValidationError('Danh sách công việc sắp xếp không hợp lệ');
    }

    await prisma.$transaction(
      taskIds.map((id, index) => prisma.projectTask.update({
        where: { id },
        data: { thuTu: index },
      })),
    );

    return prisma.projectTask.findMany({
      where: { projectId, projectPhaseId: phaseId ?? null },
      orderBy: { thuTu: 'asc' },
    });
  }

  // ── Phases ────────────────────────────────────────────────────────────────
  async addPhase(projectId: string, data: CreateProjectPhaseData) {
    await this.getById(projectId);
    this.validateProgress(data.tienDo);
    this.validatePhaseStatus(data.trangThai);

    if (data.ngayBatDau && data.ngayKetThuc) {
      if (new Date(data.ngayKetThuc) < new Date(data.ngayBatDau)) {
        throw new ValidationError('Ngày kết thúc phải sau ngày bắt đầu');
      }
    }

    const nextOrder = data.thuTu ?? await prisma.projectPhase.count({ where: { projectId } });

    return prisma.projectPhase.create({
      data: {
        projectId,
        tenGiaiDoan: data.tenGiaiDoan,
        moTa: data.moTa,
        chuSoHuuId: data.chuSoHuuId,
        chuSoHuu: data.chuSoHuu,
        nguoiPhuTrachId: data.nguoiPhuTrachId,
        nguoiPhuTrach: data.nguoiPhuTrach,
        tienDo: data.tienDo ?? 0,
        trangThai: data.trangThai ?? 'Chưa bắt đầu',
        thuTu: nextOrder,
        ngayBatDau: data.ngayBatDau,
        ngayKetThuc: data.ngayKetThuc,
        nganSach: data.nganSach,
      },
      include: { tasks: { orderBy: { thuTu: 'asc' } } },
    });
  }

  async updatePhase(projectId: string, phaseId: string, data: UpdateProjectPhaseData) {
    const phase = await prisma.projectPhase.findUnique({ where: { id: phaseId } });
    if (!phase || phase.projectId !== projectId) throw new NotFoundError('Không tìm thấy giai đoạn');
    this.validateProgress(data.tienDo);
    this.validatePhaseStatus(data.trangThai);

    const effectiveStart = data.ngayBatDau ?? phase.ngayBatDau;
    const effectiveEnd = data.ngayKetThuc ?? phase.ngayKetThuc;
    if (effectiveStart && effectiveEnd) {
      if (new Date(effectiveEnd) < new Date(effectiveStart)) {
        throw new ValidationError('Ngày kết thúc phải sau ngày bắt đầu');
      }
    }

    return prisma.projectPhase.update({
      where: { id: phaseId },
      data,
      include: { tasks: { orderBy: { thuTu: 'asc' } } },
    });
  }

  async deletePhase(projectId: string, phaseId: string, moveTasksToUnphased = false) {
    const phase = await prisma.projectPhase.findUnique({
      where: { id: phaseId },
      include: { _count: { select: { tasks: true } } },
    });
    if (!phase || phase.projectId !== projectId) throw new NotFoundError('Không tìm thấy giai đoạn');
    if (phase._count.tasks > 0 && !moveTasksToUnphased) {
      throw new ConflictError('Giai đoạn còn công việc, cần chuyển công việc ra ngoài giai đoạn trước khi xóa');
    }

    return prisma.$transaction(async (tx) => {
      if (moveTasksToUnphased) {
        await tx.projectTask.updateMany({
          where: { projectId, projectPhaseId: phaseId },
          data: { projectPhaseId: null },
        });
      }
      return tx.projectPhase.delete({ where: { id: phaseId } });
    });
  }

  async reorderPhases(projectId: string, phaseIds: string[]) {
    await this.getById(projectId);
    const phases = await prisma.projectPhase.findMany({
      where: { projectId },
      select: { id: true },
    });
    const existingIds = new Set(phases.map((phase) => phase.id));
    if (phaseIds.length !== phases.length || phaseIds.some((id) => !existingIds.has(id))) {
      throw new ValidationError('Danh sách giai đoạn sắp xếp không hợp lệ');
    }

    await prisma.$transaction(
      phaseIds.map((id, index) => prisma.projectPhase.update({
        where: { id },
        data: { thuTu: index },
      })),
    );

    return prisma.projectPhase.findMany({
      where: { projectId },
      orderBy: { thuTu: 'asc' },
      include: { tasks: { orderBy: { thuTu: 'asc' } } },
    });
  }

  // ── Updates ───────────────────────────────────────────────────────────────
  async getUpdates(projectId: string) {
    await this.getById(projectId);
    return prisma.projectUpdate.findMany({
      where: { projectId },
      orderBy: { ngay: 'desc' },
    });
  }

  async addUpdate(projectId: string, data: CreateProjectUpdateData) {
    await this.getById(projectId);
    if (data.projectPhaseId) {
      await this.validatePhaseBelongsToProject(projectId, data.projectPhaseId);
    }
    if (!Number.isInteger(data.tienDoHienTai) || data.tienDoHienTai < 0 || data.tienDoHienTai > 100) {
      throw new ValidationError('Tiến độ phải nằm trong khoảng 0 đến 100');
    }
    return prisma.projectUpdate.create({
      data: {
        projectId,
        projectPhaseId: data.projectPhaseId ?? null,
        ngay: data.ngay,
        tieuDe: data.tieuDe,
        noiDung: data.noiDung,
        tienDoHienTai: data.tienDoHienTai,
        fileDinhKem: data.fileDinhKem,
        nguoiCapNhat: data.nguoiCapNhat,
        nguoiCapNhatId: data.nguoiCapNhatId,
      },
    });
  }

  async updateUpdate(projectId: string, updateId: string, data: UpdateProjectUpdateData) {
    const existing = await prisma.projectUpdate.findUnique({ where: { id: updateId } });
    if (!existing || existing.projectId !== projectId) throw new NotFoundError('Không tìm thấy cập nhật');
    if (data.tienDoHienTai !== undefined) {
      if (!Number.isInteger(data.tienDoHienTai) || data.tienDoHienTai < 0 || data.tienDoHienTai > 100) {
        throw new ValidationError('Tiến độ phải nằm trong khoảng 0 đến 100');
      }
    }
    if (data.projectPhaseId !== undefined && data.projectPhaseId !== null) {
      await this.validatePhaseBelongsToProject(projectId, data.projectPhaseId);
    }
    return prisma.projectUpdate.update({ where: { id: updateId }, data });
  }

  async deleteUpdate(projectId: string, updateId: string) {
    const existing = await prisma.projectUpdate.findUnique({ where: { id: updateId } });
    if (!existing || existing.projectId !== projectId) throw new NotFoundError('Không tìm thấy cập nhật');
    return prisma.projectUpdate.delete({ where: { id: updateId } });
  }

  // ── Costs ─────────────────────────────────────────────────────────────────
  async getCosts(projectId: string, projectPhaseId?: string | null, projectTaskId?: string | null) {
    await this.getById(projectId);
    const where: Record<string, unknown> = { projectId };
    if (projectPhaseId !== undefined) {
      where.projectPhaseId = projectPhaseId ?? null;
    }
    if (projectTaskId !== undefined) {
      where.projectTaskId = projectTaskId ?? null;
    }
    return prisma.projectCost.findMany({ where, orderBy: { createdAt: 'asc' } });
  }

  async addCost(projectId: string, data: CreateProjectCostData) {
    await this.getById(projectId);
    if (!COST_CATEGORIES.has(data.loaiChiPhi)) {
      throw new ValidationError('Loại chi phí không hợp lệ');
    }
    if (data.projectPhaseId) {
      await this.validatePhaseBelongsToProject(projectId, data.projectPhaseId);
    }
    return prisma.projectCost.create({
      data: {
        projectId,
        projectPhaseId: data.projectPhaseId ?? null,
        projectTaskId: data.projectTaskId ?? null,
        loaiChiPhi: data.loaiChiPhi,
        tenChiPhi: data.tenChiPhi,
        donVi: data.donVi,
        soLuongKeHoach: data.soLuongKeHoach,
        giaKeHoach: data.giaKeHoach,
        thanhTienKeHoach: data.thanhTienKeHoach,
        soLuongThucTe: data.soLuongThucTe,
        giaThucTe: data.giaThucTe,
        thanhTienThucTe: data.thanhTienThucTe,
      },
    });
  }

  async updateCost(projectId: string, costId: string, data: UpdateProjectCostData) {
    const existing = await prisma.projectCost.findUnique({ where: { id: costId } });
    if (!existing || existing.projectId !== projectId) throw new NotFoundError('Không tìm thấy chi phí');
    if (data.loaiChiPhi && !COST_CATEGORIES.has(data.loaiChiPhi)) {
      throw new ValidationError('Loại chi phí không hợp lệ');
    }
    if (data.projectPhaseId !== undefined && data.projectPhaseId !== null) {
      await this.validatePhaseBelongsToProject(projectId, data.projectPhaseId);
    }
    return prisma.projectCost.update({ where: { id: costId }, data });
  }

  async deleteCost(projectId: string, costId: string) {
    const existing = await prisma.projectCost.findUnique({ where: { id: costId } });
    if (!existing || existing.projectId !== projectId) throw new NotFoundError('Không tìm thấy chi phí');
    return prisma.projectCost.delete({ where: { id: costId } });
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

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        phases: { orderBy: { thuTu: 'asc' } },
        costs: { orderBy: { createdAt: 'asc' } },
        updates: { orderBy: { ngay: 'asc' } },
        _count: { select: { tasks: true, members: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();

    // ── Sheet 1: Project info + phases ──────────────────────────────────────
    const sheet1 = workbook.addWorksheet('Dự án & Giai đoạn');
    sheet1.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã dự án', key: 'maDuAn', width: 15 },
      { header: 'Tên dự án', key: 'tenDuAn', width: 35 },
      { header: 'Trạng thái', key: 'trangThai', width: 18 },
      { header: 'Ngày bắt đầu', key: 'ngayBatDau', width: 15 },
      { header: 'Ngày kết thúc', key: 'ngayKetThuc', width: 15 },
      { header: 'Số thành viên', key: 'soThanhVien', width: 14 },
      { header: 'Số công việc', key: 'soCongViec', width: 14 },
      { header: 'Tên giai đoạn', key: 'tenGiaiDoan', width: 30 },
      { header: 'Tiến độ GĐ (%)', key: 'tienDoGD', width: 14 },
      { header: 'Trạng thái GĐ', key: 'trangThaiGD', width: 18 },
      { header: 'Ngân sách GĐ', key: 'nganSachGD', width: 16 },
    ];
    projects.forEach((project, idx) => {
      const phases = project.phases;
      if (phases.length === 0) {
        sheet1.addRow({
          stt: idx + 1,
          maDuAn: project.maDuAn,
          tenDuAn: project.tenDuAn,
          trangThai: project.trangThai,
          ngayBatDau: project.ngayBatDau.toLocaleDateString('vi-VN'),
          ngayKetThuc: project.ngayKetThuc ? project.ngayKetThuc.toLocaleDateString('vi-VN') : '',
          soThanhVien: project._count.members,
          soCongViec: project._count.tasks,
        });
      } else {
        phases.forEach((phase, phaseIdx) => {
          sheet1.addRow({
            stt: phaseIdx === 0 ? idx + 1 : '',
            maDuAn: phaseIdx === 0 ? project.maDuAn : '',
            tenDuAn: phaseIdx === 0 ? project.tenDuAn : '',
            trangThai: phaseIdx === 0 ? project.trangThai : '',
            ngayBatDau: phaseIdx === 0 ? project.ngayBatDau.toLocaleDateString('vi-VN') : '',
            ngayKetThuc: phaseIdx === 0 && project.ngayKetThuc ? project.ngayKetThuc.toLocaleDateString('vi-VN') : '',
            soThanhVien: phaseIdx === 0 ? project._count.members : '',
            soCongViec: phaseIdx === 0 ? project._count.tasks : '',
            tenGiaiDoan: phase.tenGiaiDoan,
            tienDoGD: phase.tienDo,
            trangThaiGD: phase.trangThai,
            nganSachGD: phase.nganSach ?? '',
          });
        });
      }
    });

    // ── Sheet 2: Cost summary grouped by loaiChiPhi ─────────────────────────
    const sheet2 = workbook.addWorksheet('Chi phí');
    sheet2.columns = [
      { header: 'Mã dự án', key: 'maDuAn', width: 15 },
      { header: 'Tên dự án', key: 'tenDuAn', width: 30 },
      { header: 'Loại chi phí', key: 'loaiChiPhi', width: 14 },
      { header: 'Tên chi phí', key: 'tenChiPhi', width: 25 },
      { header: 'Đơn vị', key: 'donVi', width: 10 },
      { header: 'SL kế hoạch', key: 'soLuongKH', width: 13 },
      { header: 'Giá kế hoạch', key: 'giaKH', width: 14 },
      { header: 'Thành tiền KH', key: 'thanhTienKH', width: 15 },
      { header: 'SL thực tế', key: 'soLuongTT', width: 12 },
      { header: 'Giá thực tế', key: 'giaTT', width: 13 },
      { header: 'Thành tiền TT', key: 'thanhTienTT', width: 15 },
    ];
    projects.forEach((project) => {
      project.costs.forEach((cost) => {
        sheet2.addRow({
          maDuAn: project.maDuAn,
          tenDuAn: project.tenDuAn,
          loaiChiPhi: cost.loaiChiPhi,
          tenChiPhi: cost.tenChiPhi ?? '',
          donVi: cost.donVi ?? '',
          soLuongKH: cost.soLuongKeHoach ?? '',
          giaKH: cost.giaKeHoach ?? '',
          thanhTienKH: cost.thanhTienKeHoach ?? '',
          soLuongTT: cost.soLuongThucTe ?? '',
          giaTT: cost.giaThucTe ?? '',
          thanhTienTT: cost.thanhTienThucTe ?? '',
        });
      });
    });

    // ── Sheet 3: Update log ──────────────────────────────────────────────────
    const sheet3 = workbook.addWorksheet('Cập nhật thực tế');
    sheet3.columns = [
      { header: 'Mã dự án', key: 'maDuAn', width: 15 },
      { header: 'Tên dự án', key: 'tenDuAn', width: 30 },
      { header: 'Ngày', key: 'ngay', width: 14 },
      { header: 'Tiêu đề', key: 'tieuDe', width: 30 },
      { header: 'Nội dung', key: 'noiDung', width: 50 },
      { header: 'Tiến độ (%)', key: 'tienDo', width: 12 },
      { header: 'Người cập nhật', key: 'nguoiCapNhat', width: 20 },
    ];
    projects.forEach((project) => {
      project.updates.forEach((update) => {
        sheet3.addRow({
          maDuAn: project.maDuAn,
          tenDuAn: project.tenDuAn,
          ngay: update.ngay.toLocaleDateString('vi-VN'),
          tieuDe: update.tieuDe,
          noiDung: update.noiDung,
          tienDo: update.tienDoHienTai,
          nguoiCapNhat: update.nguoiCapNhat,
        });
      });
    });

    return workbook;
  }

  // ── Approval Workflow ──────────────────────────────────────────────────────

  async getApprovals(projectId: string) {
    await this.getById(projectId);
    return prisma.projectApproval.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitForApproval(projectId: string, userId: string, ghiChu?: string, nguoiDuyetId?: string) {
    const project = await this.getById(projectId);
    if (project.nguoiTaoId !== userId) {
      throw new AuthorizationError('Chỉ người tạo dự án mới được gửi duyệt');
    }
    if (project.trangThai !== 'Lên kế hoạch' && project.trangThai !== 'Chờ duyệt') {
      throw new ValidationError('Chỉ gửi duyệt khi dự án ở trạng thái Lên kế hoạch hoặc Chờ duyệt');
    }

    const [, approval] = await prisma.$transaction([
      prisma.project.update({ where: { id: projectId }, data: { trangThai: 'Chờ duyệt' } }),
      prisma.projectApproval.create({
        data: { projectId, nguoiGuiId: userId, nguoiDuyetId: nguoiDuyetId || null, ghiChu },
      }),
    ]);

    try {
      let targetEmployeeIds: string[] | undefined;
      if (nguoiDuyetId) {
        const adminUser = await prisma.user.findUnique({
          where: { id: nguoiDuyetId },
          include: { employees: { select: { id: true } } },
        });
        if (adminUser?.employees) targetEmployeeIds = [adminUser.employees.id];
      }
      await notificationService.notify(NotificationEvent.PROJECT_APPROVAL_SUBMITTED, {
        actorUserId: userId,
        entityId: projectId,
        targetEmployeeIds,
        metadata: { tenDuAn: project.tenDuAn },
      });
    } catch { /* notification không được bubble lỗi */ }

    return approval;
  }

  async approveProject(projectId: string, adminUserId: string, role: string) {
    if (role !== 'ADMIN') {
      throw new AuthorizationError('Chỉ admin mới được duyệt dự án');
    }
    const project = await this.getById(projectId);
    if (project.trangThai !== 'Chờ duyệt') {
      throw new ValidationError('Dự án không ở trạng thái Chờ duyệt');
    }

    const latestApproval = await prisma.projectApproval.findFirst({
      where: { projectId, trangThai: 'CHO_DUYET' },
      orderBy: { createdAt: 'desc' },
    });

    await prisma.$transaction([
      prisma.project.update({ where: { id: projectId }, data: { trangThai: 'Đang thực hiện' } }),
      ...(latestApproval ? [prisma.projectApproval.update({
        where: { id: latestApproval.id },
        data: { trangThai: 'DA_DUYET', nguoiDuyetId: adminUserId },
      })] : []),
    ]);

    try {
      const creatorUser = await prisma.user.findUnique({
        where: { id: project.nguoiTaoId },
        include: { employees: { select: { id: true } } },
      });
      const targetEmployeeIds = creatorUser?.employees ? [creatorUser.employees.id] : [];
      await notificationService.notify(NotificationEvent.PROJECT_APPROVAL_APPROVED, {
        actorUserId: adminUserId,
        targetEmployeeIds,
        entityId: projectId,
        metadata: { tenDuAn: project.tenDuAn },
      });
    } catch { /* notification không được bubble lỗi */ }
  }

  async rejectProject(projectId: string, adminUserId: string, role: string, lyDoTuChoi: string) {
    if (role !== 'ADMIN') {
      throw new AuthorizationError('Chỉ admin mới được từ chối dự án');
    }
    if (!lyDoTuChoi?.trim()) {
      throw new ValidationError('Phải nhập lý do từ chối');
    }
    const project = await this.getById(projectId);
    if (project.trangThai !== 'Chờ duyệt') {
      throw new ValidationError('Dự án không ở trạng thái Chờ duyệt');
    }

    const latestApproval = await prisma.projectApproval.findFirst({
      where: { projectId, trangThai: 'CHO_DUYET' },
      orderBy: { createdAt: 'desc' },
    });

    if (latestApproval) {
      await prisma.projectApproval.update({
        where: { id: latestApproval.id },
        data: { trangThai: 'TU_CHOI', nguoiDuyetId: adminUserId, lyDoTuChoi },
      });
    }

    // Revert project status so creator can fix and resubmit
    await prisma.project.update({
      where: { id: projectId },
      data: { trangThai: 'Lên kế hoạch' },
    });

    try {
      const creatorUser = await prisma.user.findUnique({
        where: { id: project.nguoiTaoId },
        include: { employees: { select: { id: true } } },
      });
      const targetEmployeeIds = creatorUser?.employees ? [creatorUser.employees.id] : [];
      await notificationService.notify(NotificationEvent.PROJECT_APPROVAL_REJECTED, {
        actorUserId: adminUserId,
        targetEmployeeIds,
        entityId: projectId,
        metadata: { tenDuAn: project.tenDuAn, lyDoTuChoi },
      });
    } catch { /* notification không được bubble lỗi */ }
  }
}

export default new ProjectService();
