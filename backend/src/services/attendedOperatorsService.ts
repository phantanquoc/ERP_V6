import prisma from '@config/database';
import workShiftService from '@services/workShiftService';
import { parseProductionShift } from '@utils/productionDay';
import { startOfDay, endOfDay } from 'date-fns';

/**
 * Positions treated as production staff when no page→position mapping has been
 * configured yet. Without this fallback the kiosk operator list would be empty on a
 * fresh install, forcing every worker through the "find someone else" escape hatch.
 */
const DEFAULT_PRODUCTION_POSITIONS = ['Nhân viên sản xuất', 'Kỹ sư sản xuất'];

export class AttendedOperatorsService {
  /**
   * Employees who attended the given production shift on the given date.
   *
   * Shift comes from `Attendance.shift`, recorded at check-in. Rows predating that
   * column fall back to deriving from `checkInTime`, which is best-effort: the shift
   * check-in windows were changed on 2026-07-06, so deriving an older scan scores it
   * against windows that did not exist when it happened.
   *
   * Position scoping: when `DataEntryPagePosition` holds mappings for this page, only
   * those positions qualify. When it holds none, every production position qualifies
   * rather than nobody — an unconfigured page should still be usable.
   *
   * @param date - Date string (YYYY-MM-DD) or Date object
   * @param shift - Numeric production shift (1, 2, 3)
   * @param pageKey - Page key (PRODUCTION_OUTPUT, MATERIAL_EVALUATION, SYSTEM_OPERATION)
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

    // Positions mapped to this page, if any have been configured
    const mappings = await prisma.dataEntryPagePosition.findMany({
      where: { pageKey },
      select: { positionId: true },
    });
    const mappedPositionIds = mappings.map((m) => m.positionId);
    const hasMapping = mappedPositionIds.length > 0;

    const attendances = await prisma.attendance.findMany({
      where: {
        attendanceDate: {
          gte: dayStart,
          lte: dayEnd,
        },
        checkInTime: {
          not: null,
        },
        // Narrow in SQL where the shift is already recorded; rows with a null shift
        // still come through so the legacy time-derivation path below can judge them.
        OR: [{ shift }, { shift: null }],
        ...(hasMapping
          ? { employee: { positionId: { in: mappedPositionIds } } }
          : { employee: { position: { name: { in: DEFAULT_PRODUCTION_POSITIONS } } } }),
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

    const result = [];

    for (const attendance of attendances) {
      if (!attendance.checkInTime) continue;

      let attendedShift = attendance.shift;

      // Legacy rows: no shift was recorded at check-in, so fall back to deriving it.
      if (attendedShift == null) {
        const shiftName = await workShiftService.determineShift(attendance.checkInTime);
        attendedShift = parseProductionShift(shiftName);
      }

      if (attendedShift !== shift) continue;

      const employee = attendance.employee;

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

    // Stable, readable order for a touch list
    unique.sort((a, b) => a.name.localeCompare(b.name, 'vi'));

    return unique;
  }
}

export default new AttendedOperatorsService();
