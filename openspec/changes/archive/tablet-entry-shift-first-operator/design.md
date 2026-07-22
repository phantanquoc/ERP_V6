## Context

Tablet kiosk data-entry pages (`/production/nhap-lieu`, `/production/nhap-lieu-danh-gia`) currently gate on operator-first, then shift. The operator list is the full set of employees with position "Nhân viên sản xuất", pulled via `employeeService.getEmployeesForAssignment`. Kiosk tabs authenticate with a device key (`deviceOrJwtAuth('DATA_ENTRY')`), not JWT.

The system already derives which shift a check-in belongs to: `workShiftService.determineShift(checkInTime): Promise<string | null>` matches a check-in time against each `WorkShift`'s `checkInWindowStart/End` and returns the shift NAME (e.g. "Ca 1"). The `Attendance` model (common schema) stores `employeeId`, `attendanceDate`, `checkInTime` — but has NO shift column; shift is always derived from `checkInTime`.

This change reverses the gate order and makes the operator list reflect who actually attended the selected shift today, filtered to positions an admin has mapped to that page.

## Goals / Non-Goals

**Goals:**
- Reverse tablet gate to shift-first, operator-second.
- Show only employees who checked in today into the selected shift AND hold a position mapped to the page.
- Provide a "Tìm người khác" fallback to the full production-employee list so nobody is blocked when attendance is missing.
- Add a tablet hub screen that routes to each entry type.
- Let admins configure page→position mappings on desktop, persisted in DB.

**Non-Goals:**
- No new Position records (admin creates them via existing UI).
- No changes to the `Attendance` schema (no shift column added).
- No changes to face-attendance capture (`faceAttendanceService`, liveness).
- No third data-entry page (hub reserves a slot only).

## Decisions

### Decision 1: Derive shift from check-in via existing `determineShift`, match by name "Ca N"
Reuse `workShiftService.determineShift(checkInTime)` which returns the shift name. The kiosk uses numeric shift (1/2/3); map "Ca N" ↔ N by parsing the trailing integer of the shift name. Shifts whose name does not match the `Ca <n>` pattern (e.g. "Hành chính", "Văn phòng") are ignored for kiosk filtering.

- **Why**: The window-matching logic already exists and is battle-tested for attendance. Duplicating it or adding a shift column to `Attendance` would create drift and violate the "don't touch Attendance" constraint.
- **Alternative considered**: Add a `shift` column to `Attendance` populated at check-in. Rejected — schema change to a high-traffic table, backfill risk, and the derivation already exists.

### Decision 2: New model `DataEntryPagePosition` (common schema) mapping pageKey → positionId
A row links a `pageKey` (string enum-like: `PRODUCTION_OUTPUT`, `MATERIAL_EVALUATION`, reserved third) to a `positionId` (FK to `Position`). Many positions per page → many rows per pageKey. CUID id, `@@schema("common")`, unique constraint on `(pageKey, positionId)`.

- **Why**: Decouples "which positions belong to which page" from code, so adding a new position (NV ngâm, NV sấy…) is pure admin config, no deploy. Matches the project's config-in-DB pattern.
- **Alternative considered**: Hardcode page→position map in a constants file. Rejected — the user explicitly wants admin-configurable mapping.

### Decision 3: New kiosk endpoint (device-key) for attended operators; separate admin endpoint (JWT) for config CRUD
- Kiosk: `GET` attended operators by `date + shift + pageKey`, guarded by `deviceOrJwtAuth('DATA_ENTRY')`. Returns `{ id, name, employeeCode, positionName }[]`.
- Admin: CRUD on `DataEntryPagePosition`, guarded by `authenticate` + `authorize('ADMIN')`, registered in ROUTE_MAP.

- **Why**: Kiosk cannot use JWT; existing attendance routes are all JWT-only, so a new device-key route is required. Config CRUD is an admin desktop action → JWT. Separating them keeps auth boundaries clean.
- **Note (kiosk-401 context)**: The new kiosk route uses `deviceOrJwtAuth`, so a genuine 401 there is a real device-key failure and correctly triggers the kiosk-expired signal — unlike the previously-fixed `/auth/me` false positive.

### Decision 4: Fallback preserves the old flow
"Tìm người khác" reuses the existing `useProductionEmployees` / `getEmployeesForAssignment(positionName='Nhân viên sản xuất')` path. When an attended-list result is empty or the worker is missing, they tap the button to open the full list.

- **Why**: Zero-risk safety valve; the old code path already works and is well understood.

### Decision 5: Gate order and screen sequence
Per page: hub → shift selector (`ShiftSelectionScreen`) → operator selector (`OperatorSelectionScreen`, now attendance-filtered). `ShiftSelectionScreen` drops the "Người thực hiện: {operatorName}" header line since no operator is chosen yet. Selection state (`selectedShift` before `nguoiThucHien`) and its sessionStorage persistence order flip accordingly.

## Risks / Trade-offs

- **Shift name convention drift** (a WorkShift named "Ca1" or "Ca sáng" won't map to a number) → Mitigation: parse trailing integer defensively; document the "Ca <n>" naming requirement; unmatched shifts simply yield an empty attended list, and the fallback button covers it.
- **Timezone in "today"** → Mitigation: reuse the same local-day boundary approach already used for fry-batch filtering (local Y/M/D), pass explicit date range to the query.
- **Empty attended list frustrates workers** (nobody attended / all face errors) → Mitigation: prominent "Tìm người khác" fallback + Vietnamese empty-state copy.
- **Config missing for a page** (admin hasn't mapped any position) → Mitigation: define explicit behavior — when no positions mapped, attended query returns empty and UI nudges to fallback; do NOT silently show everyone.

## Migration Plan

1. Prisma migrate dev to add `DataEntryPagePosition` (additive, no data change to existing tables).
2. Deploy backend (new endpoints, ROUTE_MAP), then frontend (hub, reversed gates, config page).
3. Admin seeds page→position mappings via the new desktop config page.
4. Rollback: the migration is additive; reverting frontend restores the old gate order. The new table can be dropped without affecting existing data.

## Open Questions

- Behavior when a page has zero mapped positions: resolved above (empty attended list + fallback nudge), no further input needed.
