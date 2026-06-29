import { QuotationStatus, OrderProductionStatus } from '@prisma/client';
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
