function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export const CANONICAL_BO_PHAN: string[] = [
  'Bộ phận kỹ thuật',
  'Bộ phận sản xuất',
  'Bộ phận chất lượng',
  'Bộ phận kinh doanh',
  'Bộ phận kế toán',
  'Bộ phận tổng hợp',
  'Ban giám đốc',
];

const NORMALIZED_MAP: Record<string, string> = {
  // technical
  'technical': 'Bộ phận kỹ thuật',
  'ky thuat': 'Bộ phận kỹ thuật',
  'bo phan ky thuat': 'Bộ phận kỹ thuật',
  // production
  'production': 'Bộ phận sản xuất',
  'san xuat': 'Bộ phận sản xuất',
  'bo phan san xuat': 'Bộ phận sản xuất',
  // quality
  'quality': 'Bộ phận chất lượng',
  'chat luong': 'Bộ phận chất lượng',
  'bo phan chat luong': 'Bộ phận chất lượng',
  // business
  'business': 'Bộ phận kinh doanh',
  'kinh doanh': 'Bộ phận kinh doanh',
  'bo phan kinh doanh': 'Bộ phận kinh doanh',
  // accounting
  'accounting': 'Bộ phận kế toán',
  'ke toan': 'Bộ phận kế toán',
  'bo phan ke toan': 'Bộ phận kế toán',
  // general
  'general': 'Bộ phận tổng hợp',
  'tong hop': 'Bộ phận tổng hợp',
  'bo phan tong hop': 'Bộ phận tổng hợp',
  // admin
  'admin': 'Ban giám đốc',
  'ban giam doc': 'Ban giám đốc',
};

export function normalizeBoPhan(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';
  const key = stripDiacritics(trimmed.toLowerCase()).replace(/\s+/g, ' ').trim();
  return NORMALIZED_MAP[key] ?? trimmed;
}
