import { createSystemOperationSchema, updateSystemOperationSchema } from '@schemas';
import { Router } from 'express';

// ─── Route Ordering ───────────────────────────────────────────────

describe('Route ordering: static routes must precede param routes', () => {
  function getRoutePaths(router: Router): string[] {
    return (router as any).stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => layer.route.path);
  }

  it('systemOperationRoutes: /ma-chien/:maChien before /:id', () => {
    jest.isolateModules(() => {
      const router = require('@routes/systemOperationRoutes').default;
      const paths = getRoutePaths(router);
      const maChienIndex = paths.indexOf('/ma-chien/:maChien');
      const idIndex = paths.indexOf('/:id');

      expect(maChienIndex).toBeGreaterThan(-1);
      expect(idIndex).toBeGreaterThan(-1);
      expect(maChienIndex).toBeLessThan(idIndex);
    });
  });

  it('materialEvaluationRoutes: /ma-chien/:maChien before /:id', () => {
    jest.isolateModules(() => {
      const router = require('@routes/materialEvaluationRoutes').default;
      const paths = getRoutePaths(router);
      const maChienIndex = paths.indexOf('/ma-chien/:maChien');
      const idIndex = paths.indexOf('/:id');

      expect(maChienIndex).toBeGreaterThan(-1);
      expect(idIndex).toBeGreaterThan(-1);
      expect(maChienIndex).toBeLessThan(idIndex);
    });
  });
});

// ─── Schema Validation ────────────────────────────────────────────

describe('createSystemOperationSchema', () => {
  it('should accept minimal required fields', () => {
    const result = createSystemOperationSchema.safeParse({
      maChien: 'MC-2026-001',
      thoiGianChien: '2026-06-01T08:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('should accept all numeric fields', () => {
    const result = createSystemOperationSchema.safeParse({
      maChien: 'MC-2026-001',
      thoiGianChien: '2026-06-01T08:00:00Z',
      khoiLuongDauVao: 100.5,
      giaiDoan1ThoiGian: 2,
      giaiDoan1NhietDo: 85.3,
      giaiDoan1ApSuat: 0.5,
      giaiDoan2ThoiGian: 2,
      giaiDoan2NhietDo: 90,
      giaiDoan2ApSuat: 0.3,
      giaiDoan3ThoiGian: 0,
      giaiDoan3NhietDo: 0,
      giaiDoan3ApSuat: 0,
      giaiDoan4ThoiGian: 0,
      giaiDoan4NhietDo: 0,
      giaiDoan4ApSuat: 0,
      ghiChu: 'Test note',
      nguoiThucHien: 'Nguyễn Văn A',
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative time values', () => {
    const result = createSystemOperationSchema.safeParse({
      maChien: 'MC-2026-001',
      thoiGianChien: '2026-06-01T08:00:00Z',
      giaiDoan1ThoiGian: -1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty maChien', () => {
    const result = createSystemOperationSchema.safeParse({
      maChien: '',
      thoiGianChien: '2026-06-01T08:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('should reject decimal time values (time fields are integer-only)', () => {
    const result = createSystemOperationSchema.safeParse({
      maChien: 'MC-2026-001',
      thoiGianChien: '2026-06-01T08:00:00Z',
      giaiDoan1ThoiGian: 1.5,
      giaiDoan2ThoiGian: 2.7,
    });
    expect(result.success).toBe(false);
  });
});

describe('updateSystemOperationSchema', () => {
  it('should not allow trangThai field', () => {
    const result = updateSystemOperationSchema.safeParse({
      trangThai: 'Hoàn thành',
      ghiChu: 'test',
    });
    // trangThai should be stripped (not in schema)
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).trangThai).toBeUndefined();
    }
  });

  it('should accept valid numeric updates', () => {
    const result = updateSystemOperationSchema.safeParse({
      khoiLuongDauVao: 0,
      giaiDoan1ThoiGian: 0,
      giaiDoan1NhietDo: 85.5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.khoiLuongDauVao).toBe(0);
      expect(result.data.giaiDoan1ThoiGian).toBe(0);
    }
  });

  it('should accept zero values (not treated as falsy)', () => {
    const result = updateSystemOperationSchema.safeParse({
      khoiLuongDauVao: 0,
      giaiDoan1ThoiGian: 0,
      giaiDoan2ThoiGian: 0,
      giaiDoan3ThoiGian: 0,
      giaiDoan4ThoiGian: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.khoiLuongDauVao).toBe(0);
      expect(result.data.giaiDoan1ThoiGian).toBe(0);
    }
  });
});

// ─── Number Parsing Logic ─────────────────────────────────────────

describe('Number() vs parseInt behavior', () => {
  it('should preserve decimals (the bug parseInt caused)', () => {
    // parseInt would truncate these
    expect(Number('1.5')).toBe(1.5);
    expect(Number('2.7')).toBe(2.7);
    expect(Number('0.5')).toBe(0.5);

    // parseInt behavior for comparison
    expect(parseInt('1.5')).toBe(1); // BAD - truncated
    expect(parseInt('2.7')).toBe(2); // BAD - truncated
  });

  it('should handle zero correctly (the falsy check bug)', () => {
    const value = 0;
    // Old pattern: data.x ? parseFloat(data.x) : undefined
    // This would skip 0 because 0 is falsy
    expect(value ? parseFloat(String(value)) : undefined).toBeUndefined(); // BAD

    // New pattern: data.x != null ? parseFloat(data.x) : undefined
    expect(value != null ? parseFloat(String(value)) : undefined).toBe(0); // GOOD
  });

  it('should handle null/undefined correctly', () => {
    expect(null != null).toBe(false);
    expect(undefined != null).toBe(false);
    // These should produce undefined (field not sent)
    expect(null != null ? Number(null) : undefined).toBeUndefined();
    expect(undefined != null ? Number(undefined) : undefined).toBeUndefined();
  });
});
