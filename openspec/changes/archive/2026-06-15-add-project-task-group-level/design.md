## Context

The ERP project management module (`ProjectList.tsx` + `projectService.ts`) currently implements a 2-level hierarchy: `ProjectPhase` → `ProjectTask`. Tasks link to phases via an optional `projectPhaseId` FK. The frontend renders each phase as a sortable card with an embedded `TaskTable`.

For projects with many tasks per phase, users need an intermediate grouping level to organize tasks into logical categories (e.g., "Thiết kế", "Mua sắm", "Lắp đặt") without the overhead of a full phase.

Key constraints:
- Multi-schema Prisma (model must use `@@schema("business")`)
- IDs use CUID (`@id @default(cuid())`)
- Child tables pattern (not JSON columns)
- Update items by delete-then-recreate pattern for reordering
- Route → Controller → Service → Prisma flow
- Frontend data fetching via TanStack Query hooks

## Goals / Non-Goals

**Goals:**
- Add `ProjectTaskGroup` model as an intermediate level: Phase → TaskGroup → Task
- Full CRUD operations for task groups (create, update, delete, reorder)
- Task assignment to groups is optional (nullable FK)
- UI renders groups as lightweight header rows within TaskTable
- Both "Kế hoạch" (plan) and "Thực tế" (actual/updates) tabs display groups
- Task form includes dependent group selector (filtered by selected phase)

**Non-Goals:**
- No separate permissions for task groups (inherit from project access)
- No independent progress tracking on groups (progress calculated from child tasks)
- No group-level dates or status (keep it lightweight — just name + description + order)
- No changes to ProjectGantt (keep flat task rendering for now)
- No migration of existing tasks into groups (optional assignment only)

## Decisions

### 1. TaskGroup belongs to Phase (required), Task belongs to Group (optional)

`ProjectTaskGroup.projectPhaseId` is required (every group belongs to exactly one phase).
`ProjectTask.projectTaskGroupId` is nullable (task can be ungrouped within a phase).

**Rationale**: Matches the existing pattern where `projectPhaseId` on tasks is nullable. Users can adopt groups gradually without breaking existing data.

**Alternative considered**: Making group required when phase has groups — rejected because it forces migration of existing tasks and adds complexity.

### 2. Lightweight model (name + order + optional description)

Fields: `tenMuc`, `thuTu`, `moTa?` only. No dates, status, or assignees.

**Rationale**: Groups are organizational containers, not tracked work items. Phase already has dates/status. Adding tracking to groups would create redundant data entry and unclear rollup semantics.

### 3. Header row UI (not nested cards or accordions)

Groups render as a gray background header row within the existing TaskTable, with group name and action buttons inline.

**Rationale**: Minimizes UI changes, doesn't break existing DnD flow, maintains compact layout. Nested cards would significantly increase vertical space usage.

### 4. Route structure: phase-scoped create, flat update/delete

- Create: `POST /:id/phases/:phaseId/task-groups` (scoped to phase)
- Update: `PUT /:id/task-groups/:groupId` (flat — group ID is unique)
- Delete: `DELETE /:id/task-groups/:groupId` (flat)
- Reorder: `POST /:id/task-groups/reorder` (accepts array of {id, thuTu})

**Rationale**: Create needs phase context. Update/delete don't need phase in URL since group ID is globally unique. Matches existing pattern for tasks.

### 5. Cascade delete behavior

When a group is deleted, tasks in that group become ungrouped (`projectTaskGroupId` → null), NOT deleted.

**Rationale**: Deleting organizational structure shouldn't destroy work items. Same pattern as phase deletion (tasks become "unphased").

### 6. Include nesting strategy

`projectInclude` updated to: `phases.include.taskGroups.include.tasks` for grouped tasks. Ungrouped tasks fetched separately per phase (where `projectTaskGroupId` is null).

**Rationale**: Single query with nested includes is simpler than multiple queries. Performance acceptable for typical project sizes (<100 tasks per phase).

## Risks / Trade-offs

- [Ordering complexity] Groups and ungrouped tasks coexist in same phase → need clear visual separation. Mitigation: "Công việc chưa phân mục" section below groups.
- [Form UX] Dependent dropdown (phase → group) adds interaction step. Mitigation: Group selector only shown when selected phase has groups; defaults to "Chưa phân mục".
- [DnD interaction] Moving tasks between groups via drag-and-drop is complex. Mitigation: Out of scope for initial implementation. Tasks reassigned via edit form only.
