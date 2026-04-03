import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';
import { AttendanceStatus } from '@prisma/client';
import ExcelJS from 'exceljs';
import workShiftService from './workShiftService';
import notificationService from './notificationService';
import { NotificationType } from '@types';
import logger from '@config/logger';

export class AttendanceService {
  /**
   * Tính số giờ làm việc giữa checkIn và checkOut.
   * Dùng cùng ngày calendar (local) để tránh lệch 24h do timezone.
   */
  private calculateWorkHours(checkInTime: Date | null, checkOutTime: Date): number {
    if (!checkInTime) return 0;

    // Đảm bảo so sánh cùng ngày: lấy giờ/phút/giây local
    const inDate = new Date(checkInTime);
    const outDate = new Date(checkOutTime);

    // Nếu checkIn và checkOut khác ngày calendar (local), chỉ tính từ 00:00 ngày checkOut
    const sameDay =
      inDate.getFullYear() === outDate.getFullYear() &&
      inDate.getMonth() === outDate.getMonth() &&
      inDate.getDate() === outDate.getDate();

    const effectiveCheckIn = sameDay ? inDate : new Date(outDate.getFullYear(), outDate.getMonth(), outDate.getDate(), 0, 0, 0, 0);

    const diffMs = outDate.getTime() - effectiveCheckIn.getTime();
    const hours = Math.max(0, diffMs / (1000 * 60 * 60));
    return Math.round(hours * 100) / 100; // Round to 2 decimal places
  }

  async getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    const attendances = await prisma.attendance.findMany({
      where: {
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
      },
      orderBy: [
        { attendanceDate: 'desc' },
        { employee: { employeeCode: 'asc' } },
        { checkInTime: 'asc' },
      ],
    });

    // Group by employeeId + attendanceDate so that 1 employee + 1 day = 1 row
    const statusPriority: Record<string, number> = {
      ABSENT: 5,
      LATE: 4,
      ON_LEAVE: 3,
      OVERTIME: 2,
      PRESENT: 1,
    };

    const groupMap = new Map<string, any>();

