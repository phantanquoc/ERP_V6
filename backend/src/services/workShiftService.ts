import prisma from '@config/database';
import { ConflictError, NotFoundError, ValidationError } from '@utils/errors';
import { dateInAppTz } from '@utils/dateUtils';

const EARLY_BUFFER_MINUTES = 30;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface ShiftWindow {
  id: string;
  name: string;
  startMinutes: number;
  endMinutes: number;
  windowStart: number;
  windowEnd: number;
}

class WorkShiftService {
  async getAllShifts() {
    return await prisma.workShift.findMany({
      where: { isActive: true },
      orderBy: { startTime: 'asc' },
    });
  }

  async createShift(data: {
    name: string;
    startTime: string;
    endTime: string;
    checkInWindowStart?: string | null;
    checkInWindowEnd?: string | null;
  }) {
    this.validateShiftTimes(data);
    await this.assertNoOverlap(data, null);

    return await prisma.workShift.create({
      data: {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        checkInWindowStart: data.checkInWindowStart ?? null,
        checkInWindowEnd: data.checkInWindowEnd ?? null,
      },
    });
  }

  async updateShift(
    id: string,
    data: {
      name?: string;
      startTime?: string;
      endTime?: string;
      checkInWindowStart?: string | null;
      checkInWindowEnd?: string | null;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.workShift.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy ca làm việc');
    }

    const merged = {
      startTime: data.startTime ?? existing.startTime,
      endTime: data.endTime ?? existing.endTime,
      checkInWindowStart: data.checkInWindowStart !== undefined ? data.checkInWindowStart : existing.checkInWindowStart,
      checkInWindowEnd: data.checkInWindowEnd !== undefined ? data.checkInWindowEnd : existing.checkInWindowEnd,
    };
    this.validateShiftTimes(merged);
    if (data.isActive !== false) {
      await this.assertNoOverlap(merged, id);
    }

    return await prisma.workShift.update({
      where: { id },
      data,
    });
  }

  async deleteShift(id: string) {
    const existing = await prisma.workShift.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy ca làm việc');
    }

