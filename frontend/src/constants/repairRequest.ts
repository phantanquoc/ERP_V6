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

export const KET_LUAN_LABELS: Record<string, string> = {
  CAN_SUA_CHUA: 'Cần sửa chữa',
  KHONG_CAN: 'Không cần',
  THEO_DOI: 'Theo dõi',
};

export const MUC_DO_LABELS: Record<string, string> = {
  nhe: 'Nhẹ',
  trung_binh: 'Trung bình',
  nang: 'Nặng',
  nguy_hiem: 'Nguy hiểm',
};

export const KET_LUAN_TONE: Record<string, BadgeTone> = {
  CAN_SUA_CHUA: 'yellow',
  KHONG_CAN: 'green',
  THEO_DOI: 'blue',
};

export const MUC_DO_TONE: Record<string, BadgeTone> = {
  nhe: 'gray',
  trung_binh: 'blue',
  nang: 'yellow',
  nguy_hiem: 'red',
};

export function formatKetLuan(code: string | null | undefined): string {
  if (!code) return '—';
  return KET_LUAN_LABELS[String(code)] ?? String(code);
}

export function formatMucDo(code: string | null | undefined): string {
  if (!code) return '—';
  return MUC_DO_LABELS[String(code)] ?? String(code);
}

export function formatTimelineReason(reason: string | null | undefined): string {
  if (!reason) return '';
  let out = String(reason);
  for (const [code, label] of Object.entries(KET_LUAN_LABELS)) {
    out = out.split(code).join(label);
  }
  for (const [code, label] of Object.entries(MUC_DO_LABELS)) {
    out = out.split(code).join(label);
  }
  return out;
}
