## Context

Ba trang nhập liệu kiosk (`ProductionDataEntry`, `ProductionMaterialEvaluationEntry`, `ProductionSystemOperationEntry`, tổng ~3.800 dòng) đã qua nhiều đợt tối ưu portrait (`2026-07-27-optimize-output-preview-portrait`, `2026-07-27-optimize-kiosk-portrait-layout`). Đợt audit này xuất phát từ hai quan sát của người dùng — picker nguyên liệu lấy quá nhiều mục, và định danh nên là mã hàng hóa chứ không phải tên — nhưng audit sâu tìm ra thêm một nhóm lỗi làm **mất dữ liệu worker đã nhập**, nghiêm trọng hơn cả hai vấn đề ban đầu.

### Số liệu thật (query DB dev `erp_database`, 2026-08-04)

| Chỉ số | Giá trị |
|---|---|
| `international_products` có `loaiSanPham` LIKE `'Nguyên liệu%'` | 9 |
| Trong đó `soLuong > 0` và `donViTinh = 'Kg'` | **2** |
| `lot_products` toàn hệ thống | 44 (8 dòng đơn vị Kg) |
| `lot_products` đã có `maKien` | **43 / 44** |
| `material_evaluations` | **0** |
| `finished_products` | **0** |
| Máy `SAN_XUAT` trạng thái `HOAT_DONG` | 8 |

Hai nguyên liệu còn tồn: `NLD-001-MDSLB` (Mít đông sấy Lá Bàng, 8.549 Kg), `NLD-003-XKDLCS` (Xoài keo đông lạnh cắt sợi, 400 Kg).

Con số này chỉnh lại giả định ban đầu. Backend `internationalProductService.ts:509-512` **đã** filter `loaiSanPham startsWith 'Nguyên liệu'`, nên picker nhận 9 mục chứ không phải toàn bộ 61 sản phẩm. Vấn đề thật không phải độ dài list mà là **7/9 lựa chọn dẫn tới dead-end**: worker chọn một nguyên liệu hết hàng, đi tiếp một bước, rồi mới đụng màn hình "không có lô tồn kho". Đó là công vô ích, và nó xảy ra với 78% lựa chọn.

Hai bảng `finished_products` và `material_evaluations` đang trống hoàn toàn — nghĩa là mọi migration backfill trong change này chạy trên tập rỗng, không có rủi ro dữ liệu.

### Vấn đề định danh nằm ở tầng schema, không phải tầng hiển thị

`MaterialEvaluation.tenHangHoa` (`business_production.prisma:298`) và `FinishedProduct.tenHangHoa` (`:397`) là String denormalized, **không lưu `maSanPham`**. Backend gán `tenHangHoa = lotProduct.internationalProduct.tenSanPham` (`materialEvaluationService.ts:298`), bỏ mất mã. `SystemOperation` không có cả `tenHangHoa`.

Đường tới mã tồn tại nhưng gián tiếp và không tin cậy: `MaterialEvaluation.lotProductId → LotProduct.internationalProductId → InternationalProduct.maSanPham`, mà `lotProductId` là **nullable** (`:307`) — record tạo tay không qua kho sẽ không truy được mã. Vì vậy chỉ sửa tầng hiển thị là không đủ.

### Nhóm lỗi mất dữ liệu (phát hiện ngoài phạm vi người dùng hỏi)

`ProductionDataEntry.tsx:496-499` reset `baselineLoaded.current = false` khi `fpIndex.size === 0`, và autosave draft ở `:560` bị chặn bởi đúng cờ đó. Hệ quả: ngày/ca **chưa có** `FinishedProduct` nào thì draft **không bao giờ được ghi**, reload là mất sạch. Với `finished_products` đang 0 dòng, đây là trạng thái mặc định của mọi ca mới — tức là đúng vào lúc worker nhập nhiều nhất.

## Goals / Non-Goals

**Goals:**

