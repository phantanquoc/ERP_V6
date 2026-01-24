import { Request, Response, NextFunction } from 'express';
import leaveRequestService from '@services/leaveRequestService';

export class LeaveRequestController {
  /**
   * Create a new leave request
   */
  async createLeaveRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const leaveRequest = await leaveRequestService.createLeaveRequest(req.body);

      res.status(201).json({
        success: true,
        message: 'Leave request created successfully',
        data: leaveRequest,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all leave requests
   */
  async getAllLeaveRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const filters: any = {};

      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      if (req.query.employeeId) {
        filters.employeeId = req.query.employeeId as string;
      }
      if (req.query.leaveType) {
        filters.leaveType = req.query.leaveType as string;
      }

      const result = await leaveRequestService.getAllLeaveRequests(page, limit, filters);

      res.json({
        success: true,
        message: 'Leave requests retrieved successfully',
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leave request by ID
   */
  async getLeaveRequestById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const leaveRequest = await leaveRequestService.getLeaveRequestById(id);

      res.json({
        success: true,
        message: 'Leave request retrieved successfully',
        data: leaveRequest,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve leave request
   */
  async approveLeaveRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { approvedBy } = req.body;

      const leaveRequest = await leaveRequestService.approveLeaveRequest(id, approvedBy);

      res.json({
        success: true,
        message: 'Leave request approved successfully',
        data: leaveRequest,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject leave request
   */
  async rejectLeaveRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { approvedBy, rejectionReason } = req.body;

      const leaveRequest = await leaveRequestService.rejectLeaveRequest(id, approvedBy, rejectionReason);

      res.json({
        success: true,
        message: 'Leave request rejected successfully',
        data: leaveRequest,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export leave requests to Excel
   */
  async exportToExcel(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('📥 Export Excel request received');
      const filters: any = {};

      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      if (req.query.employeeId) {
        filters.employeeId = req.query.employeeId as string;
      }
      if (req.query.leaveType) {
        filters.leaveType = req.query.leaveType as string;
      }

      console.log('🔍 Filters:', filters);
      const buffer = await leaveRequestService.exportToExcel(filters);
      console.log('✅ Buffer generated, size:', buffer.length);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-don-nghi-phep-${Date.now()}.xlsx`);
      res.send(buffer);
      console.log('✅ File sent to client');
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      next(error);
    }
  }
}

export default new LeaveRequestController();

