import { describe, expect, it } from 'vitest';
import {
  activeRepairs,
  buildTechnicalDetailParams,
  canCancelInspection,
  canCancelRepair,
  canConfirmAcceptance,
  canDeleteRequest,
  canEditInspection,
  canEditRepair,
  dedupeById,
  formatDateVN,
  formatKetLuan,
  formatTimelineReason,
  inspectionStepsFor,
} from '../../constants/repairRequest';

const requester = { isTechnical: false, isAdmin: false, isOwner: true };
const stranger = { isTechnical: false, isAdmin: false, isOwner: false };
const tech = { isTechnical: true, isAdmin: false, isOwner: false };
const admin = { isTechnical: true, isAdmin: true, isOwner: false };

describe('edit gating', () => {
  it('non-technical owner edits only while CHO_XU_LY', () => {
    expect(canEditInspection('CHO_XU_LY', requester)).toBe(true);
    expect(canEditInspection('DA_TIEP_NHAN', requester)).toBe(false);
    expect(canEditRepair('CHO_XU_LY', requester)).toBe(true);
    expect(canEditRepair('DA_TIEP_NHAN', requester)).toBe(false);
  });
  it('non-owner outside Kỹ thuật never edits', () => {
    expect(canEditInspection('CHO_XU_LY', stranger)).toBe(false);
    expect(canEditRepair('CHO_XU_LY', stranger)).toBe(false);
  });
  it('technician edits until acceptance, never at/after CHO_NGHIEM_THU', () => {
    expect(canEditInspection('DANG_KIEM_TRA', tech)).toBe(true);
    expect(canEditInspection('DA_KIEM_TRA', tech)).toBe(false);
    expect(canEditInspection('CHO_NGHIEM_THU', tech)).toBe(false);
    expect(canEditRepair('DANG_SUA_CHUA', tech)).toBe(true);
    expect(canEditRepair('CHO_NGHIEM_THU', tech)).toBe(false);
    expect(canEditRepair('DA_NGHIEM_THU', admin)).toBe(false);
    expect(canEditRepair('TU_CHOI', admin)).toBe(false);
  });
});

describe('cancel / delete gating', () => {
  it('YCSC cancel follows DA_HUY allowed-from table', () => {
    expect(canCancelRepair('LEN_KE_HOACH', tech)).toBe(true);
    expect(canCancelRepair('DANG_SUA_CHUA', tech)).toBe(false);
    expect(canCancelRepair('CHO_NGHIEM_THU', admin)).toBe(true);
    expect(canCancelRepair('DA_NGHIEM_THU', admin)).toBe(false);
    expect(canCancelRepair('TU_CHOI', admin)).toBe(false);
    expect(canCancelRepair('CHO_XU_LY', stranger)).toBe(false);
  });
  it('YCKT cancel', () => {
    expect(canCancelInspection('DANG_KIEM_TRA', tech)).toBe(true);
    expect(canCancelInspection('CHO_NGHIEM_THU', tech)).toBe(false);
    expect(canCancelInspection('CHO_XU_LY', requester)).toBe(true);
    expect(canCancelInspection('DA_TIEP_NHAN', requester)).toBe(false);
    expect(canCancelInspection('HOAN_THANH', admin)).toBe(false);
  });
  it('delete only before work starts', () => {
    expect(canDeleteRequest('DA_TIEP_NHAN', true)).toBe(true);
    expect(canDeleteRequest('DANG_SUA_CHUA', true)).toBe(false);
    expect(canDeleteRequest('CHO_XU_LY', false)).toBe(false);
  });
});

describe('canConfirmAcceptance', () => {
  const slips = [
    { ketQua: 'KHONG_DAT', nguoiXacNhanId: 'u1', createdAt: '2026-09-01' },
    { ketQua: null, nguoiXacNhanId: 'u1', createdAt: '2026-09-05' },
  ];
  it('only the pending slip confirmer or ADMIN', () => {
    expect(canConfirmAcceptance(slips, 'u1', false)).toBe(true);
    expect(canConfirmAcceptance(slips, 'u2', false)).toBe(false);
    expect(canConfirmAcceptance(slips, 'u2', true)).toBe(true);
  });
  it('false when nothing pending', () => {
    expect(canConfirmAcceptance([{ ketQua: 'DAT', nguoiXacNhanId: 'u1' }], 'u1', true)).toBe(false);
    expect(canConfirmAcceptance(undefined, 'u1', true)).toBe(false);
  });
});

