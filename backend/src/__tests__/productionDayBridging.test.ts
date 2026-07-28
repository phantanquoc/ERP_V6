/**
 * Bridging test: pins the 06:30 production-day boundary rule across BOTH
 * the TypeScript helper (getProductionDay) and the SQL migration expression.
 *
 * The SQL migration (20260728000000_add_ngay_san_xuat_production_day) backfills
 * ngaySanXuat using a PostgreSQL expression. This test encodes the SQL expression's
 * semantics as a reference implementation and asserts equivalence with the TypeScript
 * helper on every boundary input.
 *
 * NOTE: The SQL half is pinned by proxy (a JS reimplementation of the exact SQL logic)
 * rather than executed against a live database. This is because the test suite uses
 * mocked Prisma and does not connect to PostgreSQL.
 *
 * Also asserts TZ-independence: results are identical regardless of process.env.TZ.
 */
import { getProductionDay, parseLocalDateTimeAsAppTz } from '@utils/productionDay';

// ─── SQL reference implementation ────────────────────────────────────────────
// This encodes the EXACT semantics of the migration's backfill expression for
// the naive-timestamp tables (material_evaluations, system_operations, finished_products):
//
//   EXTRACT(HOUR FROM ("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'))
//
// In PostgreSQL:
//   1. `naive_ts AT TIME ZONE 'UTC'` → declares the naive value is UTC, returns timestamptz
//   2. `timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh'` → converts to local time (returns timestamp)
//   3. EXTRACT(HOUR/MINUTE FROM local_timestamp) → gets local hour/minute
//   4. If before 06:30 local → subtract 1 day from local date
//
// For quality_evaluations (String column with ISO Z suffix):
//   1. `text::timestamptz` → parses ISO with Z as UTC timestamptz
//   2. `timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh'` → same as step 2 above
//
// Both paths produce the same result for a UTC input — the difference is only
// in how PostgreSQL receives the UTC instant. Once we have the UTC instant,
// the logic is identical.

