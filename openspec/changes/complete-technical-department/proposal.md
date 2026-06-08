## Why

The technical department module is incomplete: the landing page still shows an under-development notice, Projects is not exposed through sidebar permissions, machine systems do not support flexible detail records, faults are not tied to machine detail context, repair requests keep only text-based equipment context, handovers are not accurate for multi-item requests, and projects only have flat tasks. Completing these foundations is needed so QLHTM, Co Dien, repair handover, and project tracking can operate as real ERP workflows instead of placeholders or text-only records.

## What Changes

- Add flexible machine system details managed by QLHTM with the detail types `Thiet bi`, `Cum`, `Linh kien`, and `Diem kiem tra`.
- Add Co Dien fault template management by machine system detail and real fault records connected to those templates and details.
- Extend repair request items so each item can link to machine system and machine detail records while preserving existing `tenHeThong` and `tinhTrangThietBi` text fields for backward compatibility.
- Keep acceptance handovers connected to repair requests and add enough item-level context for accurate handover summaries on multi-item repair requests.
- Add flexible project phases with child tasks, owner/person in charge, progress, status, order, and dates, including add/edit/delete/reorder behavior.
- Replace the Technical landing page under-development state with useful entry points and status summaries for QLHTM, Co Dien, and Projects.
- Add Projects to the technical sidebar and technical sub-department permission model.
- Align technical UI screens with `openspec/ui-dna.md`: dense ERP tables, compact controls, clear filter/sort/pagination near tables, Vietnamese user-facing copy, moderate radius, and no decorative noise.

## Capabilities

### New Capabilities
- `technical-machine-details`: Machine system detail hierarchy, detail types, and QLHTM management behavior.
- `technical-fault-management`: Fault templates by machine detail and real fault records for Co Dien workflows.
- `technical-repair-item-context`: Repair request item links to system/detail records and accurate handover context for multi-item requests.
- `technical-project-phases`: Flexible project phase and child task planning, ownership, progress, status, dates, and reorder behavior.
- `technical-navigation-dashboard`: Technical landing page, sidebar entry points, and Projects permission visibility.

### Modified Capabilities

None.

## Impact

- Database: Prisma schema and migration for `MachineSystemDetail`, fault template/detail relations, repair request item relations, handover item context, and project phases.
- Backend: technical services, controllers, routes, `ROUTE_MAP`, typed errors, API response shape, and status/business rules for the new workflows.
- Frontend: service types, TanStack Query hooks, Technical landing page, QLHTM machine detail screens, Co Dien fault screens, repair request/handover item context UI, project phase/task UI, sidebar, and permissions utilities.
- Verification: backend type check, lint, and tests; frontend type check and lint.
