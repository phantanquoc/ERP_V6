/**
 * Design tokens — mã hóa openspec/ui-dna.md thành constants.
 * Không thêm CSS framework mới; tokens chỉ là JS constants để dùng chung.
 */

// ── Colors ──────────────────────────────────────────────────────────────────
export const colors = {
  primary: '#2563EB', // blue-600
  primaryHover: '#1D4ED8', // blue-700
  primaryLight: '#EFF6FF', // blue-50
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4', // cyan-500 (Technical)
  purple: '#8B5CF6',
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const;

// Domain accent (icon/dot), card shell vẫn neutral
export const domainAccent: Record<string, string> = {
  technical: 'text-cyan-500',
  quality: 'text-violet-500',
  accounting: 'text-orange-500',
  common: 'text-blue-500',
  dashboard: 'text-blue-600',
};

// Chart palettes (centralized)
export const chartPalettes = {
  product: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6'],
  inspection: ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'],
  status: ['#10B981', '#F59E0B', '#EF4444', '#6B7280', '#3B82F6', '#8B5CF6'],
} as const;

// ── Spacing (8px rhythm) ────────────────────────────────────────────────────
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
} as const;

// ── Radii ───────────────────────────────────────────────────────────────────
export const radii = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
} as const;

// ── Shadows ─────────────────────────────────────────────────────────────────
export const shadows = {
  card: '0 1px 3px rgba(0,0,0,0.08)',
  cardHover: '0 4px 12px rgba(0,0,0,0.10)',
  floating: '0 8px 24px rgba(0,0,0,0.12)',
} as const;

// ── Component shell classes (Tailwind) ─────────────────────────────────────
// Card padding: p-3 sm:p-4 (responsive — tighter on mobile, comfortable on sm+)
// sectionGap: gap-4 sm:gap-5 for bento grids, gap-2 sm:gap-3 for KPI rows
export const shell = {
  card: 'bg-white border border-gray-200 rounded-lg shadow-sm', // use with p-3 sm:p-4
  cardHover: 'hover:border-gray-300 hover:shadow-md transition-all duration-200',
  cardInteractive: 'cursor-pointer hover:border-gray-300 hover:shadow-md transition-all duration-200',
  sectionCard: 'bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4',
  chartCard: 'bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4',
  chartCardDark: 'bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg shadow-sm p-3 sm:p-4',
} as const;

// Responsive section gaps: bento gap-4 sm:gap-5, KPI gap-2 sm:gap-3
export const sectionGap = {
  bento: 'gap-4 sm:gap-5',
  kpi: 'gap-2 sm:gap-3',
} as const;

// ── Typography classes ──────────────────────────────────────────────────────
export const typography = {
  pageTitle: 'text-xl font-bold text-gray-800',
  pageSubtitle: 'text-xs text-gray-400 mt-0.5',
  sectionTitle: 'text-sm font-semibold text-gray-700',
  cardValue: 'text-xl sm:text-2xl font-bold text-gray-800', // responsive: text-xl on mobile, text-2xl on sm+
  cardLabel: 'text-xs font-medium text-gray-500',
  cardSub: 'text-xs text-gray-400',
} as const;
