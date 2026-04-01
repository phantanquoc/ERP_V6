# Testing Guide — ERP V6

Hướng dẫn chạy tất cả các loại test trong dự án.

---

## Tổng quan

| Loại test | Tool | Thư mục | Lệnh |
|-----------|------|---------|------|
| Unit (backend) | Jest | `backend/src/__tests__/` | `npm test` |
| Unit (frontend) | Vitest | `frontend/src/` | `npm test` |
| HTTP API | Supertest | `backend/src/__tests__/api.test.ts` | `npm test` |
| E2E | Playwright | `frontend/e2e/` | `npm run test:e2e` |
| Manual API | Postman | `docs/api/erp-api-collection.json` | Import vào Postman |

---

## Backend Tests (Jest)

### Chạy tất cả backend tests
```bash
cd backend
npm test
```

### Chạy với coverage report
```bash
cd backend
npm run test:coverage
# Report xuất ra: backend/coverage/lcov-report/index.html
```

### Chạy test cụ thể theo tên file
```bash
cd backend
npx jest authService          # chạy authService.test.ts
npx jest notificationService  # chạy notificationService.test.ts
npx jest attendanceService    # chạy attendanceService.test.ts
npx jest api                  # chạy api.test.ts (Supertest)
```

### Chạy với watch mode (development)
```bash
cd backend
npx jest --watch
```

### Danh sách test files
| File | Coverage |
|------|---------|
| `auth.test.ts` | Middleware: authenticate, authorize |
| `authService.test.ts` | AuthService: register, login |
| `departmentService.test.ts` | DepartmentService: CRUD |
| `employeeService.test.ts` | EmployeeService: generateCode, CRUD |
| `notificationService.test.ts` | NotificationService: create, read, mark |
| `attendanceService.test.ts` | AttendanceService: getByRange, grouping logic |
| `helpers.test.ts` | Utils: pagination |
| `ipBlock.test.ts` | Middleware: IP blocking |
| `rateLimiter.test.ts` | Middleware: rate limiting |
| `websocket.test.ts` | WebSocket: push, broadcast |
| `api.test.ts` | HTTP endpoints via Supertest |

---

## Frontend Tests (Vitest)

### Chạy tất cả frontend unit tests
```bash
cd frontend
npm test
```

### Chạy với coverage report
```bash
cd frontend
npm run test:coverage
# Report: frontend/coverage/lcov-report/index.html
```

### Watch mode
```bash
cd frontend
npm run test:watch
```

---

## E2E Tests (Playwright)

### Yêu cầu trước khi chạy
1. Backend đang chạy trên `http://localhost:5001`
2. Frontend đang chạy trên `http://localhost:5173`
3. Database đã có dữ liệu seed (hoặc tài khoản test)

### Cài Playwright browsers (lần đầu)
```bash
cd frontend
npx playwright install chromium
```

### Chạy E2E tests (frontend phải đang chạy sẵn)
```bash
cd frontend
npm run test:e2e
```

### Chạy với UI mode (debug trực quan)
```bash
cd frontend
npm run test:e2e:ui
```

### Chạy với browser hiển thị (không headless)
```bash
cd frontend
npm run test:e2e:headed
```

### Chạy test cụ thể
```bash
cd frontend
npx playwright test login      # chỉ chạy login.spec.ts
npx playwright test dashboard  # chỉ chạy dashboard.spec.ts
npx playwright test notification
npx playwright test attendance
```

### Cấu hình credentials cho E2E
Tạo file `.env.test` trong `frontend/` (không commit):
```env
E2E_ADMIN_EMAIL=admin@anbinhfoods.net
E2E_ADMIN_PASSWORD=password123
E2E_EMPLOYEE_EMAIL=employee@anbinhfoods.net
E2E_EMPLOYEE_PASSWORD=password123
BASE_URL=http://localhost:5173
```

### Xem report sau khi test
```bash
cd frontend
npx playwright show-report
```

### Danh sách E2E spec files
| File | Tests |
|------|-------|
| `e2e/login.spec.ts` | Form render, validation, wrong creds, success login, block after 3 fails, reload persistence |
| `e2e/dashboard.spec.ts` | Dashboard load, sidebar, user info, no JS errors |
| `e2e/notification.spec.ts` | Bell icon, dropdown open, unread badge, mark as read |
| `e2e/attendance.spec.ts` | Navigate to page, table display, controls, no JS errors |

---

## Manual API Testing (Postman / Insomnia)

### Import collection
1. Mở Postman → **File → Import**
2. Chọn `docs/api/erp-api-collection.json`
3. Tạo Environment với:
   - `baseUrl`: `http://localhost:5001` (local) hoặc `https://anbinhfoods.net` (production)
   - `accessToken`: để trống

### Luồng test cơ bản
1. Chạy **Auth / Login** → `accessToken` sẽ tự động được lưu vào Environment
2. Test các endpoint khác sử dụng `{{accessToken}}`

### Test WebSocket (dev only)
```bash
# Dùng CLI tool có sẵn
cd backend
npm run test:ws
```
Hoặc dùng Postman request **System / Push Notification to Self**.

---

## CI/CD

Tất cả tests được chạy tự động khi push lên branch `feature/weekly-optimization` hoặc tạo PR vào `main`.

Xem `.github/workflows/ci.yml` để biết chi tiết pipeline.

### Coverage thresholds
- **Backend**: Minimum 50% line coverage (fail CI nếu thấp hơn)
- **Frontend**: Coverage report được tạo nhưng không block CI

---

## Troubleshooting

### "Cannot find module '@config/database'"
→ Đảm bảo chạy test trong thư mục `backend/` với `npm test` (không phải `npx jest` trực tiếp)

### Playwright timeout
→ Kiểm tra frontend + backend đang chạy. Chạy `npm run dev` trong `frontend/` trước.

### "address already in use" khi chạy Supertest
→ Đảm bảo không có backend server thật đang listen trên cùng port. Test dùng mock nên không cần server thật.