    return await prisma.workShift.delete({ where: { id } });
  }

  /**
   * Determine which shift a given check-in timestamp belongs to.
   *
   * Uses the captured Date (in Asia/Ho_Chi_Minh local time) so kiosk time
   * matches the actual scan moment — never call this with `new Date()` when
   * a captured timestamp is available upstream.
   *
   * Boundary is half-open [windowStart, windowEnd).
   * If a shift lacks explicit windows, falls back to [startTime-30m, endTime).
   */
  async determineShift(checkInTime: Date): Promise<string | null> {
    const shifts = await this.loadShiftWindows();
    if (shifts.length === 0) return null;

    const { hour, minute } = dateInAppTz(checkInTime);
    const checkInTotal = hour * 60 + minute;

    const matched = shifts.filter(s => this.matchesWindow(checkInTotal, s));
    if (matched.length === 0) return null;
    if (matched.length === 1) return matched[0].name;

    // Multiple windows match — pick the one whose shift start is closest
    // to checkInTime (early arrivals prefer the upcoming shift).
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

  /**
   * How many minutes late is `checkInTime` relative to the shift it matches?
   * Returns 0 if before start (early), or the positive delta if after start.
   * Returns null if no shift matches (unknown time — caller decides).
   */
  async getLateMinutes(checkInTime: Date): Promise<{ shiftName: string; lateMinutes: number } | null> {
    const shifts = await this.loadShiftWindows();
    if (shifts.length === 0) return null;

    const { hour, minute } = dateInAppTz(checkInTime);
    const checkInTotal = hour * 60 + minute;

    const matched = shifts.filter(s => this.matchesWindow(checkInTotal, s));
    if (matched.length === 0) return null;

    // Pick the shift whose start is closest going forward
    let closest = matched[0];
    let minDiff = this.forwardDiff(checkInTotal, closest.startMinutes);
    for (let i = 1; i < matched.length; i++) {
      const diff = this.forwardDiff(checkInTotal, matched[i].startMinutes);
      if (diff < minDiff) {
        minDiff = diff;
        closest = matched[i];
      }
    }

    // forwardDiff returns negative-ish for early arrival — recompute plain "late"
    const rawDelta = (checkInTotal - closest.startMinutes + 1440) % 1440;
    const lateMinutes = rawDelta <= 720 ? rawDelta : 0; // >720 = arrived before start
    return { shiftName: closest.name, lateMinutes };
  }

  /**
   * Look up a shift by its historical check-in timestamp and return whether
   * that shift is cross-midnight (endTime < startTime → wraps to next day).
   * Used by attendance close-out logic to distinguish a legitimate Ca 3
   * check-out next morning vs. a "quên chấm ra" (forgot to check out) case.
   */
  async isCrossMidnightShiftAt(checkInTime: Date): Promise<boolean> {
    const shifts = await this.loadShiftWindows();
    if (shifts.length === 0) return false;

    const { hour, minute } = dateInAppTz(checkInTime);
    const checkInTotal = hour * 60 + minute;

    const matched = shifts.filter(s => this.matchesWindow(checkInTotal, s));
    if (matched.length === 0) return false;

    // If any matching shift is cross-midnight, treat the record as cross-midnight
    return matched.some(s => s.endMinutes <= s.startMinutes);
  }

  /**
   * Return the shift end time (in minutes-of-day, app timezone) for the
   * shift matching the given check-in timestamp. Caller uses this to decide
   * whether a next-day scan falls within the shift's legitimate close window.
   */
  async getShiftEndMinutesAt(checkInTime: Date): Promise<number | null> {
    const shifts = await this.loadShiftWindows();
    if (shifts.length === 0) return null;

    const { hour, minute } = dateInAppTz(checkInTime);
    const checkInTotal = hour * 60 + minute;

    const matched = shifts.filter(s => this.matchesWindow(checkInTotal, s));
    if (matched.length === 0) return null;

    let closest = matched[0];
    let minDiff = this.forwardDiff(checkInTotal, closest.startMinutes);
    for (let i = 1; i < matched.length; i++) {
      const diff = this.forwardDiff(checkInTotal, matched[i].startMinutes);
      if (diff < minDiff) {
        minDiff = diff;
        closest = matched[i];
      }
    }
    return closest.endMinutes;
  }

  // ---------- private helpers ----------

  private async loadShiftWindows(): Promise<ShiftWindow[]> {
    const shifts = await prisma.workShift.findMany({ where: { isActive: true } });
    return shifts.map((s) => {
      const startMinutes = this.hhmmToMinutes(s.startTime);
      const endMinutes = this.hhmmToMinutes(s.endTime);
      const windowStart = s.checkInWindowStart
        ? this.hhmmToMinutes(s.checkInWindowStart)
        : (startMinutes - EARLY_BUFFER_MINUTES + 1440) % 1440;
      const windowEnd = s.checkInWindowEnd
        ? this.hhmmToMinutes(s.checkInWindowEnd)
        : endMinutes;
      return { id: s.id, name: s.name, startMinutes, endMinutes, windowStart, windowEnd };
    });
  }

  /**
   * Half-open [windowStart, windowEnd) with wrap-around support.
   */
  private matchesWindow(checkInTotal: number, s: ShiftWindow): boolean {
    if (s.windowStart === s.windowEnd) return false;
    if (s.windowStart < s.windowEnd) {
      return checkInTotal >= s.windowStart && checkInTotal < s.windowEnd;
    }
    // Wraps midnight (e.g. Ca 3 window 21:00-22:30 does NOT wrap;
    // Ca 3 shift 22:00-06:00 wraps but windowEnd 22:30 doesn't). Kept for
    // robustness against custom shifts whose window crosses midnight.
    return checkInTotal >= s.windowStart || checkInTotal < s.windowEnd;
  }

  private forwardDiff(checkIn: number, shiftStart: number): number {
    const diff = (checkIn - shiftStart + 1440) % 1440;
    return diff <= 720 ? diff : 1440 - diff - 1;
  }

  private hhmmToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * The check-in window is half-open [start, end): `end` is the first minute the
   * window does NOT accept, so adjacent shifts meet when one's end equals the next
   * one's start. Configuring `end` as "the last minute we accept" instead leaves a
   * one-minute hole where a scan matches no shift at all — that happened in
   * production with Ca 1 ending 06:29 while Hành chính started 06:30.
   */
  private validateShiftTimes(data: {
    startTime: string;
    endTime: string;
    checkInWindowStart?: string | null;
    checkInWindowEnd?: string | null;
  }) {
    if (!HHMM_RE.test(data.startTime) || !HHMM_RE.test(data.endTime)) {
      throw new ValidationError('startTime/endTime phải theo định dạng HH:mm');
    }
    if (data.checkInWindowStart && !HHMM_RE.test(data.checkInWindowStart)) {
      throw new ValidationError('checkInWindowStart phải theo định dạng HH:mm');
    }
    if (data.checkInWindowEnd && !HHMM_RE.test(data.checkInWindowEnd)) {
      throw new ValidationError('checkInWindowEnd phải theo định dạng HH:mm');
    }
    // If both provided, they must not be equal (empty window)
    if (
      data.checkInWindowStart &&
      data.checkInWindowEnd &&
      data.checkInWindowStart === data.checkInWindowEnd
    ) {
      throw new ValidationError('Cửa sổ chấm công không được trùng đầu và cuối');
    }
  }

  /**
   * Ensure the new/updated shift's check-in window does not overlap another
   * active shift's window. Uses half-open [start, end) with wrap support.
   */
  private async assertNoOverlap(
    data: { startTime: string; endTime: string; checkInWindowStart?: string | null; checkInWindowEnd?: string | null },
    excludeId: string | null,
  ) {
    const startMinutes = this.hhmmToMinutes(data.startTime);
    const endMinutes = this.hhmmToMinutes(data.endTime);
    const winStart = data.checkInWindowStart
      ? this.hhmmToMinutes(data.checkInWindowStart)
      : (startMinutes - EARLY_BUFFER_MINUTES + 1440) % 1440;
    const winEnd = data.checkInWindowEnd
      ? this.hhmmToMinutes(data.checkInWindowEnd)
      : endMinutes;

    const others = await prisma.workShift.findMany({
      where: {
        isActive: true,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });

    for (const other of others) {
      const oStart = this.hhmmToMinutes(other.startTime);
      const oEnd = this.hhmmToMinutes(other.endTime);
      const oWinStart = other.checkInWindowStart
        ? this.hhmmToMinutes(other.checkInWindowStart)
        : (oStart - EARLY_BUFFER_MINUTES + 1440) % 1440;
      const oWinEnd = other.checkInWindowEnd ? this.hhmmToMinutes(other.checkInWindowEnd) : oEnd;

      if (this.windowsOverlap(winStart, winEnd, oWinStart, oWinEnd)) {
        throw new ConflictError(`Cửa sổ chấm công trùng với ca "${other.name}"`);
      }
    }
  }

  /**
   * Test half-open [a, b) vs half-open [c, d) overlap on 1440-minute circle.
   * Handles wrap-around by expanding both windows into up to 2 linear segments.
   */
  private windowsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
    const segA = this.toLinearSegments(aStart, aEnd);
    const segB = this.toLinearSegments(bStart, bEnd);
    for (const [s1, e1] of segA) {
      for (const [s2, e2] of segB) {
        if (s1 < e2 && s2 < e1) return true;
      }
    }
    return false;
  }

  private toLinearSegments(start: number, end: number): [number, number][] {
    if (start === end) return [];
    if (start < end) return [[start, end]];
    return [[start, 1440], [0, end]];
  }
}

export default new WorkShiftService();
