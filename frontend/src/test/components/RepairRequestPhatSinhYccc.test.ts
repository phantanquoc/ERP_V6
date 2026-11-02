import { describe, expect, it } from 'vitest';
import {
  resolveYcccRequester,
  validatePhatSinhYcccRows,
  type MaterialDraft,
} from '../../components/RepairRequestFormModal';

const row = (over: Partial<MaterialDraft> = {}): MaterialDraft => ({
  itemIndex: 0,
  internationalProductId: null,
  tenVatTu: 'Bạc thau 10mm',
  phanLoai: 'Vật tư',
  donVi: 'cái',
  soLuongDuKien: 2,
  ...over,
});

describe('validatePhatSinhYcccRows (phat-sinh YCCC pre-write validation)', () => {
  it('passes with valid rows', () => {
    expect(validatePhatSinhYcccRows([row(), row({ tenVatTu: 'Ống nhựa', itemIndex: 1 })], 2, true)).toBeNull();
  });

  it('rejects a blank product name', () => {
    const err = validatePhatSinhYcccRows([row({ tenVatTu: '   ' })], 1, true);
    expect(err).toBeTypeOf('string');
    expect(err).toMatch(/dòng 1/);
  });

  it('rejects quantity 0', () => {
    const err = validatePhatSinhYcccRows([row({ soLuongDuKien: 0 })], 1, true);
    expect(err).toBeTypeOf('string');
    expect(err).toMatch(/lớn hơn 0/);
  });

  it('rejects an out-of-range item index', () => {
    expect(validatePhatSinhYcccRows([row({ itemIndex: 3 })], 2, true)).toMatch(/không hợp lệ/);
    expect(validatePhatSinhYcccRows([row({ itemIndex: -1 })], 2, true)).toMatch(/không hợp lệ/);
  });

  it('rejects a slip with no repair items', () => {
    const err = validatePhatSinhYcccRows([row()], 0, true);
    expect(err).toBeTypeOf('string');
    expect(err).toMatch(/chưa có thiết bị/);
  });

  it('rejects when the requester has no linked employee record', () => {
    const err = validatePhatSinhYcccRows([row()], 1, false);
    expect(err).toBeTypeOf('string');
    expect(err).toMatch(/chưa liên kết hồ sơ nhân viên/);
  });

  it('rejects an empty goods list', () => {
    expect(validatePhatSinhYcccRows([], 1, true)).toMatch(/ít nhất 1 dòng/);
  });
});

describe('resolveYcccRequester', () => {
  it('resolves the employee linked to the current user', () => {
    const employees = [
      { id: 'emp-1', userId: 'user-9', name: 'Nguyễn Văn A', employeeCode: 'NV001', department: 'Kỹ thuật' },
    ];
    const requester = resolveYcccRequester({ id: 'user-9', fullName: 'Nguyễn Văn A' }, employees);
    expect(requester.ok).toBe(true);
    expect(requester.employeeId).toBe('emp-1');
    expect(requester.maNhanVien).toBe('NV001');
    expect(requester.boPhan).toBe('Kỹ thuật');
  });

  it('returns ok=false when no employee record matches (no User.id fallback)', () => {
    const requester = resolveYcccRequester({ id: 'user-404', fullName: 'Không Có' }, []);
    expect(requester.ok).toBe(false);
    expect(requester.employeeId).toBe('');
  });

  it('falls back to the viewer department label when boPhan is empty', () => {
    const employees = [{ id: 'emp-2', userId: 'user-7', name: 'Trần B', employeeCode: 'NV002' }];
    const requester = resolveYcccRequester(
      { id: 'user-7', fullName: 'Trần B', subDepartmentName: 'Cơ điện' },
      employees
    );
    expect(requester.ok).toBe(true);
    expect(requester.boPhan).toBe('Cơ điện');
  });
});
