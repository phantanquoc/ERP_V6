import { describe, expect, it } from 'vitest';
import { resolveDeepLink, NOTIFICATION_TYPE_LABELS } from '../../components/myNotificationsUtils';

// The YCBS notification (type REPLENISHMENT_REQUEST) had no deep-link case, so
// clicking "Yêu cầu bổ sung mới" opened nothing. Both purchasing pages own
// ?replenishmentRequestId= on their `replenishment` tab; the link must carry
// tab=replenishment or useUrlTab lands on purchaseRequestList and the param is
// dropped as unowned.

describe('resolveDeepLink — REPLENISHMENT_REQUEST', () => {
  it('routes to materials replenishment tab with the YCBS id', () => {
    expect(
      resolveDeepLink({
        type: 'REPLENISHMENT_REQUEST',
        metadata: { replenishmentRequestId: 'ybs1', phanLoaiGroup: 'MATERIALS' },
      }),
    ).toBe('/purchasing/materials?tab=replenishment&replenishmentRequestId=ybs1');
  });

  it('routes to equipment tab for an EQUIPMENT bucket', () => {
    expect(
      resolveDeepLink({
        type: 'REPLENISHMENT_REQUEST',
        metadata: { replenishmentRequestId: 'ybs2', phanLoaiGroup: 'EQUIPMENT' },
      }),
    ).toBe('/purchasing/equipment?tab=replenishment&replenishmentRequestId=ybs2');
  });

  it('falls back to materials and the tab when the id is missing', () => {
    expect(resolveDeepLink({ type: 'REPLENISHMENT_REQUEST', metadata: {} })).toBe(
      '/purchasing/materials?tab=replenishment',
    );
  });
});

describe('resolveDeepLink — PURCHASE_REQUEST', () => {
  it('uses purchaseRequestId when present', () => {
    expect(
      resolveDeepLink({ type: 'PURCHASE_REQUEST', metadata: { purchaseRequestId: 'pr1', phanLoaiGroup: 'EQUIPMENT' } }),
    ).toBe('/purchasing/equipment?purchaseRequestId=pr1');
  });

  // The convert-YCBS→YCMH notification sets entityId but not purchaseRequestId;
  // without this fallback the approver gets no link on the new YCMH.
  it('falls back to entityId for the convert notification', () => {
    expect(
      resolveDeepLink({ type: 'PURCHASE_REQUEST', metadata: { entityId: 'pr9', phanLoaiGroup: 'MATERIALS' } }),
    ).toBe('/purchasing/materials?purchaseRequestId=pr9');
  });
});

describe('REPLENISHMENT_REQUEST label', () => {
  it('has a Vietnamese label', () => {
    expect(NOTIFICATION_TYPE_LABELS.REPLENISHMENT_REQUEST).toBe('Yêu cầu bổ sung');
  });
});
