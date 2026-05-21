# Agent System Test Results
**Date**: 2026-05-14
**Branch**: feature/face-recognition-attendance-system

## Summary

| # | Câu hỏi | Intent | Kết quả | Status |
|---|---------|--------|---------|--------|
| 1 | "xem chấm công tuần này" | action | Trả bảng chấm công (1 record) | ✅ PASS |
| 2 | "những ai đang là nhân viên kế toán" | action | Trả bảng 29 nhân viên, format đẹp | ✅ PASS |
| 3 | "tạo đơn nghỉ phép ngày mai vì việc gia đình" | action/write | Trả confirm action + params đúng | ✅ PASS |
| 4 | "xuất excel danh sách nhân viên" | action/export | Trả export action + URL + filename | ✅ PASS |
| 5 | "xem đơn nghỉ phép đang chờ duyệt" | action | Lỗi 500 từ backend (Prisma query issue) | ⚠️ BACKEND BUG |
| 6 | "xem thông báo của tôi" | action | "Không có dữ liệu" (đúng - chưa có) | ✅ PASS |
| 7 | "xem danh sách đơn hàng" | action | "Không có dữ liệu" (đúng - chưa có) | ✅ PASS |
| 8 | "hướng dẫn cách tạo yêu cầu báo giá" | rag | Trả hướng dẫn chi tiết từ RAG | ✅ PASS |
| 9 | "xem bảng lương tháng này" | action | Trả bảng lương 29 NV, format tiền tệ | ✅ PASS |
| 10 | "xem công việc của tôi" | action | "Không có dữ liệu" (đúng - chưa có) | ✅ PASS |

## Pass Rate: 9/10 (90%)

---

## Unit Tests (pytest)

**Date**: 2026-05-14
**Result**: 48/48 passed (100%)

### Test Coverage

| Module | Tests | Status |
|--------|-------|--------|
| `agent/classifier.py` | 7 tests (intent classification, error handling, fallback) | ✅ All pass |
| `agent/registry.py` | 16 tests (role filtering, tool lookup, Groq format) | ✅ All pass |
| `agent/executor.py` | 25 tests (helpers, stream, confirm, error paths) | ✅ All pass |

### Key Test Areas

- **Intent Classification**: action/rag/ambiguous routing, JSON parsing, error fallback
- **Registry**: Role-based filtering (ADMIN/EMPLOYEE/DEPARTMENT_HEAD), tool lookup, Groq schema conversion, enum support
- **Executor Helpers**: `_get_week_range` (ISO week Mon-Sun), `_get_weekday_name`, `_coerce_params` (string→int/float), `_build_messages` (few-shot date resolution), `_simplify_record` (ID/timestamp removal, nested flattening)
- **Execute Stream**: Write→confirm sentinel, Export→export sentinel, Read→API call, Groq error handling, missing client
- **Execute Confirmed**: Successful write, invalid tool name

---

## Function Calling Accuracy (Groq API)

**Date**: 2026-05-14
**Model**: llama-3.3-70b-versatile
**Result**: 5/5 passed (100%) — rate limited before remaining 3 tests

| # | Query | Expected Tool | Actual Tool | Params | Status |
|---|-------|---------------|-------------|--------|--------|
| 1 | "xem chấm công tuần này" | get_attendance_by_date | get_attendance_by_date | startDate=2026-05-11, endDate=2026-05-17 ✓ | ✅ |
| 2 | "những ai đang là nhân viên kế toán" | list_employees | list_employees | search="nhân viên kế toán" ✓ | ✅ |
| 3 | "xem đơn nghỉ phép đang chờ duyệt" | list_leave_requests | list_leave_requests | status="pending" ✓ | ✅ |
| 4 | "xem bảng lương tháng này" | get_my_payroll | get_my_payroll | month=5, year=2026 ✓ | ✅ |
| 5 | "xem thông báo của tôi" | list_notifications | list_notifications | page=1, limit=10 ✓ | ✅ |

### Improvements Applied

1. **Few-shot examples** (6 examples as conversation messages with tool_calls)
2. **Enum constraints** on status params (pending/approved/rejected)
3. **Explicit date rules** in system prompt with resolved placeholders
4. **Type coercion** (`_coerce_params`) for Groq string→int issues
5. **LLM response formatting** (markdown tables, friendly Vietnamese)

## Chi tiết kết quả

### TEST 1: Xem chấm công tuần này ✅

**Input**: "xem chấm công tuần này"
**Intent detected**: action / attendance

**Response**:
```
| Tên | Mã | Trạng thái | Phòng ban | Chức vụ |
| --- | --- | --- | --- | --- |
| Kế toán Thuế | KT.THUE | PRESENT | Kế toán | Nhân viên kế toán |

* Ngày công: 13/05/2026
* Giờ vào: 08:37
* Giờ ra: 08:54
* Số giờ làm việc: 0,29 giờ
```

