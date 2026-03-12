import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';

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

  async determineShift(checkInTime: Date): Promise<string | null> {
    const shifts = await prisma.workShift.findMany({
      where: { isActive: true },
    });

    if (shifts.length === 0) return null;

    const checkInHours = checkInTime.getHours();
    const checkInMinutes = checkInTime.getMinutes();
    const checkInTotal = checkInHours * 60 + checkInMinutes;

    const matched: { name: string; startMinutes: number }[] = [];

    for (const shift of shifts) {
      const [startH, startM] = shift.startTime.split(':').map(Number);
      const [endH, endM] = shift.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (endMinutes > startMinutes) {
        // Normal shift (e.g. 06:00 - 14:00)
        if (checkInTotal >= startMinutes && checkInTotal < endMinutes) {
          matched.push({ name: shift.name, startMinutes });
        }
      } else {
        // Overnight shift (e.g. 22:00 - 06:00)
        if (checkInTotal >= startMinutes || checkInTotal < endMinutes) {
          matched.push({ name: shift.name, startMinutes });
        }
      }
    }

    if (matched.length === 0) return null;
    if (matched.length === 1) return matched[0].name;

    // Pick the shift whose startTime is closest to checkInTime
    let closest = matched[0];
    let minDiff = this.circularDiff(checkInTotal, closest.startMinutes);

    for (let i = 1; i < matched.length; i++) {
      const diff = this.circularDiff(checkInTotal, matched[i].startMinutes);
      if (diff < minDiff) {
        minDiff = diff;
        closest = matched[i];
      }
    }

    return closest.name;
  }

  private circularDiff(a: number, b: number): number {
    const totalMinutesInDay = 24 * 60;
    const diff = ((a - b) % totalMinutesInDay + totalMinutesInDay) % totalMinutesInDay;
    return Math.min(diff, totalMinutesInDay - diff);
  }
}

export default new WorkShiftService();
