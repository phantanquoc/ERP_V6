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

  async exportToExcelCalendar(filters: {
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
    search?: string;
    departmentId?: string;
    positionId?: string;
  }): Promise<Buffer> {
    // Derive start/end from month/year if provided
    let startDate: Date;
    let endDate: Date;

    if (filters.month && filters.year) {
      startDate = new Date(filters.year, filters.month - 1, 1);
      endDate = new Date(filters.year, filters.month, 0, 23, 59, 59);
    } else if (filters.startDate && filters.endDate) {
      startDate = new Date(filters.startDate);
      endDate = new Date(filters.endDate);
    } else {
      throw new ValidationError('Cần cung cấp month/year hoặc startDate/endDate');
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new ValidationError('Ngày không hợp lệ');
    }

    const month = filters.month || (startDate.getMonth() + 1);
    const year = filters.year || startDate.getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();

    // Build day list
    const days: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }

    // Employee filter (exclude ADMIN)
    const employeeWhere: any = {
      status: 'ACTIVE',
      user: { role: { not: 'ADMIN' } },
    };

    if (filters.positionId) {
      employeeWhere.positionId = filters.positionId;
    }
    if (filters.departmentId) {
      employeeWhere.OR = [
        { user: { departmentId: filters.departmentId } },
        { subDepartment: { departmentId: filters.departmentId } },
      ];
    }
    if (filters.search) {
      const searchConds: any[] = [
        { employeeCode: { contains: filters.search, mode: 'insensitive' } },
        { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      ];
      if (employeeWhere.OR) {
        employeeWhere.AND = [{ OR: employeeWhere.OR }, { OR: searchConds }];
        delete employeeWhere.OR;
      } else {
        employeeWhere.OR = searchConds;
      }
    }

    // Fetch holidays for the entire year (for the holiday list block)
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    // Fetch all data in parallel
    const [allEmployees, attendances, leaveRequests, persistedCells, yearHolidays, attendanceCodes, settings] = await Promise.all([
      prisma.employee.findMany({
        where: employeeWhere,
        include: { user: true, position: true, subDepartment: { include: { department: true } } },
        orderBy: { employeeCode: 'asc' },
      }),
      prisma.attendance.findMany({
        where: { attendanceDate: { gte: startDate, lte: endDate }, employee: employeeWhere },
      }),
      prisma.leaveRequest.findMany({
        where: { status: 'APPROVED', startDate: { lte: endDate }, endDate: { gte: startDate } },
      }),
      prisma.timesheetCell.findMany({
        where: { date: { gte: startDate, lte: endDate }, employee: employeeWhere },
      }),
      prisma.holiday.findMany({ where: { date: { gte: yearStart, lte: yearEnd } }, orderBy: { date: 'asc' } }),
      prisma.attendanceCode.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.payrollSettings.findFirst(),
    ]);

    // Month holidays for attendance logic
    const monthHolidays = yearHolidays.filter(h => {
      const hd = h.date;
      return hd >= startDate && hd <= endDate;
    });
    const holidaySet = new Set(monthHolidays.map(h => h.date.toISOString().split('T')[0]));

    // Index persisted cells
    const cellMap = new Map<string, typeof persistedCells[0]>();
    for (const cell of persistedCells) {
      cellMap.set(`${cell.employeeId}_${cell.date.toISOString().split('T')[0]}`, cell);
    }

    // Index attendances
    const attMap = new Map<string, typeof attendances>();
    for (const att of attendances) {
      const key = `${att.employeeId}_${att.attendanceDate.toISOString().split('T')[0]}`;
      if (!attMap.has(key)) attMap.set(key, []);
      attMap.get(key)!.push(att);
    }
    // Index leave requests
    const leaveMap = new Map<string, typeof leaveRequests>();
    for (const lr of leaveRequests) {
      if (!leaveMap.has(lr.employeeId)) leaveMap.set(lr.employeeId, []);
      leaveMap.get(lr.employeeId)!.push(lr);
    }

    // Code maps
    const leaveCodeMap: Record<string, string> = { ANNUAL: 'P', SICK: 'B', MATERNITY: 'TS', COMPENSATORY: 'BU', PERSONAL: 'KL', EMERGENCY: 'KL' };
    const statusCodeMap: Record<string, string> = { PRESENT: 'x', LATE: 'x', ABSENT: 'O' };
    const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    // Department name map
    const userDeptIds = allEmployees.map(e => (e.user as any)?.departmentId).filter(Boolean);
    const departmentNameById = new Map<string, string>();
    if (userDeptIds.length > 0) {
      const depts = await prisma.department.findMany({ where: { id: { in: [...new Set(userDeptIds)] } }, select: { id: true, name: true } });
      depts.forEach(d => departmentNameById.set(d.id, d.name));
    }

    // Helper: column number from letter (A=1)
    const colNum = (letter: string): number => {
      let n = 0;
      for (let i = 0; i < letter.length; i++) {
        n = n * 26 + (letter.charCodeAt(i) - 64);
      }
      return n;
    };

    // Helper: format date as DD/MM/YYYY
    const formatDateVN = (d: Date): string => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getFullYear()}`;
    };

    // Build employee rows with cells
    type EmpRow = {
      code: string; name: string; position: string; dept: string; hireDate: Date;
      baseSalary: number; kmDistance: number; leaveBalance: number;
      cells: Map<string, { code: string; note: string | null; workHours: number; otHours: number }>;
    };

    const empRows: EmpRow[] = allEmployees.map(emp => {
      const deptName = emp.subDepartment?.department?.name || ((emp.user as any)?.departmentId ? departmentNameById.get((emp.user as any).departmentId) ?? '' : '');
      const row: EmpRow = {
        code: emp.employeeCode,
        name: `${(emp.user as any).lastName} ${(emp.user as any).firstName}`.trim(),
        position: emp.position?.name || '',
        dept: deptName,
        hireDate: emp.hireDate,
        baseSalary: emp.baseSalary,
        kmDistance: emp.kmDistance ?? 0,
        leaveBalance: emp.leaveBalanceCarryOver ?? 0,
        cells: new Map(),
      };
      for (const dateStr of days) {
        const cellKey = `${emp.id}_${dateStr}`;
        const persisted = cellMap.get(cellKey);
        if (persisted) {
          row.cells.set(dateStr, { code: persisted.code, note: persisted.note, workHours: persisted.workHours, otHours: persisted.overtimeHours });
          continue;
        }
        const dayAtts = attMap.get(cellKey) || [];
        let code = '';
        let wh = 0;
        let ot = 0;
        for (const att of dayAtts) {
          if (att.isOvertime) { ot += att.workHours || 0; }
          else {
            wh += att.workHours || 0;
            if (!code) {
              if (att.status === 'ON_LEAVE') {
                const empLeaves = leaveMap.get(emp.id) || [];
                const match = empLeaves.find(lr => { const s = lr.startDate.toISOString().split('T')[0]; const e = lr.endDate.toISOString().split('T')[0]; return dateStr >= s && dateStr <= e; });
                code = match ? (leaveCodeMap[match.leaveType] || 'P') : 'P';
              } else { code = statusCodeMap[att.status] || ''; }
            }
          }
        }
        if (code || wh > 0 || ot > 0) row.cells.set(dateStr, { code: code || 'x', note: null, workHours: wh, otHours: ot });
      }
      return row;
    });

    // Sort rows by department then name
    empRows.sort((a, b) => {
      if (a.dept !== b.dept) { if (!a.dept) return 1; if (!b.dept) return -1; return a.dept.localeCompare(b.dept, 'vi'); }
      return a.name.localeCompare(b.name, 'vi') || a.code.localeCompare(b.code);
    });

    const standardWorkDays = settings?.standardWorkDays || 26;
    const workCodes = new Set(['x', 'ON', 'TV', 'N']);
    const payableLeaveCodes = new Set(['P', 'P/2', 'BU', 'CD', 'TS']);

    const COL_D = colNum('D'); // 4
    const COL_E = colNum('E'); // 5
    const COL_F = colNum('F'); // 6
    const COL_G = colNum('G'); // 7
    const COL_H = colNum('H'); // 8
    const COL_I = colNum('I'); // 9
    const COL_J = colNum('J'); // 10 — first day column

    // ═══ WORKBOOK ═══
    const workbook = new ExcelJS.Workbook();
    // ═══════════════════════════════════════════════════════
    // ───── Sheet 1: CHẤM CÔNG (67 columns A..BO) ─────
    // ═══════════════════════════════════════════════════════
    const ws1 = workbook.addWorksheet('CHẤM CÔNG');

    // Row 1: Company name
    ws1.mergeCells('A1:H1');
    ws1.getCell('A1').value = 'CÔNG TY TNHH AN BÌNH FOODS';
    ws1.getCell('A1').font = { bold: true, size: 12 };

    // Row 3: Title
    ws1.mergeCells('E3:AN3');
    ws1.getCell('E3').value = `BẢNG CHẤM CÔNG THÁNG ${String(month).padStart(2, '0')}/${year}`;
    ws1.getCell('E3').font = { bold: true, size: 14 };
    ws1.getCell('E3').alignment = { horizontal: 'center' };

    // Holiday list block (columns A & B, starting row 6)
    ws1.mergeCells('A6:B6');
    ws1.getCell('A6').value = `NGÀY LỄ, TẾT ${year}`;
    ws1.getCell('A6').font = { bold: true, size: 10 };
    let holidayRowIdx = 7;
    for (const h of yearHolidays) {
      ws1.getCell(`A${holidayRowIdx}`).value = h.name;
      ws1.getCell(`B${holidayRowIdx}`).value = formatDateVN(h.date);
      holidayRowIdx++;
    }

    // Identity columns (D..I) header in rows 6-8, merged vertically
    const idHeaders: Array<{ col: string; label: string }> = [
      { col: 'D', label: 'STT' },
      { col: 'E', label: 'MSNV' },
      { col: 'F', label: 'Họ và Tên' },
      { col: 'G', label: 'Chức vụ' },
      { col: 'H', label: 'Bộ Phận/Phòng ban' },
      { col: 'I', label: 'Ngày vào làm việc' },
    ];
    for (const h of idHeaders) {
      ws1.mergeCells(`${h.col}6:${h.col}8`);
      const cell = ws1.getCell(`${h.col}6`);
      cell.value = h.label;
      cell.font = { bold: true, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }

    // Day columns J..AN (31 slots, padding short months with empty)
    for (let i = 0; i < 31; i++) {
      const colIdx = COL_J + i;
      if (i < daysInMonth) {
        const dateStr = days[i];
        const dt = new Date(dateStr);
        ws1.getCell(6, colIdx).value = dt.getDate();
        ws1.getCell(6, colIdx).font = { size: 8 };
        ws1.getCell(6, colIdx).alignment = { horizontal: 'center' };
        ws1.getCell(7, colIdx).value = weekdayLabels[dt.getDay()];
        ws1.getCell(7, colIdx).font = { italic: true, size: 8 };
        ws1.getCell(7, colIdx).alignment = { horizontal: 'center' };
      }
      ws1.getColumn(colIdx).width = 3.5;
    }
    // Summary columns AO..BO (columns 41..67)
    // AO: "Thời gian tính lương (giờ)" merged AO6:AO8
    ws1.mergeCells('AO6:AO8');
    ws1.getCell('AO6').value = 'Thời gian tính lương (giờ)';
    ws1.getCell('AO6').font = { bold: true, size: 8 };
    ws1.getCell('AO6').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // AP: "Tổng thời gian làm chính thức" merged AP6:AP8
    ws1.mergeCells('AP6:AP8');
    ws1.getCell('AP6').value = 'Tổng thời gian làm chính thức';
    ws1.getCell('AP6').font = { bold: true, size: 8 };
    ws1.getCell('AP6').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // AQ..AS: "Số giờ nghỉ" group
    ws1.mergeCells('AQ6:AS6');
    ws1.getCell('AQ6').value = 'Số giờ nghỉ';
    ws1.getCell('AQ6').font = { bold: true, size: 8 };
    ws1.getCell('AQ6').alignment = { horizontal: 'center', vertical: 'middle' };
    ws1.getCell('AQ7').value = 'Tính lương';
    ws1.getCell('AR7').value = 'ngày lễ, chế độ';
    ws1.getCell('AS7').value = 'Không lương';
    for (const c of ['AQ7', 'AR7', 'AS7']) {
      ws1.getCell(c).font = { size: 8 };
      ws1.getCell(c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }

    // AT: "Tổng thời gian thử việc" merged AT6:AT8
    ws1.mergeCells('AT6:AT8');
    ws1.getCell('AT6').value = 'Tổng thời gian thử việc';
    ws1.getCell('AT6').font = { bold: true, size: 8 };
    ws1.getCell('AT6').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // AU: "Đi trễ về Sớm (giờ)" merged AU6:AU8
    ws1.mergeCells('AU6:AU8');
    ws1.getCell('AU6').value = 'Đi trễ về Sớm (giờ)';
    ws1.getCell('AU6').font = { bold: true, size: 8 };
    ws1.getCell('AU6').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // AV: "Ký nhận" merged AV6:AV7
    ws1.mergeCells('AV6:AV7');
    ws1.getCell('AV6').value = 'Ký nhận';
    ws1.getCell('AV6').font = { bold: true, size: 8 };
    ws1.getCell('AV6').alignment = { horizontal: 'center', vertical: 'middle' };

    // AW: "Tiền cơm theo NC" merged AW6:AW8
    ws1.mergeCells('AW6:AW8');
    ws1.getCell('AW6').value = 'Tiền cơm theo NC';
    ws1.getCell('AW6').font = { bold: true, size: 8 };
    ws1.getCell('AW6').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // AX..BB: "Tăng ca" group
    ws1.mergeCells('AX6:BB6');
    ws1.getCell('AX6').value = 'Tăng ca';
    ws1.getCell('AX6').font = { bold: true, size: 8 };
    ws1.getCell('AX6').alignment = { horizontal: 'center', vertical: 'middle' };
    ws1.getCell('AX7').value = 'Ngày Thường';
    ws1.getCell('AY7').value = 'Ngoài giờ NT';
    ws1.getCell('AZ7').value = 'Chủ nhật';
    ws1.getCell('BA7').value = 'Ngoài giờ CN';
    ws1.getCell('BB7').value = 'Lễ';
    for (const c of ['AX7', 'AY7', 'AZ7', 'BA7', 'BB7']) {
      ws1.getCell(c).font = { size: 8 };
      ws1.getCell(c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }
    // Multiplier row 8
    ws1.getCell('AX8').value = 1.5;
    ws1.getCell('AY8').value = 2.1;
    ws1.getCell('AZ8').value = 2;
    ws1.getCell('BA8').value = 2.7;
    ws1.getCell('BB8').value = 3;
    for (const c of ['AX8', 'AY8', 'AZ8', 'BA8', 'BB8']) {
      ws1.getCell(c).font = { italic: true, size: 8 };
      ws1.getCell(c).alignment = { horizontal: 'center' };
    }
    // BC..BO: remaining summary columns
    const remainingSumHeaders: Array<{ col: string; label: string }> = [
      { col: 'BC', label: 'Số KM' },
      { col: 'BD', label: 'Xăng xe' },
      { col: 'BE', label: 'Cơm tăng ca (vnđ)' },
      { col: 'BF', label: 'Ngày phép còn lại tháng trước' },
      { col: 'BG', label: 'Ngày phép còn lại hiện tại' },
      { col: 'BH', label: 'Ghi chú' },
      { col: 'BI', label: 'Tính chuyên cần' },
      { col: 'BJ', label: 'Tính cơm' },
      { col: 'BK', label: 'Giờ công cty cho nghỉ KL hưởng Chuyên cần' },
      { col: 'BL', label: 'Truy thu tiền ứng phép' },
      { col: 'BM', label: 'Phép bù' },
      { col: 'BN', label: 'cơm chủ nhật' },
      { col: 'BO', label: 'Ngày nghỉ việc' },
    ];
    for (const h of remainingSumHeaders) {
      ws1.mergeCells(`${h.col}6:${h.col}8`);
      ws1.getCell(`${h.col}6`).value = h.label;
      ws1.getCell(`${h.col}6`).font = { bold: true, size: 8 };
      ws1.getCell(`${h.col}6`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }

    // Data rows (start at row 9)
    const DATA_START_ROW = 9;
    let rowIdx = DATA_START_ROW;
    for (let empIdx = 0; empIdx < empRows.length; empIdx++) {
      const emp = empRows[empIdx];
      const r = ws1.getRow(rowIdx);

      // Identity columns D..I
      r.getCell(COL_D).value = empIdx + 1;
      r.getCell(COL_E).value = emp.code;
      r.getCell(COL_F).value = emp.name;
      r.getCell(COL_G).value = emp.position;
      r.getCell(COL_H).value = emp.dept;
      r.getCell(COL_I).value = formatDateVN(emp.hireDate);

      // Accumulators
      let officialDays = 0;
      let leavePaid = 0;
      let leaveHoliday = 0;
      let leaveUnpaid = 0;
      let probation = 0;
      let otWeekday = 0;
      let otSunday = 0;
      let otHoliday = 0;
      let mealDays = 0;
      let sundayMeals = 0;
      // Day columns J..AN
      for (let di = 0; di < daysInMonth; di++) {
        const dateStr = days[di];
        const cell = emp.cells.get(dateStr);
        const excelCell = r.getCell(COL_J + di);
        if (cell) {
          excelCell.value = cell.code;
          if (cell.note) { excelCell.note = cell.note; }
          const code = cell.code;
          if (workCodes.has(code)) {
            const dayVal = code === 'N' ? 0.5 : 1;
            officialDays += dayVal;
            mealDays += dayVal;
          }
          if (payableLeaveCodes.has(code)) leavePaid++;
          if (code === 'L') leaveHoliday++;
          if (['KL', 'X/2', 'O', 'NCC', 'O/2'].includes(code)) leaveUnpaid += code.includes('/2') ? 0.5 : 1;
          if (['TV', 'TV/2'].includes(code)) probation += code === 'TV/2' ? 0.5 : 1;
          if (cell.otHours > 0) {
            const isH = holidaySet.has(dateStr);
            const isSun = new Date(dateStr).getDay() === 0;
            if (isH) otHoliday += cell.otHours;
            else if (isSun) otSunday += cell.otHours;
            else otWeekday += cell.otHours;
          }
          if (new Date(dateStr).getDay() === 0 && (workCodes.has(code) || cell.otHours > 0)) {
            sundayMeals++;
          }
        }
        excelCell.alignment = { horizontal: 'center' };
      }

      // Summary columns (pinned at AO=41)
      const payableHours = (officialDays + leavePaid + leaveHoliday + probation) * 8;
      const officialHours = officialDays * 8;
      const mealAllowance = mealDays * (settings?.mealAllowancePerDay || 0);
      const fuelAmount = emp.kmDistance * (settings?.fuelPricePerKm || 0) * officialDays;
      const totalOtHours = otWeekday + otSunday + otHoliday;
      const otMealCount = totalOtHours > 0 ? Math.ceil(totalOtHours / 4) : 0;
      const otMealAmount = otMealCount * (settings?.overtimeMealAllowance || 25000);
      const hasFullAttendance = leaveUnpaid === 0;

      r.getCell(colNum('AO')).value = payableHours || '';
      r.getCell(colNum('AP')).value = officialHours || '';
      r.getCell(colNum('AQ')).value = leavePaid || '';
      r.getCell(colNum('AR')).value = leaveHoliday || '';
      r.getCell(colNum('AS')).value = leaveUnpaid || '';
      r.getCell(colNum('AT')).value = probation || '';
      r.getCell(colNum('AU')).value = '';
      r.getCell(colNum('AV')).value = '';
      r.getCell(colNum('AW')).value = mealAllowance || '';
      r.getCell(colNum('AX')).value = otWeekday || '';
      r.getCell(colNum('AY')).value = '';
      r.getCell(colNum('AZ')).value = otSunday || '';
      r.getCell(colNum('BA')).value = '';
      r.getCell(colNum('BB')).value = otHoliday || '';
      r.getCell(colNum('BC')).value = emp.kmDistance || '';
      r.getCell(colNum('BD')).value = fuelAmount || '';
      r.getCell(colNum('BE')).value = otMealAmount || '';
      r.getCell(colNum('BF')).value = emp.leaveBalance || '';
      r.getCell(colNum('BG')).value = '';
      r.getCell(colNum('BH')).value = '';
      r.getCell(colNum('BI')).value = hasFullAttendance ? 'Có' : '';
      r.getCell(colNum('BJ')).value = mealDays || '';
      r.getCell(colNum('BK')).value = '';
      r.getCell(colNum('BL')).value = '';
      r.getCell(colNum('BM')).value = '';
      r.getCell(colNum('BN')).value = sundayMeals || '';
      r.getCell(colNum('BO')).value = '';

      r.alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(COL_F).alignment = { horizontal: 'left', vertical: 'middle' };
      rowIdx++;
    }
    // Legend block (below data rows)
    rowIdx += 2;
    ws1.getCell(`V${rowIdx}`).value = 'Chú thích ký hiệu:';
    ws1.getCell(`V${rowIdx}`).font = { bold: true };
    rowIdx++;
    for (const ac of attendanceCodes) {
      ws1.getCell(`V${rowIdx}`).value = ac.code;
      ws1.getCell(`W${rowIdx}`).value = ac.label;
      rowIdx++;
    }

    // Column widths for Sheet 1
    ws1.getColumn(colNum('A')).width = 20;
    ws1.getColumn(colNum('B')).width = 12;
    ws1.getColumn(colNum('D')).width = 5;
    ws1.getColumn(colNum('E')).width = 10;
    ws1.getColumn(colNum('F')).width = 22;
    ws1.getColumn(colNum('G')).width = 15;
    ws1.getColumn(colNum('H')).width = 18;
    ws1.getColumn(colNum('I')).width = 13;
    for (let c = colNum('AO'); c <= colNum('BO'); c++) {
      ws1.getColumn(c).width = 10;
    }

    // ═══════════════════════════════════════════════════════
    // ───── Sheet 2: TĂNG CA (50 columns A..AX) ─────
    // ═══════════════════════════════════════════════════════
    const ws2 = workbook.addWorksheet('TĂNG CA');

    // Row 1: Company name
    ws2.mergeCells('A1:H1');
    ws2.getCell('A1').value = 'CÔNG TY TNHH AN BÌNH FOODS';
    ws2.getCell('A1').font = { bold: true, size: 12 };

    // Row 2: Title
    ws2.mergeCells('E2:AS2');
    ws2.getCell('E2').value = `BẢNG CHẤM CÔNG TĂNG CA THÁNG ${month}`;
    ws2.getCell('E2').font = { bold: true, size: 14 };
    ws2.getCell('E2').alignment = { horizontal: 'center' };

    // Identity headers (rows 3-5)
    ws2.mergeCells('D3:D5');
    ws2.getCell('D3').value = 'STT';
    ws2.getCell('D3').font = { bold: true, size: 9 };
    ws2.getCell('D3').alignment = { horizontal: 'center', vertical: 'middle' };

    ws2.mergeCells('E4:E5');
    ws2.getCell('E4').value = 'Mã NV';
    ws2.getCell('E4').font = { bold: true, size: 9 };
    ws2.getCell('E4').alignment = { horizontal: 'center', vertical: 'middle' };

    ws2.mergeCells('F3:F5');
    ws2.getCell('F3').value = 'Họ và Tên';
    ws2.getCell('F3').font = { bold: true, size: 9 };
    ws2.getCell('F3').alignment = { horizontal: 'center', vertical: 'middle' };

    ws2.mergeCells('G3:G5');
    ws2.getCell('G3').value = 'Chức vụ';
    ws2.getCell('G3').font = { bold: true, size: 9 };
    ws2.getCell('G3').alignment = { horizontal: 'center', vertical: 'middle' };

    ws2.mergeCells('H3:H5');
    ws2.getCell('H3').value = 'Bộ phận';
    ws2.getCell('H3').font = { bold: true, size: 9 };
    ws2.getCell('H3').alignment = { horizontal: 'center', vertical: 'middle' };

    ws2.mergeCells('I3:I5');
    ws2.getCell('I3').value = 'Tăng ca tháng trước';
    ws2.getCell('I3').font = { bold: true, size: 8 };
    ws2.getCell('I3').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    // Day columns J..AN (31 slots) rows 3=date, 4&5=weekday
    for (let i = 0; i < 31; i++) {
      const colIdx = COL_J + i;
      if (i < daysInMonth) {
        const dateStr = days[i];
        const dt = new Date(dateStr);
        ws2.getCell(3, colIdx).value = dt.getDate();
        ws2.getCell(3, colIdx).font = { size: 8 };
        ws2.getCell(3, colIdx).alignment = { horizontal: 'center' };
        ws2.mergeCells(4, colIdx, 5, colIdx);
        ws2.getCell(4, colIdx).value = weekdayLabels[dt.getDay()];
        ws2.getCell(4, colIdx).font = { italic: true, size: 8 };
        ws2.getCell(4, colIdx).alignment = { horizontal: 'center', vertical: 'middle' };
      }
      ws2.getColumn(colIdx).width = 3.5;
    }

    // Summary columns AO..AX (columns 41..50)
    const otSumDefs: Array<{ col: string; label: string; mergeRows: string; multiplier?: number }> = [
      { col: 'AO', label: 'Số giờ tăng ca ngày thường', mergeRows: 'AO3:AO4', multiplier: 1.5 },
      { col: 'AP', label: 'Số giờ tăng ca CN', mergeRows: 'AP3:AP4', multiplier: 2 },
      { col: 'AQ', label: 'Số giờ tăng ca Lễ', mergeRows: 'AQ3:AQ4', multiplier: 3 },
      { col: 'AR', label: 'Tăng ca ngoài giờ ngày thường', mergeRows: 'AR3:AR4', multiplier: 2.1 },
      { col: 'AS', label: 'Tăng ca ngoài giờ ngày nghỉ', mergeRows: 'AS3:AS4', multiplier: 2.7 },
      { col: 'AT', label: 'Lương tính tăng ca', mergeRows: 'AT3:AT5' },
      { col: 'AU', label: 'Mức lương theo giờ', mergeRows: 'AU3:AU5' },
      { col: 'AV', label: 'Tổng Thu nhập ngoài giờ', mergeRows: 'AV3:AV5' },
      { col: 'AW', label: 'Ngày công tăng ca', mergeRows: 'AW3:AW5' },
      { col: 'AX', label: 'Tổng Tiền cơm TC', mergeRows: 'AX3:AX4', multiplier: 25000 },
    ];
    for (const def of otSumDefs) {
      ws2.mergeCells(def.mergeRows);
      ws2.getCell(`${def.col}3`).value = def.label;
      ws2.getCell(`${def.col}3`).font = { bold: true, size: 8 };
      ws2.getCell(`${def.col}3`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      if (def.multiplier !== undefined) {
        ws2.getCell(`${def.col}5`).value = def.multiplier;
        ws2.getCell(`${def.col}5`).font = { italic: true, size: 8 };
        ws2.getCell(`${def.col}5`).alignment = { horizontal: 'center' };
      }
    }
    // Data rows (start at row 6)
    let otRowIdx = 6;
    for (let empIdx = 0; empIdx < empRows.length; empIdx++) {
      const emp = empRows[empIdx];
      const r = ws2.getRow(otRowIdx);

      r.getCell(COL_D).value = empIdx + 1;
      r.getCell(COL_E).value = emp.code;
      r.getCell(COL_F).value = emp.name;
      r.getCell(COL_G).value = emp.position;
      r.getCell(COL_H).value = emp.dept;
      r.getCell(COL_I).value = '';

      let otW = 0, otS = 0, otH = 0;
      for (let di = 0; di < daysInMonth; di++) {
        const dateStr = days[di];
        const cell = emp.cells.get(dateStr);
        const excelCell = r.getCell(COL_J + di);
        if (cell && cell.otHours > 0) {
          excelCell.value = cell.otHours;
          const isHol = holidaySet.has(dateStr);
          const isSun = new Date(dateStr).getDay() === 0;
          if (isHol) otH += cell.otHours;
          else if (isSun) otS += cell.otHours;
          else otW += cell.otHours;
        }
        excelCell.alignment = { horizontal: 'center' };
      }

      const hourlyRate = emp.baseSalary / standardWorkDays / 8;
      const otPay = Math.round(
        otW * hourlyRate * (settings?.otRateWeekday || 1.5) +
        otS * hourlyRate * (settings?.otRateSunday || 2) +
        otH * hourlyRate * (settings?.otRateHoliday || 3)
      );
      const totalOtHoursEmp = otW + otS + otH;
      const otWorkDays = totalOtHoursEmp > 0 ? Math.round((totalOtHoursEmp / 8) * 100) / 100 : 0;
      const otMealCountEmp = totalOtHoursEmp > 0 ? Math.ceil(totalOtHoursEmp / 4) : 0;
      const otMealTotalEmp = otMealCountEmp * (settings?.overtimeMealAllowance || 25000);

      r.getCell(colNum('AO')).value = otW || '';
      r.getCell(colNum('AP')).value = otS || '';
      r.getCell(colNum('AQ')).value = otH || '';
      r.getCell(colNum('AR')).value = '';
      r.getCell(colNum('AS')).value = '';
      r.getCell(colNum('AT')).value = emp.baseSalary || '';
      r.getCell(colNum('AU')).value = Math.round(hourlyRate);
      r.getCell(colNum('AV')).value = otPay || '';
      r.getCell(colNum('AW')).value = otWorkDays || '';
      r.getCell(colNum('AX')).value = otMealTotalEmp || '';

      r.alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(COL_F).alignment = { horizontal: 'left', vertical: 'middle' };
      otRowIdx++;
    }

    // Column widths for Sheet 2
    ws2.getColumn(colNum('D')).width = 5;
    ws2.getColumn(colNum('E')).width = 10;
    ws2.getColumn(colNum('F')).width = 22;
    ws2.getColumn(colNum('G')).width = 15;
    ws2.getColumn(colNum('H')).width = 18;
    ws2.getColumn(colNum('I')).width = 12;
    for (let c = colNum('AO'); c <= colNum('AX'); c++) {
      ws2.getColumn(c).width = 12;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }

}

export default new AttendanceService();
