import { QuotationStatus, OrderProductionStatus, RepairRequestStatus, FaultRecordStatus } from '@prisma/client';
import { ValidationError } from '@utils/errors';
import {
  advanceQuotationStatus,
  advanceOrderProductionStatus,
  advanceQuotationRequestStatus,
  advanceRepairRequestStatus,
  advanceFaultRecordStatus,
  QUOTATION_STATUS_ORDER,
  QUOTATION_TERMINAL_STATUSES,
  QUOTATION_CANCEL_TARGETS,
  ORDER_PRODUCTION_STATUS_ORDER,
  QUOTATION_REQUEST_STATUS_ORDER,
  QUOTATION_REQUEST_TERMINAL_STATUSES,
  QUOTATION_REQUEST_CANCEL_TARGETS,
  REPAIR_REQUEST_STATUS_ORDER,
  REPAIR_REQUEST_TERMINAL_STATUSES,
  REPAIR_REQUEST_CANCEL_TARGETS,
} from '@utils/statusTransitions';

// ─── Exports sanity ────────────────────────────────────────────────────────────

describe('QUOTATION_STATUS_ORDER', () => {
  it('starts with DRAFT and ends with DA_DAT_HANG', () => {
    expect(QUOTATION_STATUS_ORDER[0]).toBe(QuotationStatus.DRAFT);
    expect(QUOTATION_STATUS_ORDER[QUOTATION_STATUS_ORDER.length - 1]).toBe(QuotationStatus.DA_DAT_HANG);
  });

  it('has exactly 4 steps', () => {
    expect(QUOTATION_STATUS_ORDER).toHaveLength(4);
  });
});

describe('QUOTATION_TERMINAL_STATUSES', () => {
  it('contains DA_DAT_HANG, KHONG_DAT_HANG, EXPIRED, REJECTED', () => {
    expect(QUOTATION_TERMINAL_STATUSES.has(QuotationStatus.DA_DAT_HANG)).toBe(true);
    expect(QUOTATION_TERMINAL_STATUSES.has(QuotationStatus.KHONG_DAT_HANG)).toBe(true);
    expect(QUOTATION_TERMINAL_STATUSES.has(QuotationStatus.EXPIRED)).toBe(true);
    expect(QUOTATION_TERMINAL_STATUSES.has(QuotationStatus.REJECTED)).toBe(true);
  });
});

describe('ORDER_PRODUCTION_STATUS_ORDER', () => {
  it('has 7 steps', () => {
    expect(ORDER_PRODUCTION_STATUS_ORDER).toHaveLength(7);
  });
});

// ─── advanceQuotationStatus ────────────────────────────────────────────────────

