import type { BadgeTone } from '../components/shared/StatusBadge';

export const PRIORITIES = ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'] as const;
export const FAULT_TYPES = ['Lỗi mới', 'Lỗi lặp lại'] as const;
export const MANUAL_ENTRY = '__manual__';

export const PRIORITY_TONE: Record<string, BadgeTone> = {
  'Khẩn cấp': 'red',
  'Cao': 'yellow',
  'Trung bình': 'blue',
  'Thấp': 'gray',
};

// Inspection conclusion — only two outcomes
export const KET_LUAN_OPTIONS = ['CAN_SUA_CHUA', 'DA_KHAC_PHUC'] as const;
export const KET_LUAN_LABELS: Record<string, string> = {
  CAN_SUA_CHUA: 'Cần sửa chữa',
  DA_KHAC_PHUC: 'Đã khắc phục',
};

export const MUC_DO_OPTIONS = ['nhe', 'trung_binh', 'nang'] as const;
export const MUC_DO_LABELS: Record<string, string> = {
  nhe: 'Nhẹ',
  trung_binh: 'Trung bình',
  nang: 'Nặng',
};

export const KET_LUAN_TONE: Record<string, BadgeTone> = {
  CAN_SUA_CHUA: 'yellow',
  DA_KHAC_PHUC: 'green',
};

export const MUC_DO_TONE: Record<string, BadgeTone> = {
  nhe: 'gray',
  trung_binh: 'blue',
  nang: 'red',
};

// Legacy conclusion codes that may still exist on old records / status logs (display only)
const LEGACY_KET_LUAN_LABELS: Record<string, string> = {
  KHONG_CAN: 'Không cần sửa chữa (cũ)',
};

export function formatKetLuan(code: string | null | undefined): string {
  if (!code) return '—';
  return KET_LUAN_LABELS[String(code)] ?? LEGACY_KET_LUAN_LABELS[String(code)] ?? String(code);
}

export function formatMucDo(code: string | null | undefined): string {
  if (!code) return '—';
  return MUC_DO_LABELS[String(code)] ?? String(code);
}

// ── Dates ────────────────────────────────────────────────────────────────

