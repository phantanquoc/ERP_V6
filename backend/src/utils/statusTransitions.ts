import { QuotationStatus, OrderProductionStatus, RepairRequestStatus, FaultRecordStatus } from '@prisma/client';
import { ValidationError } from '@utils/errors';

// ─── QuotationRequest status (string-literal union — enum lives in Prisma schema) ─

export type QuotationRequestStatus = 'CHO_XU_LY' | 'DANG_BAO_GIA' | 'DA_BAO_GIA' | 'HUY';

export const QUOTATION_REQUEST_STATUS_ORDER: QuotationRequestStatus[] = [
  'CHO_XU_LY',
  'DANG_BAO_GIA',
  'DA_BAO_GIA',
];

// Terminal statuses — no further forward transitions allowed from these
export const QUOTATION_REQUEST_TERMINAL_STATUSES = new Set<QuotationRequestStatus>([
  'DA_BAO_GIA',
  'HUY',
]);

// Cancel targets — any non-terminal status may move to one of these
export const QUOTATION_REQUEST_CANCEL_TARGETS = new Set<QuotationRequestStatus>([
  'HUY',
]);

/**
 * Validate and return the next QuotationRequest status.
 *
 * Rules (applied in order):
 *  1. bypass=true → accept any value (ADMIN override)
 *  2. next === current → no-op, return current
 *  3. current is terminal → reject
 *  4. next is a cancel target (HUY) and current is non-terminal → accept
 *  5. next must be the immediate successor in QUOTATION_REQUEST_STATUS_ORDER → accept
 *  6. anything else → ValidationError
 */
export function advanceQuotationRequestStatus(
  current: QuotationRequestStatus,
  next: QuotationRequestStatus,
  opts?: { bypass?: boolean }
): QuotationRequestStatus {
  if (opts?.bypass) return next;
  if (next === current) return current;

  if (QUOTATION_REQUEST_TERMINAL_STATUSES.has(current)) {
    throw new ValidationError(
      `Không thể chuyển trạng thái YCBG từ ${current} sang ${next}`
    );
  }

  if (QUOTATION_REQUEST_CANCEL_TARGETS.has(next)) {
    return next;
  }

  const currentIndex = QUOTATION_REQUEST_STATUS_ORDER.indexOf(current);
  const nextIndex = QUOTATION_REQUEST_STATUS_ORDER.indexOf(next);

  if (currentIndex !== -1 && nextIndex === currentIndex + 1) {
    return next;
  }

  throw new ValidationError(
    `Không thể chuyển trạng thái YCBG từ ${current} sang ${next}`
  );
}

// ─── Quotation status chain (forward order) ───────────────────────────────────
export const QUOTATION_STATUS_ORDER: QuotationStatus[] = [
  QuotationStatus.DRAFT,
  QuotationStatus.DANG_CHO_PHAN_HOI,
  QuotationStatus.DANG_CHO_GUI_DON_HANG,
  QuotationStatus.DA_DAT_HANG,
];

// Terminal statuses — no further transitions allowed from these
export const QUOTATION_TERMINAL_STATUSES = new Set<QuotationStatus>([
  QuotationStatus.KHONG_DAT_HANG,
  QuotationStatus.EXPIRED,
  QuotationStatus.REJECTED,
  QuotationStatus.DA_DAT_HANG,
]);

// Cancel targets — any non-terminal status may move to one of these
export const QUOTATION_CANCEL_TARGETS = new Set<QuotationStatus>([
  QuotationStatus.KHONG_DAT_HANG,
  QuotationStatus.EXPIRED,
  QuotationStatus.REJECTED,
]);

