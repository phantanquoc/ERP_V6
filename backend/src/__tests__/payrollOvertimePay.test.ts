/**
 * Tests cho tiền tăng ca suy từ lương từng nhân viên.
 *
 * Mặc định công ty: 26 ngày công/tháng, 8 giờ/ngày. Tiền OT = lương giờ của
 * chính nhân viên đó × hệ số theo loại ngày. Trước đây hệ thống nhân số giờ với
 * một mức ₫/giờ phẳng dùng chung, nên mọi người có lương khác nhau vẫn được trả
 * OT như nhau.
 */

import { computeHourlyRate, computeOvertimePay } from '@utils/payroll';

const STANDARD_WORK_DAYS = 26;
const STANDARD_HOURS_PER_DAY = 8;

// Hệ số theo Bộ luật Lao động, khớp mặc định trong PayrollSettings.
const OT_WEEKDAY = 1.5;
const OT_SUNDAY = 2;
const OT_HOLIDAY = 3;

describe('computeHourlyRate', () => {
  it('suy lương giờ từ lương tháng theo 26 công × 8 giờ', () => {
    // 8.000.000 / 26 / 8 = 38.461,54₫/giờ
    expect(computeHourlyRate(8_000_000, STANDARD_WORK_DAYS, STANDARD_HOURS_PER_DAY)).toBeCloseTo(
      38_461.54,
      2
    );
  });

  it('lương giờ tỉ lệ thuận với lương tháng', () => {
    const low = computeHourlyRate(6_432_123, STANDARD_WORK_DAYS, STANDARD_HOURS_PER_DAY);
    const high = computeHourlyRate(10_000_000, STANDARD_WORK_DAYS, STANDARD_HOURS_PER_DAY);
    expect(low).toBeCloseTo(30_923.67, 2);
    expect(high).toBeCloseTo(48_076.92, 2);
    expect(high).toBeGreaterThan(low);
  });

  it('trả 0 khi thiếu mẫu số hoặc lương', () => {
    expect(computeHourlyRate(0, STANDARD_WORK_DAYS, STANDARD_HOURS_PER_DAY)).toBe(0);
    expect(computeHourlyRate(8_000_000, 0, STANDARD_HOURS_PER_DAY)).toBe(0);
    expect(computeHourlyRate(8_000_000, STANDARD_WORK_DAYS, 0)).toBe(0);
    expect(computeHourlyRate(-1_000, STANDARD_WORK_DAYS, STANDARD_HOURS_PER_DAY)).toBe(0);
  });

  it('đổi giờ chuẩn một ngày thì lương giờ đổi theo', () => {
    const at8 = computeHourlyRate(8_000_000, 26, 8);
    const at9 = computeHourlyRate(8_000_000, 26, 9);
    expect(at9).toBeLessThan(at8);
  });
});