- Picker nguyên liệu mặc định chỉ hiện mục có tồn kho, kèm số tồn, và có toggle xem tất cả để không chặn cứng khi hàng về mà kho chưa kịp làm phiếu nhập.
- `maSanPham` trở thành định danh nguyên liệu duy nhất hiển thị trên các màn hình nhập liệu kiosk; tên nguyên liệu bỏ khỏi các nhãn đó.
- `maSanPham` được lưu bền vững vào `MaterialEvaluation` và `FinishedProduct`, truy được cả với record không qua kho.
- Draft `localStorage` được ghi trong mọi trường hợp, kể cả ca chưa có `FinishedProduct`; không bị crash khi hết quota; không bị effect refetch ghi đè khi worker đang nhập.
- Lỗi API phân biệt được với "không có dữ liệu" trên cả ba trang.
- `maKien` thật thay cho nhãn `"Kiện 1/2/3"` và cho `soLoKien` ghép từ 4 ký tự cuối CUID.
- Lưu board nhanh hơn: song song thay vì N request nối tiếp.

**Non-Goals:**

- Không đổi luồng nghiệp vụ: các gate ca → người thực hiện → board giữ nguyên, `advanceStatus` không đụng tới.
- Không thêm virtualization cho list (9 nguyên liệu, 8 mẻ, 8 máy — không cần).
- Không thêm "gần đây / thường dùng": `material_evaluations` đang 0 dòng nên không có dữ liệu tần suất để xếp. Ghi lại thành follow-up sau khi prod tích lũy dữ liệu.
- Không sửa ~610 lỗi type tồn đọng của frontend.
- Không thay `window.confirm` bằng modal custom trong đợt này — ghi nhận là nợ UX, không phải lỗi chức năng.
- Không đụng `SystemOperation` schema để thêm `tenHangHoa`/`maSanPham`: trang vận hành lấy context mẻ qua `useFryBatchCodes`, đủ để hiển thị mã.

## Decisions

### D1. Filter tồn kho: backend trả kèm tồn, frontend mặc định lọc

Backend `getRawMaterials()` trả thêm `tongTonKho` (tổng `soLuong` các `lot_products` đơn vị Kg) cho từng nguyên liệu. Frontend `RawMaterialPicker` mặc định chỉ render mục `tongTonKho > 0`, có chip toggle `[Có hàng] [Tất cả]`, và hiển thị số tồn bên phải mỗi dòng.

Lý do không chặn cứng ở backend: nếu backend chỉ trả 2 mục, worker sẽ **không thể** nhập khi hàng đã về xưởng mà kho chưa kịp làm phiếu nhập — một tình huống vận hành thật ở nhà máy. Toggle giữ được đường thoát mà vẫn đạt mục tiêu chính là loại 7 dead-end khỏi màn hình mặc định.

Đánh đổi đã chấp nhận: query tồn kho làm `getRawMaterials` nặng hơn. Với 9 nguyên liệu và 44 `lot_products` thì không đáng kể; dùng `groupBy` một lần thay vì N+1.

### D2. Thêm cột `maSanPham` vào hai bảng, không join khi đọc

Thêm `maSanPham String?` vào `MaterialEvaluation` và `FinishedProduct`, backend gán khi tạo, migration backfill từ `lotProductId`.

Đã cân nhắc hai phương án khác:
- *Join qua `lotProductId` khi đọc*: không cần migration, nhưng `lotProductId` nullable nên record tạo tay mất mã, và phải thêm join vào mọi query list.
- *Map ở frontend theo `tenSanPham`*: rẻ nhất nhưng khớp theo tên là mong manh — đổi tên sản phẩm là vỡ.

Chọn thêm cột vì `maSanPham` là dữ liệu định danh truy xuất nguồn gốc, thuộc về record chứ không phải thuộc về câu query. Nullable để không phá 0 dòng hiện có và các record tạo tay tương lai. `migrate dev` đã dùng lại được sau commit `897eb85`; backfill chạy trên tập rỗng nên không rủi ro.

### D3. Bỏ tên nguyên liệu khỏi nhãn kiosk, giữ ở picker chọn

