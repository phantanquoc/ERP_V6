import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';
import { AttendanceStatus } from '@prisma/client';
import ExcelJS from 'exceljs';
import workShiftService from './workShiftService';

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
      ],
    });

    return attendances.map((attendance, index) => ({
      stt: index + 1,
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
    }));
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

    let attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_attendanceDate_isOvertime: {
          employeeId,
          attendanceDate: today,
          isOvertime: false,
        },
      },
    });

    if (!attendance) {
      attendance = await prisma.attendance.create({
        data: {
          employeeId,
          attendanceDate: today,
          checkInTime,
          status: AttendanceStatus.PRESENT,
          notes: shiftName || undefined,
        },
      });
    } else {
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkInTime,
          status: AttendanceStatus.PRESENT,
          notes: shiftName || attendance.notes,
        },
      });
    }

    return attendance;
  }

  async checkOut(employeeId: string, checkOutTime: Date): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_attendanceDate_isOvertime: {
          employeeId,
          attendanceDate: today,
          isOvertime: false,
        },
      },
    });

    if (!attendance) {
      throw new NotFoundError('Attendance record not found for today');
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

    let attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_attendanceDate_isOvertime: {
          employeeId,
          attendanceDate: today,
          isOvertime: true,
        },
      },
    });

    if (!attendance) {
      attendance = await prisma.attendance.create({
        data: {
          employeeId,
          attendanceDate: today,
          checkInTime,
          isOvertime: true,
          status: AttendanceStatus.OVERTIME,
        },
      });
    } else {
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkInTime,
          status: AttendanceStatus.OVERTIME,
        },
      });
    }

    return attendance;
  }

  async overtimeCheckOut(employeeId: string, checkOutTime: Date): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_attendanceDate_isOvertime: {
          employeeId,
          attendanceDate: today,
          isOvertime: true,
        },
      },
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

