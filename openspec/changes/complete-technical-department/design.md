## Context

The technical department currently has partial surfaces across frontend and backend, but the workflows are not complete. `frontend/src/pages/TechnicalManagement.tsx` only renders an under-development notice. `frontend/src/components/Sidebar.tsx` exposes QLHTM and Co Dien technical subitems but not Projects, and `frontend/src/utils/permissions.ts` does not include a Projects technical sub-department. In Prisma, `MachineSystem` exists without a detail model, `FaultRecord` only has the soft reference `maHeThong`, `RepairRequestItem` stores equipment context as text, `AcceptanceHandover` is tied to the parent repair request only, and `Project` has flat `ProjectTask` records without flexible phases.

Project constraints require implementation in this order: Prisma schema and migration first, then backend service, controller, route, and `ROUTE_MAP`, then frontend service types, hooks, and components. Multi-schema Prisma rules still apply: every model must include `@@schema(...)`, IDs for new models use CUID, child data must be relational rows rather than JSON arrays, and status transitions must remain server-side business methods where status changes are needed. UI work must follow `openspec/ui-dna.md`.

## Goals / Non-Goals

**Goals:**

- Make QLHTM manage `MachineSystem` records and flexible `MachineSystemDetail` records with the types `Thiet bi`, `Cum`, `Linh kien`, and `Diem kiem tra`.
- Make Co Dien manage reusable fault templates by machine detail and real fault records connected to machine systems, details, and optional templates.
- Link repair request items to machine system/detail records while preserving the existing text fields for backward compatibility and historical readability.
- Preserve acceptance handovers as repair-request-level records while adding item-level handover context for multi-item repair requests.
- Add flexible project phases with child tasks, owners/persons in charge, progress, status, ordering, and dates.
- Replace the technical landing placeholder with useful status and entry points, and expose Projects through sidebar and permissions.

**Non-Goals:**

- Do not replace the existing repair request workflow or remove deprecated parent text fields during this change.
- Do not introduce generic `PATCH /status` endpoints.
- Do not add a new LLM provider or AI integration.
- Do not redesign the whole ERP shell or unrelated department modules.
- Do not use JSON columns for repair items, handover items, project phases, or project tasks.

## Decisions

### Machine system details are relational child records

Add `MachineSystemDetail` in the `business` schema with CUID IDs, a required relation to `MachineSystem`, an optional self-parent relation, and an enum or constrained value for `Thiet bi`, `Cum`, `Linh kien`, and `Diem kiem tra`. The detail stores code/name/status/order and optional operational fields such as location, description, assignee, attachment, and active flag. Use indexes on `machineSystemId`, `parentDetailId`, type, and active/status fields.

Alternative considered: extending `MachineSystem` with more columns for equipment/component/checkpoint fields. This would repeat sparse fields, prevent flexible depth, and fail the child-table rule.

### Fault templates and fault records are separate concepts

Add a reusable fault template model linked to `MachineSystemDetail` for Co Dien reference data. Extend `FaultRecord` to relate to `MachineSystem`, optional `MachineSystemDetail`, and optional fault template while preserving `maHeThong` as a compatibility field. Real fault records remain operational events with discovery, severity, status, description, files, and handling context.

Alternative considered: using `FaultRecord` as both template and event. This would mix reference data with actual incidents and make reporting on recurring faults unreliable.

### Repair request item links are additive and backward compatible

Add nullable `machineSystemId` and `machineSystemDetailId` relations to `RepairRequestItem` and keep `tenHeThong` and `tinhTrangThietBi` as required text snapshots. When a linked record is selected, the backend stores both the relational IDs and readable text snapshots so old records, exported reports, and UI displays remain stable if machine names change later.

Alternative considered: replacing text fields with required foreign keys. That would break existing records and block free-text legacy or emergency repair entries.

### Handover item context is modeled as child rows

Keep `AcceptanceHandover` connected to `RepairRequest`, then add child handover item rows that link to the relevant `RepairRequestItem` and optionally snapshot system/detail names plus before/after condition. This preserves the existing parent handover contract while making multi-item handovers accurate.