Bảng matrix, card chế độ hẹp, header preview, nhãn `FieldFocusEditor`, nút chọn mẻ chiên: **chỉ** `maSanPham`. Cột "Nguyên liệu" đổi tiêu đề thành "Mã hàng hóa" và bỏ `truncate max-w-[150px]` — mã ngắn hơn tên nên vừa đủ chỗ.

`RawMaterialPicker` là ngoại lệ: vẫn hiện mã to đậm + tên nhỏ + số tồn. Đây là màn hình worker *chọn*, cần chắc chắn không chọn sai; các màn hình kia là nơi worker *đã biết mình đang làm gì* và cần đọc nhanh.

Rủi ro đã cân nhắc: mã `NLTDSC-002-MMTSS` không tự giải thích, worker mới sẽ khó nhận ra. Chấp nhận vì người dùng khẳng định trong bối cảnh dự án này mã hàng hóa là định danh worker dùng hàng ngày.

### D4. Nhãn `FieldFocusEditor` bổ sung mã hàng hóa

Hiện `ProductionDataEntry.tsx:1221` render `"Máy 03 · MC-05"` — worker đang ở overlay full-screen nhập số mà không biết đang nhập cho nguyên liệu nào. Đổi thành `"Máy 03 · MC-05 · NLD-001-MDSLB"`. Đây là bổ sung, không xung đột với D3: D3 bỏ *tên*, không bỏ *mã*.

Tương tự `ProductionSystemOperationEntry.tsx:807` ("Chọn máy cho mã chiên MC-05" → thêm mã hàng hóa; biến `selectedBatch` đã có sẵn ở `:654`) và step `form` (`:851-963`) hiện chỉ có breadcrumb chữ xám 14px cho 14 trường thông số — thêm dải context mã mẻ + mã hàng hóa.

### D5. Sửa cờ `baselineLoaded` thay vì bỏ nó

Tách hai trách nhiệm đang bị gộp vào một `useRef`: "baseline đã load xong" và "được phép autosave". Effect ở `:496-499` không reset cờ khi `fpIndex.size === 0` nữa — tập rỗng vẫn là một baseline hợp lệ (baseline rỗng), không phải trạng thái chưa load.

Đồng thời effect load baseline (`:495-556`) thêm guard: không `setBoard` khi board đang dirty. Hiện `invalidateQueries(productionEntryKeys.all)` (`useProductionDataEntry.ts:172`) refetch rộng, và effect có dep `fpIndex` nên refetch xong là ghi đè input worker đang gõ.

### D6. Thu hẹp invalidation và query key

`productionEntryKeys.all` hiện trỏ tới `materialEvaluationKeys.all = ['materialEvaluations']` (`useProductionDataEntry.ts:10`), nên lưu thông số vận hành invalidate cả batches, finishedProducts, systemOps và mọi màn hình MaterialEvaluation khác. Đổi sang invalidate đúng key liên quan.

`useAllFinishedProducts` query key thêm `shift` (`:13-14` hiện chỉ có `productionDate`) và filter theo ca — hiện fetch cả 3 ca (tối đa 192 record) khi chỉ cần 64.

### D7. `maKien` thật cho picker Kiện và `soLoKien`

`ProductionMaterialEvaluationEntry.tsx:428` hiển thị `"Kiện ${idx+1}"` — index trong mảng, đổi thứ tự API là nhãn đổi theo. Giá trị lưu xuống `soLoKien` là `${tenLo}-${kienId.slice(-4)}` (`:689`) — 4 ký tự cuối CUID, worker không bao giờ thấy trước khi lưu nên không đối chiếu được "Kiện 2" với gì cả.

DB đã có `maKien` ở 43/44 dòng (dạng `Lô Nguyên Liệu-s6hp`). Dùng trực tiếp làm nhãn và làm `soLoKien`; fallback về nhãn index chỉ khi `maKien` null.

### D8. Batch save song song