---

### TEST 2: Những ai đang là nhân viên kế toán ✅

**Input**: "những ai đang là nhân viên kế toán"
**Intent detected**: action / employee

**Response**:
```
| Tên | Mã nhân viên | Trạng thái | Phòng ban | Chức vụ |
| --- | --- | --- | --- | --- |
| Kế toán Thuế | KT.THUE | ACTIVE | Bộ phận kế toán | Nhân viên kế toán |
| Kế toán Hành chính | KT.ADMIN | ACTIVE | Bộ phận kế toán | Nhân viên kế toán |
| Trưởng phòng Kế toán | KT.TRUONGPHONG | ACTIVE | Bộ phận kế toán | Nhân viên kế toán |
và 26 kết quả khác
```

---

### TEST 3: Tạo đơn nghỉ phép ngày mai ✅

**Input**: "tạo đơn nghỉ phép ngày mai vì việc gia đình"
**Intent detected**: action / leave (write)

**Response**:
```
Tôi sẽ thực hiện: **Tạo đơn xin nghỉ phép mới**

- loaiNghiPhep: nghỉ phép năm
- lyDo: việc gia đình
- ngayBatDau: 2026-05-15
- ngayKetThuc: 2026-05-15

→ [Xác nhận] [Hủy] buttons rendered
```

---

### TEST 4: Xuất excel danh sách nhân viên ✅

**Input**: "xuất excel danh sách nhân viên"
**Intent detected**: action / employee (export)

**Response**:
```
File Excel đã sẵn sàng để tải xuống.
→ [Tải xuống export_employees_excel_2026-05-14.xlsx] button rendered
```

---

### TEST 5: Xem đơn nghỉ phép đang chờ duyệt ⚠️

**Input**: "xem đơn nghỉ phép đang chờ duyệt"
**Intent detected**: action / leave

**Response**: Lỗi 500 — Prisma query issue trong leaveRequestService.ts
**Root cause**: Backend bug (không liên quan agent) — Prisma query có field không hợp lệ

---

### TEST 6: Xem thông báo của tôi ✅

**Input**: "xem thông báo của tôi"
**Intent detected**: action / notification

**Response**: "Không có dữ liệu." (đúng — chưa có notification nào)

---

### TEST 7: Xem danh sách đơn hàng ✅

**Input**: "xem danh sách đơn hàng"
**Intent detected**: action / order

**Response**: "Không có dữ liệu." (đúng — chưa có order nào)

---

### TEST 8: Hướng dẫn cách tạo yêu cầu báo giá ✅

**Input**: "hướng dẫn cách tạo yêu cầu báo giá"
**Intent detected**: rag / quotation

**Response**:
```
Vào Bộ phận kinh doanh → chọn Phòng KD Nội Địa hoặc Phòng KD Quốc Tế
→ tab Danh sách yêu cầu BG → nhấn "Thêm yêu cầu báo giá". Điền:
- Khách hàng ✅ — chọn từ danh sách
- Sản phẩm ✅ — nhấn "Thêm sản phẩm" để thêm dòng
- Yêu cầu sản phẩm (tùy chọn)
Nhấn "Tạo mới" hoặc "Lưu" để hoàn tất.
```

---

### TEST 9: Xem bảng lương tháng này ✅

**Input**: "xem bảng lương tháng này"
**Intent detected**: action / payroll

**Response**:
```
| Tên | Mã | Chức vụ | Phòng ban |
| --- | --- | --- | --- |
| Kế toán Hành chính | KT.ADMIN | Nhân viên kế toán | Kế toán |
| Kế toán Thuế | KT.THUE | Nhân viên kế toán | Kế toán |
...và 23 kết quả khác

Chi tiết: Lương cơ bản: 12.000.000đ, Thưởng KPI: 1.000.000đ, Tổng: 13.000.000đ
```

---

### TEST 10: Xem công việc của tôi ✅

**Input**: "xem công việc của tôi"
**Intent detected**: action / task

**Response**: "Không có dữ liệu." (đúng — chưa có task nào)

---

## Known Issues

1. **TEST 5 — Leave request query fails**: Backend Prisma bug khi query leave requests với filter status. Không phải lỗi agent.

## Architecture Verified

- ✅ Intent classifier (8b) phân loại đúng rag vs action
- ✅ Function calling (70b) chọn đúng tool + extract params
- ✅ Param coercion (string → int) hoạt động
- ✅ Write actions trả confirm sentinel (không execute ngay)
- ✅ Export actions trả download URL
- ✅ Read actions execute + format kết quả thân thiện (bảng markdown)
- ✅ RAG routing hoạt động (hướng dẫn sử dụng)
- ✅ JWT forwarding hoạt động (backend API nhận đúng user context)
