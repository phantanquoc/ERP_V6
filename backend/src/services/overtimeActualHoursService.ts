/**
 * Derives *actual* overtime hours for an overtime-plan participant from their
 * clock pair, using the shift recorded on the plan item as the boundary between
 * regular work and overtime.
 *
 * Why this exists: overtime attendance rows are materialized at plan-approval
 * time carrying *planned* hours (see `overtimePlanService.materializeAttendance`),
 * so every stored `checkOutTime` on an overtime row was computed from the plan
 * rather than recorded from a clock. Payroll pays from those rows. This module
 * supplies the evidence-based figure that payroll can consume instead, gated by
 * the `useActualOvertimeHours` payroll setting.
 *
 * Design contract (openspec/changes/overtime-actual-hours-from-clock):
 *  - Clock times come from the participant's REGULAR (isOvertime = false) row on
 *    the item's date — never from the plan-derived overtime row, which would be
 *    circular.
 *  - The shift boundary comes from the plan item, never from the shift label the
 *    system inferred at scan time (inferred labels are provably wrong for early
 *    arrivals).
 *  - Computed at read time. Nothing here writes to the database.
 */

import prisma from '@config/database';
import { dateInAppTz } from '@utils/dateUtils';

const MINUTES_PER_DAY = 24 * 60;

/** Shortfall (in minutes) against the planned figure that is forgiven entirely. */
const TOLERANCE_MINUTES = 10;

/** A day shorter than this between punches is a scan artefact, not a work day. */
const MIN_PLAUSIBLE_DAY_MINUTES = 60;

/**
 * Slack allowed when testing whether a punch pair brackets the named shift.
 * Generous on purpose: a rejection is a flag a human resolves, never a silent
 * wrong number, so over-flagging is cheaper than under-flagging.
 */
const SHIFT_COMPAT_SLACK_MINUTES = 120;

/**
 * A derived value more than this far below zero is read as a next-day wrap
 * (e.g. clocking out at 02:00 against a 22:00 shift end) rather than as an
 * early departure. Without this split, leaving 30 minutes early would wrap to
 * 23.5 hours and then cap to the full planned figure.
 */
const NEXT_DAY_WRAP_THRESHOLD_MINUTES = 720;

/** Disagreement at or above this, on a retrospective item, raises an advisory flag. */
const RETROSPECTIVE_DISAGREEMENT_HOURS = 1;

export type OvertimeDirection = 'AFTER_SHIFT' | 'BEFORE_SHIFT' | 'OVERLAPPING' | 'NO_SHIFT';

export type OvertimeItemClassification = 'RETROSPECTIVE' | 'PROSPECTIVE' | 'PENDING';

export type OvertimeFlagCode =
  | 'NO_ATTENDANCE_ROW'
  | 'INCOMPLETE_PUNCH_PAIR'
  | 'IMPLAUSIBLY_SHORT_DAY'
  | 'SHIFT_MISMATCH'
  | 'NO_SHIFT_ON_ITEM'
  | 'OVERLAPPING_WINDOW'
  | 'RETROSPECTIVE_DISAGREEMENT'
  | 'RETROSPECTIVE_NO_CLOCK_EVIDENCE';

/**
 * REFUSAL — no actual figure could be derived; the day pays zero when actual
 * hours are in use.
 * ADVISORY — the planned figure is retained as the actual figure and stays
 * payable, but a human should look at it.
 */
export type OvertimeFlagKind = 'REFUSAL' | 'ADVISORY';

export interface OvertimeFlag {
  code: OvertimeFlagCode;
  kind: OvertimeFlagKind;
  /** User-facing, Vietnamese. */
  message: string;
}

/** The shift named on the plan item. `"HH:mm"` strings, as stored on WorkShift. */
export interface ShiftWindow {
  name: string | null;
  startTime: string;
  endTime: string;
}

export interface OvertimeItemInput {
  /** The overtime date. Compared against the plan's creation date, date-only. */
  ngayTangCa: Date;
  /** Overtime window start, `"HH:mm"`. */
  gioBatDau: string;
  /** Overtime window end, `"HH:mm"`. */
  gioKetThuc: string;
  /** The shift recorded on the item; null when the item names no shift. */
  shift: ShiftWindow | null;
}

/** The participant's regular (non-overtime) attendance row for the item's date. */
export interface RegularAttendanceInput {
  checkInTime: Date | null;
  checkOutTime: Date | null;
}