`useProductionDataEntry.ts:147` gọi PUT trong for-loop tuần tự. 8 mẻ × 8 máy = 64 ô dirty thành 64 round-trip nối tiếp. Đổi sang `Promise.allSettled` để giữ được báo cáo partial-failure mà spec yêu cầu (`spec.md`: "SHALL report how many saved, how many failed, which cells failed"), đồng thời thêm progress indicator.

Không gộp thành một batch endpoint mới: `PUT /finished-products/by-batch-machine` đã tồn tại và ổn định, `Promise.allSettled` đạt được mục tiêu mà không mở rộng bề mặt API.

### D9. Sửa `getMachineLabel` nhận sai kiểu tham số

`ProductionDataEntry.tsx:768` truyền `machineSystemId` (CUID) vào `getMachineLabel()`, mà hàm (`:708-711`) bóc số cuối bằng regex `/(\d+)$/` — kết quả là "Máy 7" sai hoặc nguyên CUID trong toast lỗi. Worker không biết ô nào lỗi để sửa. Map `id → maHeThong` qua `fryers` trước khi gọi.

## Risks / Trade-offs

**Migration trên hai bảng nghiệp vụ.** `MaterialEvaluation` và `FinishedProduct` nằm trong `High-Risk Areas`. Giảm thiểu: cột nullable, không đổi cột hiện có, backfill idempotent, DB dev đang 0 dòng. Prod cần backup trước khi migrate — đã có `DEPLOY_PROD_PLAYBOOK.md` với destructive-migration guard.

**Bỏ tên nguyên liệu là quyết định một chiều về UX.** Nếu worker phản hồi khó đọc mã, đổi lại cần sửa nhiều điểm hiển thị. Giảm thiểu: giữ tên trong `RawMaterialPicker` và trong `EvaluationDetailReadOnly`, nên vẫn có nơi tra được mã ↔ tên.

**Toggle "Tất cả" có thể bị worker để bật thường trực**, làm mất tác dụng filter. Chấp nhận: trạng thái toggle không persist qua lần mở picker, mỗi lần mở đều về mặc định "Có hàng".

**Guard "không ghi đè board đang dirty" có thể làm worker thấy dữ liệu cũ** khi worker khác vừa lưu cùng ca. Đánh đổi có ý thức: mất input đang gõ tệ hơn thấy dữ liệu chậm 5 phút. Có thể bù bằng nút refresh thủ công — ghi thành follow-up, không làm trong đợt này.

**Số liệu dev có thể không đại diện prod.** Nếu prod có hàng trăm nguyên liệu thì D1 vẫn đúng hướng nhưng lợi ích lớn hơn nhiều; nếu prod có nhiều nguyên liệu tồn kho > 0 thì lợi ích nhỏ hơn dự kiến. Cần verify trên prod trước khi deploy.

## Migration Plan

1. Prisma: thêm `maSanPham String?` vào `MaterialEvaluation` và `FinishedProduct`, thêm `@@index([maSanPham])`. `npx prisma migrate dev`.
2. Script backfill trong cùng migration: `UPDATE ... SET "maSanPham" = ip."maSanPham" FROM lot_products lp JOIN international_products ip ... WHERE "lotProductId" = lp.id`. Chạy trên tập rỗng ở dev; ở prod chạy sau backup.
3. Backend service gán `maSanPham` khi tạo — cả đường qua kho (`materialEvaluationService.ts:298`) và đường tạo tay (`:178`, `finishedProductService.ts:165`).
4. `getRawMaterials()` trả kèm `tongTonKho`.
5. Frontend: types → hooks → components, theo thứ tự bắt buộc trong `AGENTS.md`.

Không có bước rollback dữ liệu cần thiết: cột nullable, thêm mới, không xóa gì.

## Open Questions

- Prod có bao nhiêu nguyên liệu và bao nhiêu trong đó có tồn kho? Cần verify trước deploy để biết lợi ích thật của D1.
- `maKien` ở prod có được điền đầy đủ như dev (43/44) không? Nếu tỷ lệ null cao thì D7 cần fallback rõ ràng hơn.
