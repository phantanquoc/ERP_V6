import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';
import { AttendanceStatus } from '@prisma/client';
import ExcelJS from 'exceljs';

export class AttendanceService {
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

    let attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_attendanceDate: {
          employeeId,
          attendanceDate: today,
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
        },
      });
    } else {
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkInTime,
          status: AttendanceStatus.PRESENT,
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
        employeeId_attendanceDate: {
          employeeId,
          attendanceDate: today,
        },
      },
    });

    if (!attendance) {
      throw new NotFoundError('Attendance record not found for today');
    }

    const checkInTime = attendance.checkInTime;
    let workHours = 0;

    if (checkInTime) {
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      workHours = diffMs / (1000 * 60 * 60); // Convert to hours
    }

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
        case 'PRESENT': statusText = 'Có mặt'; break;
        case 'ABSENT': statusText = 'Vắng'; break;
        case 'LATE': statusText = 'Đi trễ'; break;
        case 'EARLY': statusText = 'Về sớm'; break;
        case 'ON_LEAVE': statusText = 'Nghỉ phép'; break;
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

