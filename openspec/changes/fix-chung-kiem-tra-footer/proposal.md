> ⚠️ **LỖI THỜI (2026-10-01):** Phần mô hình dữ liệu "1 bảng RepairRequest + requestType" không còn đúng. Code hiện tại tách 2 bảng độc lập `InspectionRequest` (YCKT, `/inspection-requests`) và `RepairRequest` (YCSC). Xem "Domain Map" trong `AGENTS.md`.

# Proposal — Chung / Kiểm tra / Footer (fix-chung-kiem-tra-footer)

## Why

Tab **Chung** cho phép mọi nhân viên tạo YCKT nhưng phiếu thất lạc giữa Repair/Inspection, footer chi tiết phân mảnh CTA khiến Kỹ thuật không có chỗ xử lý tập trung và ADMIN/Khác vai lẫn lộn quyền.

## What Changes

- **Tạo YCKT từ Chung:** `CommonManagement` tạo `RepairRequest` với `lockedRequestType=KIEM_TRA` (mọi role đều được tạo), `POST /repair-requests` set `requestType=KIEM_TRA`; sau tạo điều hướng/hiển thị thuộc **Sửa chữa & Lỗi `?type=kiem_tra`** — Kỹ thuật là bên xử lý tiếp.
- **3 nhánh xử lý của Kỹ thuật trên detail `?type=kiem_tra`:**
  1. Ổn — `ketLuan` = `KHONG_CAN` | `THEO_DOI` → CTA **Hoàn thành kiểm tra** → `HOAN_THANH`.
  2. Không ổn — `ketLuan` = `CAN_SUA_CHUA` → CTA **Tạo yêu cầu sửa chữa** → mở `RepairRequestFormModal` prefill `sourceInspectionRequestId` + `items` (copy `sourceInspectionItemId` xuống item con), tạo xong phiếu mới `SUA_CHUA` và link truy vết.
  3. Từ chối/Hủy — `TU_CHOI` / `DA_HUY` với `reason` bắt buộc, ghi `StatusLog`.
- **Footer là nơi duy nhất chứa hành động:** gom toàn bộ CTA chuyển trạng thái + phụ trợ vào footer của `RepairDetailPanel`/`InspectionDetail`; body chỉ hiển thị thông tin.
- **Quy tắc footer:** luôn có **Lịch sử** + **Đóng**; **Xóa** chỉ `ADMIN`; mọi CTA chuyển trạng thái (`Tiếp nhận`, `Hoàn thành`, `Tạo SC`, `Từ chối`, `Hủy`) chỉ render khi `isKyThuat` (Kỹ thuật/Bảo trì).

## Non-Goals

- Không tách bảng `InspectionRequest`; không đổi `maYeuCau` prefix; không thêm workflow phê duyệt cấp 2.

## Impact

- `CommonManagement.tsx`, `RepairDetailPanel.tsx` (+ `InspectionRequestList` nếu dùng chung), `RepairRequestFormModal.tsx`, `repairRequestService.ts`/`inspectionRequestService.ts`, `ROUTE_MAP` không đổi.

## Risks

- Nhầm `requestType` khi tạo từ Chung → chặn bằng `lockedRequestType` + Zod + service guard.
- CTA trùng giữa body/footer → xóa CTA body, chỉ giữ footer.

## Dependencies

- Phụ thuộc `split-inspection-repair` Phase 2 (discriminator `requestType`, `sourceInspectionRequestId`, `StatusLog`).

## Verify

- `npx tsc --noEmit` (backend + frontend) 0 lỗi; manual 3 nhánh `?type=kiem_tra` + rule footer (ADMIN xóa, non-Kỹ thuật không CTA).
