import prisma from '@config/database';
import { AuthorizationError, NotFoundError, ValidationError } from '@utils/errors';
import { AttendanceStatus, Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import workShiftService from './workShiftService';
import { getTodayInAppTz } from '@utils/dateUtils';

const MAX_SHIFT_HOURS = 20;

export class AttendanceService {
  /**
   * Tính số giờ làm việc giữa checkIn và checkOut.
   * Hỗ trợ ca cross-midnight (Ca 3): tính đầy đủ giờ trước và sau nửa đêm.
   * Reject nếu > MAX_SHIFT_HOURS (chấm công ra quá muộn — probably wrong data).
   */
  private calculateWorkHours(checkInTime: Date | null, checkOutTime: Date): number {
    if (!checkInTime) return 0;

    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    if (diffMs <= 0) return 0;

    const hours = diffMs / (1000 * 60 * 60);
    if (hours > MAX_SHIFT_HOURS) return 0;

    return Math.round(hours * 100) / 100;
  }

  async getAttendanceByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    const attendances = await prisma.attendance.findMany({
      where: {
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
        employee: {
          status: 'ACTIVE',
        },
      },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
            subDepartment: {
              include: {
                department: true,
              },
            },
          },
        },
      },
      orderBy: [
        { attendanceDate: 'desc' },
        { employee: { employeeCode: 'asc' } },
        { checkInTime: 'asc' },
      ],
    });

    // Group by employeeId + attendanceDate, separating regular from overtime rows
    const groupMap = new Map<string, any>();

    for (const attendance of attendances) {
      const key = `${attendance.employeeId}_${attendance.attendanceDate.toISOString().split('T')[0]}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          id: attendance.id,
          ids: [attendance.id],
          regularIds: !attendance.isOvertime ? [attendance.id] : [],
          overtimeIds: attendance.isOvertime ? [attendance.id] : [],
          employeeCode: attendance.employee.employeeCode,
          employeeName: `${attendance.employee.user.lastName} ${attendance.employee.user.firstName}`.trim(),
          positionId: attendance.employee.positionId ?? null,
          positionName: attendance.employee.position?.name || '',
          departmentId: attendance.employee.subDepartment?.department?.id || attendance.employee.user.departmentId || null,
          departmentName: attendance.employee.subDepartment?.department?.name || null,
          attendanceDate: attendance.attendanceDate,
          // Regular (isOvertime === false) fields
          regularStatus: !attendance.isOvertime ? attendance.status : null,
          regularCheckInTimes: (!attendance.isOvertime && attendance.checkInTime) ? [attendance.checkInTime] : [],
          regularCheckOutTimes: (!attendance.isOvertime && attendance.checkOutTime) ? [attendance.checkOutTime] : [],
          regularHours: !attendance.isOvertime ? (attendance.workHours || 0) : 0,
          regularNotes: (!attendance.isOvertime && attendance.notes) ? [attendance.notes] : [],
          // Overtime (isOvertime === true) fields
          hasOvertime: attendance.isOvertime,
          overtimeCheckInTimes: (attendance.isOvertime && attendance.checkInTime) ? [attendance.checkInTime] : [],
          overtimeCheckOutTimes: (attendance.isOvertime && attendance.checkOutTime) ? [attendance.checkOutTime] : [],
          overtimeHours: attendance.isOvertime ? (attendance.workHours || 0) : 0,
          overtimeNotesList: (attendance.isOvertime && attendance.notes) ? [attendance.notes] : [],
        });
      } else {
        const group = groupMap.get(key)!;
        group.ids.push(attendance.id);

        if (!attendance.isOvertime) {
          group.regularIds.push(attendance.id);
          if (attendance.checkInTime) group.regularCheckInTimes.push(attendance.checkInTime);
          if (attendance.checkOutTime) group.regularCheckOutTimes.push(attendance.checkOutTime);
          group.regularHours += attendance.workHours || 0;
          if (!group.regularStatus) group.regularStatus = attendance.status;
          if (attendance.notes) group.regularNotes.push(attendance.notes);
        } else {
          group.hasOvertime = true;
          group.overtimeIds.push(attendance.id);
          if (attendance.checkInTime) group.overtimeCheckInTimes.push(attendance.checkInTime);
          if (attendance.checkOutTime) group.overtimeCheckOutTimes.push(attendance.checkOutTime);
          group.overtimeHours += attendance.workHours || 0;
          if (attendance.notes) group.overtimeNotesList.push(attendance.notes);
        }
      }
    }

    // Convert Map values to array, sort times, join notes, assign stt
    const result = Array.from(groupMap.values()).map((group, index) => {
      const regularCheckInTimes = group.regularCheckInTimes.sort((a: Date, b: Date) => a.getTime() - b.getTime());
      const regularCheckOutTimes = group.regularCheckOutTimes.sort((a: Date, b: Date) => a.getTime() - b.getTime());
      const overtimeCheckInTimes = group.overtimeCheckInTimes.sort((a: Date, b: Date) => a.getTime() - b.getTime());
      const overtimeCheckOutTimes = group.overtimeCheckOutTimes.sort((a: Date, b: Date) => a.getTime() - b.getTime());
      const overtimeNotes = group.overtimeNotesList.length > 0 ? group.overtimeNotesList.join('; ') : null;
      const regularNotes = group.regularNotes.length > 0 ? group.regularNotes.join('; ') : null;

      // Backwards-compat fields: status = regular status (or 'OVERTIME' if only overtime), workHours = regular hours only
      const status = group.regularStatus ?? 'OVERTIME';

      return {
        stt: index + 1,
        id: group.id,
        ids: group.ids,
        regularIds: group.regularIds,
        overtimeIds: group.overtimeIds,
        employeeCode: group.employeeCode,
        employeeName: group.employeeName,
        positionId: group.positionId,
        positionName: group.positionName,
        departmentId: group.departmentId,
        departmentName: group.departmentName,
        attendanceDate: group.attendanceDate,
        // Backwards-compat fields
        checkInTimes: regularCheckInTimes,
        checkOutTimes: regularCheckOutTimes,
        workHours: Math.round(group.regularHours * 100) / 100,
        status,
        notes: regularNotes,
        // New split fields
        regularStatus: group.regularStatus,
        regularHours: Math.round(group.regularHours * 100) / 100,
        regularCheckInTimes,
        regularCheckOutTimes,
        hasOvertime: group.hasOvertime,
        overtimeHours: Math.round(group.overtimeHours * 100) / 100,
        overtimeCheckInTimes,
        overtimeCheckOutTimes,
        overtimeNotes,
      };
    });

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
      isOvertime: attendance.isOvertime,
      notes: attendance.notes,
    }));
  }

  async resolveEmployeeAttendanceAccess(
    requestedEmployeeId: string,
    requester: { userId: string; role: string }
  ): Promise<string> {
    if (requester.role !== 'EMPLOYEE') {
      return requestedEmployeeId;
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: requester.userId },
      select: { id: true },
    });

    if (!employee) {
      throw new NotFoundError('Không tìm thấy thông tin nhân viên');
    }

    if (employee.id !== requestedEmployeeId) {
      throw new AuthorizationError('Bạn chỉ được xem dữ liệu điểm danh của chính mình');
    }

    return employee.id;
  }

  async checkIn(employeeId: string, checkInTime: Date, tx?: Prisma.TransactionClient): Promise<any> {
    const db = tx ?? prisma;
    const today = getTodayInAppTz();

    // Determine work shift based on check-in time
    const shiftName = await workShiftService.determineShift(checkInTime);

    // Tìm ca đang mở (chưa checkout) trong ngày
    const openAttendance = await db.attendance.findFirst({
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
      return await db.attendance.update({
        where: { id: openAttendance.id },
        data: {
          checkInTime,
          status: AttendanceStatus.PRESENT,
          notes: shiftName || openAttendance.notes,
        },
      });
    }

    // Không có ca đang mở → tạo ca mới (cho phép nhiều ca trong ngày)
    return await db.attendance.create({
      data: {
        employeeId,
        attendanceDate: today,
        checkInTime,
        status: AttendanceStatus.PRESENT,
        notes: shiftName || undefined,
      },
    });
  }

  async checkOut(employeeId: string, checkOutTime: Date, tx?: Prisma.TransactionClient): Promise<any> {
    const db = tx ?? prisma;
    const today = getTodayInAppTz();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Tìm ca đang mở (chưa checkout) — bao gồm cả hôm qua để hỗ trợ Ca 3
    // (nhân viên vào 22:00 đêm hôm trước, quẹt ra 06:00 sáng hôm sau).
    const attendance = await db.attendance.findFirst({
      where: {
        employeeId,
        attendanceDate: { in: [today, yesterday] },
        isOvertime: false,
        checkOutTime: null,
      },
      orderBy: { checkInTime: 'desc' },
    });

    if (!attendance) {
      throw new NotFoundError('Không tìm thấy ca đang mở. Vui lòng chấm công vào trước.');
    }

    const checkInTime = attendance.checkInTime;
    const workHours = this.calculateWorkHours(checkInTime, checkOutTime);

    return await db.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime,
        workHours,
      },
    });
  }

  /**
   * Đánh dấu một attendance record là "quên chấm ra": prepend note cảnh báo,
   * set workHours = 0, giữ nguyên checkOutTime = null (không có giờ ra thực).
   * Dùng khi phát hiện record cũ đã mở từ ngày trước mà nhân viên chấm công
   * vào lại — tránh nhầm với ca cross-midnight hợp lệ (Ca 3).
   */
  async markForgotten(id: string, tx?: Prisma.TransactionClient): Promise<any> {
    const db = tx ?? prisma;
    const existing = await db.attendance.findUnique({
      where: { id },
      select: { notes: true },
    });

    if (!existing) {
      throw new NotFoundError('Không tìm thấy bản ghi chấm công');
    }

    const marker = '⚠ Quên chấm ra';
    const already = existing.notes?.includes(marker) ?? false;
    const newNotes = already
      ? existing.notes
      : existing.notes && existing.notes.trim().length > 0
        ? `${marker} · ${existing.notes}`
        : marker;

    return await db.attendance.update({
      where: { id },
      data: {
        notes: newNotes,
        workHours: 0,
      },
    });
  }

  async overtimeCheckIn(employeeId: string, checkInTime: Date): Promise<any> {
    const today = getTodayInAppTz();

    const shiftName = await workShiftService.determineShift(checkInTime);
    const noteText = shiftName ? `Tăng ca — ${shiftName}` : 'Tăng ca';

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
      return await prisma.attendance.update({
        where: { id: openAttendance.id },
        data: {
          checkInTime,
          status: AttendanceStatus.OVERTIME,
          notes: openAttendance.notes ?? noteText,
        },
      });
    }

    return await prisma.attendance.create({
      data: {
        employeeId,
        attendanceDate: today,
        checkInTime,
        isOvertime: true,
        status: AttendanceStatus.OVERTIME,
        notes: noteText,
      },
    });
  }

  async overtimeCheckOut(employeeId: string, checkOutTime: Date): Promise<any> {
    const today = getTodayInAppTz();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Include yesterday để tăng ca cross-midnight vẫn khớp
    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        attendanceDate: { in: [today, yesterday] },
        isOvertime: true,
        checkOutTime: null,
      },
      orderBy: { checkInTime: 'desc' },
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
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      select: { id: true },
    });

    if (!employee) {
      throw new NotFoundError('Không tìm thấy nhân viên');
    }

    const workHours = data.workHours
      ?? (data.checkInTime && data.checkOutTime
        ? this.calculateWorkHours(data.checkInTime, data.checkOutTime)
        : 0);

    // Auto-note với shift name nếu caller không cung cấp và có checkInTime
    let notes = data.notes;
    if (!notes && data.checkInTime) {
      const shiftName = await workShiftService.determineShift(data.checkInTime);
      if (shiftName) notes = shiftName;
    }

    const attendance = await prisma.attendance.create({
      data: {
        ...data,
        notes,
        workHours,
      },
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
      employeeName: `${attendance.employee.user.lastName} ${attendance.employee.user.firstName}`.trim(),
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
        const inDate = new Date(finalCheckIn);
        const outDate = new Date(finalCheckOut);
        if (outDate.getTime() < inDate.getTime()) {
          throw new ValidationError('Giờ ra phải sau giờ vào');
        }
        data.workHours = this.calculateWorkHours(inDate, outDate);
      }
    }

    // Sync isOvertime with status so grouping in getAttendanceByDateRange stays consistent
    const updateData: typeof data & { isOvertime?: boolean } = { ...data };
    if (data.status !== undefined) {
      updateData.isOvertime = data.status === 'OVERTIME';
    }

    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: updateData,
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
      employeeName: `${updated.employee.user.lastName} ${updated.employee.user.firstName}`.trim(),
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
        user: { role: { not: 'ADMIN' } },
      };
    } else {
      where.employee = {
        user: { role: { not: 'ADMIN' } },
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