/** DD/MM/YYYY (zero padded) — the UI date convention. */
export function formatDateVN(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** DD/MM/YYYY HH:mm */
export function formatDateTimeVN(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Status-log reason codes ──────────────────────────────────────────────

// Action codes written by the backend into *StatusLog.reason
const REASON_LABELS: Record<string, string> = {
  create: 'Tạo phiếu',
  accept: 'Tiếp nhận',
  startInspection: 'Bắt đầu kiểm tra',
  submitInspection: 'Gửi kết quả kiểm tra',
  update_details: 'Cập nhật kết quả kiểm tra',
  acceptance_dat: 'Xác nhận nghiệm thu ĐẠT',
  complete: 'Hoàn thành',
  complete_admin: 'Hoàn thành (ADMIN)',
  plan: 'Lên kế hoạch',
  start_repair: 'Bắt đầu sửa chữa',
  submit_acceptance: 'Đề nghị nghiệm thu',
  reject: 'Từ chối',
  cancel: 'Hủy phiếu',
  user_cancel: 'Người dùng hủy phiếu',
  admin_override: 'ADMIN can thiệp',
  'admin_override:edit': 'ADMIN sửa phiếu nghiệm thu',
  'admin_override:delete': 'ADMIN xóa phiếu nghiệm thu',
};

const describeDetailsSnapshot = (json: string): string => {
  try {
    const snap = JSON.parse(json) as Record<string, unknown>;
    const parts: string[] = [];
    if (snap.ketLuan != null && snap.ketLuan !== '') parts.push(`kết luận: ${formatKetLuan(String(snap.ketLuan))}`);
    if (snap.ketQuaKiemTra != null && String(snap.ketQuaKiemTra).trim() !== '') parts.push(`kết quả: ${String(snap.ketQuaKiemTra).trim()}`);
    return parts.join('; ');
  } catch {
    return '';
  }
};

/** Turns a status-log reason (action code or free text) into a Vietnamese, user-facing sentence. Never returns raw JSON. */
export function formatTimelineReason(reason: string | null | undefined): string {
  if (!reason) return '';
  const raw = String(reason).trim();
  if (!raw) return '';
  if (REASON_LABELS[raw]) return REASON_LABELS[raw];
  if (raw.startsWith('update_details')) {
    const rest = raw.slice('update_details'.length).trim();
    const summary = rest ? describeDetailsSnapshot(rest) : '';
    return summary ? `${REASON_LABELS.update_details} — ${summary}` : REASON_LABELS.update_details;
  }
  if (raw.startsWith('submit_da_khac_phuc')) {
    const code = raw.slice('submit_da_khac_phuc'.length).trim();
    return `Đã khắc phục — gửi phiếu nghiệm thu${code ? ` ${code}` : ''}`;
  }
  if (raw.startsWith('acceptance_khong_dat')) {
    const why = raw.slice('acceptance_khong_dat'.length).replace(/^:\s*/, '').trim();
    return `Xác nhận nghiệm thu KHÔNG ĐẠT${why ? `: ${why}` : ''}`;
  }
  // Free text typed by a user (reject / cancel reason) — keep as-is, only localise known codes
  let out = raw;
  for (const [code, label] of Object.entries({ ...KET_LUAN_LABELS, ...LEGACY_KET_LUAN_LABELS })) {
    out = out.split(code).join(label);
  }
  return out;
}

// ── Workflow gating (mirrors backend services; backend stays the source of truth) ──

export interface GateActor {
  /** Kỹ thuật member (primary or secondary dept, any role) or ADMIN — see isTechnicalUser */
  isTechnical: boolean;
  isAdmin: boolean;
  /** record.createdById === current user id */
  isOwner: boolean;
}

const INSPECTION_EDITABLE = new Set(['CHO_XU_LY', 'DA_TIEP_NHAN', 'DANG_KIEM_TRA']);
const REPAIR_EDITABLE = new Set(['CHO_XU_LY', 'DA_TIEP_NHAN', 'LEN_KE_HOACH', 'DANG_SUA_CHUA', 'CHO_NGHIEM_THU']);
const INSPECTION_TERMINAL = new Set(['HOAN_THANH', 'DA_HUY', 'TU_CHOI']);
const INSPECTION_CANCEL_FROM = new Set(['CHO_XU_LY', 'DA_TIEP_NHAN', 'DANG_KIEM_TRA']);
const REPAIR_CANCEL_FROM = new Set(['CHO_XU_LY', 'DA_TIEP_NHAN', 'LEN_KE_HOACH']);
const REPAIR_CANCEL_FROM_ADMIN = new Set(['CHO_XU_LY', 'DA_TIEP_NHAN', 'LEN_KE_HOACH', 'DANG_SUA_CHUA', 'CHO_NGHIEM_THU']);
const DELETE_FROM = new Set(['CHO_XU_LY', 'DA_TIEP_NHAN']);

/** Non-technical creators: only own request while CHO_XU_LY. Technicians/ADMIN: until acceptance starts. */
export function canEditInspection(status: string, a: GateActor): boolean {
  if (a.isTechnical || a.isAdmin) return INSPECTION_EDITABLE.has(status);
  return a.isOwner && status === 'CHO_XU_LY';
}

export function canEditRepair(status: string, a: GateActor): boolean {
  if (a.isTechnical || a.isAdmin) return REPAIR_EDITABLE.has(status);
  return a.isOwner && status === 'CHO_XU_LY';
}

/** Mirrors advanceInspection DA_HUY rules: ADMIN any non-terminal, technician CHO_XU_LY/DA_TIEP_NHAN/DANG_KIEM_TRA. */
export function canCancelInspection(status: string, a: GateActor): boolean {
  if (a.isAdmin) return !INSPECTION_TERMINAL.has(status);
  if (a.isTechnical) return INSPECTION_CANCEL_FROM.has(status);
  return a.isOwner && status === 'CHO_XU_LY';
}

/** Mirrors DA_HUY_ALLOWED_FROM_NORMAL / _ADMIN in backend statusTransitions. */
export function canCancelRepair(status: string, a: GateActor): boolean {
  if (a.isAdmin) return REPAIR_CANCEL_FROM_ADMIN.has(status);
  if (a.isTechnical) return REPAIR_CANCEL_FROM.has(status);
  return a.isOwner && status === 'CHO_XU_LY';
}

/** Delete is for canDeleteTechnical users, and only before work has started. */
export function canDeleteRequest(status: string, canDelete: boolean): boolean {
  return canDelete && DELETE_FROM.has(status);
}

export interface AcceptanceSlipLike {
  ketQua?: string | null;
  nguoiXacNhanId?: string | null;
  createdAt?: string | null;
}

/** Latest acceptance slip still waiting for the requester's ĐẠT / KHÔNG ĐẠT. */
export function pickPendingSlip<T extends AcceptanceSlipLike>(slips: T[] | null | undefined): T | null {
  return [...(slips ?? [])]
    .sort((x, y) => String(y.createdAt ?? '').localeCompare(String(x.createdAt ?? '')))
    .find((s) => !s.ketQua) ?? null;
}

/** Only the pending slip's designated confirmer (or ADMIN) may confirm acceptance. */
export function canConfirmAcceptance(slips: AcceptanceSlipLike[] | null | undefined, userId: string, isAdmin: boolean): boolean {
  const pending = pickPendingSlip(slips);
  if (!pending) return false;
  if (isAdmin) return true;
  return !!userId && !!pending.nguoiXacNhanId && pending.nguoiXacNhanId === userId;
}

/** YCSC that still count for the source YCKT (cancelled / rejected ones do not). */
export function activeRepairs<T extends { trangThai: string }>(repairs: T[] | null | undefined): T[] {
  return (repairs ?? []).filter((r) => r.trangThai !== 'DA_HUY' && r.trangThai !== 'TU_CHOI');
}

// ── Stepper ──────────────────────────────────────────────────────────────

export function inspectionStepsFor(status: string, ketLuan: string | null | undefined): { key: string; label: string }[] {
  const head = [
    { key: 'CHO_XU_LY', label: 'Chờ xử lý' },
    { key: 'DA_TIEP_NHAN', label: 'Đã tiếp nhận' },
    { key: 'DANG_KIEM_TRA', label: 'Đang kiểm tra' },
  ];
  const fixedBranch = status === 'CHO_NGHIEM_THU' || ketLuan === 'DA_KHAC_PHUC';
  return fixedBranch
    ? [...head, { key: 'CHO_NGHIEM_THU', label: 'Chờ xác nhận nghiệm thu' }, { key: 'HOAN_THANH', label: 'Hoàn thành' }]
    : [...head, { key: 'DA_KIEM_TRA', label: 'Đã kiểm tra' }, { key: 'HOAN_THANH', label: 'Hoàn thành' }];
}

// ── Deep links between YCKT and YCSC ─────────────────────────────────────

const DETAIL_KEYS = ['inspectionId', 'inspectionRequestId', 'repairId', 'repairRequestId', 'create', 'type', 'sub', 'requestType'];

/**
 * URL params that open a YCKT/YCSC detail on the Technical page. Removes the other record's id
 * (YCKT and YCSC ids overlap, and keeping both makes TechnicalQuality bounce between tabs).
 */
export function buildTechnicalDetailParams(current: URLSearchParams | string, target: 'inspection' | 'repair', id: string | number): URLSearchParams {
  const next = new URLSearchParams(current);
  DETAIL_KEYS.forEach((k) => next.delete(k));
  // List filters belong to the tab we are leaving
  ['q', 'search', 'status', 'trangThai', 'page', 'limit'].forEach((k) => next.delete(k));
  if (target === 'repair') {
    next.set('tab', 'repairs');
    next.set('repairId', String(id));
  } else {
    next.set('tab', 'inspections');
    next.set('inspectionId', String(id));
  }
  return next;
}

/** De-duplicate rows by id (API returns material needs both top-level and under items). */
export function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị',
  DEPARTMENT_HEAD: 'Trưởng bộ phận',
  TEAM_LEAD: 'Trưởng nhóm',
  EMPLOYEE: 'Nhân viên',
};