    for (const attendance of attendances) {
      const key = `${attendance.employeeId}_${attendance.attendanceDate.toISOString().split('T')[0]}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          id: attendance.id,
          ids: [attendance.id],
          employeeCode: attendance.employee.employeeCode,
          employeeName: `${attendance.employee.user.firstName} ${attendance.employee.user.lastName}`.trim(),
          positionName: attendance.employee.position?.name || '',
          attendanceDate: attendance.attendanceDate,
          checkInTimes: attendance.checkInTime ? [attendance.checkInTime] : [],
          checkOutTimes: attendance.checkOutTime ? [attendance.checkOutTime] : [],
          workHours: attendance.workHours || 0,
          status: attendance.status,
          notes: attendance.notes ? [attendance.notes] : [],
        });
      } else {
        const group = groupMap.get(key)!;
        group.ids.push(attendance.id);
        if (attendance.checkInTime) {
          group.checkInTimes.push(attendance.checkInTime);
        }
        if (attendance.checkOutTime) {
          group.checkOutTimes.push(attendance.checkOutTime);
        }
        group.workHours += attendance.workHours || 0;
        // Take the most significant status
        if ((statusPriority[attendance.status] || 0) > (statusPriority[group.status] || 0)) {
          group.status = attendance.status;
        }
        if (attendance.notes) {
          group.notes.push(attendance.notes);
        }
      }
    }

    // Convert Map values to array, sort times, join notes, assign stt
    const result = Array.from(groupMap.values()).map((group, index) => ({
      stt: index + 1,
      id: group.id,
      ids: group.ids,
      employeeCode: group.employeeCode,
      employeeName: group.employeeName,
      positionName: group.positionName,
      attendanceDate: group.attendanceDate,
      checkInTimes: group.checkInTimes.sort((a: Date, b: Date) => a.getTime() - b.getTime()),
      checkOutTimes: group.checkOutTimes.sort((a: Date, b: Date) => a.getTime() - b.getTime()),
      workHours: Math.round(group.workHours * 100) / 100,
      status: group.status,
      notes: group.notes.length > 0 ? group.notes.join('; ') : null,
    }));

    return result;
  }

  async getEmployeeAttendance(employeeId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId,
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        attendanceDate: 'desc',
      },
    });

    return attendances.map((attendance, index) => ({
      stt: index + 1,
      id: attendance.id,
      attendanceDate: attendance.attendanceDate,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      workHours: attendance.workHours,
      status: attendance.status,
      notes: attendance.notes,
    }));
  }

  async checkIn(employeeId: string, checkInTime: Date): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Determine work shift based on check-in time
    const shiftName = await workShiftService.determineShift(checkInTime);

    // Tìm ca đang mở (chưa checkout) trong ngày
    const openAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        attendanceDate: today,
        isOvertime: false,
        checkOutTime: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (openAttendance) {
      // Có ca đang mở → cập nhật giờ checkin
      return await prisma.attendance.update({
        where: { id: openAttendance.id },
        data: {
          checkInTime,
          status: AttendanceStatus.PRESENT,
          notes: shiftName || openAttendance.notes,
        },
      });
    }

    // Không có ca đang mở → tạo ca mới (cho phép nhiều ca trong ngày)
    return await prisma.attendance.create({
      data: {
        employeeId,
        attendanceDate: today,
        checkInTime,
        status: AttendanceStatus.PRESENT,
        notes: shiftName || undefined,
      },
    });
  }

  async checkOut(employeeId: string, checkOutTime: Date): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tìm ca đang mở (chưa checkout) trong ngày
    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        attendanceDate: today,
        isOvertime: false,
        checkOutTime: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!attendance) {
      throw new NotFoundError('Không tìm thấy ca đang mở. Vui lòng chấm công vào trước.');
    }

    const checkInTime = attendance.checkInTime;
    const workHours = this.calculateWorkHours(checkInTime, checkOutTime);

    return await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime,
        workHours,
      },
    });
  }

  async overtimeCheckIn(employeeId: string, checkInTime: Date): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tìm ca tăng ca đang mở (chưa checkout)
    const openAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        attendanceDate: today,
        isOvertime: true,
        checkOutTime: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (openAttendance) {
      // Cập nhật ca tăng ca đang mở
      return await prisma.attendance.update({
        where: { id: openAttendance.id },
        data: {
          checkInTime,
          status: AttendanceStatus.OVERTIME,
        },
      });
    }

    // Tạo ca tăng ca mới
    return await prisma.attendance.create({
      data: {
        employeeId,
        attendanceDate: today,
        checkInTime,
        isOvertime: true,
        status: AttendanceStatus.OVERTIME,
      },
    });
  }

  async overtimeCheckOut(employeeId: string, checkOutTime: Date): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tìm ca tăng ca đang mở (chưa checkout)
    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        attendanceDate: today,
        isOvertime: true,
        checkOutTime: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!attendance) {
      throw new NotFoundError('Chưa chấm công tăng ca vào. Vui lòng chấm công tăng ca vào trước.');
    }

    const checkInTime = attendance.checkInTime;
    const workHours = this.calculateWorkHours(checkInTime, checkOutTime);

    return await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime,
        workHours,
      },
    });
  }

  async createAttendance(data: {
    employeeId: string;
    attendanceDate: Date;
    checkInTime?: Date;
    checkOutTime?: Date;
    workHours?: number;
    status: AttendanceStatus;
    notes?: string;
  }): Promise<any> {
    const attendance = await prisma.attendance.create({
      data,
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
      },
    });

    // ⚠️ SECURITY: Notify employee + supervisor when manually marked as LATE
    if (data.status === AttendanceStatus.LATE) {
      void this.notifyLateAttendance(data.employeeId);
    }

    return {
      id: attendance.id,
      employeeCode: attendance.employee.employeeCode,
      employeeName: `${attendance.employee.user.firstName} ${attendance.employee.user.lastName}`.trim(),
      positionName: attendance.employee.position?.name || '',
      attendanceDate: attendance.attendanceDate,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      workHours: attendance.workHours,
      status: attendance.status,
      notes: attendance.notes,
    };
  }

  /** Notify the employee and their supervisor when attendance is manually marked as LATE. */
  private async notifyLateAttendance(employeeId: string): Promise<void> {
    try {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          subDepartment: { include: { department: true } },
        },
      });
      if (!employee) return;

      const empName = `${employee.user.firstName} ${employee.user.lastName}`;

      // Notify the employee themselves
      await notificationService.createNotification({
        userId: employee.user.id,
        type: NotificationType.ATTENDANCE_REMINDER,
        title: '⚠️ Chấm công muộn',
        message: 'Bạn đã được ghi nhận đến muộn hôm nay. Vui lòng lưu ý giờ giấc.',
      });

      // Notify supervisors (DEPARTMENT_HEAD / TEAM_LEAD) in the same department
      if (employee.subDepartment?.departmentId) {
        const supervisors = await prisma.user.findMany({
          where: {
            role: { in: ['DEPARTMENT_HEAD', 'TEAM_LEAD'] },
            employees: {
              subDepartment: { departmentId: employee.subDepartment.departmentId },
            },
          },
          select: { id: true },
        });

        await Promise.allSettled(supervisors.map(sup =>
          notificationService.createNotification({
            userId: sup.id,
            type: NotificationType.ATTENDANCE_REMINDER,
            title: '⚠️ Nhân viên đến muộn',
            message: `${empName} đã được ghi nhận chấm công muộn hôm nay.`,
          })
        ));
      }
    } catch (error) {
      logger.error('❌ Error sending late attendance notification:', error);
    }
  }

  async updateAttendance(
    attendanceId: string,
    data: {
      checkInTime?: Date;
      checkOutTime?: Date;
      workHours?: number;
      status?: AttendanceStatus;
      notes?: string;
    }
  ): Promise<any> {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundError('Attendance record not found');
    }

    // Recalculate workHours if checkInTime or checkOutTime is being updated
    if (data.checkInTime !== undefined || data.checkOutTime !== undefined) {
      const finalCheckIn = data.checkInTime ?? attendance.checkInTime;
      const finalCheckOut = data.checkOutTime ?? attendance.checkOutTime;

      if (finalCheckIn && finalCheckOut) {
        const diffMs = new Date(finalCheckOut).getTime() - new Date(finalCheckIn).getTime();
        data.workHours = diffMs / (1000 * 60 * 60);
      }
    }

    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data,
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      employeeCode: updated.employee.employeeCode,
      employeeName: `${updated.employee.user.firstName} ${updated.employee.user.lastName}`.trim(),
      positionName: updated.employee.position?.name || '',
      attendanceDate: updated.attendanceDate,
      checkInTime: updated.checkInTime,
      checkOutTime: updated.checkOutTime,
      workHours: updated.workHours,
      status: updated.status,
      notes: updated.notes,
    };
  }

  async deleteAttendance(attendanceId: string): Promise<void> {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundError('Attendance record not found');
    }

    await prisma.attendance.delete({
      where: { id: attendanceId },
    });
  }

  async getDailySummary(date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        subDepartment: { select: { name: true } },
        position: { select: { name: true } },
      },
    });

    // Get all attendances for this date
    const attendances = await prisma.attendance.findMany({
      where: {
        attendanceDate: { gte: dayStart, lte: dayEnd },
      },
      include: {
        employee: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            subDepartment: { select: { name: true } },
            position: { select: { name: true } },
          },
        },
      },
    });

    // Group attendances
    const present_out: any[] = [];  // has checkOut
    const present: any[] = [];       // checkIn only
    const absentIds = new Set(employees.map(e => e.id));

    for (const att of attendances) {
      absentIds.delete(att.employeeId);
      if (att.checkOutTime) {
        present_out.push(this.formatAttendanceCard(att));
      } else {
        present.push(this.formatAttendanceCard(att));
      }
    }

    const absent = employees
      .filter(e => absentIds.has(e.id))
      .map(e => ({
        employeeId: e.id,
        employeeCode: e.employeeCode,
        firstName: e.user.firstName,
        lastName: e.user.lastName,
        department: e.subDepartment?.name || '',
        position: e.position?.name || '',
        userId: e.user.id,
      }));

    return {
      date: date.toISOString().split('T')[0],
      summary: {
        totalEmployees: employees.length,
        present: present.length,
        present_out: present_out.length,
        absent: absent.length,
      },
      employees: { present, present_out, absent },
    };
  }

  private formatAttendanceCard(att: any) {
    const getTime = (t: Date | string | null) => t ? new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null;
    return {
      employeeId: att.employee.id,
      employeeCode: att.employee.employeeCode,
      firstName: att.employee.user.firstName,
      lastName: att.employee.user.lastName,
      department: att.employee.subDepartment?.name || '',
      position: att.employee.position?.name || '',
      checkInTime: getTime(att.checkInTime),
      checkOutTime: getTime(att.checkOutTime),
      workHours: att.workHours,
      lastCheckTime: getTime(att.checkOutTime || att.checkInTime),
      userId: att.employee.user.id,
    };
  }

  async getOvertimeAttendances(query: {
    search?: string;
    page?: number;
    limit?: number;
    month?: string; // "YYYY-MM"
    planId?: string;
  }): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const pageNum = Math.max(1, parseInt(String(query.page || 1), 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(query.limit || 10), 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      OR: [
        { status: AttendanceStatus.OVERTIME },
        { isOvertime: true },
      ],
    };

    if (query.planId) {
      where.overtimePlanId = query.planId;
    }

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      where.attendanceDate = { gte: startDate, lte: endDate };
    }

    if (query.search) {
      where.employee = {
        OR: [
          { employeeCode: { contains: query.search, mode: 'insensitive' } },
          { user: { firstName: { contains: query.search, mode: 'insensitive' } } },
          { user: { lastName: { contains: query.search, mode: 'insensitive' } } },
        ],
      };
    }

    const [total, records] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        include: {
          employee: {
            include: {
              user: { select: { firstName: true, lastName: true } },
              subDepartment: { select: { name: true } },
            },
          },
        },
        orderBy: { attendanceDate: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    const data = records.map((att) => ({
      id: att.id,
      employeeCode: (att.employee as any).employeeCode,
      employeeName: `${(att.employee as any).user.firstName} ${(att.employee as any).user.lastName}`.trim(),
      subDepartmentName: (att.employee as any).subDepartment?.name || '',
      attendanceDate: att.attendanceDate,
      checkInTime: att.checkInTime,
      checkOutTime: att.checkOutTime,
      workHours: att.workHours,
      status: att.status,
      isOvertime: att.isOvertime,
      overtimePlanId: att.overtimePlanId,
      notes: att.notes,
    }));

    return { data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) };
  }

  async getAbsentEmployees(date: Date) {
    const dayStart = new Date(date); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(date); dayEnd.setHours(23,59,59,999);
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: { user: true },
    });
    const checkedIn = await prisma.attendance.findMany({
      where: { attendanceDate: { gte: dayStart, lte: dayEnd } },
      select: { employeeId: true },
    });
    const checkedInIds = new Set(checkedIn.map(a => a.employeeId));
    return employees.filter(e => !checkedInIds.has(e.id));
  }

  async getPresentNotOutEmployees(date: Date) {
    const dayStart = new Date(date); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(date); dayEnd.setHours(23,59,59,999);
    return prisma.attendance.findMany({
      where: {
        attendanceDate: { gte: dayStart, lte: dayEnd },
        checkInTime: { not: null },
        checkOutTime: null,
      },
      include: { employee: { include: { user: true } } },
    });
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};

    if (filters?.search) {
      where.employee = {
        OR: [
          { employeeCode: { contains: filters.search, mode: 'insensitive' } },
          { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
          { user: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        ],
      };
    }

    const data = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
      },
      orderBy: [
        { attendanceDate: 'desc' },
        { employee: { employeeCode: 'asc' } },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bảng chấm công');

    worksheet.columns = [
      { header: 'Mã NV', key: 'employeeCode', width: 15 },
      { header: 'Họ tên', key: 'fullName', width: 25 },
      { header: 'Chức vụ', key: 'position', width: 20 },
      { header: 'Ngày', key: 'date', width: 18 },
      { header: 'Giờ vào', key: 'checkIn', width: 15 },
      { header: 'Giờ ra', key: 'checkOut', width: 15 },
      { header: 'Số giờ làm', key: 'workHours', width: 15 },
      { header: 'Trạng thái', key: 'status', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((att) => {
      const fullName = `${att.employee.user.lastName} ${att.employee.user.firstName}`;

      let statusText = '';
      switch (att.status) {
        case 'PRESENT': statusText = 'Đúng giờ'; break;
        case 'LATE': statusText = 'Muộn'; break;
        case 'ABSENT': statusText = 'Vắng mặt'; break;
        case 'ON_LEAVE': statusText = 'Nghỉ phép'; break;
        case 'OVERTIME': statusText = 'Tăng ca'; break;
        default: statusText = att.status;
      }

      worksheet.addRow({
        employeeCode: att.employee.employeeCode,
        fullName,
        position: att.employee.position?.name || '',
        date: att.attendanceDate ? new Date(att.attendanceDate).toLocaleDateString('vi-VN') : '',
        checkIn: att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString('vi-VN') : '',
        checkOut: att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString('vi-VN') : '',
        workHours: att.workHours ? Number(att.workHours).toFixed(2) : '0',
        status: statusText,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new AttendanceService();

