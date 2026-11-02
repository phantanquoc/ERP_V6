/**
 * Multipart/form-data coercion guards for the YCSC plan save (PUT /repair-requests)
 * and the create schema.
 *
 * Two real bugs these lock down:
 *  - Boolean('false') === true — naive z.coerce.boolean() flipped canNgungMay to true
 *    on every form submit of the "Lên kế hoạch" modal.
 *  - An empty form field must CLEAR a nullable column ('' → null), not 400 the request
 *    (dates) and not write 0 (chiPhiDuKien).
 */
import {
  createRepairRequestSchema,
  repairPlanSchema,
  updateRepairRequestSchema,
} from '@schemas';

describe('canNgungMay multipart coercion', () => {
  it('update: string "false" stays false', () => {
    expect(updateRepairRequestSchema.parse({ canNgungMay: 'false' }).canNgungMay).toBe(false);
  });

  it('update: string "true" and real booleans parse correctly', () => {
    expect(updateRepairRequestSchema.parse({ canNgungMay: 'true' }).canNgungMay).toBe(true);
    expect(updateRepairRequestSchema.parse({ canNgungMay: true }).canNgungMay).toBe(true);
    expect(updateRepairRequestSchema.parse({ canNgungMay: false }).canNgungMay).toBe(false);
  });

  it('update: field not sent stays undefined (no silent true)', () => {
    expect(updateRepairRequestSchema.parse({}).canNgungMay).toBeUndefined();
  });

  it('create: string "false" stays false', () => {
    const parsed = createRepairRequestSchema.parse({
      mucDoUuTien: 'Thấp',
      canNgungMay: 'false',
    });
    expect(parsed.canNgungMay).toBe(false);
  });

  it('repairPlanSchema: string "false" stays false', () => {
    expect(repairPlanSchema.parse({ canNgungMay: 'false' }).canNgungMay).toBe(false);
  });
});

describe('empty form fields clear nullable columns', () => {
  it('empty date strings become null instead of throwing invalid_date', () => {
    const parsed = updateRepairRequestSchema.parse({
      ngayBatDauKeHoach: '',
      ngayHoanThienDuKien: '',
    });
    expect(parsed.ngayBatDauKeHoach).toBeNull();
    expect(parsed.ngayHoanThienDuKien).toBeNull();
  });

  it('valid date strings still parse to Date', () => {
    const parsed = updateRepairRequestSchema.parse({ ngayBatDauKeHoach: '2026-11-05' });
    expect(parsed.ngayBatDauKeHoach).toBeInstanceOf(Date);
    expect((parsed.ngayBatDauKeHoach as Date).toISOString().slice(0, 10)).toBe('2026-11-05');
  });

  it('empty chiPhiDuKien clears to null — not coerced to 0', () => {
    expect(updateRepairRequestSchema.parse({ chiPhiDuKien: '' }).chiPhiDuKien).toBeNull();
    expect(updateRepairRequestSchema.parse({ chiPhiDuKien: '0' }).chiPhiDuKien).toBe(0);
    expect(updateRepairRequestSchema.parse({ chiPhiDuKien: '1500' }).chiPhiDuKien).toBe(1500);
  });

  it('create schema accepts an empty plan date', () => {
    const parsed = createRepairRequestSchema.parse({
      mucDoUuTien: 'Thấp',
      ngayBatDauKeHoach: '',
    });
    expect(parsed.ngayBatDauKeHoach).toBeNull();
  });
});

describe('plan date order validation still holds', () => {
  it('rejects end date before start date', () => {
    expect(() =>
      updateRepairRequestSchema.parse({
        ngayBatDauKeHoach: '2026-11-05',
        ngayHoanThienDuKien: '2026-11-01',
      })
    ).toThrow();
  });

  it('one-sided range (end cleared) passes without a bogus 1970 comparison', () => {
    const parsed = updateRepairRequestSchema.parse({
      ngayBatDauKeHoach: '2026-11-05',
      ngayHoanThienDuKien: '',
    });
    expect(parsed.ngayBatDauKeHoach).toBeInstanceOf(Date);
    expect(parsed.ngayHoanThienDuKien).toBeNull();
  });
});
