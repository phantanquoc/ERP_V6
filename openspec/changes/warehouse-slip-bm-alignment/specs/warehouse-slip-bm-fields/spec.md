## ADDED Requirements

### Requirement: Header requester and department fields

Both `WarehouseReceipt` and `WarehouseIssue` headers SHALL store `nguoiDeNghi` (requester display name, String?), `maNguoiDeNghi` (requester employee id, String?), `boPhan` (department display combining department + subDepartment, String?), and `boPhanId` (optional reference id, String?). `WarehouseIssue` additionally SHALL store `lyDoXuatKho` (reason for issue, preset+free text, String?). All are nullable and additive. When `supplyRequestId` is present and `nguoiDeNghi`/`boPhan` are blank, the backend SHALL auto-fill them from `SupplyRequest.tenNhanVien`/`boPhan` inside the same transaction that creates the slip.

#### Scenario: Create slip with requester and department
- **WHEN** an authorized user creates a receipt or issue with `nguoiDeNghi`, `maNguoiDeNghi`, `boPhan`, and (for issue) `lyDoXuatKho`
- **THEN** the system persists all header fields and returns them on getAll/getById

#### Scenario: Auto-fill from supply request
- **WHEN** a slip is created linked to a `SupplyRequest` and `nguoiDeNghi`/`boPhan` are omitted
- **THEN** the system fills `nguoiDeNghi` from `SupplyRequest.tenNhanVien` and `boPhan` from `SupplyRequest.boPhan`

#### Scenario: Requester combobox uses active non-admin employees
- **WHEN** the create/edit modal renders the requester field
- **THEN** it uses `EmployeeCombobox` fed by `useEmployeesForAssignment` (active employees, excluding ADMIN) with search by name/code/department, and selecting a person auto-fills `boPhan` as `department + subDepartment`

### Requirement: Per-line KH/TT fields and condition/packaging

Each line (`WarehouseReceiptItem`, `WarehouseIssueItem`) SHALL store `soLoKeHoach` (String?, planned lot name), `soLoThucTe` (String?, actual lot name), `soKienKeHoach` (String? JSON array of maKien codes, planned set), `soKienThucTe` (String? JSON array of maKien codes, actual set), `tinhTrang` (String?, condition), `quyCach` (String?, packaging spec). `soLoThucTe` SHALL be derived from the actual kien set when present (joined distinct `tenLo` of those kien) and MUST NOT be entered separately when `soKienThucTe` is supplied. Stock mutations SHALL always use the actual values; plan values are audit-only and MUST NOT affect `LotProduct.soLuong`.

#### Scenario: Create line with KH/TT split
- **WHEN** a receipt line is created with `soLoKeHoach="Lo A"`, `soLoThucTe="Lo B"`, `soKienKeHoach='["K1.1","K1.2"]'`, `soKienThucTe='["K1.3"]'`, `tinhTrang="Bình thường"`, `quyCach="25kg/bao"`
- **THEN** all fields are persisted and returned; stock is mutated only for the actual kien set

#### Scenario: Actual lot derived from kien
- **WHEN** a line has `soKienThucTe` containing kien belonging to lots "Lo B" and "Lo C"
- **THEN** `soLoThucTe` is stored as the joined distinct lot names (e.g. "Lo B, Lo C") derived from those kien, not from manual input

### Requirement: Grouped product row semantics

One logical product row on the Excel/print (same `tenSanPham`+`donViTinh`+`warehouseId`) MAY group many physical kien. The DB SHALL remain one row per kien (`Warehouse*Item` per `lotProductId`); the API SHALL accept either a grouped payload (one entry with `soKienThucTe` array) and expand it server-side into per-kien items before the sequential-snapshot path, or already-expanded per-kien items. The Excel/print SHALL collapse per-kien rows sharing the same product into one Excel row with comma-joined maKien and summed quantities.

#### Scenario: Grouped payload expands to per-kien rows
- **WHEN** the create endpoint receives one grouped entry with `tenSanPham="Mít sấy"`, `soKienThucTe='["K1.1","K1.2"]'`, and per-kien quantities `[30, 20]`
- **THEN** the system creates two `Warehouse*Item` rows (one per kien) with correct `lotProductId`/`maKien`/`soLuongThucTe` and sequential snapshots

#### Scenario: Export groups per-kien rows
- **WHEN** a slip with 3 kien for the same product is exported to xlsx or printed
- **THEN** the Excel/print shows one product row with `So kien TT = "K1.1, K1.2, K1.3"` and `So luong TT = summed actual`

### Requirement: Printed flag and lock-after-print

Both headers SHALL store `daIn` (Boolean, default false) and `inLanDauAt` (DateTime?). On first successful print or xlsx export, the backend SHALL set `daIn=true` and `inLanDauAt=now()` if not already set. Subsequent edits to a printed slip SHALL be allowed but the UI SHALL show a "Đã in" badge; an optional strict mode (configurable) may require ADMIN to edit a printed slip.

#### Scenario: First print marks as printed
- **WHEN** a slip with `daIn=false` is printed or exported via the xlsx endpoint
- **THEN** the system sets `daIn=true` and `inLanDauAt` to the current time atomically

#### Scenario: Printed badge
- **WHEN** the slip list or detail renders a slip with `daIn=true`
- **THEN** it shows a "Đã in" indicator
