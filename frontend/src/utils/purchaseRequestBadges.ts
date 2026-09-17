/**
 * Badge helpers for YCMH (PurchaseRequest).
 * Centralises status + sourceType colours so Detail and Edit modals stay consistent.
 */

export type SourceType = 'MANUAL' | 'SHORTAGE' | 'REORDER' | 'QUICK' | string;
export type TrangThai =
  | 'Chờ báo giá'
  | 'Chờ duyệt'
  | 'Đã duyệt'
  | 'Từ chối'
  | 'Đã hủy'
  | 'Hoàn thành'
  | string;

// Display label for sourceType. SHORTAGE(PR legacy) keeps its code for migration.
export function sourceTypeLabel(sourceType?: string | null): string {
  switch ((sourceType ?? '').toUpperCase()) {
    case 'SHORTAGE': return 'Thiếu tồn (SHORTAGE)';
    case 'REORDER': return 'Tự động (REORDER)';
    case 'QUICK': return 'Mua nhanh (QUICK)';
    case 'MANUAL':
    default: return 'Thủ công';
  }
}

export function sourceTypeBadgeClass(sourceType?: string | null): string {
  switch ((sourceType ?? '').toUpperCase()) {
    case 'SHORTAGE': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'REORDER': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'QUICK': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'MANUAL':
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function trangThaiBadgeClass(trangThai?: string | null): string {
  switch (trangThai) {
    case 'Chờ báo giá': return 'bg-orange-100 text-orange-800';
    case 'Chờ duyệt': return 'bg-yellow-100 text-yellow-800';
    case 'Đã duyệt': return 'bg-green-100 text-green-800';
    case 'Từ chối': return 'bg-red-100 text-red-800';
    case 'Đã hủy': return 'bg-gray-100 text-gray-700';
    case 'Hoàn thành': return 'bg-emerald-100 text-emerald-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

// Forward-only transitions — mirrors backend ALLOWED_TRANSITIONS.
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'Chờ báo giá': ['Chờ duyệt'],
  'Chờ duyệt': ['Đã duyệt', 'Từ chối'],
  'Từ chối': [],
  'Đã duyệt': ['Hoàn thành'],
  'Hoàn thành': [],
  'Đã hủy': [],
};

export const ALL_TRANG_THAI: string[] = [
  'Chờ báo giá',
  'Chờ duyệt',
  'Đã duyệt',
  'Từ chối',
  'Hoàn thành',
  'Đã hủy',
];

export function allowedNextStatuses(current?: string | null): string[] {
  return ALLOWED_TRANSITIONS[current ?? ''] ?? [];
}

export function isTransitionAllowed(from: string, to: string): boolean {
  if (from === to) return true;
  return allowedNextStatuses(from).includes(to);
}

// --- Helpers used by PurchaseRequestDetailModal ---
const ALLOWED_URL_RE = /^(https?:\/\/|blob:)/i;

export function safeFileUrl(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return null;
  if (ALLOWED_URL_RE.test(trimmed)) return trimmed;
  return null;
}

export function formatVND(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '-';
  return Number(n).toLocaleString('vi-VN') + 'đ';
}

export function formatDateVN(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('vi-VN');
}

export function formatDateTimeVN(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
