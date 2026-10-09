# Spec Delta — fault-template-tree-binding

## Purpose

Bind fault templates to the machine detail tree so that every template mutation stays consistent with tree mutations, orphan/inactive states are visible, subtree queries work, and cloning preserves templates.

## ADDED Requirements

### Requirement: Fault template list surfaces inactive-detail and orphan states

The system SHALL surface two special states in the fault template list: templates whose linked detail is inactive (`machineSystemDetail.hoatDong = false`) and templates with no linked detail (`machineSystemDetailId IS NULL`).

#### Scenario: Inactive-detail badge
- **WHEN** a fault template's linked detail has `hoatDong = false`
- **THEN** the list row shows a warning badge "Chi tiết đã dừng" next to the detail name
- **THEN** the row remains visible under the default filter (no silent hiding)

#### Scenario: Filter to inactive-detail templates
- **WHEN** the user selects the filter "Chi tiết đã dừng"
- **THEN** the endpoint returns only templates where the joined detail has `hoatDong = false`
- **THEN** the UI highlights the active filter

#### Scenario: Orphan bucket — unlinked templates
- **WHEN** the user selects the filter/tab "Chưa gắn chi tiết"
- **THEN** the endpoint returns templates where `machineSystemDetailId IS NULL`
- **THEN** the UI shows `tenDetailGoiY` / `loaiDetailGoiY` hint columns instead of "—" when those hints exist
- **THEN** both intentionally-common templates and orphaned-after-deletion templates appear here (distinguished by whether hints are present)

#### Scenario: Detail deleted — template becomes orphan via SetNull
- **WHEN** a `MachineSystemDetail` row is deleted (after guards) and FK `onDelete: SetNull` fires
- **THEN** related `FaultTemplate.machineSystemDetailId` becomes `NULL`
- **THEN** those templates appear in the orphan bucket on next list fetch

### Requirement: Fault template queries support subtree scope

The system SHALL support `includeSubtree=true` on `GET /fault-templates` when `machineSystemDetailId` is supplied, returning templates linked to the specified detail plus all its descendants.

#### Scenario: Subtree query returns descendant templates
- **WHEN** client calls `GET /fault-templates?machineSystemDetailId=X&includeSubtree=true`
- **THEN** the server resolves all descendant `MachineSystemDetail.id` values transitively via `parentDetailId` under `X`
- **THEN** the response includes templates where `machineSystemDetailId` equals `X` or any descendant id
- **THEN** pagination counts reflect the expanded set

#### Scenario: Subtree query without flag returns direct only
- **WHEN** client calls `GET /fault-templates?machineSystemDetailId=X` without `includeSubtree`
- **THEN** the server returns only templates where `machineSystemDetailId = X`

#### Scenario: Subtree query for leaf detail
- **WHEN** `X` has no children
- **THEN** `includeSubtree=true` behaves identically to the direct-only query

### Requirement: Transactional validation of detail link

The system SHALL validate the linked detail inside the same `prisma.$transaction` that creates/updates the fault template, closing the race where a detail is deactivated between validation and insert.

#### Scenario: Create template while detail is deactivated concurrently
- **WHEN** a `POST /fault-templates` with `machineSystemDetailId = D` races with a `PATCH /machine-system-details/D/deactivate`
- **THEN** the transaction re-reads `D` inside `tx` and rejects with `ValidationError` "Chi tiết hệ thống máy đã ngừng hoạt động" if `hoatDong` is now false
- **THEN** no template row is created

#### Scenario: Create template with nonexistent detail
- **WHEN** `machineSystemDetailId` does not exist at transaction time
- **THEN** the system rejects with `ValidationError` "Chi tiết hệ thống máy không hợp lệ"

### Requirement: Guard moving a detail across systems when templates exist

The system SHALL prevent moving a `MachineSystemDetail` to a different `MachineSystem` while fault templates still reference it, unless the caller explicitly handles the templates.

#### Scenario: Move detail with templates — rejected
- **WHEN** client calls `PUT /machine-system-details/:id` changing `machineSystemId` to a different system while `FaultTemplate` rows still reference that detail
- **THEN** the service throws `ValidationError` with a Vietnamese message indicating templates must be moved or detached first
- **THEN** no update occurs

#### Scenario: Move detail without templates — allowed
- **WHEN** no `FaultTemplate` references the detail
- **THEN** the move succeeds

