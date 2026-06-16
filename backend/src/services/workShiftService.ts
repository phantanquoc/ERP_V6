import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';
import { nowInAppTz } from '@utils/dateUtils';

const EARLY_BUFFER_MINUTES = 30;

class WorkShiftService {
  async getAllShifts() {
    return await prisma.workShift.findMany({
      where: { isActive: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async createShift(data: { name: string; startTime: string; endTime: string }) {
    return await prisma.workShift.create({
      data: {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });
  }

  async updateShift(
    id: string,
    data: { name?: string; startTime?: string; endTime?: string; isActive?: boolean }
  ) {
    const existing = await prisma.workShift.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Work shift not found');
    }

    return await prisma.workShift.update({
      where: { id },
      data,
    });
  }

  async deleteShift(id: string) {
    const existing = await prisma.workShift.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Work shift not found');
    }

    return await prisma.workShift.delete({ where: { id } });
  }

  async determineShift(_checkInTime: Date): Promise<string | null> {
    const shifts = await prisma.workShift.findMany({
      where: { isActive: true },
    });

    if (shifts.length === 0) return null;

    const { hour, minute } = nowInAppTz();
    const checkInTotal = hour * 60 + minute;

    const matched: { name: string; startMinutes: number }[] = [];

    for (const shift of shifts) {
      const [startH, startM] = shift.startTime.split(':').map(Number);
      const [endH, endM] = shift.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const bufferedStart = (startMinutes - EARLY_BUFFER_MINUTES + 1440) % 1440;

      if (endMinutes > startMinutes) {
        // Normal shift (e.g. 06:00 - 14:00), buffered to [05:30, 14:00)
        if (bufferedStart < endMinutes) {
          if (checkInTotal >= bufferedStart && checkInTotal < endMinutes) {
            matched.push({ name: shift.name, startMinutes });
          }
        } else {
          // Buffer wraps past midnight (e.g. start 00:20, buffer → 23:50)
          if (checkInTotal >= bufferedStart || checkInTotal < endMinutes) {
            matched.push({ name: shift.name, startMinutes });
          }
        }
      } else {
        // Overnight shift (e.g. 22:00 - 06:00), buffered to [21:30, 06:00)
        if (checkInTotal >= bufferedStart || checkInTotal < endMinutes) {
          matched.push({ name: shift.name, startMinutes });
        }
      }
    }

    if (matched.length === 0) return null;
    if (matched.length === 1) return matched[0].name;

    // Pick the shift whose startTime is closest (forward) to checkInTime
    let closest = matched[0];
    let minDiff = this.forwardDiff(checkInTotal, closest.startMinutes);

    for (let i = 1; i < matched.length; i++) {
      const diff = this.forwardDiff(checkInTotal, matched[i].startMinutes);
      if (diff < minDiff) {
        minDiff = diff;
        closest = matched[i];
      }
    }

    return closest.name;
  }

  private forwardDiff(checkIn: number, shiftStart: number): number {
    // How many minutes from shiftStart to checkIn (wrapping at midnight).
    // Smaller = checkIn is closer AFTER shiftStart (just started).
    // If checkIn is before shiftStart (early arrival), treat as large distance
    // but still smaller than a shift that started many hours ago.
    const diff = (checkIn - shiftStart + 1440) % 1440;
    // If diff > 720 (12h), it means checkIn is BEFORE shiftStart (early arrival)
    // Convert to "negative" distance so early arrival is preferred over a shift
    // that started long ago. Subtract 1 to give early arrivals tiebreaker
    // advantage — employees almost always arrive early, not late.
    return diff <= 720 ? diff : 1440 - diff - 1;
  }
}

export default new WorkShiftService();