describe('labels', () => {
  it('maps reason codes to Vietnamese and never shows JSON', () => {
    expect(formatTimelineReason('create')).toBe('Tạo phiếu');
    expect(formatTimelineReason('startInspection')).toBe('Bắt đầu kiểm tra');
    expect(formatTimelineReason('submit_da_khac_phuc NT-2026-001')).toBe('Đã khắc phục — gửi phiếu nghiệm thu NT-2026-001');
    expect(formatTimelineReason('acceptance_dat')).toBe('Xác nhận nghiệm thu ĐẠT');
    expect(formatTimelineReason('acceptance_khong_dat: còn rò dầu')).toBe('Xác nhận nghiệm thu KHÔNG ĐẠT: còn rò dầu');
    expect(formatTimelineReason('user_cancel')).toBe('Người dùng hủy phiếu');
    expect(formatTimelineReason('admin_override')).toBe('ADMIN can thiệp');
    const details = formatTimelineReason('update_details {"ketQuaKiemTra":"ổn","ketLuan":"KHONG_CAN"}');
    expect(details).not.toContain('{');
    expect(details).toContain('Không cần sửa chữa');
    expect(formatTimelineReason('Thiếu vật tư')).toBe('Thiếu vật tư');
    expect(formatTimelineReason(null)).toBe('');
  });
  it('formats kết luận incl. legacy code', () => {
    expect(formatKetLuan('CAN_SUA_CHUA')).toBe('Cần sửa chữa');
    expect(formatKetLuan('KHONG_CAN')).toContain('Không cần');
    expect(formatKetLuan(null)).toBe('—');
  });
  it('pads dates as DD/MM/YYYY', () => {
    expect(formatDateVN('2026-09-04T03:00:00.000Z')).toBe('04/09/2026');
    expect(formatDateVN(null)).toBe('—');
    expect(formatDateVN('not-a-date')).toBe('—');
  });
});

describe('inspectionStepsFor', () => {
  it('uses CHO_NGHIEM_THU for the Đã khắc phục branch', () => {
    expect(inspectionStepsFor('CHO_NGHIEM_THU', null).map((s) => s.key)).toContain('CHO_NGHIEM_THU');
    expect(inspectionStepsFor('DANG_KIEM_TRA', 'DA_KHAC_PHUC').map((s) => s.key)).not.toContain('DA_KIEM_TRA');
    expect(inspectionStepsFor('DA_KIEM_TRA', 'CAN_SUA_CHUA').map((s) => s.key)).toContain('DA_KIEM_TRA');
  });
});

describe('buildTechnicalDetailParams', () => {
  it('YCKT → YCSC drops inspectionId and stale params', () => {
    const p = buildTechnicalDetailParams('tab=inspections&inspectionId=7&type=sua_chua&q=abc&page=2', 'repair', 12);
    expect(p.get('tab')).toBe('repairs');
    expect(p.get('repairId')).toBe('12');
    expect(p.has('inspectionId')).toBe(false);
    expect(p.has('type')).toBe(false);
    expect(p.has('q')).toBe(false);
    expect(p.has('page')).toBe(false);
  });
  it('YCSC → YCKT drops repairId', () => {
    const p = buildTechnicalDetailParams('tab=repairs&repairId=12', 'inspection', 7);
    expect(p.get('tab')).toBe('inspections');
    expect(p.get('inspectionId')).toBe('7');
    expect(p.has('repairId')).toBe(false);
  });
});

describe('collections', () => {
  it('dedupes material needs by id', () => {
    expect(dedupeById([{ id: 'a' }, { id: 'b' }, { id: 'a' }]).map((x) => x.id)).toEqual(['a', 'b']);
  });
  it('activeRepairs excludes cancelled / rejected YCSC', () => {
    expect(activeRepairs([{ trangThai: 'DA_HUY' }, { trangThai: 'TU_CHOI' }, { trangThai: 'DANG_SUA_CHUA' }])).toHaveLength(1);
  });
});