#### Scenario: Detail renamed — no guard needed
- **WHEN** only `tenChiTiet`/`maChiTiet`/`loaiChiTiet` change
- **THEN** the update succeeds regardless of template references (display updates via relation)

### Requirement: Detail tree shows per-node template counts and inline creation

When a machine system's detail tree is displayed (e.g., in `MachineSummaryDrawer`), each node SHALL show template counts and offer inline template creation prefilled for that node.

#### Scenario: Node badge shows direct and subtree counts
- **WHEN** the tree is rendered for a system
- **THEN** each node shows `directCount` (templates where `machineSystemDetailId = node.id`) and `subtreeCount` (templates where `machineSystemDetailId IN descendants(node) ∪ {node}`)
- **THEN** the badge format is `direct / subtree` (e.g., `2 / 5`); for leaves both values are equal

#### Scenario: Add template from tree node
- **WHEN** the user clicks "Thêm mẫu lỗi" on a tree node `N`
- **THEN** the template form opens with `machineSystemId` and `machineSystemDetailId = N.id` prefilled and the system/detail selectors locked
- **THEN** on save the new template appears in the tree counts without full page reload

#### Scenario: Expand node to list its templates
- **WHEN** the user expands a tree node
- **THEN** a child panel lists that node's direct templates (name, severity, status) with edit/deactivate actions
- **THEN** the panel is paginated if the node has many templates

### Requirement: Coverage grouping in template tab

The template tab SHALL offer a toggle "Nhóm theo chi tiết" that groups rows by detail and surfaces details with zero templates for the filtered system.

#### Scenario: Grouped view shows zero-template details
- **WHEN** the user enables "Nhóm theo chi tiết" while filtering by `machineSystemId = S`
- **THEN** the UI groups templates under their `tenChiTiet` header
- **THEN** details of system `S` that have 0 templates appear as a group header with "Chưa có mẫu" and a CTA "Thêm mẫu"

#### Scenario: Ungrouped view unchanged
- **WHEN** the toggle is off
- **THEN** the flat paginated table is shown as before

### Requirement: Clone system optionally clones fault templates

Cloning a `MachineSystem` SHALL offer an opt-in to also clone its fault templates (and their repair steps), remapping detail links via the clone's `oldToNew` detail id map inside the same transaction.

#### Scenario: Clone with templates checked
- **WHEN** client calls `POST /machine-systems/:id/clone` with `{ ..., includeFaultTemplates: true }`
- **THEN** inside the same `prisma.$transaction`, for each `FaultTemplate` where `machineSystemId = sourceId` (or `machineSystemDetailId IN sourceDetailIds`), a new `FaultTemplate` is created with `machineSystemId = newSystem.id`, `machineSystemDetailId = oldToNew.get(oldDetailId) ?? null`, regenerated `maMauLoi`, and copied fields
- **THEN** each source `RepairStep` is copied with remapped `faultTemplateId` and preserved `stepNumber`/`moTa`/etc.
- **THEN** `tenDetailGoiY/loaiDetailGoiY` templates (detail-less) are also cloned with `machineSystemId = newSystem.id`

#### Scenario: Clone without templates (default)
- **WHEN** `includeFaultTemplates` is falsy or absent
- **THEN** behavior is unchanged — new system has 0 templates

#### Scenario: Clone collision on maMauLoi
- **WHEN** a generated `maMauLoi` collides
- **THEN** the transaction aborts with `ConflictError` and no partial clone remains

### Requirement: Deactivate detail suggests bulk-deactivating related templates

When deactivating a `MachineSystemDetail` (especially a non-leaf), the UI SHALL offer to also deactivate fault templates linked to that detail and its descendants.

#### Scenario: Deactivate non-leaf detail — suggestion dialog
- **WHEN** the user deactivates a detail `D` that has `N > 0` templates in its subtree
- **THEN** a confirmation dialog shows "Có X mẫu lỗi liên quan — dừng luôn?"
- **THEN** if confirmed, the backend executes `updateMany` where `machineSystemDetailId IN subtreeIds(D)` setting `hoatDong = false, trangThai = 'Ngừng hoạt động'` in the same or a follow-up transaction
- **THEN** if declined, only the detail is deactivated

#### Scenario: Deactivate leaf detail with no templates — no suggestion
- **WHEN** `D` is a leaf with 0 templates
- **THEN** no extra dialog is shown
