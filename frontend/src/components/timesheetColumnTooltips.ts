/**
 * Tooltip content for Monthly Timesheet column headers.
 * Keyed by a stable short id used at each <th>. Business meaning confirmed with HR.
 */
export interface ColumnTooltip {
  title: string;
  description: string;
}

export const COLUMN_TOOLTIPS: Record<string, ColumnTooltip> = {
  // --- Main summary table ---
  payableHours: {
    title: 'Thời gian tính lương (giờ)',
    description: 'Giờ lương theo kế hoạch = làm chính thức + nghỉ có lương + nghỉ lễ/chế độ + nghỉ không lương + thử việc. KHÔNG bị trừ giờ trễ/sớm, không gồm tăng ca. Ví dụ 26 công đủ = 208h. Tự tính; click để ghi đè.',
  },
  officialWorkDays: {
    title: 'Tổng thời gian làm chính thức (giờ)',
    description: 'Giờ làm thực tế = Giờ lương kế hoạch trừ đi giờ đi trễ/về sớm. Ngày đủ (x, ON, TV) = 8h, nửa ngày (N, TV/2, X/2, P/2) = 4h. Tự tính; click để ghi đè.',
  },
  leaveHoursPayable: {
    title: 'Số giờ nghỉ — Tính lương',
    description: 'Giờ nghỉ vẫn được trả lương: phép năm P (8h), nửa phép P/2 (4h), nghỉ bù BU (8h). Tự tính; click để ghi đè.',
  },
  leaveHoursHolidayRegime: {
    title: 'Số giờ nghỉ — Ngày lễ, chế độ',
    description: 'Giờ nghỉ lễ (L, 8h) và nghỉ chế độ (CD, 8h). Tự tính; click để ghi đè.',
  },
  leaveHoursUnpaid: {
    title: 'Số giờ nghỉ — Không lương',
    description: 'Giờ nghỉ không được trả lương: nghỉ bệnh B, nghỉ không lương KL, nửa ngày không lương X/2, chưa đi làm O, thai sản TS, nghỉ hưởng chuyên cần NCC. Tự tính; click để ghi đè.',
  },
  probationDays: {
    title: 'Tổng thời gian thử việc (giờ)',
    description: 'Số giờ thử việc = TV × 8 + TV/2 × 4. Tự tính; click để ghi đè.',
  },
  lateEarlyHours: {
    title: 'Đi trễ về sớm (giờ)',
    description: 'Nhập tay: số giờ đi trễ hoặc về sớm (0.5 = 30 phút). Để trống nếu đúng giờ. Hệ thống không tự tính.',
  },
  signature: {
    title: 'Ký nhận',
    description: 'Nhập tay: tên/ký hiệu người ký xác nhận bảng công.',
  },
  mealAllowanceMoney: {
    title: 'Tiền cơm theo NC (ngày công)',
    description: 'Tiền cơm theo ngày công = số ngày ăn cơm × đơn giá cơm/ngày. Tự tính; click để ghi đè.',
  },
  otWeekday: {
    title: 'Tăng ca ngày thường 150%',
    description: 'Giờ tăng ca ngày thường, hệ số 150%.',
  },
  otWeekdayExtra: {
    title: 'Tăng ca ngày thường ngoài giờ 210%',
    description: 'Giờ tăng ca ngày thường phần vượt thêm, hệ số 210%.',
  },
  otSunday: {
    title: 'Tăng ca Chủ nhật 200%',
    description: 'Giờ tăng ca ngày Chủ nhật, hệ số 200%.',
  },
  otSundayExtra: {
    title: 'Tăng ca Chủ nhật ngoài giờ 270%',
    description: 'Giờ tăng ca Chủ nhật phần vượt thêm, hệ số 270%.',
  },
  otHoliday: {
    title: 'Tăng ca ngày Lễ 300%',
    description: 'Giờ tăng ca ngày Lễ, hệ số 300%.',
  },
  kmDistance: {
    title: 'Số KM',
    description: 'Nhập tay: quãng đường di chuyển (km) dùng tính phụ cấp xăng.',
  },
  fuelAmount: {
    title: 'Xăng xe',
    description: 'Tiền xăng = Số KM × đơn giá xăng/km. Tự tính; click để ghi đè.',
  },
  overtimeMealMoney: {
    title: 'Cơm tăng ca (vnđ)',
    description: 'Tiền cơm tăng ca = số ngày tăng ca đủ điều kiện × phụ cấp cơm tăng ca. Tự tính; click để ghi đè.',
  },
  leaveBalanceCarryOver: {
    title: 'Ngày phép còn lại tháng trước',
    description: 'Nhập tay: số ngày phép năm còn dư chuyển từ tháng trước sang.',
  },
  leaveCurrentBalance: {
    title: 'Ngày phép còn lại hiện tại',
    description: 'Số ngày phép còn lại = phép tồn tháng trước − (giờ nghỉ có lương ÷ 8). Tự tính.',
  },
  note: {
    title: 'Ghi chú',
    description: 'Nhập tay: ghi chú tự do.',
  },
  diligence: {
    title: 'Tính chuyên cần',
    description: 'Đạt (✓) khi (số buổi X/2 × 0.5 + số ngày KL × 1) ≤ 1. Cho phép nghỉ tối đa 1 ngày không lương. Nghỉ bệnh B, thai sản TS, chưa đi làm O không làm mất chuyên cần. Tự tính; click để ghi đè.',
  },
  mealCount: {
    title: 'Tính cơm',
    description: 'Số ngày đủ điều kiện tính tiền cơm (số ngày ăn cơm trong tháng).',
  },
  unpaidDeductHours: {
    title: 'Giờ công cty cho nghỉ KL hưởng chuyên cần',
    description: 'Số giờ được công ty cho nghỉ không lương nhưng vẫn hưởng chuyên cần (NCC, nghỉ bệnh B, làm online ON). Tự tính; click để ghi đè.',
  },
  leaveAdvanceRecovery: {
    title: 'Truy thu tiền ứng phép',
    description: 'Nhập tay: số tiền (VNĐ) truy thu khi nhân viên đã ứng phép vượt số phép thực có.',
  },
  leaveCompensatory: {
    title: 'Phép bù',
    description: 'Số ngày nghỉ bù (đếm mã BU). Tự tính; click để ghi đè.',
  },
  sundayMeal: {
    title: 'Cơm chủ nhật',
    description: 'Số bữa cơm ngày Chủ nhật có đi làm. Tự tính; click để ghi đè.',
  },
  resignDate: {
    title: 'Ngày nghỉ việc',
    description: 'Nhập tay: ngày chấm dứt làm việc của nhân viên.',
  },
};

