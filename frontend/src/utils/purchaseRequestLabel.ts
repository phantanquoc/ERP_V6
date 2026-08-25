/**
 * Replenishment naming helper.
 * A SHORTAGE purchase request in "Chờ báo giá" is displayed as "Yêu cầu bổ sung";
 * every other combination is "Yêu cầu mua hàng".
 * Preserved code (maYeuCau) is unchanged — this is display-only.
 */

export interface PurchaseRequestIdentity {
  sourceType?: string | null;
  trangThai?: string | null;
}

export function isReplenishment(pr: PurchaseRequestIdentity): boolean {
  return pr.sourceType === 'SHORTAGE' && pr.trangThai === 'Chờ báo giá';
}

export function labelForPurchaseRequest(pr: PurchaseRequestIdentity): string {
  return isReplenishment(pr) ? 'Yêu cầu bổ sung' : 'Yêu cầu mua hàng';
}

export default labelForPurchaseRequest;
