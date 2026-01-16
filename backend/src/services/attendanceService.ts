import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';
import { AttendanceStatus } from '@prisma/client';

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
}

export default new AttendanceService();