// ─── Order production status chain (forward order) ────────────────────────────
export const ORDER_PRODUCTION_STATUS_ORDER: OrderProductionStatus[] = [
  OrderProductionStatus.CHO_LEN_KE_HOACH,
  OrderProductionStatus.CHO_SAN_XUAT,
  OrderProductionStatus.DANG_SAN_XUAT,
  OrderProductionStatus.CHO_GIAO_HANG,
  OrderProductionStatus.DA_LEN_CONTAINER,
  OrderProductionStatus.DANG_VAN_CHUYEN,
  OrderProductionStatus.DA_GIAO_CHO_KHACH_HANG,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validate and return the next quotation status.
 *
 * Rules (applied in order):
 *  1. bypass=true → accept any enum value
 *  2. next === current → no-op, return current
 *  3. current is terminal → reject
 *  4. next is a cancel target and current is non-terminal → accept
 *  5. next must be the immediate successor in QUOTATION_STATUS_ORDER → accept
 *  6. anything else → ValidationError
 */
export function advanceQuotationStatus(
  current: QuotationStatus,
  next: QuotationStatus,
  opts?: { bypass?: boolean }
): QuotationStatus {
  if (opts?.bypass) return next;
  if (next === current) return current;

  if (QUOTATION_TERMINAL_STATUSES.has(current)) {
    throw new ValidationError(
      `Không thể chuyển trạng thái báo giá từ ${current} sang ${next}: trạng thái hiện tại đã là cuối cùng`
    );
  }

  if (QUOTATION_CANCEL_TARGETS.has(next)) {
    return next;
  }

  const currentIndex = QUOTATION_STATUS_ORDER.indexOf(current);
  const nextIndex = QUOTATION_STATUS_ORDER.indexOf(next);

  if (currentIndex !== -1 && nextIndex === currentIndex + 1) {
    return next;
  }

  throw new ValidationError(
    `Không thể chuyển trạng thái báo giá từ ${current} sang ${next}`
  );
}

/**
 * Validate and return the next order production status.
 *
 * Rules:
 *  1. bypass=true → accept any enum value
 *  2. next === current → no-op, return current
 *  3. next must be the immediate successor in ORDER_PRODUCTION_STATUS_ORDER → accept
 *  4. anything else → ValidationError
 */
export function advanceOrderProductionStatus(
  current: OrderProductionStatus,
  next: OrderProductionStatus,
  opts?: { bypass?: boolean }
): OrderProductionStatus {
  if (opts?.bypass) return next;
  if (next === current) return current;

  const currentIndex = ORDER_PRODUCTION_STATUS_ORDER.indexOf(current);
  const nextIndex = ORDER_PRODUCTION_STATUS_ORDER.indexOf(next);

  if (currentIndex !== -1 && nextIndex === currentIndex + 1) {
    return next;
  }

  throw new ValidationError(
    `Không thể chuyển trạng thái sản xuất từ ${current} sang ${next}`
  );
}

// ─── RepairRequest status chain (forward order) ───────────────────────────────

export const REPAIR_REQUEST_STATUS_ORDER: RepairRequestStatus[] = [
  RepairRequestStatus.CHO_XU_LY,
  RepairRequestStatus.DANG_SUA_CHUA,
  RepairRequestStatus.HOAN_THANH,
];

// Terminal statuses — no further forward transitions allowed from these
export const REPAIR_REQUEST_TERMINAL_STATUSES = new Set<RepairRequestStatus>([
  RepairRequestStatus.HOAN_THANH,
  RepairRequestStatus.DA_HUY,
]);

// Cancel targets — any non-terminal status may move to one of these
export const REPAIR_REQUEST_CANCEL_TARGETS = new Set<RepairRequestStatus>([
  RepairRequestStatus.DA_HUY,
]);

/**
 * Validate and return the next RepairRequest status.
 *
 * Rules (applied in order):
 *  1. bypass=true → accept any enum value (ADMIN override)
 *  2. next === current → no-op, return current
 *  3. current is terminal → reject
 *  4. next is a cancel target (DA_HUY) and current is non-terminal → accept
 *  5. next must be the immediate successor in REPAIR_REQUEST_STATUS_ORDER → accept
 *  6. anything else → ValidationError
 */
export function advanceRepairRequestStatus(
  current: RepairRequestStatus,
  next: RepairRequestStatus,
  opts?: { bypass?: boolean }
): RepairRequestStatus {
  if (opts?.bypass) return next;
  if (next === current) return current;

  if (REPAIR_REQUEST_TERMINAL_STATUSES.has(current)) {
    throw new ValidationError(
      `Không thể chuyển trạng thái yêu cầu sửa chữa từ ${current} sang ${next}`
    );
  }

  if (REPAIR_REQUEST_CANCEL_TARGETS.has(next)) {
    return next;
  }

  const currentIndex = REPAIR_REQUEST_STATUS_ORDER.indexOf(current);
  const nextIndex = REPAIR_REQUEST_STATUS_ORDER.indexOf(next);

  if (currentIndex !== -1 && nextIndex === currentIndex + 1) {
    return next;
  }

  throw new ValidationError(
    `Không thể chuyển trạng thái yêu cầu sửa chữa từ ${current} sang ${next}`
  );
}

// ─── FaultRecord status transitions ───────────────────────────────────────────
// Allowed transitions (non-linear, cyclic):
//   DANG_THEO_DOI → DA_XU_LY  (mark resolved)
//   DA_XU_LY      → TAI_PHAT   (mark recurred)
//   TAI_PHAT      → DA_XU_LY   (resolve again)

type FaultRecordTransition = [FaultRecordStatus, FaultRecordStatus];

const FAULT_RECORD_ALLOWED_TRANSITIONS: FaultRecordTransition[] = [
  [FaultRecordStatus.DANG_THEO_DOI, FaultRecordStatus.DA_XU_LY],
  [FaultRecordStatus.DA_XU_LY, FaultRecordStatus.TAI_PHAT],
  [FaultRecordStatus.TAI_PHAT, FaultRecordStatus.DA_XU_LY],
];

/**
 * Validate and return the next FaultRecord status.
 *
 * Rules (applied in order):
 *  1. bypass=true → accept any enum value (ADMIN override)
 *  2. next === current → no-op, return current
 *  3. transition must be in FAULT_RECORD_ALLOWED_TRANSITIONS → accept
 *  4. anything else → ValidationError with Vietnamese message
 */
export function advanceFaultRecordStatus(
  current: FaultRecordStatus,
  next: FaultRecordStatus,
  opts?: { bypass?: boolean }
): FaultRecordStatus {
  if (opts?.bypass) return next;
  if (next === current) return current;

  const isAllowed = FAULT_RECORD_ALLOWED_TRANSITIONS.some(
    ([from, to]) => from === current && to === next
  );

  if (isAllowed) return next;

  throw new ValidationError(
    `Không thể chuyển trạng thái sự cố từ ${current} sang ${next}`
  );
}
