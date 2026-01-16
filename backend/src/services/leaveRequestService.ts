import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import type { PaginatedResponse } from '@types';
import ExcelJS from 'exceljs';

export class LeaveRequestService {
  /**
   * Generate leave request code
   * Format: NP-{SEQUENCE}
   * Example: NP-001, NP-002
   */
  async generateLeaveRequestCode(): Promise<string> {
    const lastRequest = await prisma.leaveRequest.findFirst({
      where: {
        code: {
          startsWith: 'NP-',
        },
      },
      orderBy: {
        code: 'desc',
      },
    });

    let sequence = 1;
    if (lastRequest) {
      const lastCode = lastRequest.code;
      const sequenceStr = lastCode.replace('NP-', '');
      if (sequenceStr) {
        sequence = parseInt(sequenceStr, 10) + 1;
      }
    }

    return `NP-${String(sequence).padStart(3, '0')}`;
  }

  /**
   * Create a new leave request
   */
  async createLeaveRequest(data: any) {
    const code = await this.generateLeaveRequestCode();

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        code,
        employeeId: data.employeeId,
        leaveType: data.leaveType,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        startTime: data.startTime,
        endTime: data.endTime,
        isHalfDay: data.isHalfDay || false,
        halfDayPeriod: data.halfDayPeriod,
        reason: data.reason,
        attachments: data.attachments || [],
        status: 'PENDING',
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            position: true,
            subDepartment: true,
          },
        },
      },
    });

    // Create notification for Quality Personnel department
    await this.createNotificationForQualityPersonnel(leaveRequest);

    return leaveRequest;
  }

  /**
   * Get all leave requests with pagination
   */
  async getAllLeaveRequests(
    page: number = 1,
    limit: number = 10,
    filters?: any
  ): Promise<PaginatedResponse<any>> {
    const { skip, limit: take } = getPaginationParams(page, limit);

    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.leaveType) {
      where.leaveType = filters.leaveType;
    }

    const [data, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip,
        take,
        include: {
          employee: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              position: true,
              subDepartment: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: calculateTotalPages(total, limit),
    };
  }

  /**
   * Get leave request by ID
   */
  async getLeaveRequestById(id: string) {
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            position: true,
            subDepartment: true,
          },
        },
      },
    });

    if (!leaveRequest) {
      throw new NotFoundError('Leave request not found');
    }

    return leaveRequest;
  }

  /**
   * Approve leave request
   */
  async approveLeaveRequest(id: string, approvedBy: string) {
    const leaveRequest = await this.getLeaveRequestById(id);

    if (leaveRequest.status !== 'PENDING') {
      throw new ValidationError('Leave request is already processed');
    }

    const updatedRequest = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Create notification for employee
    await this.createNotificationForEmployee(updatedRequest, 'APPROVED');

    return updatedRequest;
  }

  /**
   * Reject leave request
   */
  async rejectLeaveRequest(id: string, approvedBy: string, rejectionReason: string) {
    const leaveRequest = await this.getLeaveRequestById(id);

    if (leaveRequest.status !== 'PENDING') {
      throw new ValidationError('Leave request is already processed');
    }

    const updatedRequest = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedBy,
        approvedAt: new Date(),
        rejectionReason,
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Create notification for employee
    await this.createNotificationForEmployee(updatedRequest, 'REJECTED');

    return updatedRequest;
  }

  /**
   * Create notification for Quality Personnel department
   */
  private async createNotificationForQualityPersonnel(leaveRequest: any) {
    // Find all employees in Quality Personnel department
    const qualityPersonnel = await prisma.employee.findMany({
      where: {
        subDepartment: {
          code: 'QUALITY_PERSONNEL',
        },
      },
    });

    // Create notifications for all Quality Personnel employees
    const notifications = qualityPersonnel.map((employee) => ({
      employeeId: employee.id,
      type: 'LEAVE_REQUEST',
      title: 'Đơn nghỉ phép mới',
      message: `${leaveRequest.employee.user.firstName} ${leaveRequest.employee.user.lastName} đã gửi đơn nghỉ phép ${this.getLeaveTypeLabel(leaveRequest.leaveType)}`,
      isRead: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });
  }

  /**
   * Create notification for employee
   */
  private async createNotificationForEmployee(leaveRequest: any, status: 'APPROVED' | 'REJECTED') {
    const message = status === 'APPROVED'
      ? `Đơn nghỉ phép ${leaveRequest.code} của bạn đã được phê duyệt`
      : `Đơn nghỉ phép ${leaveRequest.code} của bạn đã bị từ chối`;

    await prisma.notification.create({
      data: {
        employeeId: leaveRequest.employeeId,
        type: 'LEAVE_REQUEST_RESPONSE',
        title: status === 'APPROVED' ? 'Đơn nghỉ phép được duyệt' : 'Đơn nghỉ phép bị từ chối',
        message,
        isRead: false,
      },
    });
  }

  /**
   * Get leave type label in Vietnamese
   */
  private getLeaveTypeLabel(leaveType: string): string {
    const labels: Record<string, string> = {
      ANNUAL: 'nghỉ phép năm',
      SICK: 'nghỉ ốm',
      PERSONAL: 'nghỉ việc riêng',
      MATERNITY: 'nghỉ thai sản',
      EMERGENCY: 'nghỉ khẩn cấp',
      COMPENSATORY: 'nghỉ bù',
    };
    return labels[leaveType] || leaveType;
  }

  /**
   * Export leave requests to Excel
   */
  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }
    if (filters?.leaveType) {
      where.leaveType = filters.leaveType;
    }

    const data = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            position: true,
            subDepartment: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('📊 Found leave requests:', data.length);

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách đơn nghỉ phép');

    // Define columns
    worksheet.columns = [
      { header: 'Mã đơn', key: 'code', width: 15 },
      { header: 'Nhân viên', key: 'employeeName', width: 25 },
      { header: 'Loại nghỉ', key: 'leaveType', width: 20 },
      { header: 'Thời gian', key: 'duration', width: 30 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
      { header: 'Lý do', key: 'reason', width: 40 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    data.forEach((request) => {
      const employeeName = `${request.employee.user.lastName} ${request.employee.user.firstName}`;
      const startDate = new Date(request.startDate).toLocaleDateString('vi-VN');
      const endDate = new Date(request.endDate).toLocaleDateString('vi-VN');
      const duration = `${startDate} - ${endDate}`;

      let statusText = '';
      switch (request.status) {
        case 'PENDING':
          statusText = 'Chờ duyệt';
          break;
        case 'APPROVED':
          statusText = 'Đã duyệt';
          break;
        case 'REJECTED':
          statusText = 'Từ chối';
          break;
        default:
          statusText = request.status;
      }

      worksheet.addRow({
        code: request.code,
        employeeName,
        leaveType: this.getLeaveTypeLabel(request.leaveType),
        duration,
        status: statusText,
        createdAt: new Date(request.createdAt).toLocaleDateString('vi-VN'),
        reason: request.reason,
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new LeaveRequestService();