function sqlReferenceGetProductionDay(utcTimestamp: Date): string {
  // Step 1+2: Convert UTC to Asia/Ho_Chi_Minh local time
  // Asia/Ho_Chi_Minh is UTC+7 with no DST
  const localMs = utcTimestamp.getTime() + 7 * 60 * 60 * 1000;
  const localDate = new Date(localMs);

  const localHour = localDate.getUTCHours();
  const localMinute = localDate.getUTCMinutes();
  const localYear = localDate.getUTCFullYear();
  const localMonth = localDate.getUTCMonth(); // 0-indexed
  const localDay = localDate.getUTCDate();

  // Step 3+4: Apply 06:30 boundary
  let prodDay: Date;
  if (localHour < 6 || (localHour === 6 && localMinute < 30)) {
    // Before boundary → previous calendar date
    prodDay = new Date(Date.UTC(localYear, localMonth, localDay - 1));
  } else {
    prodDay = new Date(Date.UTC(localYear, localMonth, localDay));
  }

  // Format as YYYY-MM-DD
  const y = prodDay.getUTCFullYear();
  const m = String(prodDay.getUTCMonth() + 1).padStart(2, '0');
  const d = String(prodDay.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
// ─── END SQL reference ───────────────────────────────────────────────────────

// ─── Boundary test cases ─────────────────────────────────────────────────────
// Each case: [description, UTC ISO string, expected production day YYYY-MM-DD]
const BOUNDARY_CASES: [string, string, string][] = [
  // --- Required by defect spec ---
  [
    'before 06:30 VN (03:00 VN = 20:00Z prev day) → previous production day',
    '2026-07-26T20:00:00.000Z', // = 2026-07-27 03:00 VN
    '2026-07-26',
  ],
  [
    'exactly 06:30 VN (23:30Z prev day) → that production day (boundary inclusive)',
    '2026-07-26T23:30:00.000Z', // = 2026-07-27 06:30 VN
    '2026-07-27',
  ],
  [
    'exactly 06:29 VN (23:29Z prev day) → previous production day',
    '2026-07-26T23:29:00.000Z', // = 2026-07-27 06:29 VN
    '2026-07-26',
  ],
  [
    'daytime 14:00 VN (07:00Z) → same production day',
    '2026-07-27T07:00:00.000Z', // = 2026-07-27 14:00 VN
    '2026-07-27',
  ],
  [
    'late evening: stored 23:30Z = 06:30+07 next calendar day — the case that just broke',
    '2026-07-26T23:30:00.000Z', // = 2026-07-27 06:30 VN → prod day 2026-07-27
    '2026-07-27',
  ],
  [
    'MC-13 at 00:30 VN (17:30Z prev day) → starting production day',
    '2026-07-27T17:30:00.000Z', // = 2026-07-28 00:30 VN → prod day 2026-07-27
    '2026-07-27',
  ],
  [
    'MC-14 at 02:00 VN (19:00Z prev day) → starting production day',
    '2026-07-27T19:00:00.000Z', // = 2026-07-28 02:00 VN → prod day 2026-07-27
    '2026-07-27',
  ],
  [
    'MC-15 at 03:30 VN (20:30Z prev day) → starting production day',
    '2026-07-27T20:30:00.000Z', // = 2026-07-28 03:30 VN → prod day 2026-07-27
    '2026-07-27',
  ],
  [
    'MC-16 at 05:00 VN (22:00Z prev day) → starting production day',
    '2026-07-27T22:00:00.000Z', // = 2026-07-28 05:00 VN → prod day 2026-07-27
    '2026-07-27',
  ],
  // --- Additional edge cases for robustness ---
  [
    'midnight VN (17:00Z prev day) → previous production day',
    '2026-07-26T17:00:00.000Z', // = 2026-07-27 00:00 VN → prod day 2026-07-26
    '2026-07-26',
  ],
  [
    'dev DB row MC-001: stored 02:26Z = 09:26 VN → prod day 2026-07-10',
    '2026-07-10T02:26:00.000Z', // = 2026-07-10 09:26 VN
    '2026-07-10',
  ],
  [
    'dev DB row MC-002: stored 23:30Z = 06:30 VN next day → prod day 2026-07-14',
    '2026-07-13T23:30:00.000Z', // = 2026-07-14 06:30 VN
    '2026-07-14',
  ],
  [
    'dev DB row MC-006: stored 23:30Z = 06:30 VN next day → prod day 2026-07-27',
    '2026-07-26T23:30:00.000Z', // = 2026-07-27 06:30 VN
    '2026-07-27',
  ],
];

describe('Production Day Bridging Test — SQL + TypeScript equivalence', () => {
  describe('TypeScript getProductionDay and SQL reference produce identical results', () => {
    it.each(BOUNDARY_CASES)('%s', (_desc, utcIso, expected) => {
      const ts = new Date(utcIso);
      const tsResult = getProductionDay(ts);
      const sqlResult = sqlReferenceGetProductionDay(ts);

      // Both must agree
      expect(tsResult).toBe(expected);
      expect(sqlResult).toBe(expected);
    });
  });

  describe('TZ-independence: same results regardless of process.env.TZ', () => {
    // The getProductionDay helper uses Intl.DateTimeFormat with explicit timeZone,
    // so it should produce the same result regardless of process.env.TZ.
    // This assertion would have caught Defect 2.
    const originalTZ = process.env.TZ;

    afterAll(() => {
      // Restore original TZ
      if (originalTZ === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTZ;
      }
    });

    it.each(BOUNDARY_CASES)(
      'TZ-independent: %s',
      (_desc, utcIso, expected) => {
        const ts = new Date(utcIso);

        // Test with TZ=UTC (simulates the dev container)
        process.env.TZ = 'UTC';
        const resultUtc = getProductionDay(ts);

        // Test with TZ=Asia/Ho_Chi_Minh (simulates a local dev machine)
        process.env.TZ = 'Asia/Ho_Chi_Minh';
        const resultVn = getProductionDay(ts);

        // Both must produce the same correct answer
        expect(resultUtc).toBe(expected);
        expect(resultVn).toBe(expected);
      },
    );
  });

  describe('parseLocalDateTimeAsAppTz — TZ-independent parsing', () => {
    const originalTZ = process.env.TZ;

    afterAll(() => {
      if (originalTZ === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTZ;
      }
    });

    it('naive datetime "2026-07-27T06:30:00" is interpreted as APP_TZ regardless of server TZ', () => {
      // 06:30 VN = 23:30 UTC previous day
      const expected = new Date('2026-07-26T23:30:00.000Z');

      process.env.TZ = 'UTC';
      const resultUtc = parseLocalDateTimeAsAppTz('2026-07-27T06:30:00');
      expect(resultUtc.getTime()).toBe(expected.getTime());

      process.env.TZ = 'Asia/Ho_Chi_Minh';
      const resultVn = parseLocalDateTimeAsAppTz('2026-07-27T06:30:00');
      expect(resultVn.getTime()).toBe(expected.getTime());
    });

    it('ISO string with Z suffix is returned as-is (already UTC)', () => {
      const input = '2026-07-27T06:30:00.000Z';
      const result = parseLocalDateTimeAsAppTz(input);
      expect(result.toISOString()).toBe(input);
    });

    it('ISO string with offset is parsed correctly', () => {
      const result = parseLocalDateTimeAsAppTz('2026-07-27T06:30:00+07:00');
      // +07:00 means this is 2026-07-26T23:30:00Z
      expect(result.toISOString()).toBe('2026-07-26T23:30:00.000Z');
    });

    it('production-day boundary 06:30 produces correct UTC for service filter', () => {
      // This is what the frontend sends: "2026-07-27T06:30:00" (naive, meant as VN local)
      // The service must convert it to UTC 2026-07-26T23:30:00.000Z for Prisma
      process.env.TZ = 'UTC'; // Simulate container environment
      const result = parseLocalDateTimeAsAppTz('2026-07-27T06:30:00');
      expect(result.toISOString()).toBe('2026-07-26T23:30:00.000Z');
    });
  });

  describe('parseLocalDateTimeAsAppTz — materialEvaluation create path', () => {
    const originalTZ = process.env.TZ;

    afterAll(() => {
      if (originalTZ === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTZ;
      }
    });

    it('naive "2026-07-27T06:30:00" yields identical instant under TZ=UTC and TZ=Asia/Ho_Chi_Minh, equal to 06:30 Vietnam time', () => {
      // 06:30 Vietnam (UTC+7) = 2026-07-26T23:30:00Z
      const expectedUtcIso = '2026-07-26T23:30:00.000Z';

      process.env.TZ = 'UTC';
      const resultUnderUtc = parseLocalDateTimeAsAppTz('2026-07-27T06:30:00');

      process.env.TZ = 'Asia/Ho_Chi_Minh';
      const resultUnderVn = parseLocalDateTimeAsAppTz('2026-07-27T06:30:00');

      // Both must produce the same UTC instant
      expect(resultUnderUtc.toISOString()).toBe(expectedUtcIso);
      expect(resultUnderVn.toISOString()).toBe(expectedUtcIso);
      // And they must be bitwise equal (not just string-equal)
      expect(resultUnderUtc.getTime()).toBe(resultUnderVn.getTime());
    });

    it.each([
      ['MC-13 at 00:30 VN', '2026-07-28T00:30:00', '2026-07-27'],
      ['MC-14 at 02:00 VN', '2026-07-28T02:00:00', '2026-07-27'],
      ['MC-15 at 03:30 VN', '2026-07-28T03:30:00', '2026-07-27'],
      ['MC-16 at 05:00 VN', '2026-07-28T05:00:00', '2026-07-27'],
    ])('after-midnight batch %s → ngaySanXuat %s under both TZ=UTC and TZ=Asia/Ho_Chi_Minh', (_label, naiveStr, expectedProdDay) => {
      // Under TZ=UTC (the container), naive parse would give wrong result without the helper
      process.env.TZ = 'UTC';
      const parsedUtc = parseLocalDateTimeAsAppTz(naiveStr);
      const prodDayUnderUtc = getProductionDay(parsedUtc);

      process.env.TZ = 'Asia/Ho_Chi_Minh';
      const parsedVn = parseLocalDateTimeAsAppTz(naiveStr);
      const prodDayUnderVn = getProductionDay(parsedVn);

      // Both environments must yield the same production day
      expect(prodDayUnderUtc).toBe(expectedProdDay);
      expect(prodDayUnderVn).toBe(expectedProdDay);
      // And the parsed instants must be identical
      expect(parsedUtc.getTime()).toBe(parsedVn.getTime());
    });

    it('value with Z suffix passes through unchanged', () => {
      const input = '2026-07-27T06:30:00.000Z';

      process.env.TZ = 'UTC';
      const result = parseLocalDateTimeAsAppTz(input);
      expect(result.toISOString()).toBe(input);

      process.env.TZ = 'Asia/Ho_Chi_Minh';
      const resultVn = parseLocalDateTimeAsAppTz(input);
      expect(resultVn.toISOString()).toBe(input);
    });

    it('parseLocalDateTimeAsAppTz is NOT equivalent to bare new Date() for naive strings (documents the design difference)', () => {
      // The helper always interprets naive strings as Asia/Ho_Chi_Minh regardless of
      // process TZ. bare new Date() interpretation depends on the runtime TZ.
      // This test asserts the helper produces the correct UTC instant for a known naive input.
      process.env.TZ = 'UTC';
      const correctResult = parseLocalDateTimeAsAppTz('2026-07-27T06:30:00');
      // 06:30 Vietnam = 23:30 UTC previous day — this is the canonical correct answer
      expect(correctResult.toISOString()).toBe('2026-07-26T23:30:00.000Z');

      // And the same input under TZ=Asia/Ho_Chi_Minh produces the same answer
      process.env.TZ = 'Asia/Ho_Chi_Minh';
      const correctResultVn = parseLocalDateTimeAsAppTz('2026-07-27T06:30:00');
      expect(correctResultVn.toISOString()).toBe('2026-07-26T23:30:00.000Z');

      // Key assertion: both are identical — the helper is TZ-independent
      expect(correctResult.getTime()).toBe(correctResultVn.getTime());
    });
  });
});
