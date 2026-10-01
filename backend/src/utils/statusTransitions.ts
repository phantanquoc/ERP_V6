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
// 7-step linear order; TU_CHOI and DA_HUY are terminal branches not in linear order.

export const REPAIR_STATUS_ORDER: RepairRequestStatus[] = [
  RepairRequestStatus.CHO_XU_LY,
  RepairRequestStatus.DA_TIEP_NHAN,
  RepairRequestStatus.LEN_KE_HOACH,
  RepairRequestStatus.DANG_SUA_CHUA,
  RepairRequestStatus.CHO_NGHIEM_THU,
  RepairRequestStatus.DA_NGHIEM_THU,
  RepairRequestStatus.HOAN_THANH,
];

// Backward-compat alias — old 4-state constant kept for existing imports
export const REPAIR_REQUEST_STATUS_ORDER: RepairRequestStatus[] = REPAIR_STATUS_ORDER;

// Terminal statuses — no outgoing transitions
export const REPAIR_REQUEST_TERMINAL_STATUSES = new Set<RepairRequestStatus>([
  RepairRequestStatus.HOAN_THANH,
  RepairRequestStatus.DA_HUY,
  RepairRequestStatus.TU_CHOI,
]);

// Cancel / reject branches
export const REPAIR_REQUEST_CANCEL_TARGETS = new Set<RepairRequestStatus>([
  RepairRequestStatus.DA_HUY,
]);

const REJECT_TARGET = RepairRequestStatus.TU_CHOI;

// TU_CHOI allowed only from these statuses
const TU_CHOI_ALLOWED_FROM = new Set<RepairRequestStatus>([
  RepairRequestStatus.CHO_XU_LY,
  RepairRequestStatus.DA_TIEP_NHAN,
  RepairRequestStatus.LEN_KE_HOACH,
]);

// DA_HUY allowed from these for normal roles; ADMIN extends to CHO_NGHIEM_THU
const DA_HUY_ALLOWED_FROM_NORMAL = new Set<RepairRequestStatus>([
  RepairRequestStatus.CHO_XU_LY,
  RepairRequestStatus.DA_TIEP_NHAN,
  RepairRequestStatus.LEN_KE_HOACH,
]);
const DA_HUY_ALLOWED_FROM_ADMIN = new Set<RepairRequestStatus>([
  RepairRequestStatus.CHO_XU_LY,
  RepairRequestStatus.DA_TIEP_NHAN,
  RepairRequestStatus.LEN_KE_HOACH,
  RepairRequestStatus.DANG_SUA_CHUA,
  RepairRequestStatus.CHO_NGHIEM_THU,
]);

// KIEM_TRA short path: CHO_XU_LY -> DA_TIEP_NHAN -> HOAN_THANH
const KIEM_TRA_ORDER: RepairRequestStatus[] = [
  RepairRequestStatus.CHO_XU_LY,
  RepairRequestStatus.DA_TIEP_NHAN,
  RepairRequestStatus.HOAN_THANH,
];

type AdvanceRepairOpts = { bypass?: boolean; isAdmin?: boolean; requestType?: string };

function resolveAdvanceArgs(
  arg3?: AdvanceRepairOpts | boolean,
  arg4?: string
): { bypass: boolean; requestType?: string } {
  let bypass = false;
  let requestType: string | undefined = arg4;
  if (typeof arg3 === 'boolean') {
    bypass = arg3;
  } else if (arg3 && typeof arg3 === 'object') {
    bypass = Boolean(arg3.bypass || arg3.isAdmin);
    if (arg3.requestType) requestType = arg3.requestType;
  }
  return { bypass, requestType };
}

// ADMIN may skip forward only up to this step; acceptance (DA_NGHIEM_THU) and completion
// (HOAN_THANH) are always reached one step at a time through confirmAcceptance / complete.
const ADMIN_SKIP_LIMIT_INDEX = REPAIR_STATUS_ORDER.indexOf(RepairRequestStatus.CHO_NGHIEM_THU);

/**
 * Validate and return the next RepairRequest status.
 *
 * Supports both signatures:
 *   advanceRepairRequestStatus(current, next, { bypass, requestType })
 *   advanceRepairRequestStatus(current, next, isAdmin, requestType)  // task spec
 *
 * Rules (ADMIN bypass included — nobody leaves a terminal state or goes backward):
 *  1. next === current → no-op
 *  2. current is terminal → reject (also for ADMIN)
 *  3. TU_CHOI only from CHO_XU_LY | DA_TIEP_NHAN | LEN_KE_HOACH
 *  4. DA_HUY: normal before DANG_SUA_CHUA, ADMIN up to CHO_NGHIEM_THU (never after DA_NGHIEM_THU)
 *  5. KIEM_TRA (legacy rows) guards: only CHO_XU_LY -> DA_TIEP_NHAN -> HOAN_THANH, one step at a time
 *  6. Forward-only: normal requires the immediate successor; ADMIN may skip forward but only up to
 *     CHO_NGHIEM_THU. DA_NGHIEM_THU / HOAN_THANH require the immediate predecessor for everyone.
 *  The KHÔNG ĐẠT loop (CHO_NGHIEM_THU → DANG_SUA_CHUA) is written only by confirmAcceptance.
 */