describe('advanceQuotationStatus', () => {
  // Scenario: Single-step advance is accepted
  it('allows single-step forward: DRAFT → DANG_CHO_PHAN_HOI', () => {
    const result = advanceQuotationStatus(
      QuotationStatus.DRAFT,
      QuotationStatus.DANG_CHO_PHAN_HOI
    );
    expect(result).toBe(QuotationStatus.DANG_CHO_PHAN_HOI);
  });

  it('allows single-step forward: DANG_CHO_PHAN_HOI → DANG_CHO_GUI_DON_HANG', () => {
    const result = advanceQuotationStatus(
      QuotationStatus.DANG_CHO_PHAN_HOI,
      QuotationStatus.DANG_CHO_GUI_DON_HANG
    );
    expect(result).toBe(QuotationStatus.DANG_CHO_GUI_DON_HANG);
  });

  it('allows single-step forward: DANG_CHO_GUI_DON_HANG → DA_DAT_HANG', () => {
    const result = advanceQuotationStatus(
      QuotationStatus.DANG_CHO_GUI_DON_HANG,
      QuotationStatus.DA_DAT_HANG
    );
    expect(result).toBe(QuotationStatus.DA_DAT_HANG);
  });

  // Scenario: No-op same status is accepted
  it('accepts no-op when current equals next', () => {
    const result = advanceQuotationStatus(
      QuotationStatus.DANG_CHO_PHAN_HOI,
      QuotationStatus.DANG_CHO_PHAN_HOI
    );
    expect(result).toBe(QuotationStatus.DANG_CHO_PHAN_HOI);
  });

  it('accepts no-op for DRAFT', () => {
    const result = advanceQuotationStatus(QuotationStatus.DRAFT, QuotationStatus.DRAFT);
    expect(result).toBe(QuotationStatus.DRAFT);
  });

  // Scenario: Cancel target from non-terminal is accepted
  it('allows move to KHONG_DAT_HANG from DANG_CHO_PHAN_HOI', () => {
    const result = advanceQuotationStatus(
      QuotationStatus.DANG_CHO_PHAN_HOI,
      QuotationStatus.KHONG_DAT_HANG
    );
    expect(result).toBe(QuotationStatus.KHONG_DAT_HANG);
  });

  it('allows move to REJECTED from DRAFT', () => {
    const result = advanceQuotationStatus(QuotationStatus.DRAFT, QuotationStatus.REJECTED);
    expect(result).toBe(QuotationStatus.REJECTED);
  });

  it('allows move to EXPIRED from DANG_CHO_GUI_DON_HANG', () => {
    const result = advanceQuotationStatus(
      QuotationStatus.DANG_CHO_GUI_DON_HANG,
      QuotationStatus.EXPIRED
    );
    expect(result).toBe(QuotationStatus.EXPIRED);
  });

  // Scenario: Terminal status is locked
  it('rejects any transition from DA_DAT_HANG', () => {
    expect(() =>
      advanceQuotationStatus(QuotationStatus.DA_DAT_HANG, QuotationStatus.DRAFT)
    ).toThrow(ValidationError);
  });

  it('rejects any transition from KHONG_DAT_HANG', () => {
    expect(() =>
      advanceQuotationStatus(QuotationStatus.KHONG_DAT_HANG, QuotationStatus.DRAFT)
    ).toThrow(ValidationError);
  });

  it('rejects any transition from EXPIRED', () => {
    expect(() =>
      advanceQuotationStatus(QuotationStatus.EXPIRED, QuotationStatus.DRAFT)
    ).toThrow(ValidationError);
  });

  it('rejects any transition from REJECTED', () => {
    expect(() =>
      advanceQuotationStatus(QuotationStatus.REJECTED, QuotationStatus.DRAFT)
    ).toThrow(ValidationError);
  });

  // Scenario: Skipping a step is rejected
  it('rejects skipping steps: DRAFT → DA_DAT_HANG', () => {
    expect(() =>
      advanceQuotationStatus(QuotationStatus.DRAFT, QuotationStatus.DA_DAT_HANG)
    ).toThrow(ValidationError);
  });

  it('rejects backward transition', () => {
    expect(() =>
      advanceQuotationStatus(QuotationStatus.DANG_CHO_PHAN_HOI, QuotationStatus.DRAFT)
    ).toThrow(ValidationError);
  });

  // Scenario: Bypass accepts any in-enum value
  it('bypass allows any transition: DA_DAT_HANG → DRAFT', () => {
    const result = advanceQuotationStatus(
      QuotationStatus.DA_DAT_HANG,
      QuotationStatus.DRAFT,
      { bypass: true }
    );
    expect(result).toBe(QuotationStatus.DRAFT);
  });

  it('bypass allows backward transition', () => {
    const result = advanceQuotationStatus(
      QuotationStatus.DANG_CHO_GUI_DON_HANG,
      QuotationStatus.DRAFT,
      { bypass: true }
    );
    expect(result).toBe(QuotationStatus.DRAFT);
  });

  // Error messages must be in Vietnamese
  it('throws ValidationError with Vietnamese message on illegal transition', () => {
    try {
      advanceQuotationStatus(QuotationStatus.DRAFT, QuotationStatus.DA_DAT_HANG);
      fail('Expected ValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      // Message should contain Vietnamese text
      expect((err as ValidationError).message).toMatch(/Không thể chuyển trạng thái/);
    }
  });
});

// ─── advanceOrderProductionStatus ─────────────────────────────────────────────

describe('advanceOrderProductionStatus', () => {
  // Scenario: Order production helper behaves equivalently — skipping throws
  it('rejects skipping: CHO_SAN_XUAT → DA_GIAO_CHO_KHACH_HANG', () => {
    expect(() =>
      advanceOrderProductionStatus(
        OrderProductionStatus.CHO_SAN_XUAT,
        OrderProductionStatus.DA_GIAO_CHO_KHACH_HANG
      )
    ).toThrow(ValidationError);
  });

  it('allows single-step forward: CHO_LEN_KE_HOACH → CHO_SAN_XUAT', () => {
    const result = advanceOrderProductionStatus(
      OrderProductionStatus.CHO_LEN_KE_HOACH,
      OrderProductionStatus.CHO_SAN_XUAT
    );
    expect(result).toBe(OrderProductionStatus.CHO_SAN_XUAT);
  });

  it('allows single-step forward: CHO_SAN_XUAT → DANG_SAN_XUAT', () => {
    const result = advanceOrderProductionStatus(
      OrderProductionStatus.CHO_SAN_XUAT,
      OrderProductionStatus.DANG_SAN_XUAT
    );
    expect(result).toBe(OrderProductionStatus.DANG_SAN_XUAT);
  });

  it('accepts no-op same status', () => {
    const result = advanceOrderProductionStatus(
      OrderProductionStatus.DANG_SAN_XUAT,
      OrderProductionStatus.DANG_SAN_XUAT
    );
    expect(result).toBe(OrderProductionStatus.DANG_SAN_XUAT);
  });

  it('rejects backward transition: DANG_SAN_XUAT → CHO_SAN_XUAT', () => {
    expect(() =>
      advanceOrderProductionStatus(
        OrderProductionStatus.DANG_SAN_XUAT,
        OrderProductionStatus.CHO_SAN_XUAT
      )
    ).toThrow(ValidationError);
  });

  it('bypass allows any direction', () => {
    const result = advanceOrderProductionStatus(
      OrderProductionStatus.DA_GIAO_CHO_KHACH_HANG,
      OrderProductionStatus.CHO_LEN_KE_HOACH,
      { bypass: true }
    );
    expect(result).toBe(OrderProductionStatus.CHO_LEN_KE_HOACH);
  });

  it('throws ValidationError with Vietnamese message on skip', () => {
    try {
      advanceOrderProductionStatus(
        OrderProductionStatus.CHO_SAN_XUAT,
        OrderProductionStatus.DA_GIAO_CHO_KHACH_HANG
      );
      fail('Expected ValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).message).toMatch(/Không thể chuyển trạng thái sản xuất/);
    }
  });

  it('QUOTATION_CANCEL_TARGETS does not include DA_DAT_HANG (it is terminal, not cancel)', () => {
    expect(QUOTATION_CANCEL_TARGETS.has(QuotationStatus.DA_DAT_HANG)).toBe(false);
  });
});

// ─── advanceQuotationRequestStatus ────────────────────────────────────────────

describe('advanceQuotationRequestStatus — constants', () => {
  it('exports QUOTATION_REQUEST_STATUS_ORDER with 3 steps', () => {
    expect(QUOTATION_REQUEST_STATUS_ORDER).toHaveLength(3);
    expect(QUOTATION_REQUEST_STATUS_ORDER[0]).toBe('CHO_XU_LY');
    expect(QUOTATION_REQUEST_STATUS_ORDER[2]).toBe('DA_BAO_GIA');
  });

  it('exports QUOTATION_REQUEST_TERMINAL_STATUSES containing DA_BAO_GIA and HUY', () => {
    expect(QUOTATION_REQUEST_TERMINAL_STATUSES.has('DA_BAO_GIA')).toBe(true);
    expect(QUOTATION_REQUEST_TERMINAL_STATUSES.has('HUY')).toBe(true);
    expect(QUOTATION_REQUEST_TERMINAL_STATUSES.has('CHO_XU_LY')).toBe(false);
  });

  it('exports QUOTATION_REQUEST_CANCEL_TARGETS containing HUY only', () => {
    expect(QUOTATION_REQUEST_CANCEL_TARGETS.has('HUY')).toBe(true);
    expect(QUOTATION_REQUEST_CANCEL_TARGETS.has('DA_BAO_GIA')).toBe(false);
  });
});

describe('advanceQuotationRequestStatus', () => {
  // Scenario: Single-step forward allowed
  it('allows single-step forward: CHO_XU_LY → DANG_BAO_GIA', () => {
    const result = advanceQuotationRequestStatus('CHO_XU_LY', 'DANG_BAO_GIA');
    expect(result).toBe('DANG_BAO_GIA');
  });

  it('allows single-step forward: DANG_BAO_GIA → DA_BAO_GIA', () => {
    const result = advanceQuotationRequestStatus('DANG_BAO_GIA', 'DA_BAO_GIA');
    expect(result).toBe('DA_BAO_GIA');
  });

  // Scenario: No-op allowed
  it('accepts no-op when current equals next', () => {
    const result = advanceQuotationRequestStatus('DANG_BAO_GIA', 'DANG_BAO_GIA');
    expect(result).toBe('DANG_BAO_GIA');
  });

  // Scenario: Cancel to HUY from non-terminal
  it('allows cancel to HUY from CHO_XU_LY', () => {
    const result = advanceQuotationRequestStatus('CHO_XU_LY', 'HUY');
    expect(result).toBe('HUY');
  });

  it('allows cancel to HUY from DANG_BAO_GIA', () => {
    const result = advanceQuotationRequestStatus('DANG_BAO_GIA', 'HUY');
    expect(result).toBe('HUY');
  });

  // Scenario: Jump rejected
  it('rejects jumping: CHO_XU_LY → DA_BAO_GIA', () => {
    expect(() =>
      advanceQuotationRequestStatus('CHO_XU_LY', 'DA_BAO_GIA')
    ).toThrow(ValidationError);

    try {
      advanceQuotationRequestStatus('CHO_XU_LY', 'DA_BAO_GIA');
      fail('Expected ValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).message).toMatch(/Không thể chuyển trạng thái YCBG từ CHO_XU_LY sang DA_BAO_GIA/);
    }
  });

  // Scenario: Backward rejected
  it('rejects backward transition: DA_BAO_GIA → DANG_BAO_GIA', () => {
    expect(() =>
      advanceQuotationRequestStatus('DA_BAO_GIA', 'DANG_BAO_GIA')
    ).toThrow(ValidationError);
  });

  // Scenario: Transition from terminal HUY rejected
  it('rejects any transition from terminal HUY', () => {
    expect(() =>
      advanceQuotationRequestStatus('HUY', 'CHO_XU_LY')
    ).toThrow(ValidationError);
  });

  // Scenario: ADMIN bypass
  it('bypass allows jump: CHO_XU_LY → DA_BAO_GIA', () => {
    const result = advanceQuotationRequestStatus('CHO_XU_LY', 'DA_BAO_GIA', { bypass: true });
    expect(result).toBe('DA_BAO_GIA');
  });
});

// ─── RepairRequest status transitions ─────────────────────────────────────────

describe('REPAIR_REQUEST_STATUS_ORDER', () => {
  it('starts with CHO_XU_LY and ends with HOAN_THANH', () => {
    expect(REPAIR_REQUEST_STATUS_ORDER[0]).toBe(RepairRequestStatus.CHO_XU_LY);
    expect(REPAIR_REQUEST_STATUS_ORDER[REPAIR_REQUEST_STATUS_ORDER.length - 1]).toBe(RepairRequestStatus.HOAN_THANH);
  });

  it('has exactly 3 forward steps', () => {
    expect(REPAIR_REQUEST_STATUS_ORDER).toHaveLength(3);
  });
});

describe('REPAIR_REQUEST_TERMINAL_STATUSES', () => {
  it('contains HOAN_THANH and DA_HUY', () => {
    expect(REPAIR_REQUEST_TERMINAL_STATUSES.has(RepairRequestStatus.HOAN_THANH)).toBe(true);
    expect(REPAIR_REQUEST_TERMINAL_STATUSES.has(RepairRequestStatus.DA_HUY)).toBe(true);
  });

  it('does not contain CHO_XU_LY or DANG_SUA_CHUA', () => {
    expect(REPAIR_REQUEST_TERMINAL_STATUSES.has(RepairRequestStatus.CHO_XU_LY)).toBe(false);
    expect(REPAIR_REQUEST_TERMINAL_STATUSES.has(RepairRequestStatus.DANG_SUA_CHUA)).toBe(false);
  });
});

describe('REPAIR_REQUEST_CANCEL_TARGETS', () => {
  it('contains only DA_HUY', () => {
    expect(REPAIR_REQUEST_CANCEL_TARGETS.has(RepairRequestStatus.DA_HUY)).toBe(true);
    expect(REPAIR_REQUEST_CANCEL_TARGETS.size).toBe(1);
  });
});

describe('advanceRepairRequestStatus', () => {
  // Single-step forward transitions
  it('CHO_XU_LY → DANG_SUA_CHUA (valid single step)', () => {
    expect(advanceRepairRequestStatus(
      RepairRequestStatus.CHO_XU_LY,
      RepairRequestStatus.DANG_SUA_CHUA
    )).toBe(RepairRequestStatus.DANG_SUA_CHUA);
  });

  it('DANG_SUA_CHUA → HOAN_THANH (valid single step)', () => {
    expect(advanceRepairRequestStatus(
      RepairRequestStatus.DANG_SUA_CHUA,
      RepairRequestStatus.HOAN_THANH
    )).toBe(RepairRequestStatus.HOAN_THANH);
  });

  // No-op: next === current
  it('no-op: CHO_XU_LY → CHO_XU_LY returns current', () => {
    expect(advanceRepairRequestStatus(
      RepairRequestStatus.CHO_XU_LY,
      RepairRequestStatus.CHO_XU_LY
    )).toBe(RepairRequestStatus.CHO_XU_LY);
  });

  it('no-op: DANG_SUA_CHUA → DANG_SUA_CHUA returns current', () => {
    expect(advanceRepairRequestStatus(
      RepairRequestStatus.DANG_SUA_CHUA,
      RepairRequestStatus.DANG_SUA_CHUA
    )).toBe(RepairRequestStatus.DANG_SUA_CHUA);
  });

  // Cancel from each non-terminal status
  it('cancel from CHO_XU_LY → DA_HUY is allowed', () => {
    expect(advanceRepairRequestStatus(
      RepairRequestStatus.CHO_XU_LY,
      RepairRequestStatus.DA_HUY
    )).toBe(RepairRequestStatus.DA_HUY);
  });

  it('cancel from DANG_SUA_CHUA → DA_HUY is allowed', () => {
    expect(advanceRepairRequestStatus(
      RepairRequestStatus.DANG_SUA_CHUA,
      RepairRequestStatus.DA_HUY
    )).toBe(RepairRequestStatus.DA_HUY);
  });

  // Rejection: skip-step forward
  it('rejects skip: CHO_XU_LY → HOAN_THANH (skips DANG_SUA_CHUA)', () => {
    expect(() =>
      advanceRepairRequestStatus(RepairRequestStatus.CHO_XU_LY, RepairRequestStatus.HOAN_THANH)
    ).toThrow(ValidationError);
  });

  // Rejection: backward transition
  it('rejects backward: DANG_SUA_CHUA → CHO_XU_LY', () => {
    expect(() =>
      advanceRepairRequestStatus(RepairRequestStatus.DANG_SUA_CHUA, RepairRequestStatus.CHO_XU_LY)
    ).toThrow(ValidationError);
  });

  // Rejection: transition from terminal HOAN_THANH
  it('rejects any transition from terminal HOAN_THANH', () => {
    expect(() =>
      advanceRepairRequestStatus(RepairRequestStatus.HOAN_THANH, RepairRequestStatus.CHO_XU_LY)
    ).toThrow(ValidationError);
  });

  it('rejects any transition from terminal HOAN_THANH to DA_HUY', () => {
    expect(() =>
      advanceRepairRequestStatus(RepairRequestStatus.HOAN_THANH, RepairRequestStatus.DA_HUY)
    ).toThrow(ValidationError);
  });

  // Rejection: transition from terminal DA_HUY
  it('rejects any transition from terminal DA_HUY', () => {
    expect(() =>
      advanceRepairRequestStatus(RepairRequestStatus.DA_HUY, RepairRequestStatus.CHO_XU_LY)
    ).toThrow(ValidationError);
  });

  // ADMIN bypass
  it('bypass allows skip: CHO_XU_LY → HOAN_THANH', () => {
    expect(advanceRepairRequestStatus(
      RepairRequestStatus.CHO_XU_LY,
      RepairRequestStatus.HOAN_THANH,
      { bypass: true }
    )).toBe(RepairRequestStatus.HOAN_THANH);
  });

  it('bypass allows any transition from terminal HOAN_THANH', () => {
    expect(advanceRepairRequestStatus(
      RepairRequestStatus.HOAN_THANH,
      RepairRequestStatus.CHO_XU_LY,
      { bypass: true }
    )).toBe(RepairRequestStatus.CHO_XU_LY);
  });

  it('bypass allows cancel from terminal DA_HUY', () => {
    expect(advanceRepairRequestStatus(
      RepairRequestStatus.DA_HUY,
      RepairRequestStatus.DANG_SUA_CHUA,
      { bypass: true }
    )).toBe(RepairRequestStatus.DANG_SUA_CHUA);
  });
});

// ─── advanceFaultRecordStatus ─────────────────────────────────────────────────

describe('advanceFaultRecordStatus', () => {
  // Scenario 1: Single-step advance from DANG_THEO_DOI to DA_XU_LY
  it('allows DANG_THEO_DOI → DA_XU_LY', () => {
    expect(advanceFaultRecordStatus(
      FaultRecordStatus.DANG_THEO_DOI,
      FaultRecordStatus.DA_XU_LY
    )).toBe(FaultRecordStatus.DA_XU_LY);
  });

  // Scenario 2: DA_XU_LY to TAI_PHAT is allowed (reopen)
  it('allows DA_XU_LY → TAI_PHAT', () => {
    expect(advanceFaultRecordStatus(
      FaultRecordStatus.DA_XU_LY,
      FaultRecordStatus.TAI_PHAT
    )).toBe(FaultRecordStatus.TAI_PHAT);
  });

  // Scenario 3: TAI_PHAT to DA_XU_LY is allowed (resolve again)
  it('allows TAI_PHAT → DA_XU_LY', () => {
    expect(advanceFaultRecordStatus(
      FaultRecordStatus.TAI_PHAT,
      FaultRecordStatus.DA_XU_LY
    )).toBe(FaultRecordStatus.DA_XU_LY);
  });

  // Scenario 4: No-op returns unchanged
  it('accepts no-op: DANG_THEO_DOI → DANG_THEO_DOI', () => {
    expect(advanceFaultRecordStatus(
      FaultRecordStatus.DANG_THEO_DOI,
      FaultRecordStatus.DANG_THEO_DOI
    )).toBe(FaultRecordStatus.DANG_THEO_DOI);
  });

  it('accepts no-op: DA_XU_LY → DA_XU_LY', () => {
    expect(advanceFaultRecordStatus(
      FaultRecordStatus.DA_XU_LY,
      FaultRecordStatus.DA_XU_LY
    )).toBe(FaultRecordStatus.DA_XU_LY);
  });

  // Scenario 5: Skip step from DANG_THEO_DOI to TAI_PHAT is rejected
  it('rejects skip: DANG_THEO_DOI → TAI_PHAT', () => {
    expect(() =>
      advanceFaultRecordStatus(FaultRecordStatus.DANG_THEO_DOI, FaultRecordStatus.TAI_PHAT)
    ).toThrow(ValidationError);
  });

  it('rejects backward: DA_XU_LY → DANG_THEO_DOI', () => {
    expect(() =>
      advanceFaultRecordStatus(FaultRecordStatus.DA_XU_LY, FaultRecordStatus.DANG_THEO_DOI)
    ).toThrow(ValidationError);
  });

  it('throws ValidationError with Vietnamese message on illegal transition', () => {
    try {
      advanceFaultRecordStatus(FaultRecordStatus.DANG_THEO_DOI, FaultRecordStatus.TAI_PHAT);
      fail('Expected ValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).message).toMatch(/Không thể chuyển trạng thái sự cố/);
    }
  });

  // Scenario 6: Bypass accepts any in-enum value
  it('bypass allows DANG_THEO_DOI → TAI_PHAT without throwing', () => {
    expect(advanceFaultRecordStatus(
      FaultRecordStatus.DANG_THEO_DOI,
      FaultRecordStatus.TAI_PHAT,
      { bypass: true }
    )).toBe(FaultRecordStatus.TAI_PHAT);
  });

  it('bypass allows any enum value', () => {
    expect(advanceFaultRecordStatus(
      FaultRecordStatus.DA_XU_LY,
      FaultRecordStatus.DANG_THEO_DOI,
      { bypass: true }
    )).toBe(FaultRecordStatus.DANG_THEO_DOI);
  });
});
