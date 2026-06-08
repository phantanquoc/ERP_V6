## 1. Prisma Schema and Migration

- [x] 1.1 Add `MachineSystemDetail` and supported detail type enum or constrained values in `backend/prisma/schema.prisma` with `@@schema("business")`, CUID IDs, relation to `MachineSystem`, optional self-parent relation, ordering, active/status fields, and indexes.
- [x] 1.2 Add fault template schema for reusable Co Dien fault templates linked to machine system details, and extend `FaultRecord` with nullable relations to `MachineSystem`, `MachineSystemDetail`, and fault template while preserving `maHeThong`.
- [x] 1.3 Extend `RepairRequestItem` with nullable machine system/detail relations while preserving existing text fields, and add relational handover child rows linked to `AcceptanceHandover` and `RepairRequestItem`.
- [x] 1.4 Add `ProjectPhase` and nullable `projectPhaseId` on `ProjectTask`, including owner/person in charge, progress, status, order, start/end dates, cascade behavior, and indexes.
- [x] 1.5 Create and apply a Prisma migration for all schema changes, then run Prisma generate. ← (verify: migration uses relational child tables, every new model has `@@schema(...)`, new IDs use CUID, existing repair text fields remain available)

## 2. Backend Technical APIs

- [x] 2.1 Implement machine system detail service methods for create/list/detail/update/deactivate/delete with same-system hierarchy validation and referenced-record delete protection.
- [x] 2.2 Implement machine system detail controller and route, register the route in `backend/src/routes/index.ts` `ROUTE_MAP`, and enforce technical QLHTM access.
- [x] 2.3 Implement fault template service/controller/route behavior for Co Dien, including active template filtering, machine detail validation, and referenced-template deactivation behavior.
- [x] 2.4 Extend fault record service/controller/route behavior so real fault records can be created from templates or directly with machine system/detail context and compatibility `maHeThong`.
- [x] 2.5 Extend repair request services so item create/update reads optional machine links, stores text snapshots, preserves legacy text-only items, and returns linked plus snapshot context.
- [x] 2.6 Extend acceptance handover services/controllers so handovers keep the repair request relation and manage child handover item rows in one transaction with same-request validation.
- [x] 2.7 Implement project phase service/controller/route behavior for add/edit/delete/reorder phases, task phase assignment, unphased task display support, and progress/status validation.
- [x] 2.8 Implement technical landing summary backend endpoint for QLHTM, Co Dien, repair/handover context, and Projects status counts.
- [x] 2.9 Add focused backend tests for machine details, fault templates/records, repair item links, handover item validation, project phase reorder, permission checks, and route registration. ← (verify: controller flow stays route -> controller -> service -> Prisma, writes use transactions where parent/child rows change, no generic `PATCH /status` endpoint is introduced)

## 3. Frontend Services and Hooks

- [x] 3.1 Add frontend service types and API methods for machine system details with list filters, sort, pagination, create/update/deactivate/delete, and detail reads.
- [x] 3.2 Add frontend service types and API methods for fault templates and real fault records, including template-based record creation and machine detail filters.
- [x] 3.3 Update repair request and acceptance handover frontend types/services for optional machine links, text snapshots, and handover item rows.
- [x] 3.4 Add frontend service types and API methods for project phases, phase reorder, phase child tasks, unphased tasks, progress, status, and date fields.
- [x] 3.5 Add TanStack Query hooks and structured query key factories for machine details, fault templates/records, repair context, handover context, project phases/tasks, and technical landing summaries. ← (verify: components consume hooks rather than calling `apiClient` directly, mutations invalidate structured list/detail keys)

## 4. Frontend Technical Screens

- [x] 4.1 Replace `frontend/src/pages/TechnicalManagement.tsx` under-development notice with compact operational entry points and status summaries for QLHTM, Co Dien, and Projects.
- [x] 4.2 Add or update QLHTM machine system/detail screens with dense tables, machine/detail filters, type filters, sort, pagination, hierarchy context, and compact add/edit/deactivate/delete flows.
- [x] 4.3 Add or update Co Dien fault template and real fault record screens with separate table views, machine detail context, status/severity filters, template selection, and compact forms.
- [x] 4.4 Update repair request item UI so users can select machine system/detail records or enter legacy text-only context, with linked and snapshot context shown in details.
- [x] 4.5 Update acceptance handover UI so multi-item repair requests show accurate item-level handover context and reject cross-request handover items.
- [x] 4.6 Add or update Projects technical screens for phase add/edit/delete/reorder, child tasks, owner/person in charge, progress, status, order, and dates.
- [x] 4.7 Add Projects to the technical sidebar and `frontend/src/utils/permissions.ts` technical sub-department model, including ADMIN bypass and route visibility behavior.
- [x] 4.8 Review technical screens against `openspec/ui-dna.md` for compact ERP tables, nearby filter/sort/pagination controls, Vietnamese user-facing copy, moderate radius, and no decorative noise. ← (verify: Technical landing no longer renders only a development notice, Projects is visible only to permitted users, text does not overlap at desktop or mobile widths)

## 5. Required Verification

- [x] 5.1 Run `cd backend && npx tsc --noEmit` and fix all TypeScript errors before continuing.
- [x] 5.2 Run `cd backend && npm run lint` and fix all lint errors.
- [x] 5.3 Run `cd backend && npm test` and fix failing tests without skipping failures.
- [x] 5.4 Run `cd frontend && npx tsc --noEmit` and fix all TypeScript errors before continuing.
- [x] 5.5 Run `cd frontend && npm run lint` and fix all lint errors. ← (verify: every required project check passes after implementation)