Alternative considered: creating one acceptance handover per repair item. That would fragment the existing repair-request handover relationship and complicate approval, attachments, and notifications.

### Project phases own phase-level task grouping

Add `ProjectPhase` as a child of `Project` with owner/person in charge, progress, status, order, start/end dates, and description. Add `projectPhaseId` to `ProjectTask` so tasks can belong to a phase. Existing tasks can remain unphased during migration or be assigned to a default phase if product behavior requires a grouped display.

Alternative considered: encoding phases as special tasks. That would make reordering, status aggregation, and task hierarchy ambiguous.

### Backend APIs follow existing layered boundaries

Implement each workflow through service methods, controller handlers, route files, and `ROUTE_MAP` registration. Controllers handle HTTP only; services own validation, transactions, status/progress calculation, child-row updates, and typed errors. Parent and child writes use `prisma.$transaction`.

Alternative considered: component-driven direct API calls or controller-level Prisma access. Both conflict with project conventions and create inconsistent business rules.

### Technical UI follows dense ERP patterns

Screens use compact table-first layouts with nearby filter/sort/pagination controls, modal or inline forms for add/edit flows, Vietnamese user-facing copy, moderate radius, and no decorative filler. The Technical landing page should summarize counts/status and provide direct entry points to QLHTM, Co Dien, and Projects rather than a marketing or under-development view.

Alternative considered: a large landing hero or decorative cards. This conflicts with the ERP UI DNA and slows repeated operational workflows.

## Risks / Trade-offs

- Schema migration touches shared technical data -> Mitigation: add nullable relations first, keep legacy text fields, generate Prisma client, and write migration tests or targeted backend tests around create/update/read flows.
- Linked machine names can drift from old repair text -> Mitigation: store text snapshots on repair and handover item rows while using relations for current lookup/navigation.
- Multi-item handover can become inconsistent with repair request items -> Mitigation: validate every handover child row belongs to the same `repairRequestId` inside one transaction.
- Phase reordering can create duplicate order values -> Mitigation: expose reorder as a dedicated service method that updates all affected rows in a transaction and normalizes order values.
- Project task migration may leave existing tasks without phases -> Mitigation: support nullable `projectPhaseId` during migration and document whether the UI displays unphased tasks or creates a default phase.
- Permission changes can expose an empty route -> Mitigation: implement Projects route visibility only with the landing entry and Projects module pages, and verify sidebar, permissions, and routes together.
- UI tables may become crowded -> Mitigation: use compact filters, optional horizontal scroll, meaningful headers, and omit columns that are empty across the current dataset.

## Migration Plan

1. Add Prisma enums/models/relations and migration in `backend/prisma/schema.prisma`, keeping compatibility columns and nullable new foreign keys where existing data requires it.
2. Generate Prisma client and update backend types.
3. Implement backend service/controller/route/`ROUTE_MAP` layers in the required order with transactions for parent-child writes.
4. Add focused backend tests for machine details, fault templates/records, repair item links, handover item context, project phases/tasks, and technical route registration.
5. Implement frontend service types, hooks, and components in the required order.
6. Replace the Technical landing placeholder and add Projects sidebar/permission visibility.
7. Run required checks: `cd backend && npx tsc --noEmit`, `cd backend && npm run lint`, `cd backend && npm test`, `cd frontend && npx tsc --noEmit`, and `cd frontend && npm run lint`.

Rollback is a normal migration rollback before production release. After production data exists, rollback must preserve legacy text fields and avoid deleting repair/handover history; prefer a forward fix migration over destructive rollback.

## Open Questions

- Should existing unphased `ProjectTask` rows remain in an "Unphased" UI section, or should migration create a default phase per project?
- Should fault template codes be globally unique, or unique only within a machine detail?
- Should a machine detail be allowed to move between machine systems after repair/fault records reference it, or should moves be blocked once referenced?