export function advanceRepairRequestStatus(
  current: RepairRequestStatus,
  next: RepairRequestStatus,
  optsOrIsAdmin?: AdvanceRepairOpts | boolean,
  requestTypeArg?: string
): RepairRequestStatus {
  const { bypass, requestType } = resolveAdvanceArgs(optsOrIsAdmin, requestTypeArg);
  const rt = requestType; // 'KIEM_TRA' | 'SUA_CHUA' | undefined

  if (next === current) return current;

  if (REPAIR_REQUEST_TERMINAL_STATUSES.has(current)) {
    throw new ValidationError(
      `Không thể chuyển trạng thái yêu cầu sửa chữa từ ${current} sang ${next}`
    );
  }

  // TU_CHOI branch
  if (next === REJECT_TARGET) {
    if (!TU_CHOI_ALLOWED_FROM.has(current)) {
      throw new ValidationError(
        `Không thể từ chối yêu cầu ở trạng thái ${current}`
      );
    }
    return next;
  }

  // DA_HUY branch
  if (next === RepairRequestStatus.DA_HUY) {
    const allowed = bypass ? DA_HUY_ALLOWED_FROM_ADMIN : DA_HUY_ALLOWED_FROM_NORMAL;
    if (!allowed.has(current)) {
      throw new ValidationError(
        bypass
          ? `Không thể hủy yêu cầu ở trạng thái ${current} (ADMIN chỉ được hủy tới CHO_NGHIEM_THU)`
          : `Không thể hủy yêu cầu ở trạng thái ${current} (chỉ được hủy trước DANG_SUA_CHUA)`
      );
    }
    return next;
  }

  // KIEM_TRA guards — reject any SUA_CHUA-only statuses
  if (rt === 'KIEM_TRA') {
    // Block SUA_CHUA-only statuses for KIEM_TRA
    const suaChuaOnly: RepairRequestStatus[] = [
      RepairRequestStatus.LEN_KE_HOACH,
      RepairRequestStatus.DANG_SUA_CHUA,
      RepairRequestStatus.CHO_NGHIEM_THU,
      RepairRequestStatus.DA_NGHIEM_THU,
    ];
    if ((suaChuaOnly as string[]).includes(next as string)) {
      throw new ValidationError(
        `Phiếu kiểm tra không thể chuyển sang trạng thái ${next}`
      );
    }
    // Enforce KIEM_TRA linear order
    const curIdx = KIEM_TRA_ORDER.indexOf(current);
    const nxtIdx = KIEM_TRA_ORDER.indexOf(next);
    if (curIdx !== -1 && nxtIdx !== -1 && nxtIdx === curIdx + 1) return next;
    throw new ValidationError(
      `Không thể chuyển trạng thái yêu cầu kiểm tra từ ${current} sang ${next}`
    );
  }

  // SUA_CHUA (or unknown requestType) linear order. Legacy compat edges
  // (CHO_XU_LY→DANG_SUA_CHUA, DANG_SUA_CHUA→HOAN_THANH, DA_NGHIEM_THU→DANG_SUA_CHUA) were removed:
  // they let callers skip planning or bypass the requester's acceptance.
  const order = REPAIR_STATUS_ORDER;
  const currentIndex = order.indexOf(current);
  const nextIndex = order.indexOf(next);

  if (currentIndex !== -1 && nextIndex !== -1) {
    if (nextIndex === currentIndex + 1) return next;
    if (bypass && nextIndex > currentIndex && nextIndex <= ADMIN_SKIP_LIMIT_INDEX) return next;
  }

  throw new ValidationError(
    `Không thể chuyển trạng thái yêu cầu sửa chữa từ ${current} sang ${next}`
  );
}

/**
 * New signature required by task spec: advanceRepairRequestStatus(current, next, isAdmin, requestType)
 * Thin wrapper for explicit positional args — delegates to main function.
 */
export function advanceRepairRequestStatusWithType(
  current: RepairRequestStatus,
  next: RepairRequestStatus,
  isAdmin: boolean,
  requestType?: string
): RepairRequestStatus {
  return advanceRepairRequestStatus(current, next, { bypass: isAdmin, requestType });
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