export const OVERTIME_COLUMN_TOOLTIPS: Record<string, ColumnTooltip> = {
  otCarryOver: {
    title: 'Tăng ca tháng trước',
    description: 'Số giờ tăng ca còn chuyển từ tháng trước sang.',
  },
  otWeekday: {
    title: 'Số giờ tăng ca ngày thường',
    description: 'Giờ tăng ca trong ngày thường, hệ số 150%.',
  },
  otSunday: {
    title: 'Số giờ tăng ca Chủ nhật',
    description: 'Giờ tăng ca ngày Chủ nhật, hệ số 200%.',
  },
  otHoliday: {
    title: 'Số giờ tăng ca Lễ',
    description: 'Giờ tăng ca ngày Lễ, hệ số 300%.',
  },
  otWeekdayExtra: {
    title: 'Tăng ca ngoài giờ ngày thường',
    description: 'Giờ tăng ca ngày thường phần vượt thêm, hệ số 210%.',
  },
  otSundayExtra: {
    title: 'Tăng ca ngoài giờ ngày nghỉ',
    description: 'Giờ tăng ca ngày nghỉ phần vượt thêm, hệ số 270%.',
  },
  otSalary: {
    title: 'Lương tính tăng ca',
    description: 'Tổng lương phần tăng ca theo các hệ số tương ứng.',
  },
  hourlyRate: {
    title: 'Mức lương theo giờ',
    description: 'Mức lương theo giờ = lương cơ bản ÷ (ngày công chuẩn × 8).',
  },
  otTotalIncome: {
    title: 'Tổng thu nhập ngoài giờ',
    description: 'Tổng thu nhập từ tăng ca sau khi áp các hệ số.',
  },
  otDaysCount: {
    title: 'Ngày công tăng ca',
    description: 'Số ngày có phát sinh tăng ca, nhập tay.',
  },
  overtimeMealMoney: {
    title: 'Tổng tiền cơm tăng ca',
    description: 'Tiền cơm tăng ca = số ngày tăng ca đủ điều kiện × phụ cấp cơm tăng ca.',
  },
};