export interface OvertimeActualHoursResult {
  /** Hours the plan authorised, derived from the item's window. */
  plannedHours: number;
  /**
   * The evidence-based figure, or null when the system refused to compute.
   * For retrospective and advisory-flagged items this equals `plannedHours`.
   */
  actualHours: number | null;
  /** What payroll consumes when the actual-hours setting is on. Never null. */
  payableActualHours: number;
  /** Unrounded, uncapped derivation — retained for audit and flag comparison. */
  rawDerivedHours: number | null;
  direction: OvertimeDirection;
  classification: OvertimeItemClassification;
  flag: OvertimeFlag | null;
}

/** `"HH:mm"` → minutes since midnight. */
function parseHHMM(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/** A punch instant → minutes since midnight in the application timezone. */
function punchMinutes(d: Date): number {
  const { hour, minute } = dateInAppTz(d);
  return hour * 60 + minute;
}

/** Calendar day in UTC terms, for date-only comparisons. */
function dayKey(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Duration of the overtime window in minutes, handling overnight ranges
 * (e.g. 22:00 → 02:00). Mirrors `materializeAttendance` so the planned figure
 * this module reports matches the one already stored on the row.
 */
function windowMinutes(startHHMM: string, endHHMM: string): number {
  let duration = parseHHMM(endHHMM) - parseHHMM(startHHMM);
  if (duration <= 0) duration += MINUTES_PER_DAY;
  return duration;
}

function flag(code: OvertimeFlagCode, kind: OvertimeFlagKind, message: string): OvertimeFlag {
  return { code, kind, message };
}

/**
 * Which side of the shift the overtime window sits on.
 *
 * After-shift when the overtime starts at or after the shift ends; before-shift
 * when it ends at or before the shift starts. Anything else overlaps the shift
 * and yields no meaningful boundary.
 */
export function resolveDirection(item: OvertimeItemInput): OvertimeDirection {
  if (!item.shift) return 'NO_SHIFT';

  const shiftStart = parseHHMM(item.shift.startTime);
  const shiftEnd = parseHHMM(item.shift.endTime);
  const otStart = parseHHMM(item.gioBatDau);
  const otEnd = parseHHMM(item.gioKetThuc);

  // Overnight shift (e.g. 22:00 → 06:00): the shift occupies the ends of the
  // clock and the off-shift gap sits in the middle of the day, so BOTH ordinary
  // comparisons hold at once for any overtime inside that gap and cannot
  // separate the directions. Decide by which shift boundary the window sits
  // nearer to instead: overtime is worked contiguously with the shift, so the
  // boundary it touches is the one it extends.
  const shiftCrossesMidnight = shiftEnd <= shiftStart;
  if (shiftCrossesMidnight) {
    // The off-shift gap [shiftEnd, shiftStart] lies wholly inside one day, so an
    // overtime window that itself wraps midnight cannot fit in it — it must pass
    // through the shift. Checked first: the containment test below compares
    // same-day minutes and would otherwise read such a window as contained.
    if (otEnd <= otStart) return 'OVERLAPPING';
    // Must lie wholly within the off-shift gap [shiftEnd, shiftStart].
    if (otStart < shiftEnd || otEnd > shiftStart) return 'OVERLAPPING';
    const gapAfterShiftEnd = otStart - shiftEnd;
    const gapBeforeShiftStart = shiftStart - otEnd;
    return gapAfterShiftEnd <= gapBeforeShiftStart ? 'AFTER_SHIFT' : 'BEFORE_SHIFT';
  }

  if (otStart >= shiftEnd) return 'AFTER_SHIFT';
  if (otEnd <= shiftStart) return 'BEFORE_SHIFT';
  return 'OVERLAPPING';
}

/**
 * Classifies an item against its plan's creation date.
 *
 * Per item, never per plan: four live plans span dates either side of their own
 * creation date, so a plan-level rule would misclassify roughly half their items.
 */
export function classifyItem(
  itemDate: Date,
  planCreatedAt: Date,
  now: Date = new Date()
): OvertimeItemClassification {
  if (dayKey(itemDate) < dayKey(planCreatedAt)) return 'RETROSPECTIVE';
  // A prospective item whose date has not yet passed has nothing to derive.
  if (dayKey(itemDate) > dayKey(now)) return 'PENDING';
  return 'PROSPECTIVE';
}

/**
 * Applies the rounding rules in order: forgive a short shortfall, round to the
 * nearest half hour, cap at the planned figure, floor sub-half-hour to zero.
 *
 * Order matters. The tolerance is checked against the planned figure *before*
 * rounding, so a 2.92-hour derivation against a 3-hour plan credits 3 by rule
 * rather than by coincidence.
 */
export function applyRoundingRules(rawHours: number, plannedHours: number): number {
  if (rawHours <= 0) return 0;

  // Worked at or beyond the plan: the plan is what was authorised.
  if (rawHours >= plannedHours) return plannedHours;

  // Punching out a few minutes early must not cost anything.
  const shortfallMinutes = (plannedHours - rawHours) * 60;
  if (shortfallMinutes <= TOLERANCE_MINUTES) return plannedHours;

  // Nearest, not downward: two participants punching out one minute apart were
  // otherwise paid 0.5 and 1.0 hours for the same item.
  const rounded = Math.round(rawHours * 2) / 2;

  const capped = Math.min(rounded, plannedHours);

  // The step is half an hour, so anything below it is zero. Queueing at the
  // scanner for a few minutes is not overtime.
  return capped < 0.5 ? 0 : capped;
}

/**
 * Whether the punch pair plausibly brackets the shift named on the item.
 *
 * The plan's shift is occasionally wrong through data entry — live data has
 * items naming an 11:00–14:00 shift against punches spanning 05:47–17:02, which
 * would otherwise yield 8.2 hours against a 3-hour plan. Such contradictions are
 * detectable and become flags; the inferred shift label's errors are not
 * detectable this way, which is why the plan's shift is the source.
 */
function isCompatibleWithShift(
  direction: OvertimeDirection,
  shift: ShiftWindow,
  clockInMin: number,
  clockOutMin: number,
  plannedMinutes: number
): boolean {
  const shiftStart = parseHHMM(shift.startTime);
  const shiftEnd = parseHHMM(shift.endTime);

  if (direction === 'AFTER_SHIFT') {
    // Expect arrival around the shift start, not hours adrift of it.
    const earliestPlausibleIn = shiftStart - SHIFT_COMPAT_SLACK_MINUTES;
    const latestPlausibleIn = shiftStart + SHIFT_COMPAT_SLACK_MINUTES;
    return clockInMin >= earliestPlausibleIn && clockInMin <= latestPlausibleIn;
  }

  if (direction === 'BEFORE_SHIFT') {
    // Expect arrival no earlier than the overtime window itself implies, and
    // departure at or around the shift end.
    const earliestPlausibleIn = shiftStart - plannedMinutes - SHIFT_COMPAT_SLACK_MINUTES;
    const latestPlausibleIn = shiftStart + SHIFT_COMPAT_SLACK_MINUTES;
    if (clockInMin < earliestPlausibleIn || clockInMin > latestPlausibleIn) return false;

    const shiftCrossesMidnight = shiftEnd <= shiftStart;
    if (shiftCrossesMidnight) return true; // departure lands next day; not comparable here
    return clockOutMin >= shiftEnd - SHIFT_COMPAT_SLACK_MINUTES;
  }

  return false;
}

/**
 * Raw overtime hours from the clock, before any rounding.
 *
 * After-shift is measured from the clock-out; before-shift from the clock-in.
 * Negative results mean the participant left early or arrived late, i.e. no
 * overtime — not a wrap — unless they are far enough negative to be a next-day
 * clock-out.
 */
function deriveRawHours(
  direction: OvertimeDirection,
  shift: ShiftWindow,
  clockInMin: number,
  clockOutMin: number
): number {
  const shiftStart = parseHHMM(shift.startTime);
  const shiftEnd = parseHHMM(shift.endTime);

  let diff: number;
  if (direction === 'AFTER_SHIFT') {
    diff = clockOutMin - shiftEnd;
  } else {
    diff = shiftStart - clockInMin;
  }

  if (diff < -NEXT_DAY_WRAP_THRESHOLD_MINUTES) diff += MINUTES_PER_DAY;
  if (diff < 0) diff = 0;

  return diff / 60;
}

/**
 * Derives one participant's actual overtime hours for one plan item.
 *
 * `attendance` is the participant's REGULAR row for the item's date, or null
 * when they have none.
 */
export function calculateActualOvertimeHours(
  item: OvertimeItemInput,
  planCreatedAt: Date,
  attendance: RegularAttendanceInput | null,
  now: Date = new Date()
): OvertimeActualHoursResult {
  const plannedMinutes = windowMinutes(item.gioBatDau, item.gioKetThuc);
  const plannedHours = Math.round((plannedMinutes / 60) * 100) / 100;
  const direction = resolveDirection(item);
  const classification = classifyItem(item.ngayTangCa, planCreatedAt, now);

  const base = { plannedHours, direction, classification };

  /** Advisory outcome: the planned figure stands and stays payable. */
  const retainPlanned = (
    f: OvertimeFlag | null,
    rawDerivedHours: number | null = null
  ): OvertimeActualHoursResult => ({
    ...base,
    actualHours: plannedHours,
    payableActualHours: plannedHours,
    rawDerivedHours,
    flag: f,
  });

  /** Refusal outcome: no figure, and the day pays nothing. */
  const refuse = (f: OvertimeFlag): OvertimeActualHoursResult => ({
    ...base,
    actualHours: null,
    payableActualHours: 0,
    rawDerivedHours: null,
    flag: f,
  });

  // An item naming no shift, or whose window overlaps its shift, has no usable
  // boundary. It keeps its planned hours and is flagged for a human; handling it
  // properly needs a rule the data does not currently support.
  if (direction === 'NO_SHIFT') {
    return retainPlanned(
      flag(
        'NO_SHIFT_ON_ITEM',
        'ADVISORY',
        'Hạng mục tăng ca không gắn ca làm việc nên không thể tính giờ thực tế'
      )
    );
  }
  if (direction === 'OVERLAPPING') {
    return retainPlanned(
      flag(
        'OVERLAPPING_WINDOW',
        'ADVISORY',
        'Khung giờ tăng ca chồng lấn ca làm việc nên không thể tính giờ thực tế'
      )
    );
  }

  // Nothing to derive yet for a date that has not arrived.
  if (classification === 'PENDING') {
    return retainPlanned(null);
  }

  const shift = item.shift as ShiftWindow;

  // --- Refusal conditions (D6): flag rather than approximate -----------------

  if (!attendance) {
    const f = flag(
      'NO_ATTENDANCE_ROW',
      'REFUSAL',
      'Không có dữ liệu chấm công trong ngày tăng ca'
    );
    return classification === 'RETROSPECTIVE' ? retainPlanned(f) : refuse(f);
  }

  const { checkInTime, checkOutTime } = attendance;
  if (!checkInTime || !checkOutTime) {
    const f = flag(
      'INCOMPLETE_PUNCH_PAIR',
      'REFUSAL',
      'Thiếu giờ vào hoặc giờ ra trong ngày tăng ca'
    );
    return classification === 'RETROSPECTIVE' ? retainPlanned(f) : refuse(f);
  }

  // Elapsed time from the instants themselves, so it is timezone-independent.
  const elapsedMinutes = (checkOutTime.getTime() - checkInTime.getTime()) / 60000;
  if (elapsedMinutes < MIN_PLAUSIBLE_DAY_MINUTES) {
    // The before-shift formula reads only the clock-in and would otherwise
    // return a full result for a participant present for eleven minutes.
    const f = flag(
      'IMPLAUSIBLY_SHORT_DAY',
      'REFUSAL',
      'Khoảng thời gian giữa giờ vào và giờ ra quá ngắn, không thể tính giờ tăng ca'
    );
    return classification === 'RETROSPECTIVE' ? retainPlanned(f) : refuse(f);
  }

  const clockInMin = punchMinutes(checkInTime);
  const clockOutMin = punchMinutes(checkOutTime);

  if (!isCompatibleWithShift(direction, shift, clockInMin, clockOutMin, plannedMinutes)) {
    const f = flag(
      'SHIFT_MISMATCH',
      'REFUSAL',
      'Giờ chấm công không khớp với ca làm việc ghi trên kế hoạch tăng ca'
    );
    return classification === 'RETROSPECTIVE' ? retainPlanned(f) : refuse(f);
  }

  // --- Derivation ------------------------------------------------------------

  const rawDerivedHours = deriveRawHours(direction, shift, clockInMin, clockOutMin);

  // A retrospective item was written after the fact, so its author already knew
  // what happened; the planned figure wins. It is still compared against the
  // clock so transcription errors surface without blocking the entry.
  if (classification === 'RETROSPECTIVE') {
    const derived = applyRoundingRules(rawDerivedHours, plannedHours);

    // Exception to the retain-planned rule: a usable clock pair that derives no
    // overtime at all is positive evidence of absence, not a transcription gap.
    // The punches were readable, they passed the shift-compatibility test, and
    // they place the participant off the clock by the shift boundary. Paying the
    // planned figure here is exactly the overpayment this change exists to stop,
    // so the day is refused rather than credited. This is narrower than refusing
    // every disagreement: a partial shortfall still defers to the author.
    if (derived === 0) {
      return refuse(
        flag(
          'RETROSPECTIVE_NO_CLOCK_EVIDENCE',
          'REFUSAL',
          `Kế hoạch ghi ${plannedHours}h nhưng giờ chấm công không cho thấy tăng ca nào`
        )
      );
    }

    const disagreement = Math.abs(rawDerivedHours - plannedHours);
    const disagrees = disagreement >= RETROSPECTIVE_DISAGREEMENT_HOURS;
    return retainPlanned(
      disagrees
        ? flag(
            'RETROSPECTIVE_DISAGREEMENT',
            'ADVISORY',
            `Giờ kế hoạch (${plannedHours}h) lệch so với giờ chấm công (${
              Math.round(rawDerivedHours * 100) / 100
            }h)`
          )
        : null,
      rawDerivedHours
    );
  }

  const actualHours = applyRoundingRules(rawDerivedHours, plannedHours);
  return {
    ...base,
    actualHours,
    payableActualHours: actualHours,
    rawDerivedHours,
    flag: null,
  };
}

// ─── Period aggregation ─────────────────────────────────────────────────────

/** One participant-day of derived overtime, keyed by employee and date. */
export interface OvertimeDayEntry {
  employeeId: string;
  /** `YYYY-MM-DD`, the item's overtime date. */
  dateKey: string;
  planId: string;
  planItemId: string;
  shiftName: string | null;
  plannedHours: number;
  actualHours: number | null;
  payableActualHours: number;
  /** Unrounded, uncapped derivation. Retained so a manager can see the evidence. */
  rawDerivedHours: number | null;
  direction: OvertimeDirection;
  classification: OvertimeItemClassification;
  flag: OvertimeFlag | null;
}

export interface PeriodOvertimeTotals {
  /** employeeId → summed planned hours across the period. */
  plannedByEmployee: Map<string, number>;
  /** employeeId → summed payable actual hours across the period. */
  actualByEmployee: Map<string, number>;
  /** `employeeId|YYYY-MM-DD` → the derived entry, for display and flags. */
  byEmployeeDay: Map<string, OvertimeDayEntry>;
  /** employeeId → only those entries carrying a flag, for surfacing to managers. */
  flagsByEmployee: Map<string, OvertimeDayEntry[]>;
}

function toDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function employeeDayKey(employeeId: string, dateKey: string): string {
  return `${employeeId}|${dateKey}`;
}

/**
 * Derives actual overtime for every plan participant in a date range.
 *
 * Reads plan items rather than the materialized overtime rows, because the item
 * carries the window and the shift that the derivation needs. The regular
 * attendance row supplies the punches.
 *
 * One entry per (employee, date): where several items land on the same
 * participant-day, the first by (date, start, end) wins, matching the tiebreak
 * `overtimePlanService.materializeAttendance` uses when writing the rows, so the
 * planned totals reported here agree with the rows payroll sums today.
 */
export async function resolveActualOvertimeForPeriod(
  startDate: Date,
  endDate: Date,
  employeeIds?: string[],
  now: Date = new Date()
): Promise<PeriodOvertimeTotals> {
  // Approved plans only. Attendance rows are materialized on approval
  // (`overtimePlanService.materializeAttendance`), so a pending or rejected plan
  // has no stored row and must contribute no derived hours either — otherwise
  // the actual figure would pay for overtime that was never authorised.
  const items = await prisma.overtimePlanItem.findMany({
    where: {
      ngayTangCa: { gte: startDate, lte: endDate },
      overtimePlan: { trangThai: 'DA_DUYET' },
    },
    include: { overtimePlan: true, workShift: true },
    orderBy: [{ ngayTangCa: 'asc' }, { gioBatDau: 'asc' }, { gioKetThuc: 'asc' }],
  });

  const totals: PeriodOvertimeTotals = {
    plannedByEmployee: new Map(),
    actualByEmployee: new Map(),
    byEmployeeDay: new Map(),
    flagsByEmployee: new Map(),
  };

  if (items.length === 0) return totals;

  // Participants are user IDs on the item; payroll works in employee IDs.
  const participantUserIds = Array.from(
    new Set(items.flatMap(i => i.nguoiThamGiaIds))
  );
  if (participantUserIds.length === 0) return totals;

  const employees = await prisma.employee.findMany({
    where: { userId: { in: participantUserIds } },
    select: { id: true, userId: true },
  });
  const employeeIdByUserId = new Map(employees.map(e => [e.userId, e.id]));

  const scopedEmployeeIds = employeeIds ? new Set(employeeIds) : null;

  // Regular rows only — the overtime row's timestamps are plan-derived (D1).
  const relevantEmployeeIds = employees
    .map(e => e.id)
    .filter(id => !scopedEmployeeIds || scopedEmployeeIds.has(id));
  if (relevantEmployeeIds.length === 0) return totals;

  const regularRows = await prisma.attendance.findMany({
    where: {
      employeeId: { in: relevantEmployeeIds },
      attendanceDate: { gte: startDate, lte: endDate },
      isOvertime: false,
    },
    select: {
      employeeId: true,
      attendanceDate: true,
      checkInTime: true,
      checkOutTime: true,
    },
  });
  const regularByKey = new Map(
    regularRows.map(r => [
      employeeDayKey(r.employeeId, toDateKey(r.attendanceDate)),
      { checkInTime: r.checkInTime, checkOutTime: r.checkOutTime },
    ])
  );

  for (const item of items) {
    const dateKey = toDateKey(item.ngayTangCa);
    const shift = item.workShift
      ? {
          name: item.workShift.name,
          startTime: item.workShift.startTime,
          endTime: item.workShift.endTime,
        }
      : null;

    for (const userId of item.nguoiThamGiaIds) {
      const employeeId = employeeIdByUserId.get(userId);
      if (!employeeId) continue;
      if (scopedEmployeeIds && !scopedEmployeeIds.has(employeeId)) continue;

      const key = employeeDayKey(employeeId, dateKey);
      if (totals.byEmployeeDay.has(key)) continue; // first item wins

      const result = calculateActualOvertimeHours(
        {
          ngayTangCa: item.ngayTangCa,
          gioBatDau: item.gioBatDau,
          gioKetThuc: item.gioKetThuc,
          shift,
        },
        item.overtimePlan.ngayTao,
        regularByKey.get(key) ?? null,
        now
      );

      totals.byEmployeeDay.set(key, {
        employeeId,
        dateKey,
        planId: item.overtimePlanId,
        planItemId: item.id,
        shiftName: item.workShiftName ?? shift?.name ?? null,
        plannedHours: result.plannedHours,
        actualHours: result.actualHours,
        payableActualHours: result.payableActualHours,
        rawDerivedHours: result.rawDerivedHours,
        direction: result.direction,
        classification: result.classification,
        flag: result.flag,
      });

      if (result.flag) {
        const entry = totals.byEmployeeDay.get(key) as OvertimeDayEntry;
        const existing = totals.flagsByEmployee.get(employeeId);
        if (existing) existing.push(entry);
        else totals.flagsByEmployee.set(employeeId, [entry]);
      }

      totals.plannedByEmployee.set(
        employeeId,
        (totals.plannedByEmployee.get(employeeId) ?? 0) + result.plannedHours
      );
      totals.actualByEmployee.set(
        employeeId,
        (totals.actualByEmployee.get(employeeId) ?? 0) + result.payableActualHours
      );
    }
  }

  // Guard against float drift accumulating across a month of half-hour steps.
  for (const map of [totals.plannedByEmployee, totals.actualByEmployee]) {
    for (const [id, value] of map) map.set(id, Math.round(value * 100) / 100);
  }

  return totals;
}

/** Whether payroll should consume the derived figure. Defaults to planned. */
export async function isActualOvertimeEnabled(): Promise<boolean> {
  const settings = await prisma.payrollSettings.findFirst();
  return settings?.useActualOvertimeHours ?? false;
}

export default {
  calculateActualOvertimeHours,
  applyRoundingRules,
  resolveDirection,
  classifyItem,
  resolveActualOvertimeForPeriod,
  isActualOvertimeEnabled,
  employeeDayKey,
};
