/**
 * Meeting Controller
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin request handler — only extracts params, calls service, formats response.
 * All business logic lives in MeetingService.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, ApiResponse } from '@types';
import meetingService from '@services/meetingService';
import prisma from '@config/database';
import { ValidationError } from '@utils/errors';

export class MeetingController {
  /**
   * GET /api/meetings
   * Paginated meeting list with optional filters.
   */
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await meetingService.getAll({
        search: req.query.search as string,
        page,
        limit,
        status: req.query.status as string,
        departmentId: req.query.departmentId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      });
      res.json({
        success: true,
        data: result.data,
        pagination: { page: result.page, limit, total: result.total, totalPages: result.totalPages },
      } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  /**
   * GET /api/meetings/my
   * Meetings for the authenticated user's employee record.
   */
  async getMyMeetings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      // Resolve userId → employeeId
      const employee = await prisma.employee.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!employee) { res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' }); return; }

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await meetingService.getMyMeetings(employee.id, {
        search: req.query.search as string,
        page,
        limit,
        status: req.query.status as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      });
      res.json({
        success: true,
        data: result.data,
        pagination: { page: result.page, limit, total: result.total, totalPages: result.totalPages },
      } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  /**
   * GET /api/meetings/:id
   * Full meeting detail with participants.
   */
  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const meeting = await meetingService.getById(req.params.id as string);
      res.json({ success: true, data: meeting } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  /**
   * POST /api/meetings
   * Create a new meeting.
   */
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const { title, agenda, meetingDate, startTime, endTime, room, notes, departmentId, participantIds } = req.body;
      if (!title || !meetingDate || !startTime || !endTime) {
        throw new ValidationError('title, meetingDate, startTime, endTime là bắt buộc');
      }

      const meeting = await meetingService.create(
        { title, agenda, meetingDate: new Date(meetingDate), startTime, endTime, room, notes, departmentId, participantIds: participantIds || [] },
        userId
      );
      res.status(201).json({ success: true, data: meeting, message: 'Tạo cuộc họp thành công' } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  /**
   * PUT /api/meetings/:id
   * Update meeting (creator/ADMIN only).
   */
  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const { title, agenda, meetingDate, startTime, endTime, room, notes, status, participantIds } = req.body;
      const meeting = await meetingService.update(
        req.params.id as string,
        {
          title, agenda,
          meetingDate: meetingDate ? new Date(meetingDate) : undefined,
          startTime, endTime, room, notes, status, participantIds,
        },
        userId,
        userRole || ''
      );
      res.json({ success: true, data: meeting, message: 'Cập nhật cuộc họp thành công' } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  /**
   * DELETE /api/meetings/:id
   * Delete meeting (SCHEDULED only, creator/ADMIN only).
   */
  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      await meetingService.delete(req.params.id as string, userId, userRole || '');
      res.json({ success: true, message: 'Xóa cuộc họp thành công' } as ApiResponse<any>);
    } catch (error) { next(error); }
  }

  /**
   * PUT /api/meetings/:id/confirm
   * Confirm or decline meeting participation.
   */
  async confirm(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const { isConfirmed } = req.body;
      if (typeof isConfirmed !== 'boolean') {
        throw new ValidationError('isConfirmed phải là true hoặc false');
      }

      const employee = await prisma.employee.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!employee) { res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' }); return; }

      const result = await meetingService.confirmAttendance(req.params.id as string, employee.id, isConfirmed);
      res.json({ success: true, data: result, message: isConfirmed ? 'Xác nhận tham dự thành công' : 'Đã từ chối tham dự' } as ApiResponse<any>);
    } catch (error) { next(error); }
  }
}

export default new MeetingController();
