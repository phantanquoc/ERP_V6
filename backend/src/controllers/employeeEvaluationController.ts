import { Response, NextFunction } from 'express';
import employeeEvaluationService from '@services/employeeEvaluationService';
import evaluationPeerFeedbackService from '@services/evaluationPeerFeedbackService';
import { getAuditLog } from '@services/evaluationAuditService';
import prisma from '@config/database';
import type { AuthenticatedRequest } from '@types';

export class EmployeeEvaluationController {
  async getEmployeeEvaluations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year } = req.query;

      if (!month || !year) {
        res.status(400).json({
          success: false,
          message: 'Month and year are required',
        });
        return;
      }

      const evaluations = await employeeEvaluationService.getEmployeeEvaluations(
        Number(month),
        Number(year),
        req.userDepartmentId || undefined,
        req.userSubDepartmentId || undefined
      );

      res.json({
        success: true,
        data: evaluations,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async getEvaluationDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.evaluationId as string;
      const userId = req.user?.id;

      const details = await employeeEvaluationService.getEvaluationDetails(evaluationId, userId);

      res.json({
        success: true,
        data: details,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async createOrUpdateEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employeeId, month, year } = req.body;

      if (!employeeId || !month || !year) {
        res.status(400).json({
          success: false,
          message: 'Employee ID, month, and year are required',
        });
        return;
      }

      const evaluation = await employeeEvaluationService.createOrUpdateEvaluation(
        employeeId,
        month,
        year
      );

      res.json({
        success: true,
        data: evaluation,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async updateEvaluationDetail(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const detailId = req.params.detailId as string;
      const { selfScore, supervisorScore1, supervisorScore2, comment } = req.body;
      const userId = req.user?.id;

      const detail = await employeeEvaluationService.updateEvaluationDetail(detailId, {
        selfScore,
        supervisorScore1,
        supervisorScore2,
        comment,
      }, userId);

      res.json({
        success: true,
        data: detail,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async getEvaluationHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.evaluationId as string;
      const userId = req.user?.id;

      const history = await employeeEvaluationService.getEvaluationHistory(evaluationId, userId ?? '');

      res.json({
        success: true,
        data: history,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async createBulkEvaluations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year } = req.body;

      if (!month || !year) {
        res.status(400).json({
          success: false,
          message: 'Month and year are required',
        });
        return;
      }

      const result = await employeeEvaluationService.createBulkEvaluations(
        Number(month),
        Number(year)
      );

      res.json({
        success: true,
        data: result,
        message: `Tạo đánh giá thành công cho ${result.created} nhân viên (bỏ qua ${result.skipped} đã có đánh giá)`,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async finalizeEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.evaluationId as string;
      const userId = req.user?.id ?? '';

      const evaluation = await employeeEvaluationService.finalizeEvaluation(evaluationId, userId);

      res.json({
        success: true,
        data: evaluation,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async getPendingCount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const count = await employeeEvaluationService.getPendingEvaluationCount(userId!);
      res.json({ success: true, data: { count } });
    } catch (error) {
      next(error);
    }
  }

  async syncEvaluationDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.evaluationId as string;

      const result = await employeeEvaluationService.syncEvaluationDetails(evaluationId);

      res.json({
        success: true,
        data: result,
        message: `Đồng bộ tiêu chí thành công: thêm ${result.added}, xóa ${result.removed}`,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async acknowledgeEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.evaluationId as string;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
        return;
      }

      const evaluation = await employeeEvaluationService.acknowledgeEvaluation(evaluationId, userId);

      res.json({
        success: true,
        data: evaluation,
        message: 'Đã xác nhận đánh giá thành công',
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async getCompletionStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year } = req.query;

      if (!month || !year) {
        res.status(400).json({
          success: false,
          message: 'Month and year are required',
        });
        return;
      }

      const stats = await employeeEvaluationService.getEvaluationCompletionStats(
        Number(month),
        Number(year)
      );

      res.json({
        success: true,
        data: stats,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async getSubordinatesForEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year } = req.params;
      const userId = req.user?.id;

      const subordinates = await employeeEvaluationService.getSubordinatesForEvaluation(
        userId!,
        Number(month),
        Number(year)
      );

      res.json({
        success: true,
        data: subordinates,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  // ─── updateEvaluationComment ──────────────────────────────────────────────

  async updateEvaluationComment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.id as string;
      const { role, comment } = req.body;
      const userId = req.user?.id ?? '';

      const roleToField: Record<string, 'commentEmployee' | 'commentSup1' | 'commentSup2'> = {
        employee: 'commentEmployee',
        sup1: 'commentSup1',
        sup2: 'commentSup2',
      };

      const commentField = roleToField[role];
      if (!commentField) {
        res.status(400).json({ success: false, message: 'role phải là employee, sup1 hoặc sup2' });
        return;
      }

      const result = await employeeEvaluationService.updateEvaluationComment(
        evaluationId,
        commentField,
        comment ?? '',
        userId
      );

      res.json({ success: true, data: result, message: 'Cập nhật nhận xét thành công' });
    } catch (error) {
      next(error);
    }
  }

  // ─── toggleNotApplicable ─────────────────────────────────────────────────

  async toggleNotApplicable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const detailId = req.params.detailId as string;
      const { notApplicable } = req.body;
      const userId = req.user?.id ?? '';

      const result = await employeeEvaluationService.toggleNotApplicable(
        detailId,
        Boolean(notApplicable),
        userId
      );

      res.json({ success: true, data: result, message: 'Cập nhật N/A thành công' });
    } catch (error) {
      next(error);
    }
  }

  // ─── Evidence ────────────────────────────────────────────────────────────

  async uploadEvidence(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const detailId = req.params.detailId as string;
      const userId = req.user?.id ?? '';

      if (!req.file) {
        res.status(400).json({ success: false, message: 'Không có file được upload' });
        return;
      }

      const result = await employeeEvaluationService.uploadEvidence(
        detailId,
        {
          originalname: req.file.originalname,
          path: req.file.path,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
        userId
      );

      res.status(201).json({ success: true, data: result, message: 'Upload minh chứng thành công' });
    } catch (error) {
      next(error);
    }
  }

  async deleteEvidence(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evidenceId = req.params.evidenceId as string;
      const userId = req.user?.id ?? '';

      await employeeEvaluationService.deleteEvidence(evidenceId, userId);

      res.json({ success: true, message: 'Xóa minh chứng thành công' });
    } catch (error) {
      next(error);
    }
  }

  async listEvidence(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const detailId = req.params.detailId as string;
      const userId = req.user?.id ?? '';

      const data = await employeeEvaluationService.listEvidence(detailId, userId);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Appeal ──────────────────────────────────────────────────────────────

  async submitAppeal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.id as string;
      const { appealComment } = req.body;
      const userId = req.user?.id ?? '';

      if (!appealComment) {
        res.status(400).json({ success: false, message: 'Nội dung khiếu nại là bắt buộc' });
        return;
      }

      const result = await employeeEvaluationService.submitAppeal(evaluationId, appealComment, userId);

      res.json({ success: true, data: result, message: 'Gửi khiếu nại thành công' });
    } catch (error) {
      next(error);
    }
  }

  async replyAppeal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.id as string;
      const { appealResponse } = req.body;
      const userId = req.user?.id ?? '';

      if (!appealResponse) {
        res.status(400).json({ success: false, message: 'Nội dung phản hồi khiếu nại là bắt buộc' });
        return;
      }

      const result = await employeeEvaluationService.replyAppeal(evaluationId, appealResponse, userId);

      res.json({ success: true, data: result, message: 'Phản hồi khiếu nại thành công' });
    } catch (error) {
      next(error);
    }
  }

  // ─── Audit log ───────────────────────────────────────────────────────────

  async getAuditLog(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.id as string;
      const userId = req.user?.id ?? '';
      const userRole = req.user?.role ?? '';
      const userDepartmentId = req.userDepartmentId;

      const data = await getAuditLog(prisma, evaluationId, userId, userRole, userDepartmentId);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Calibration heatmap ─────────────────────────────────────────────────

  async getCalibrationHeatmap(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year } = req.query;
      const userId = req.user?.id ?? '';

      if (!month || !year) {
        res.status(400).json({ success: false, message: 'month và year là bắt buộc' });
        return;
      }

      const data = await employeeEvaluationService.getCalibrationHeatmap(
        Number(month),
        Number(year),
        userId
      );

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Payroll preview ─────────────────────────────────────────────────────

  async getPayrollPreview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.id as string;
      const userId = req.user?.id ?? '';

      const data = await employeeEvaluationService.getPayrollImpactPreview(evaluationId, userId);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Copy from previous month ────────────────────────────────────────────

  async copyFromPreviousMonth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.id as string;
      const userId = req.user?.id ?? '';

      const data = await employeeEvaluationService.copyFromPreviousMonth(evaluationId, userId);

      res.json({ success: true, data, message: `Đã sao chép ${data.copied} điểm từ tháng trước` });
    } catch (error) {
      next(error);
    }
  }

  // ─── PDF export ──────────────────────────────────────────────────────────

  async getPdf(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.id as string;
      const userId = req.user?.id ?? '';

      const { evaluation, currentUserRole, isOwn, isSup } =
        await employeeEvaluationService.getEvaluationPdfData(evaluationId, userId);

      if (!evaluation) {
        res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
        return;
      }

      // Basic access check: own evaluation, supervisor, ADMIN, or DEPT_HEAD
      if (
        currentUserRole !== 'ADMIN' &&
        currentUserRole !== 'DEPARTMENT_HEAD' &&
        !isOwn &&
        !isSup
      ) {
        res.status(403).json({ success: false, message: 'Không có quyền xuất PDF đánh giá này' });
        return;
      }

      const emp = (evaluation as any).employee;
      const fullName = emp?.user
        ? `${emp.user.lastName} ${emp.user.firstName}`.trim()
        : '';
      const periodLabel = (evaluation as any).period ?? '';
      const employeeCode = emp?.employeeCode ?? (evaluation as any).id.substring(0, 8).toUpperCase();
      const filename = `danh-gia-${employeeCode}-${periodLabel}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Build PDF with PDFKit
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      doc.pipe(res);

      // ── Header ─────────────────────────────────────────────────────────
      doc.fontSize(18).font('Helvetica-Bold').text('PHIEU DANH GIA NHAN VIEN', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Nhan vien: ${fullName}`, { align: 'left' });
      doc.text(`Chuc vu: ${emp?.position?.name ?? ''}`);
      doc.text(`Ky danh gia: ${periodLabel}`);
      doc.text(`Trang thai: ${(evaluation as any).status}`);
      doc.text(`Ngay tao: ${new Date().toLocaleDateString('vi-VN')}`);
      doc.moveDown();

      // ── Score table ───────────────────────────────────────────────────
      doc.fontSize(13).font('Helvetica-Bold').text('BANG DIEM DANH GIA');
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica');

      const details: any[] = (evaluation as any).details ?? [];
      for (const detail of details) {
        const resp = detail.positionResponsibility;
        const naFlag = detail.notApplicable ? ' [N/A]' : '';
        const selfScore = detail.notApplicable ? 'N/A' : (detail.selfScore ?? '-');
        const sup1Score = detail.notApplicable ? 'N/A' : (detail.supervisorScore1 ?? '-');
        const sup2Score = detail.notApplicable ? 'N/A' : (detail.supervisorScore2 ?? '-');
        doc.text(
          `${resp?.title ?? ''}${naFlag} | Trong so: ${resp?.weight ?? 0}% | Tu danh gia: ${selfScore} | Cap tren 1: ${sup1Score} | Cap tren 2: ${sup2Score}`
        );
        if (detail.commentEmployee) doc.text(`  Nhan xet NV: ${detail.commentEmployee}`, { indent: 10 });
        if (detail.commentSup1) doc.text(`  Nhan xet CT1: ${detail.commentSup1}`, { indent: 10 });
        if (detail.commentSup2) doc.text(`  Nhan xet CT2: ${detail.commentSup2}`, { indent: 10 });
      }
      doc.moveDown();

      // ── Overall comments ──────────────────────────────────────────────
      doc.fontSize(11).font('Helvetica-Bold').text('NHAN XET TONG QUAT');
      doc.fontSize(9).font('Helvetica');
      if ((evaluation as any).commentEmployee) doc.text(`Nhan vien: ${(evaluation as any).commentEmployee}`);
      if ((evaluation as any).commentSup1) doc.text(`Cap tren 1: ${(evaluation as any).commentSup1}`);
      if ((evaluation as any).commentSup2) doc.text(`Cap tren 2: ${(evaluation as any).commentSup2}`);
      doc.moveDown();

      // ── Goals + IDP (Full mode only) ──────────────────────────────────
      if ((evaluation as any).mode === 'FULL') {
        const goals: any[] = (evaluation as any).goals ?? [];
        const idpItems: any[] = (evaluation as any).idpItems ?? [];

        if (goals.length > 0) {
          doc.fontSize(11).font('Helvetica-Bold').text('MUC TIEU');
          doc.fontSize(9).font('Helvetica');
          for (const g of goals) {
            doc.text(`${g.orderIndex}. ${g.title} - Ky han: ${g.targetPeriod}`);
            if (g.description) doc.text(`   ${g.description}`, { indent: 10 });
          }
          doc.moveDown();
        }

        if (idpItems.length > 0) {
          doc.fontSize(11).font('Helvetica-Bold').text('KE HOACH PHAT TRIEN CA NHAN (IDP)');
          doc.fontSize(9).font('Helvetica');
          for (const item of idpItems) {
            const deadline = item.deadline ? new Date(item.deadline).toLocaleDateString('vi-VN') : '';
            doc.text(`${item.orderIndex}. Ky nang: ${item.skill} | Hanh dong: ${item.action} | Deadline: ${deadline}`);
          }
          doc.moveDown();
        }
      }

      // ── Evidence ─────────────────────────────────────────────────────
      const allEvidences: any[] = details.flatMap((d: any) => d.evidences ?? []);
      if (allEvidences.length > 0) {
        doc.fontSize(11).font('Helvetica-Bold').text('BANG CHUNG / MINH CHUNG');
        doc.fontSize(9).font('Helvetica');
        for (const ev of allEvidences) {
          doc.text(`- ${ev.fileName} (${ev.filePath})`);
        }
        doc.moveDown();
      }

      // ── Appeal ───────────────────────────────────────────────────────
      if ((evaluation as any).appealComment) {
        doc.fontSize(11).font('Helvetica-Bold').text('KHIEU NAI');
        doc.fontSize(9).font('Helvetica');
        doc.text(`Noi dung: ${(evaluation as any).appealComment}`);
        if ((evaluation as any).appealResponse) {
          doc.text(`Phan hoi: ${(evaluation as any).appealResponse}`);
        }
        doc.moveDown();
      }

      // ── Acknowledgment + footer ───────────────────────────────────────
      if ((evaluation as any).acknowledgedAt) {
        doc.text(`Ngay xac nhan: ${new Date((evaluation as any).acknowledgedAt).toLocaleDateString('vi-VN')}`);
      }
      doc.moveDown();
      doc.fontSize(8).font('Helvetica').text(
        `Xuat ban: ${new Date().toLocaleString('vi-VN')} — He thong ERP An Binh Foods`,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      next(error);
    }
  }

  // ─── Goals CRUD ───────────────────────────────────────────────────────────

  async listGoals(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.id as string;
      const userId = req.user?.id ?? '';
      const data = await employeeEvaluationService.listGoals(evaluationId, userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createGoal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.id as string;
      const userId = req.user?.id ?? '';
      const { title, description, targetPeriod } = req.body;

      if (!title || !targetPeriod) {
        res.status(400).json({ success: false, message: 'title và targetPeriod là bắt buộc' });
        return;
      }

      const data = await employeeEvaluationService.createGoal(
        evaluationId,
        { title, description, targetPeriod },
        userId
      );
      res.status(201).json({ success: true, data, message: 'Tạo mục tiêu thành công' });
    } catch (error) {
      next(error);
    }
  }

  async updateGoal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const goalId = req.params.goalId as string;
      const userId = req.user?.id ?? '';
      const { title, description, targetPeriod } = req.body;

      const data = await employeeEvaluationService.updateGoal(goalId, { title, description, targetPeriod }, userId);
      res.json({ success: true, data, message: 'Cập nhật mục tiêu thành công' });
    } catch (error) {
      next(error);
    }
  }

  async deleteGoal(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const goalId = req.params.goalId as string;
      const userId = req.user?.id ?? '';
      await employeeEvaluationService.deleteGoal(goalId, userId);
      res.json({ success: true, message: 'Xóa mục tiêu thành công' });
    } catch (error) {
      next(error);
    }
  }

  // ─── IDP CRUD ─────────────────────────────────────────────────────────────

  async listIdpItems(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.id as string;
      const userId = req.user?.id ?? '';
      const data = await employeeEvaluationService.listIdpItems(evaluationId, userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createIdpItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.id as string;
      const userId = req.user?.id ?? '';
      const { skill, action, deadline } = req.body;

      if (!skill || !action || !deadline) {
        res.status(400).json({ success: false, message: 'skill, action và deadline là bắt buộc' });
        return;
      }

      const data = await employeeEvaluationService.createIdpItem(
        evaluationId,
        { skill, action, deadline },
        userId
      );
      res.status(201).json({ success: true, data, message: 'Tạo mục IDP thành công' });
    } catch (error) {
      next(error);
    }
  }

  async updateIdpItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const idpItemId = req.params.idpItemId as string;
      const userId = req.user?.id ?? '';
      const { skill, action, deadline } = req.body;

      const data = await employeeEvaluationService.updateIdpItem(idpItemId, { skill, action, deadline }, userId);
      res.json({ success: true, data, message: 'Cập nhật mục IDP thành công' });
    } catch (error) {
      next(error);
    }
  }

  async deleteIdpItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const idpItemId = req.params.idpItemId as string;
      const userId = req.user?.id ?? '';
      await employeeEvaluationService.deleteIdpItem(idpItemId, userId);
      res.json({ success: true, message: 'Xóa mục IDP thành công' });
    } catch (error) {
      next(error);
    }
  }

  // ─── Peer feedback ────────────────────────────────────────────────────────

  async invitePeers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.id as string;
      const userId = req.user?.id ?? '';
      const { inviteeUserIds } = req.body;

      if (!Array.isArray(inviteeUserIds) || inviteeUserIds.length === 0) {
        res.status(400).json({ success: false, message: 'inviteeUserIds phải là mảng không rỗng' });
        return;
      }

      const data = await evaluationPeerFeedbackService.invitePeers(evaluationId, inviteeUserIds, userId);
      res.status(201).json({ success: true, data, message: 'Mời đánh giá đồng nghiệp thành công' });
    } catch (error) {
      next(error);
    }
  }

  async submitPeerFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.params.token as string;
      const { strength, weakness, suggestion } = req.body;
      const userId = req.user?.id ?? '';

      const data = await evaluationPeerFeedbackService.submitPeerFeedback(
        token,
        { strength, weakness, suggestion },
        userId
      );
      res.json({ success: true, data, message: 'Gửi đánh giá đồng nghiệp thành công' });
    } catch (error) {
      next(error);
    }
  }

  async declinePeerFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.params.token as string;
      const userId = req.user?.id ?? '';
      await evaluationPeerFeedbackService.declineInvite(token, userId);
      res.json({ success: true, message: 'Từ chối đánh giá đồng nghiệp thành công' });
    } catch (error) {
      next(error);
    }
  }

  async getPeerFeedbackAggregate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.id as string;
      const userId = req.user?.id ?? '';

      const data = await evaluationPeerFeedbackService.getPeerAggregate(evaluationId, userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async exportXlsx(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const month = parseInt(req.query.month as string, 10);
      const year = parseInt(req.query.year as string, 10);
      if (!month || !year || month < 1 || month > 12) {
        res.status(400).json({ success: false, message: 'Tháng và năm không hợp lệ' });
        return;
      }
      const buffer = await employeeEvaluationService.exportEvaluations(month, year);
      const filename = `danh-gia-nhan-vien-T${String(month).padStart(2, '0')}-${year}.xlsx`;
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
      });
      res.end(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new EmployeeEvaluationController();
