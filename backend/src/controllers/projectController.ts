import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import projectService from '@services/projectService';
import { getFileUrl } from '@middlewares/upload';

class ProjectController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;
      const trangThai = req.query.trangThai as string | undefined;
      const userId = req.user!.id;
      const role = req.user!.role;

      const result = await projectService.getAll(page, limit, search, trangThai, userId, role);
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.getById(req.params.id);
      res.json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let memberIds: string[] = [];
      if (req.body.memberIds) {
        memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds : JSON.parse(req.body.memberIds);
      }

      const data = {
        tenDuAn: req.body.tenDuAn,
        moTa: req.body.moTa,
        ngayBatDau: new Date(req.body.ngayBatDau),
        ngayKetThuc: req.body.ngayKetThuc ? new Date(req.body.ngayKetThuc) : undefined,
        trangThai: req.body.trangThai,
        nguoiTaoId: req.user!.id,
        fileDinhKem: req.file ? getFileUrl('projects', req.file.filename) : undefined,
        memberIds,
      };

      const project = await projectService.create(data);
      res.status(201).json({ success: true, data: project, message: 'Tạo dự án thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        tenDuAn: req.body.tenDuAn,
        moTa: req.body.moTa,
        trangThai: req.body.trangThai,
        ngayBatDau: req.body.ngayBatDau ? new Date(req.body.ngayBatDau) : undefined,
        ngayKetThuc: req.body.ngayKetThuc ? new Date(req.body.ngayKetThuc) : undefined,
      };
      if (req.file) updateData.fileDinhKem = getFileUrl('projects', req.file.filename);
      Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);

      const project = await projectService.update(req.params.id, updateData, req.user!.id, req.user!.role);
      res.json({ success: true, data: project, message: 'Cập nhật dự án thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectService.delete(req.params.id, req.user!.id, req.user!.role);
      res.json({ success: true, message: 'Xóa dự án thành công' });
    } catch (error) {
      next(error);
    }
  }

  // Members
  async addMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const member = await projectService.addMember(
        req.params.id,
        req.body.userId,
        req.body.vaiTro ?? 'Thành viên',
        req.user!.id,
        req.user!.role,
      );
      res.status(201).json({ success: true, data: member, message: 'Thêm thành viên thành công' });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectService.removeMember(
        req.params.id,
        req.params.userId,
        req.user!.id,
        req.user!.role,
      );
      res.json({ success: true, message: 'Xóa thành viên thành công' });
    } catch (error) {
      next(error);
    }
  }

  // Tasks
  async addTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = {
        tieuDe: req.body.tieuDe,
        moTa: req.body.moTa,
        nguoiPhuTrach: req.body.nguoiPhuTrach,
        projectPhaseId: req.body.projectPhaseId === '' ? null : req.body.projectPhaseId,
        tienDo: req.body.tienDo !== undefined ? parseInt(req.body.tienDo, 10) : undefined,
        ngayBatDau: req.body.ngayBatDau ? new Date(req.body.ngayBatDau) : undefined,
        ngayKetThuc: req.body.ngayKetThuc ? new Date(req.body.ngayKetThuc) : undefined,
        deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
        trangThai: req.body.trangThai,
        thuTu: req.body.thuTu !== undefined ? parseInt(req.body.thuTu) : undefined,
      };
      const task = await projectService.addTask(req.params.id, data);
      res.status(201).json({ success: true, data: task, message: 'Thêm công việc thành công' });
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: Record<string, unknown> = {
        tieuDe: req.body.tieuDe,
        moTa: req.body.moTa,
        nguoiPhuTrach: req.body.nguoiPhuTrach,
        projectPhaseId: req.body.projectPhaseId === '' ? null : req.body.projectPhaseId,
        tienDo: req.body.tienDo !== undefined ? parseInt(req.body.tienDo, 10) : undefined,
        ngayBatDau: req.body.ngayBatDau ? new Date(req.body.ngayBatDau) : undefined,
        ngayKetThuc: req.body.ngayKetThuc ? new Date(req.body.ngayKetThuc) : undefined,
        trangThai: req.body.trangThai,
        deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
        thuTu: req.body.thuTu !== undefined ? parseInt(req.body.thuTu) : undefined,
      };
      Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

      const task = await projectService.updateTask(
        req.params.id,
        req.params.taskId,
        data,
        req.user!.id,
        req.user!.role,
      );
      res.json({ success: true, data: task, message: 'Cập nhật công việc thành công' });
    } catch (error) {
      next(error);
    }
  }

  // Phases
  async addPhase(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const phase = await projectService.addPhase(req.params.id, {
        tenGiaiDoan: req.body.tenGiaiDoan,
        moTa: req.body.moTa,
        chuSoHuuId: req.body.chuSoHuuId,
        chuSoHuu: req.body.chuSoHuu,
        nguoiPhuTrachId: req.body.nguoiPhuTrachId,
        nguoiPhuTrach: req.body.nguoiPhuTrach,
        tienDo: req.body.tienDo !== undefined ? parseInt(req.body.tienDo, 10) : undefined,
        trangThai: req.body.trangThai,
        thuTu: req.body.thuTu !== undefined ? parseInt(req.body.thuTu, 10) : undefined,
        ngayBatDau: req.body.ngayBatDau ? new Date(req.body.ngayBatDau) : undefined,
        ngayKetThuc: req.body.ngayKetThuc ? new Date(req.body.ngayKetThuc) : undefined,
      });
      res.status(201).json({ success: true, data: phase, message: 'Thêm giai đoạn thành công' });
    } catch (error) {
      next(error);
    }
  }

  async updatePhase(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: Record<string, unknown> = {
        tenGiaiDoan: req.body.tenGiaiDoan,
        moTa: req.body.moTa,
        chuSoHuuId: req.body.chuSoHuuId,
        chuSoHuu: req.body.chuSoHuu,
        nguoiPhuTrachId: req.body.nguoiPhuTrachId,
        nguoiPhuTrach: req.body.nguoiPhuTrach,
        tienDo: req.body.tienDo !== undefined ? parseInt(req.body.tienDo, 10) : undefined,
        trangThai: req.body.trangThai,
        thuTu: req.body.thuTu !== undefined ? parseInt(req.body.thuTu, 10) : undefined,
        ngayBatDau: req.body.ngayBatDau ? new Date(req.body.ngayBatDau) : undefined,
        ngayKetThuc: req.body.ngayKetThuc ? new Date(req.body.ngayKetThuc) : undefined,
      };
      Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

      const phase = await projectService.updatePhase(req.params.id, req.params.phaseId, data);
      res.json({ success: true, data: phase, message: 'Cập nhật giai đoạn thành công' });
    } catch (error) {
      next(error);
    }
  }

  async deletePhase(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const moveTasksToUnphased = req.query.moveTasksToUnphased === 'true' || req.body?.moveTasksToUnphased === true;
      await projectService.deletePhase(req.params.id, req.params.phaseId, moveTasksToUnphased);
      res.json({ success: true, message: 'Xóa giai đoạn thành công' });
    } catch (error) {
      next(error);
    }
  }

  async reorderPhases(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const phaseIds = Array.isArray(req.body.phaseIds) ? req.body.phaseIds : [];
      const phases = await projectService.reorderPhases(req.params.id, phaseIds);
      res.json({ success: true, data: phases, message: 'Sắp xếp giai đoạn thành công' });
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectService.deleteTask(req.params.id, req.params.taskId);
      res.json({ success: true, message: 'Xóa công việc thành công' });
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        search: req.query.search as string | undefined,
        trangThai: req.query.trangThai as string | undefined,
      };
      const workbook = await projectService.exportToExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-du-an-${Date.now()}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }
}

export default new ProjectController();
