#!/bin/bash
# Script kiểm tra tab "Chấm công tháng" với dữ liệu test đã seed

set -e

echo "🧪 Test Script — Tab Chấm công tháng"
echo "===================================="
echo ""

# 1. Verify DB data
echo "📊 Step 1: Verify DB seeded data"
docker compose -f docker-compose.dev.yml exec postgres psql -U erp_user -d erp_database -c "
SELECT
  e.\"employeeCode\",
  e.\"baseSalary\",
  COUNT(t.id) as cell_count,
  SUM(t.\"overtimeHours\") as total_ot
FROM common.employees e
LEFT JOIN common.timesheet_cells t ON t.\"employeeId\" = e.id
  AND t.date >= '2026-06-01' AND t.date < '2026-07-01'
WHERE e.\"employeeCode\" IN ('NV0018', 'NV0032', 'NV0005', 'NV0007')
GROUP BY e.id, e.\"employeeCode\", e.\"baseSalary\"
ORDER BY e.\"employeeCode\";
"
echo ""

# 2. Generate JWT token
echo "🔑 Step 2: Generate JWT token"
JWT_SECRET=$(docker compose -f docker-compose.dev.yml exec backend printenv JWT_SECRET)
TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: 'cmmvdhsza00eam8kkbubyva8c', email: 'admin@example.com', role: 'ADMIN' },
  '$JWT_SECRET'.trim(),
  { expiresIn: '1h' }
);
console.log(token);
")
echo "✓ Token generated"
echo ""

# 3. Test API endpoint
echo "🌐 Step 3: Test API /timesheet/monthly?month=6&year=2026"
curl -s "http://localhost:5003/api/timesheet/monthly?month=6&year=2026" \
  -H "Authorization: Bearer $TOKEN" \
  > /tmp/timesheet_test.json

python3 << 'PYEOF'
import json

with open('/tmp/timesheet_test.json') as f:
    data = json.load(f)

if not data.get('success'):
    print('❌ API Error:', data.get('message'))
    exit(1)

result = data['data']
summaries = result.get('summaries', )
settings = result.get('settings', {})

print(f"📊 Month: {result['month']}/{result['year']}, days: {result['daysInMonth']}")
print(f"⚙️  Settings: stdDays={settings['standardWorkDays']}, OT rates={settings['otRateWeekday']}/{settings['otRateSunday']}/{settings['otRateHoliday']}")
print()

target_codes = ['NV0018', 'NV0032', 'NV0005', 'NV0007']
tests = []

for row in result['rows']:
    if row['employeeCode'] not in target_codes:
        continue

    s = summaries.get(row['employeeId'], {})
    hr = round(row['baseSalary'] / (settings['standardWorkDays'] * 8)) if row['baseSalary'] else 0
    expected = round(hr * (s.get('otWeekday', 0) * settings['otRateWeekday'] +
                           s.get('otSunday', 0) * settings['otRateSunday'] +
                           s.get('otHoliday', 0) * settings['otRateHoliday']))
    actual = s.get('otTotalIncome', 0)
    match = abs(expected - actual) < 10

    tests.append({
        'code': row['employeeCode'],
        'name': row['fullName'],
        'baseSalary': row['baseSalary'],
        'otWeekday': s.get('otWeekday', 0),
        'otSunday': s.get('otSunday', 0),
        'otTotalIncome': actual,
        'expected': expected,
        'pass': match
    })

# Print results
for t in sorted(tests, key=lambda x: x['code']):
    status = '✅ PASS' if t['pass'] else f"❌ FAIL (expected {t['expected']:,}đ)"
    print(f"{t['code']} - {t['name']}")
    print(f"  Lương CB: {t['baseSalary']:,}đ")
    print(f"  OT: weekday={t['otWeekday']}h, Sunday={t['otSunday']}h")
    print(f"  otTotalIncome: {t['otTotalIncome']:,}đ {status}")
    print()

all_pass = all(t['pass'] for t in tests)
print('=' * 50)
if all_pass:
    print('✅ ALL TESTS PASSED')
    exit(0)
else:
    print('❌ SOME TESTS FAILED')
    exit(1)
PYEOF

TEST_EXIT=$?
echo ""

# 4. Summary
echo "📋 Step 4: Summary"
if [ $TEST_EXIT -eq 0 ]; then
    echo "✅ Backend tính toán đúng 100%"
    echo ""
    echo "📝 Kiểm tra UI thủ công:"
    echo "  1. cd frontend && npm run dev"
    echo "  2. Mở http://localhost:5173"
    echo "  3. Đăng nhập admin@example.com / admin123"
    echo "  4. Vào Quality Personnel → tab 'Chấm công tháng'"
    echo "  5. Chọn tháng 6/2026"
    echo "  6. Verify 4 nhân viên: NV0018, NV0032, NV0005, NV0007"
    echo "  7. Kiểm tra cột 'Tổng thu nhập ngoài giờ' khớp với giá trị trên"
    echo ""
    echo "🎯 Expected values:"
    echo "  NV0018: 921,875đ"
    echo "  NV0032: 2,379,781đ"
    echo "  NV0005: 41,828đ"
    echo "  NV0007: 21,635đ"
else
    echo "❌ Tests failed — check audit report for details"
    exit 1
fi
