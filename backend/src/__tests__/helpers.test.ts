import { getPaginationParams, calculateTotalPages } from '@utils/helpers';

// ─── getPaginationParams ───────────────────────────────────────────

describe('getPaginationParams', () => {
  it('should return defaults when no arguments provided', () => {
    const result = getPaginationParams();

    expect(result).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it('should calculate skip correctly for page 3 with limit 10', () => {
    const result = getPaginationParams(3, 10);

    expect(result).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  it('should handle string inputs', () => {
    const result = getPaginationParams('2', '15');

    expect(result).toEqual({ page: 2, limit: 15, skip: 15 });
  });

  it('should clamp page to minimum of 1 for negative values', () => {
    const result = getPaginationParams(-5, 10);

    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('should clamp page to minimum of 1 for zero', () => {
    const result = getPaginationParams(0, 10);

    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('should clamp limit to minimum of 1', () => {
    const result = getPaginationParams(1, 0);

    expect(result.limit).toBe(10);
  });

  it('should clamp limit to maximum of 100', () => {
    const result = getPaginationParams(1, 200);

    expect(result.limit).toBe(100);
  });

  it('should handle limit of exactly 100', () => {
    const result = getPaginationParams(1, 100);

    expect(result.limit).toBe(100);
  });

  it('should handle limit of exactly 1', () => {
    const result = getPaginationParams(1, 1);

    expect(result.limit).toBe(1);
  });

  it('should default to page 1 for non-numeric string page', () => {
    const result = getPaginationParams('abc', 10);

    expect(result.page).toBe(1);
  });

  it('should default to limit 10 for non-numeric string limit', () => {
    const result = getPaginationParams(1, 'abc');

    expect(result.limit).toBe(10);
  });

  it('should calculate skip correctly for large page numbers', () => {
    const result = getPaginationParams(50, 20);

    expect(result).toEqual({ page: 50, limit: 20, skip: 980 });
  });
});

// ─── calculateTotalPages ───────────────────────────────────────────

describe('calculateTotalPages', () => {
  it('should return 1 when total equals limit', () => {
    expect(calculateTotalPages(10, 10)).toBe(1);
  });

  it('should return 1 when total is less than limit', () => {
    expect(calculateTotalPages(5, 10)).toBe(1);
  });

  it('should round up for partial pages', () => {
    expect(calculateTotalPages(11, 10)).toBe(2);
  });

  it('should return correct pages for exact division', () => {
    expect(calculateTotalPages(30, 10)).toBe(3);
  });

  it('should return 0 when total is 0', () => {
    expect(calculateTotalPages(0, 10)).toBe(0);
  });

  it('should handle large totals', () => {
    expect(calculateTotalPages(1000, 25)).toBe(40);
  });

  it('should handle limit of 1', () => {
    expect(calculateTotalPages(5, 1)).toBe(5);
  });

  it('should round up correctly for 101 items with limit 10', () => {
    expect(calculateTotalPages(101, 10)).toBe(11);
  });
});

