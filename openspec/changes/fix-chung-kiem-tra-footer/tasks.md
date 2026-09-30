# Tasks — fix-chung-kiem-tra-footer

## 1 — Chung tạo YCKT (lockedRequestType)

- [ ] 1.1 `CommonManagement.tsx` — form tạo YCKT set `lockedRequestType=KIEM_TRA`, mọi role đều tạo được; `POST /repair-requests` với `requestType=KIEM_TRA` (service guard).
- [ ] 1.2 Sau tạo: toast + điều hướng/list filter về `Sửa chữa & Lỗi ?type=kiem_tra`; verify phiếu mới có `requestType=KIEM_TRA` và hiện ở Kỹ thuật queue.

## 2 — Detail ?type=kiem_tra: 3 nhánh Kỹ thuật

- [ ] 2.1 Nhánh (1) ổn — khi `ketLuan in [KHONG_CAN, THEO_DOI]`: footer CTA **Hoàn thành kiểm tra** → `PATCH .../complete` → `HOAN_THANH` (+ StatusLog).
- [ ] 2.2 Nhánh (2) không ổn — khi `ketLuan=CAN_SUA_CHUA`: footer CTA **Tạo yêu cầu sửa chữa** → mở `RepairRequestFormModal` prefill `sourceInspectionRequestId` + `items` (service copy `sourceInspectionItemId`), tạo xong link truy vết.
- [ ] 2.3 Nhánh (3) từ chối/hủy — CTA **Từ chối** → `TU_CHOI` / **Hủy** → `DA_HUY` (reason bắt buộc, ghi StatusLog); guard forward-only.

## 3 — Footer là nơi duy nhất chứa hành động

- [ ] 3.1 Gom toàn bộ CTA chuyển trạng thái vào footer `RepairDetailPanel` (và `InspectionDetail` nếu dùng chung); xóa CTA trùng ở body.
- [ ] 3.2 Footer luôn render **Lịch sử** + **Đóng**; **Xóa** chỉ khi `role=ADMIN`.
- [ ] 3.3 Mọi CTA chuyển trạng thái chỉ render khi `isKyThuat=true`; user thường chỉ thấy Lịch sử/Đóng/Xóa(ADMIN).

## 4 — Verify

- [ ] 4.1 `backend: npx tsc --noEmit` 0 lỗi; `frontend: npx tsc --noEmit -p tsconfig.app.json` 0 lỗi.
- [ ] 4.2 `npm run lint` không thêm lỗi mới; `npm test -- --runInBand` pass (statusTransitions).
- [ ] 4.3 Manual: Chung(any role) tạo YCKT → hiện ở `?type=kiem_tra` → Kỹ thuật test 3 nhánh + footer rule (ADMIN xóa, non-Kỹ thuật không thấy CTA).

## Ghi chú

- Không thêm route mới; `ROUTE_MAP` giữ nguyên. `isKyThuat` check `phongBan/role` Kỹ thuật/Bảo trì.
- E2E deep-link: `?type=kiem_tra&id=<id>` mở đúng detail với footer tương ứng.
