/**
 * Format a date string as relative time in Vietnamese.
 * Thresholds: Vừa xong (<1m), N phút (<60m), N giờ (<24h), Hôm qua (1d),
 * N ngày trước (2-6d), 1 tuần trước (7-13d), N tuần trước (14-29d), dd/mm/yyyy (>=30d)
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays <= 6) return `${diffDays} ngày trước`;
  if (diffDays <= 13) return '1 tuần trước';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;

  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
