/**
 * Unit tests for @utils/payroll — computeKpiDeduction.
 *
 * Asserts that the shared helper produces identical output to the legacy inline
 * formula for every grid point:
 *   sup2Percentage ∈ {0, 25, 50, 75, 100}
 *   kpiBonus       ∈ {0, 1_000_000, 5_000_000}
 */

import { computeKpiDeduction } from '../../utils/payroll';

/** Legacy formula — kept here as the reference for comparison */
function legacyKpiDeduction(kpiBonus: number, sup2Percentage: number): number {
  return kpiBonus > 0
    ? Math.round((kpiBonus * (100 - sup2Percentage)) / 100)
    : 0;
}

const SUP2_PERCENTAGES = [0, 25, 50, 75, 100];
const KPI_BONUSES = [0, 1_000_000, 5_000_000];

describe('computeKpiDeduction', () => {
  describe('matches legacy formula for full parameter grid', () => {
    for (const kpiBonus of KPI_BONUSES) {
      for (const sup2Percentage of SUP2_PERCENTAGES) {
        it(`kpiBonus=${kpiBonus}, sup2Percentage=${sup2Percentage}`, () => {
          const expected = legacyKpiDeduction(kpiBonus, sup2Percentage);
          const actual = computeKpiDeduction(kpiBonus, sup2Percentage);
          expect(actual).toBe(expected);
        });
      }
    }
  });

  describe('edge cases', () => {
    it('returns 0 when kpiBonus is 0', () => {
      expect(computeKpiDeduction(0, 80)).toBe(0);
    });

    it('returns 0 when sup2Percentage is 100 (perfect score)', () => {
      expect(computeKpiDeduction(1_000_000, 100)).toBe(0);
    });

    it('returns full kpiBonus when sup2Percentage is 0 (zero score)', () => {
      expect(computeKpiDeduction(1_000_000, 0)).toBe(1_000_000);
    });

    it('rounds to nearest integer', () => {
      // 1_000_001 * (100 - 50) / 100 = 500_000.5 → 500_001
      expect(computeKpiDeduction(1_000_001, 50)).toBe(500_001);
    });

    it('does not apply deduction when kpiBonus is negative', () => {
      expect(computeKpiDeduction(-100, 50)).toBe(0);
    });
  });
});
