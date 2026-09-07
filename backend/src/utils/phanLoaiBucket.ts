export type Bucket = 'MATERIALS' | 'EQUIPMENT' | 'OTHER';

function stripDiacritics(input: string): string {
  return (input ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Single source of truth for goods-class bucketing.
 * Used by supplyRequestService (PR bucket), notificationRegistry (recipient routing),
 * and purchaseRequestService (phanLoaiNCC filter via buckets).
 *
 * DB vocabulary (lookup PHAN_LOAI_VAT_TU + LOAI_SAN_PHAM):
 * - Nguyên vật liệu, Vật tư, Phụ liệu, Nguyên liệu trái/tươi/đông, Thành phẩm, Nhiên liệu
 * - Công cụ dụng cụ, Thiết bị sản xuất, dụng cụ/dụng cụ sản xuất
 * - Văn phòng phẩm, Sơ đồ nhà máy, thiet ke may khuay ... (→ OTHER)
 *
 * Domain convention (confirmed with ops):
 * - MATERIALS = goods that are consumed/transformed into output, handled by
 *   SUBDEPT_PURCHASING_MATERIALS (phòng thu mua NVL)
 * - EQUIPMENT = durable tooling/machines, handled by SUBDEPT_PURCHASING_EQUIPMENT
 * - OTHER     = office / factory-layout / free-text → broadcast fallback
 */
export function bucketPhanLoai(phanLoai: string): Bucket {
  const raw = (phanLoai ?? '').trim();
  if (!raw) return 'OTHER';
  const n = stripDiacritics(raw).toLowerCase();
  // Concrete/tooling — check before materials (some names contain both words)
  if (n.includes('thiet bi') || n.includes('cong cu') || n.includes('dung cu')) return 'EQUIPMENT';
  // Raw materials & consumables processed into finished product
  if (
    n.includes('nguyen lieu') || // covers 'Nguyên vật liệu', 'Nguyên liệu trái', 'tươi đã sơ chế', 'đông'
    n.includes('nguyen vat lieu') ||
    n.includes('vat tu') ||
    n.includes('vat lieu') ||
    n.includes('phu lieu') ||
    n.includes('bao bi') ||
    n.includes('nhien lieu') ||
    n.includes('thanh pham') // Thành phẩm made from inputs — sourced by materials team
  )
    return 'MATERIALS';
  return 'OTHER';
}

/** Bucket → permitted purchasing sub-department code (null = broadcast DEPT_PURCHASING). */
export function subDeptCodeForBucket(bucket: Bucket): string | null {
  if (bucket === 'MATERIALS') return 'SUBDEPT_PURCHASING_MATERIALS';
  if (bucket === 'EQUIPMENT') return 'SUBDEPT_PURCHASING_EQUIPMENT';
  return null;
}
