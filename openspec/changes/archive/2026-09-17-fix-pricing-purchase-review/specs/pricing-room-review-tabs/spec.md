## ADDED Requirements

### Requirement: Server-derived approver identity for purchase requests

When a purchase request transitions to `Đã duyệt` or `Từ chối` via `PUT /purchase-requests/:id`, the system SHALL ignore any `nguoiDuyet` or `ngayDuyet` supplied by the client and SHALL derive both server-side from the authenticated actor (`__actorUserId` / `req.user.id`) by looking up `prisma.user` and formatting `nguoiDuyet` as `${lastName} ${firstName}`.trim() falling back to `email`, and `ngayDuyet` as the server's current time. The behavior SHALL mirror `cancelPurchaseRequest` for `nguoiHuy`/`ngayHuy`. The column remains `String?` (no migration).

#### Scenario: Admin approves via pricing review
- **WHEN** an `ADMIN` user in the Pricing Room clicks Approve on a `Chờ duyệt` purchase request via `PUT /purchase-requests/:id {trangThai: "Đã duyệt"}`
- **THEN** the persisted `nguoiDuyet` equals the admin's display name from `User` (not "Phòng giá thành") and `ngayDuyet` is the server time

#### Scenario: Client-supplied approver name is ignored
- **WHEN** a client sends `PUT /purchase-requests/:id {trangThai: "Đã duyệt", nguoiDuyet: "Phòng giá thành", ngayDuyet: "2026-09-17T00:00:00.000Z"}`
- **THEN** the server overwrites `nguoiDuyet` with the actor's display name and `ngayDuyet` with `new Date()` and persists those

#### Scenario: Rejection also server-derived
- **WHEN** a pricing approver rejects with `PUT /purchase-requests/:id {trangThai: "Từ chối"}`
- **THEN** `nguoiDuyet` is set to the actor's display name and `ngayDuyet` to server time; `ghiChuMuaHang` is preserved from the request

#### Scenario: Frontend sends minimal payload
- **WHEN** `PurchaseRequestReviewTab` calls approve/reject
- **THEN** it sends only `{trangThai: "Đã duyệt"}` or `{trangThai: "Từ chối", ghiChuMuaHang?: string}` without `nguoiDuyet`/`ngayDuyet`

### Requirement: Detail modal labels for purchase requests

The purchase-request detail modal SHALL use the label "Danh sách hàng hóa (n)" for the items section title and "Tên hàng hóa" for the item name column header, consistent with `CreatePurchaseRequestModal` and `SupplyRequestManagement`.

#### Scenario: Modal shows standardized labels
- **WHEN** a user opens the detail modal for any purchase request
- **THEN** the items section heading reads "Danh sách hàng hóa (n)" and the table header reads "Tên hàng hóa" (not "Sản phẩm"/"Tên hàng")

### Requirement: Detail modal single-scroll layout

The purchase-request detail modal SHALL have a single vertical scroll container: the outer `overflow-y-auto flex-1` inside the `modal-viewport-h` flex column. The inner items table wrapper SHALL NOT impose its own vertical scroll (`max-h-64`, `overflow-hidden` + `overflow-auto`); it SHALL use `overflow-x-auto` only (horizontal scroll if needed). The table header `thead` with `sticky top-0` SHALL adhere to the outer scroll.

#### Scenario: Long item list is fully viewable
- **WHEN** a purchase request has 30 items and the user scrolls the detail modal
- **THEN** all items are reachable by scrolling the single outer container; there is no trapped inner `max-h-64` scroll and the header remains sticky via the outer scroll

### Requirement: Action column iconography for purchase review table

The purchase-review table's "Hành động" column SHALL render icon-only actions using `lucide-react`: `Eye` (detail, blue), `Check` (approve, green), `XCircle` (reject, red), each as `p-1.5 rounded-md` with `title` and `aria-label`, `disabled:opacity-50` when not permitted. The column SHALL NOT render `text-xs text-gray-400 px-2` branches (`—` or `{st}`); status is shown only in the "Trạng thái" badge column. Rules: when `!isPending` show only `Eye`; when `isPending && !canApprove` show `Eye` plus disabled muted `Check`/`XCircle` with tooltip "Bạn không có quyền duyệt".

#### Scenario: Pending row with permission shows icons
- **WHEN** a row is `Chờ duyệt` and the user has approve permission
- **THEN** the action cell shows `Eye`, `Check`, and `XCircle` icons (no text buttons, no status text)

#### Scenario: Pending row without permission shows disabled icons
- **WHEN** a row is `Chờ duyệt` and the user lacks approve permission
- **THEN** the action cell shows `Eye` plus disabled `Check`/`XCircle` with tooltip "Bạn không có quyền duyệt" and no `—`

#### Scenario: Non-pending row shows only detail icon
- **WHEN** a row is `Đã duyệt`, `Từ chối`, or `Hoàn thành`
- **THEN** the action cell shows only `Eye`; no status text is rendered there

#### Scenario: Icons are accessible
- **WHEN** a user hovers or uses a screen reader on an action icon
- **THEN** each icon has a `title` and `aria-label` describing the action
