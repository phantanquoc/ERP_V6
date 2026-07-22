import prisma from '@config/database';
import workShiftService from '@services/workShiftService';
import { startOfDay, endOfDay } from 'date-fns';

/**
 * Parse shift number from shift name "Ca N"
 * Returns null if name doesn't match the pattern
 */
function parseShiftNumber(shiftName: string): number | null {
  const match = shiftName.match(/Ca\s+(\d+)$/i);
  if (!match) return null;
  return parseInt(match[1], 10);
}

export class AttendedOperatorsService {
  /**
   * Get employees who attended the given shift on the given date,
   * filtered to positions mapped to the pageKey
   *
   * @param date - Date string (YYYY-MM-DD) or Date object
   * @param shift - Numeric shift (1, 2, 3)
   * @param pageKey - Page key (PRODUCTION_OUTPUT, MATERIAL_EVALUATION, etc.)
   * @returns Array of attended operators with id, name, employeeCode, positionName
   */
  async getAttendedOperators(
    date: string | Date,
    shift: number,
    pageKey: string
  ) {
    // Convert to date range (local day boundaries)
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const dayStart = startOfDay(dateObj);
    const dayEnd = endOfDay(dateObj);

    // Get mapped positions for this page
    const mappings = await prisma.dataEntryPagePosition.findMany({
      where: { pageKey },
      select: { positionId: true },
    });

    // If no positions mapped, return empty array (not all employees)
    if (mappings.length === 0) {
      return [];
    }

    const mappedPositionIds = mappings.map((m) => m.positionId);

    // Get all attendance records for this date
    const attendances = await prisma.attendance.findMany({
      where: {
        attendanceDate: {
          gte: dayStart,
          lte: dayEnd,
        },
        checkInTime: {
          not: null,
        },
      },
      include: {
        employee: {
          include: {
            position: {
              select: {
                id: true,
                name: true,
              },
            },
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Filter to employees who:
    // 1. Checked in to the selected shift
    // 2. Hold a position mapped to this page
    const result = [];

    for (const attendance of attendances) {
      if (!attendance.checkInTime) continue;

      // Derive shift from check-in time
      const shiftName = await workShiftService.determineShift(
        attendance.checkInTime
      );

      if (!shiftName) continue;

      // Parse shift number
      const shiftNum = parseShiftNumber(shiftName);
      if (shiftNum !== shift) continue;

      // Check if employee's position is mapped to this page
      const employee = attendance.employee;
      if (!employee.positionId) continue;
      if (!mappedPositionIds.includes(employee.positionId)) continue;

      result.push({
        id: employee.id,
        name: `${employee.user.lastName} ${employee.user.firstName}`.trim(),
        employeeCode: employee.employeeCode,
        positionName: employee.position?.name || '',
      });
    }

    // Remove duplicates (in case multiple attendance records per day)
    const unique = result.filter(
      (item, index, arr) =>
        arr.findIndex((x) => x.id === item.id) === index
    );

    return unique;
  }
}

export default new AttendedOperatorsService();
