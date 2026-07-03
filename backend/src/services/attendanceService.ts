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
    startDate: string;
    endDate: string;
    search?: string;
    departmentId?: string;
    positionId?: string;
  }): Promise<Buffer> {
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new ValidationError('Ngày không hợp lệ');
    }

    // Build day list (YYYY-MM-DD) inclusive
    const days: string[] = [];
    {
      const cursor = new Date(startDate);
      while (cursor.getTime() <= endDate.getTime()) {
        days.push(cursor.toISOString().split('T')[0]);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    // Query attendance rows with filters + ADMIN excluded
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

    const attendances = await prisma.attendance.findMany({
      where: {
        attendanceDate: { gte: startDate, lte: endDate },
        employee: employeeWhere,
      },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
            subDepartment: { include: { department: true } },
          },
        },
      },
      orderBy: [
        { employee: { employeeCode: 'asc' } },
        { attendanceDate: 'asc' },
      ],
    });

    // Also fetch all matching employees so those with 0 records still appear
    const allEmployees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        user: true,
        position: true,
        subDepartment: { include: { department: true } },
      },
      orderBy: { employeeCode: 'asc' },
    });

    // User.departmentId is a raw FK (no @relation) — build id→name map to resolve
    // department name for employees who have User.departmentId but no subDepartment.
    const userDeptIds = allEmployees
      .map(e => e.user?.departmentId)
      .filter((id): id is string => !!id);
    const departmentNameById = new Map<string, string>();
    if (userDeptIds.length > 0) {
      const departments = await prisma.department.findMany({
        where: { id: { in: Array.from(new Set(userDeptIds)) } },
        select: { id: true, name: true },
      });
      departments.forEach(d => departmentNameById.set(d.id, d.name));
    }

    // Build per-employee per-day map
    type DayCell = {
      regularHours: number;
      overtimeHours: number;
      regularStatus: AttendanceStatus | null;
      hasOvertime: boolean;
    };

    type EmployeeRow = {
      employeeCode: string;
      fullName: string;
      positionName: string;
      departmentName: string;
      cells: Map<string, DayCell>;
      totalDays: number;
      totalOvertimeHours: number;
    };

    const rowMap = new Map<string, EmployeeRow>();

    for (const emp of allEmployees) {
      rowMap.set(emp.id, {
        employeeCode: emp.employeeCode,
        fullName: `${emp.user.lastName} ${emp.user.firstName}`.trim(),
        positionName: emp.position?.name || '',
        departmentName:
          emp.subDepartment?.department?.name
          || (emp.user?.departmentId ? departmentNameById.get(emp.user.departmentId) ?? '' : ''),
        cells: new Map(),
        totalDays: 0,
        totalOvertimeHours: 0,
      });
    }

    for (const att of attendances) {
      const row = rowMap.get(att.employeeId);
      if (!row) continue;
      const dayKey = att.attendanceDate.toISOString().split('T')[0];
      const cell = row.cells.get(dayKey) ?? {
        regularHours: 0,
        overtimeHours: 0,
        regularStatus: null,
        hasOvertime: false,
      };

      if (att.isOvertime) {
        cell.overtimeHours += att.workHours || 0;
        cell.hasOvertime = true;
      } else {
        cell.regularHours += att.workHours || 0;
        if (!cell.regularStatus) cell.regularStatus = att.status;
      }

      row.cells.set(dayKey, cell);
    }

    // Compute totals per employee
    for (const row of rowMap.values()) {
      for (const cell of row.cells.values()) {
        const isWorkingDay =
          cell.regularStatus === 'PRESENT' ||
          cell.regularStatus === 'LATE' ||
          (cell.hasOvertime && !cell.regularStatus);
        if (isWorkingDay) row.totalDays += 1;
        row.totalOvertimeHours += cell.overtimeHours;
      }
      row.totalOvertimeHours = Math.round(row.totalOvertimeHours * 100) / 100;
    }

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lịch chấm công');

    const fixedColumns = [
      { header: 'Mã NV', key: 'employeeCode', width: 12 },
      { header: 'Họ tên', key: 'fullName', width: 25 },
      { header: 'Chức vụ', key: 'position', width: 20 },
      { header: 'Bộ phận', key: 'department', width: 20 },
    ];

    const dayColumns = days.map((d) => {
      const [_, m, day] = d.split('-');
      return { header: `${day}/${m}`, key: `day_${d}`, width: 8 };
    });

    const totalColumns = [
      { header: 'Tổng ngày làm việc', key: 'totalDays', width: 18 },
      { header: 'Tổng giờ tăng ca', key: 'totalOvertimeHours', width: 18 },
    ];

    worksheet.columns = [...fixedColumns, ...dayColumns, ...totalColumns];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Status → ARGB fill map (matches UI palette in AttendanceManagement.tsx)
    const statusColor = (cell: DayCell): string | null => {
      if (cell.regularStatus === 'PRESENT') return 'FFDCFCE7'; // green-100
      if (cell.regularStatus === 'LATE') return 'FFFEF3C7';    // amber-100
      if (cell.regularStatus === 'ABSENT') return 'FFFEE2E2';  // red-100
      if (cell.regularStatus === 'ON_LEAVE') return 'FFDBEAFE'; // blue-100
      if (cell.hasOvertime) return 'FFF3E8FF';                 // purple-100 (OT-only day)
      return null;
    };

    // Regular-hours text color (matches UI). OT is always purple.
    const regularTextArgb = (status: AttendanceStatus | null): string => {
      if (status === 'PRESENT') return 'FF166534';   // green-800
      if (status === 'LATE') return 'FF92400E';      // amber-800
      if (status === 'ABSENT') return 'FF991B1B';    // red-800
      if (status === 'ON_LEAVE') return 'FF1E40AF';  // blue-800
      return 'FF374151';                             // gray-700
    };
    const overtimeTextArgb = 'FF6B21A8'; // purple-800

    const roundHours = (h: number) => Math.round(h * 100) / 100;

    // Sort by department (empty last), then by full name, then employee code
    const rows = Array.from(rowMap.values()).sort((a, b) => {
      const aDept = a.departmentName || '';
      const bDept = b.departmentName || '';
      if (aDept !== bDept) {
        if (!aDept) return 1;
        if (!bDept) return -1;
        return aDept.localeCompare(bDept, 'vi');
      }
      const nameCmp = a.fullName.localeCompare(b.fullName, 'vi');
      if (nameCmp !== 0) return nameCmp;
      return a.employeeCode.localeCompare(b.employeeCode);
    });

    rows.forEach((row) => {
      const rowData: Record<string, any> = {
        employeeCode: row.employeeCode,
        fullName: row.fullName,
        position: row.positionName,
        department: row.departmentName,
        totalDays: row.totalDays,
        totalOvertimeHours: row.totalOvertimeHours,
      };

      days.forEach((d) => {
        const cell = row.cells.get(d);
        if (cell) {
          const reg = roundHours(cell.regularHours);
          const ot = roundHours(cell.overtimeHours);
          // Numeric value stored is the total (regular + OT). Display is overridden
          // below with rich text when both regular and OT exist.
          const total = roundHours(reg + ot);
          rowData[`day_${d}`] = total > 0 ? total : '';
        } else {
          rowData[`day_${d}`] = '';
        }
      });

      const excelRow = worksheet.addRow(rowData);
      excelRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

      // Apply status colors + rich text split for regular/OT
      days.forEach((d, idx) => {
        const cell = row.cells.get(d);
        if (!cell) return;

        const cellRef = excelRow.getCell(fixedColumns.length + idx + 1);
        const color = statusColor(cell);
        if (color) {
          cellRef.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: color },
          };
        }

        const reg = roundHours(cell.regularHours);
        const ot = roundHours(cell.overtimeHours);
        const isSplit = cell.hasOvertime && cell.regularStatus !== null && reg > 0 && ot > 0;

        if (isSplit) {
          // Two lines: regular hours in status color, OT in purple below.
          cellRef.value = {
            richText: [
              {
                text: `${reg}`,
                font: { color: { argb: regularTextArgb(cell.regularStatus) }, bold: true },
              },
              { text: '\n', font: {} },
              {
                text: `+${ot} OT`,
                font: { color: { argb: overtimeTextArgb }, bold: true, size: 10 },
              },
            ],
          };
        } else if (ot > 0 && reg === 0) {
          // OT-only day
          cellRef.value = {
            richText: [
              {
                text: `${ot} OT`,
                font: { color: { argb: overtimeTextArgb }, bold: true },
              },
            ],
          };
        } else if (reg > 0) {
          // Regular-only day — color the text to match status
          cellRef.value = {
            richText: [
              {
                text: `${reg}`,
                font: { color: { argb: regularTextArgb(cell.regularStatus) }, bold: true },
              },
            ],
          };
        }
      });

      // Left-align text columns
      excelRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      excelRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      excelRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      excelRow.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    });

    // Add legend rows at the bottom
    worksheet.addRow([]);
    const legendHeader = worksheet.addRow(['Chú thích màu:']);
    legendHeader.font = { bold: true };

    const legendItems: Array<{ label: string; argb: string }> = [
      { label: 'Đúng giờ', argb: 'FFDCFCE7' },
      { label: 'Đi muộn', argb: 'FFFEF3C7' },
      { label: 'Vắng mặt', argb: 'FFFEE2E2' },
      { label: 'Nghỉ phép', argb: 'FFDBEAFE' },
      { label: 'Tăng ca', argb: 'FFF3E8FF' },
    ];

    legendItems.forEach((item) => {
      const legendRow = worksheet.addRow(['', item.label]);
      const colorCell = legendRow.getCell(1);
      colorCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: item.argb },
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new AttendanceService();
