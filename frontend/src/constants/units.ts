/**
 * @deprecated Use the `useLookups('DON_VI_TINH')` hook instead — the shared lookup API
 * (`/api/lookups`) is the single source of truth for unit-of-measure values and is
 * admin-managed, so new units no longer need a code change.
 *
 * Kept only for backward compatibility. This list is INCOMPLETE: it holds 13 values
 * while the database holds 23, including units that real products use (`Đôi`, `Can`,
 * `Xe`, `Bịch`, `Xô`, `Miếng`, `Container`, `Lô`). Validating against this array is
 * what caused warehouse forms to silently skip unit auto-fill and let a product with
 * unit `Đôi` be saved as `Kg`. Do not use it for validation or as dropdown options.
 */
export const DON_VI_TINH_OPTIONS: string[] = [
  'Kg',
  'Tấn',
  'Gram',
  'Cái',
  'Bộ',
  'Hộp',
  'Thùng',
  'Bao',
  'Gói',
  'Lít',
  'Mét',
  'Cuộn',
  'Người',
];

/**
 * Default unit pre-selected when a form is first opened or reset.
 *
 * Still in active use (WarehouseManagement's add-product form) and intentionally NOT
 * deprecated: it is a seed value for a new blank form, not a validation list.
 *
 * Historical note: an earlier comment here claimed the capital-K spelling had to match
 * a case-sensitive filter in MaterialEvaluationManagement. That filter no longer exists
 * — `donViTinh` is display-only there, and the only unit comparison left in the
 * codebase is a case-insensitive `contains: 'kg'`. The value is kept as 'Kg' simply
 * because it is the canonical label in the DON_VI_TINH lookup group.
 */
export const DEFAULT_DON_VI_TINH = 'Kg';
