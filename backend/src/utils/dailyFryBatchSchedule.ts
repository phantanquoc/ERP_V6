/**
 * Daily fry-batch schedule module.
 *
 * Returns the fixed sixteen-batch schedule for any production day.
 * Codes are MC-01 through MC-16, starting at 06:30 with 90-minute cadence.
 * Shift grouping: 5/5/6 by position (fixed, independent of any roster).
 *
 * This module does NOT pre-create records. The schedule is purely computed.
 * Records are created on-demand when a worker enters data.
 *
 * Reuses getProductionDay from @utils/productionDay for the 06:30 boundary rule.
 */

import { getProductionDay } from '@utils/productionDay';

export { getProductionDay };

/** Total number of batches per production day */
export const BATCH_COUNT = 16;

/** Cadence in minutes between batch starts */
export const CADENCE_MINUTES = 90;

/** Boundary hour (06) and minute (30) — first batch start time */
const START_HOUR = 6;
const START_MINUTE = 30;

/** Shift boundaries by batch index (0-based): shift 1 = 0–4, shift 2 = 5–9, shift 3 = 10–15 */
const SHIFT_BOUNDARIES = [5, 10, 16] as const;

export interface ScheduledBatch {
  /** Two-digit code: MC-01 through MC-16 */
  code: string;
  /** 1-based sequence number (1–16) */
  sequence: number;
  /** Shift number (1, 2, or 3) */
  shift: number;
  /** Start time as { hour, minute } in local clock time */
  startTime: { hour: number; minute: number };
  /**
   * The production day this batch belongs to (YYYY-MM-DD).
   * For after-midnight batches (MC-13–MC-16), this is the day the shift STARTED,
   * not the calendar date of the clock time.
   */
  ngaySanXuat: string;
  /**
   * Whether the clock time falls on the next calendar date relative to ngaySanXuat.
   * True for MC-13 through MC-16 (00:30, 02:00, 03:30, 05:00).
   */
  isNextCalendarDay: boolean;
}

/**
 * Determine the shift number for a given 1-based sequence.
 * Shift 1: MC-01 to MC-05 (seq 1–5)
 * Shift 2: MC-06 to MC-10 (seq 6–10)
 * Shift 3: MC-11 to MC-16 (seq 11–16)
 */
export function getShiftForSequence(sequence: number): number {
  if (sequence <= SHIFT_BOUNDARIES[0]) return 1;
  if (sequence <= SHIFT_BOUNDARIES[1]) return 2;
  return 3;
}

/**
 * Get the full sixteen-batch schedule for a given production day.
 *
 * @param productionDay - The production day as "YYYY-MM-DD"
 * @returns Array of 16 ScheduledBatch entries
 */
export function getDailySchedule(productionDay: string): ScheduledBatch[] {
  const schedule: ScheduledBatch[] = [];

  for (let i = 0; i < BATCH_COUNT; i++) {
    const sequence = i + 1;
    const code = `MC-${String(sequence).padStart(2, '0')}`;

    // Calculate start time: base 06:30 + i * 90 minutes
    const totalMinutesFromStart = i * CADENCE_MINUTES;
    let totalMinutesFromMidnight = START_HOUR * 60 + START_MINUTE + totalMinutesFromStart;

    // Determine if this crosses into the next calendar day (past 24:00)
    const isNextCalendarDay = totalMinutesFromMidnight >= 24 * 60;
    if (isNextCalendarDay) {
      totalMinutesFromMidnight -= 24 * 60;
    }

    const hour = Math.floor(totalMinutesFromMidnight / 60);
    const minute = totalMinutesFromMidnight % 60;

    schedule.push({
      code,
      sequence,
      shift: getShiftForSequence(sequence),
      startTime: { hour, minute },
      ngaySanXuat: productionDay,
      isNextCalendarDay,
    });
  }

  return schedule;
}

/**
 * Get the schedule for a specific shift on a production day.
 *
 * @param productionDay - The production day as "YYYY-MM-DD"
 * @param shift - Shift number (1, 2, or 3)
 * @returns Subset of schedule entries for that shift
 */
export function getScheduleForShift(productionDay: string, shift: number): ScheduledBatch[] {
  return getDailySchedule(productionDay).filter((b) => b.shift === shift);
}

/**
 * Check whether a given code is a valid scheduled batch code.
 * Valid codes are MC-01 through MC-16 (two-digit, zero-padded).
 */
export function isScheduledCode(code: string): boolean {
  const match = code.match(/^MC-(\d{2})$/);
  if (!match) return false;
  const seq = parseInt(match[1], 10);
  return seq >= 1 && seq <= BATCH_COUNT;
}

/**
 * Get the sequence number from a scheduled batch code.
 * Returns null if not a valid scheduled code.
 */
export function getSequenceFromCode(code: string): number | null {
  const match = code.match(/^MC-(\d{2})$/);
  if (!match) return null;
  const seq = parseInt(match[1], 10);
  if (seq < 1 || seq > BATCH_COUNT) return null;
  return seq;
}
