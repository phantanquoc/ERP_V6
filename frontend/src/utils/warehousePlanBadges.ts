/**
 * Badge helpers dùng chung cho kế hoạch nhập kho (InboundPlan) và xuất kho (OutboundPlan).
 *
 * Hai tab kế hoạch có cùng vòng trạng thái, khác đúng phần chữ:
 *   inbound: Chờ nhập → Đã nhập     outbound: Chờ xuất → Đã xuất
 * nên logic badge trước đây bị copy-paste 2 bản. Gom về đây để đổi màu/ngưỡng
 * "sắp đến hạn" một lần là cả 2 tab theo.
 */

/** Số ngày trước hạn thì coi là "Sắp đến hạn". */
export const DUE_SOON_DAYS = 3;

export type PlanBadgeTone = 'gray' | 'green' | 'red' | 'amber' | 'blue';

export interface PlanBadge {
  label: string;
  tone: PlanBadgeTone;
  className: string;
}

const TONE_CLASS: Record<PlanBadgeTone, string> = {
  gray: 'bg-gray-100 text-gray-600',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
};

export interface PlanStatusInput {
  trangThai: string;
  ngayDuKien?: string | null;
  /** Trạng thái "đang chờ" của luồng: 'Chờ nhập' hoặc 'Chờ xuất'. */
  pendingStatus: string;
  /** Trạng thái hoàn tất của luồng: 'Đã nhập' hoặc 'Đã xuất'. */
  doneStatus: string;
}

/**
 * Suy ra badge cho một dòng kế hoạch.
 *
 * Quá hạn được tính theo NGÀY HẸN chứ không chỉ dựa vào cột trangThai: backend chỉ
 * ghi 'Quá hạn' cho inbound khi có phiếu nhập chạy qua onReceiptCreated, còn outbound
 * thì không nơi nào ghi. Nếu chỉ đọc trangThai thì dòng quá hạn thật vẫn hiện xanh.
 */
export function resolvePlanBadge({ trangThai, ngayDuKien, pendingStatus, doneStatus }: PlanStatusInput): PlanBadge {
  const badge = (label: string, tone: PlanBadgeTone): PlanBadge => ({ label, tone, className: TONE_CLASS[tone] });

  if (trangThai === 'Đã hủy') return badge('Đã hủy', 'gray');
  if (trangThai === doneStatus) return badge(doneStatus, 'green');

  const due = ngayDuKien ? new Date(ngayDuKien) : null;
  const hasDue = due && !isNaN(due.getTime());
  const now = Date.now();
  const isOverdue = hasDue && due!.getTime() < now && [pendingStatus, 'Quá hạn'].includes(trangThai);

  if (isOverdue || trangThai === 'Quá hạn') return badge('Quá hạn', 'red');

  const isSoon = hasDue
    && trangThai === pendingStatus
    && (due!.getTime() - now) / 86_400_000 <= DUE_SOON_DAYS;
  if (isSoon) return badge('Sắp đến hạn', 'amber');

  return badge(trangThai, 'blue');
}