describe('computeOvertimePay', () => {
  it('tính đúng số đã đối chiếu trên dữ liệu thật (NV0027)', () => {
    // 38 giờ OT, lương 8tr, ngày thường: 38 × 38.461,54 × 1.5 = 2.192.308₫
    const pay = computeOvertimePay(
      38,
      8_000_000,
      OT_WEEKDAY,
      STANDARD_WORK_DAYS,
      STANDARD_HOURS_PER_DAY
    );
    expect(pay).toBe(2_192_308);
  });

  it('tính đúng số đã đối chiếu trên dữ liệu thật (NV0039)', () => {
    // 27,5 giờ OT: 27,5 × 38.461,54 × 1.5 = 1.586.538₫
    const pay = computeOvertimePay(
      27.5,
      8_000_000,
      OT_WEEKDAY,
      STANDARD_WORK_DAYS,
      STANDARD_HOURS_PER_DAY
    );
    expect(pay).toBe(1_586_538);
  });

  // Đây là lý do tồn tại của thay đổi: mức phẳng dùng chung không thể đúng cho
  // cả hai người khi lương giờ của họ chênh nhau.
  it('cùng số giờ nhưng lương khác nhau thì tiền OT khác nhau', () => {
    const lowPaid = computeOvertimePay(
      10,
      6_432_123,
      OT_WEEKDAY,
      STANDARD_WORK_DAYS,
      STANDARD_HOURS_PER_DAY
    );
    const highPaid = computeOvertimePay(
      10,
      10_000_000,
      OT_WEEKDAY,
      STANDARD_WORK_DAYS,
      STANDARD_HOURS_PER_DAY
    );
    expect(lowPaid).toBe(463_855);
    expect(highPaid).toBe(721_154);
    expect(highPaid).toBeGreaterThan(lowPaid);
  });

  it('hệ số cao hơn thì trả nhiều hơn: ngày thường < chủ nhật < lễ', () => {
    const args = [10, 8_000_000] as const;
    const weekday = computeOvertimePay(
      ...args,
      OT_WEEKDAY,
      STANDARD_WORK_DAYS,
      STANDARD_HOURS_PER_DAY
    );
    const sunday = computeOvertimePay(
      ...args,
      OT_SUNDAY,
      STANDARD_WORK_DAYS,
      STANDARD_HOURS_PER_DAY
    );
    const holiday = computeOvertimePay(
      ...args,
      OT_HOLIDAY,
      STANDARD_WORK_DAYS,
      STANDARD_HOURS_PER_DAY
    );
    expect(weekday).toBe(576_923);
    expect(sunday).toBe(769_231);
    expect(holiday).toBe(1_153_846);
  });

  it('không có giờ OT thì không có tiền', () => {
    expect(
      computeOvertimePay(0, 8_000_000, OT_WEEKDAY, STANDARD_WORK_DAYS, STANDARD_HOURS_PER_DAY)
    ).toBe(0);
    expect(
      computeOvertimePay(-5, 8_000_000, OT_WEEKDAY, STANDARD_WORK_DAYS, STANDARD_HOURS_PER_DAY)
    ).toBe(0);
  });

  // Chưa nhập lương cơ bản thì không suy được lương giờ. Trả 0 sẽ âm thầm mất
  // tiền OT của người đã làm, nên quay về mức phẳng cấu hình sẵn.
  it('dùng mức phẳng khi nhân viên chưa có lương cơ bản', () => {
    const pay = computeOvertimePay(
      10,
      0,
      OT_WEEKDAY,
      STANDARD_WORK_DAYS,
      STANDARD_HOURS_PER_DAY,
      50_000
    );
    expect(pay).toBe(500_000);
  });

  it('không có lương và không có mức phẳng thì trả 0', () => {
    expect(
      computeOvertimePay(10, 0, OT_WEEKDAY, STANDARD_WORK_DAYS, STANDARD_HOURS_PER_DAY, 0)
    ).toBe(0);
  });

  it('có lương cơ bản thì bỏ qua mức phẳng', () => {
    // Mức phẳng 1₫/giờ sẽ ra 10₫ nếu bị dùng; lương thật phải thắng.
    const pay = computeOvertimePay(
      10,
      8_000_000,
      OT_WEEKDAY,
      STANDARD_WORK_DAYS,
      STANDARD_HOURS_PER_DAY,
      1
    );
    expect(pay).toBe(576_923);
  });

  it('làm tròn về số nguyên đồng', () => {
    const pay = computeOvertimePay(
      1,
      6_432_123,
      OT_WEEKDAY,
      STANDARD_WORK_DAYS,
      STANDARD_HOURS_PER_DAY
    );
    expect(Number.isInteger(pay)).toBe(true);
    expect(pay).toBe(46_386);
  });

  it('làm tròn từng lần gọi → 1h × 2 lần ≠ 2h một lần (chênh ±1₫)', () => {
    const full = computeOvertimePay(
      2,
      8_000_000,
      OT_WEEKDAY,
      STANDARD_WORK_DAYS,
      STANDARD_HOURS_PER_DAY
    );
    const half = computeOvertimePay(
      1,
      8_000_000,
      OT_WEEKDAY,
      STANDARD_WORK_DAYS,
      STANDARD_HOURS_PER_DAY
    );
    // 1h = 57.692₫, 2h = 115.385₫. Làm tròn riêng nên half×2 = 115.384₫.
    expect(full).toBe(115_385);
    expect(half).toBe(57_692);
    expect(Math.abs(half * 2 - full)).toBeLessThanOrEqual(1);
  });

  it('đổi ngày công chuẩn thì tiền OT đổi theo', () => {
    const at26 = computeOvertimePay(10, 8_000_000, OT_WEEKDAY, 26, 8);
    const at24 = computeOvertimePay(10, 8_000_000, OT_WEEKDAY, 24, 8);
    // Ít ngày công hơn → lương ngày cao hơn → OT cao hơn.
    expect(at24).toBeGreaterThan(at26);
  });
});
