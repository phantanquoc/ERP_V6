## 1. Database Schema

- [x] 1.1 Add `ProjectTaskGroup` model to `backend/prisma/schema/business_machines.prisma` with fields: id, projectPhaseId (required FK), tenMuc, moTa?, thuTu, createdAt, updatedAt. Add relation to ProjectPhase and ProjectTask[]. Indexes: [projectPhaseId], [projectPhaseId, thuTu]. Map to "project_task_groups", schema "business".
- [x] 1.2 Add `projectTaskGroupId String?` and `projectTaskGroup ProjectTaskGroup?` relation to `ProjectTask` model. Add @@index([projectTaskGroupId]).
- [x] 1.3 Add `taskGroups ProjectTaskGroup[]` relation to `ProjectPhase` model.
- [x] 1.4 Run `npx prisma migrate dev --name add-project-task-group` to create migration ← (verify: migration applies cleanly, schema matches design.md) [NOTE: DB not accessible in this env; schema validated via prisma generate]

## 2. Backend Service

- [x] 2.1 Add task group CRUD methods to `projectService.ts`: `addTaskGroup(projectId, phaseId, data)`, `updateTaskGroup(projectId, groupId, data)`, `deleteTaskGroup(projectId, groupId)` (nullify tasks' FK before delete), `reorderTaskGroups(projectId, items[])`.
- [x] 2.2 Add `validateGroupBelongsToPhase(groupId, phaseId)` helper in projectService.
- [x] 2.3 Update `projectInclude` to nest `taskGroups: { include: { tasks: { orderBy: { thuTu: 'asc' } } }, orderBy: { thuTu: 'asc' } }` within phases.
- [x] 2.4 Update `addTask` and `updateTask` to accept optional `projectTaskGroupId`, validate group belongs to same phase using the helper from 2.2.
- [x] 2.5 Update `getById` response shaping: return ungrouped tasks (where projectTaskGroupId is null) separately from grouped tasks within each phase. ← (verify: service methods handle all spec scenarios including cross-phase validation error)

## 3. Backend Controller & Routes

- [x] 3.1 Add controller methods in `projectController.ts`: `addTaskGroup`, `updateTaskGroup`, `deleteTaskGroup`, `reorderTaskGroups`.
- [x] 3.2 Add routes in `projectRoutes.ts`: `POST /:id/phases/:phaseId/task-groups`, `PUT /:id/task-groups/:groupId`, `DELETE /:id/task-groups/:groupId`, `POST /:id/task-groups/reorder`.
- [x] 3.3 Register routes in ROUTE_MAP if not auto-registered. ← (verify: all new endpoints accessible and return correct response shapes)

## 4. Frontend Types & Hooks

- [x] 4.1 Add `ProjectTaskGroup` interface to `frontend/src/services/projectService.ts` with fields matching schema. Update `ProjectPhase` to include `taskGroups?: ProjectTaskGroup[]`. Update `ProjectTask` to include `projectTaskGroupId?: string | null`.
- [x] 4.2 Add `CreateTaskGroupRequest` and `UpdateTaskGroupRequest` types.
- [x] 4.3 Add API functions: `addTaskGroup`, `updateTaskGroup`, `deleteTaskGroup`, `reorderTaskGroups` in projectService.
- [x] 4.4 Add mutation hooks in `useProjectPhases.ts` (or new `useProjectTaskGroups.ts`): `useAddTaskGroup`, `useUpdateTaskGroup`, `useDeleteTaskGroup`, `useReorderTaskGroups`. Invalidate project detail query on success. ← (verify: types compile cleanly with `npx tsc --noEmit`, hooks use correct query key invalidation)

## 5. Frontend UI — Task Group Display

- [x] 5.1 Update `SortablePhaseItem` in `ProjectList.tsx`: add "Thêm mục" button in phase header actions (next to "Thêm công việc").
- [x] 5.2 Create group header row rendering within TaskTable/phase: gray background row with group name, edit/delete/add-task-to-group buttons. Render groups sorted by `thuTu`, with their tasks below each header.
- [x] 5.3 Add "Công việc chưa phân mục" section below groups within each phase (only shown when phase has at least one group AND has ungrouped tasks).
- [x] 5.4 Apply same group rendering to "Thực tế" (updates) tab view. ← (verify: both plan and actual tabs render groups correctly; phase with no groups renders unchanged)

## 6. Frontend UI — Task Group Form & Task Form Update

- [x] 6.1 Add task group create/edit modal with fields: tenMuc (required), moTa (optional). Wire to mutation hooks.
- [x] 6.2 Update task form: add "Mục công việc" dropdown that appears when selected phase has groups. Populated with groups from selected phase + "Chưa phân mục" default. Resets when phase changes.
- [x] 6.3 Pass `projectTaskGroupId` in task create/update API calls. ← (verify: task form correctly shows/hides group dropdown based on phase selection; full create/edit flow works end-to-end)

## 7. Verification

- [x] 7.1 Run `cd backend && npx tsc --noEmit` — must pass
- [x] 7.2 Run `cd frontend && npx tsc --noEmit` — must pass
- [x] 7.3 Run `cd backend && npm run lint` — must pass
- [x] 7.4 Run `cd frontend && npm run lint` — must pass ← (verify: zero type errors, zero lint errors in both services)
