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
        ngayBatDauThucTe: req.body.ngayBatDauThucTe ? new Date(req.body.ngayBatDauThucTe) : undefined,
        ngayHoanThanhThucTe: req.body.ngayHoanThanhThucTe ? new Date(req.body.ngayHoanThanhThucTe) : undefined,
        deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
        trangThai: req.body.trangThai,
        thuTu: req.body.thuTu !== undefined ? parseInt(req.body.thuTu) : undefined,
        mucDoUuTien: req.body.mucDoUuTien || null,
        laMilestone: req.body.laMilestone === true || req.body.laMilestone === 'true',
        laPhatSinh: req.body.laPhatSinh === true || req.body.laPhatSinh === 'true',
        ghiChu: req.body.ghiChu,
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
        ngayBatDauThucTe: req.body.ngayBatDauThucTe ? new Date(req.body.ngayBatDauThucTe) : undefined,
        ngayHoanThanhThucTe: req.body.ngayHoanThanhThucTe ? new Date(req.body.ngayHoanThanhThucTe) : undefined,
        trangThai: req.body.trangThai,
        deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
        thuTu: req.body.thuTu !== undefined ? parseInt(req.body.thuTu) : undefined,
        mucDoUuTien: req.body.mucDoUuTien !== undefined ? (req.body.mucDoUuTien || null) : undefined,
        laMilestone: req.body.laMilestone !== undefined ? (req.body.laMilestone === true || req.body.laMilestone === 'true') : undefined,
        ghiChu: req.body.ghiChu,
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
        nganSach: req.body.nganSach ? parseFloat(req.body.nganSach) : undefined,
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
        nganSach: req.body.nganSach !== undefined ? (req.body.nganSach ? parseFloat(req.body.nganSach) : null) : undefined,
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

  // Updates
  async getUpdates(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const updates = await projectService.getUpdates(req.params.id);
      res.json({ success: true, data: updates });
    } catch (error) {
      next(error);
    }
  }

  async addUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const update = await projectService.addUpdate(req.params.id, {
        ngay: new Date(req.body.ngay),
        tieuDe: req.body.tieuDe,
        noiDung: req.body.noiDung,
        tienDoHienTai: parseInt(req.body.tienDoHienTai, 10),
        fileDinhKem: req.body.fileDinhKem,
        nguoiCapNhat: req.body.nguoiCapNhat,
        nguoiCapNhatId: req.user!.id,
        projectPhaseId: req.body.projectPhaseId === '' ? null : req.body.projectPhaseId,
      });
      res.status(201).json({ success: true, data: update, message: 'Thêm cập nhật thành công' });
    } catch (error) {
      next(error);
    }
  }

  async updateUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: Record<string, unknown> = {
        ngay: req.body.ngay ? new Date(req.body.ngay) : undefined,
        tieuDe: req.body.tieuDe,
        noiDung: req.body.noiDung,
        tienDoHienTai: req.body.tienDoHienTai !== undefined ? parseInt(req.body.tienDoHienTai, 10) : undefined,
        fileDinhKem: req.body.fileDinhKem,
        projectPhaseId: req.body.projectPhaseId === '' ? null : req.body.projectPhaseId,
      };
      Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
      const update = await projectService.updateUpdate(req.params.id, req.params.updateId, data);
      res.json({ success: true, data: update, message: 'Cập nhật thành công' });
    } catch (error) {
      next(error);
    }
  }

  async deleteUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectService.deleteUpdate(req.params.id, req.params.updateId);
      res.json({ success: true, message: 'Xóa cập nhật thành công' });
    } catch (error) {
      next(error);
    }
  }

  // Costs
  async getCosts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectPhaseId = req.query.projectPhaseId as string | undefined;
      const projectTaskId = req.query.projectTaskId as string | undefined;
      const costs = await projectService.getCosts(req.params.id, projectPhaseId, projectTaskId);
      res.json({ success: true, data: costs });
    } catch (error) {
      next(error);
    }
  }

  async addCost(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cost = await projectService.addCost(req.params.id, {
        projectPhaseId: req.body.projectPhaseId === '' ? null : req.body.projectPhaseId,
        projectTaskId: req.body.projectTaskId === '' ? null : (req.body.projectTaskId ?? null),
        loaiChiPhi: req.body.loaiChiPhi,
        tenChiPhi: req.body.tenChiPhi,
        donVi: req.body.donVi,
        soLuongKeHoach: req.body.soLuongKeHoach ? parseFloat(req.body.soLuongKeHoach) : undefined,
        giaKeHoach: req.body.giaKeHoach ? parseFloat(req.body.giaKeHoach) : undefined,
        thanhTienKeHoach: req.body.thanhTienKeHoach ? parseFloat(req.body.thanhTienKeHoach) : undefined,
        soLuongThucTe: req.body.soLuongThucTe ? parseFloat(req.body.soLuongThucTe) : undefined,
        giaThucTe: req.body.giaThucTe ? parseFloat(req.body.giaThucTe) : undefined,
        thanhTienThucTe: req.body.thanhTienThucTe ? parseFloat(req.body.thanhTienThucTe) : undefined,
      });
      res.status(201).json({ success: true, data: cost, message: 'Thêm chi phí thành công' });
    } catch (error) {
      next(error);
    }
  }

  async updateCost(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: Record<string, unknown> = {
        projectPhaseId: req.body.projectPhaseId === '' ? null : req.body.projectPhaseId,
        projectTaskId: req.body.projectTaskId === '' ? null : req.body.projectTaskId,
        loaiChiPhi: req.body.loaiChiPhi,
        tenChiPhi: req.body.tenChiPhi,
        donVi: req.body.donVi,
        soLuongKeHoach: req.body.soLuongKeHoach !== undefined ? (req.body.soLuongKeHoach ? parseFloat(req.body.soLuongKeHoach) : null) : undefined,
        giaKeHoach: req.body.giaKeHoach !== undefined ? (req.body.giaKeHoach ? parseFloat(req.body.giaKeHoach) : null) : undefined,
        thanhTienKeHoach: req.body.thanhTienKeHoach !== undefined ? (req.body.thanhTienKeHoach ? parseFloat(req.body.thanhTienKeHoach) : null) : undefined,
        soLuongThucTe: req.body.soLuongThucTe !== undefined ? (req.body.soLuongThucTe ? parseFloat(req.body.soLuongThucTe) : null) : undefined,
        giaThucTe: req.body.giaThucTe !== undefined ? (req.body.giaThucTe ? parseFloat(req.body.giaThucTe) : null) : undefined,
        thanhTienThucTe: req.body.thanhTienThucTe !== undefined ? (req.body.thanhTienThucTe ? parseFloat(req.body.thanhTienThucTe) : null) : undefined,
      };
      Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
      const cost = await projectService.updateCost(req.params.id, req.params.costId, data);
      res.json({ success: true, data: cost, message: 'Cập nhật chi phí thành công' });
    } catch (error) {
      next(error);
    }
  }

  async deleteCost(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectService.deleteCost(req.params.id, req.params.costId);
      res.json({ success: true, message: 'Xóa chi phí thành công' });
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

  // Approval workflow
  async getApprovals(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const approvals = await projectService.getApprovals(req.params.id);
      res.json({ success: true, data: approvals });
    } catch (error) {
      next(error);
    }
  }

  async submitForApproval(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const approval = await projectService.submitForApproval(
        req.params.id,
        req.user!.id,
        req.body.ghiChu,
        req.body.nguoiDuyetId,
      );
      res.status(201).json({ success: true, data: approval, message: 'Đã gửi duyệt kế hoạch' });
    } catch (error) {
      next(error);
    }
  }

  async approveProject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectService.approveProject(req.params.id, req.user!.id, req.user!.role);
      res.json({ success: true, message: 'Đã phê duyệt kế hoạch dự án' });
    } catch (error) {
      next(error);
    }
  }

  async rejectProject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectService.rejectProject(
        req.params.id,
        req.user!.id,
        req.user!.role,
        req.body.lyDoTuChoi,
      );
      res.json({ success: true, message: 'Đã từ chối kế hoạch dự án' });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProjectController();
