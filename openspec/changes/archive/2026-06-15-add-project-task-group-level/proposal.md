## Why

Project management currently has a 2-level hierarchy: Phase → Task. For projects with many tasks per phase, users need an intermediate grouping level ("Mục công việc") to organize tasks into logical categories within a phase — improving readability and planning structure.

## What Changes

- Add new `ProjectTaskGroup` model between `ProjectPhase` and `ProjectTask`
- Tasks gain an optional `projectTaskGroupId` FK — tasks can belong to a group or remain ungrouped within a phase
- Backend: full CRUD for task groups (create, update, delete, reorder), validation that group belongs to correct phase
- Frontend: task groups render as header rows (gray background) within TaskTable; task form gets a dependent "Mục công việc" dropdown; create/edit group form added
- When a user creates the first group in a phase, UI suggests assigning existing ungrouped tasks to it

## Capabilities

### New Capabilities
- `project-task-group`: CRUD operations for the intermediate "Mục công việc" level between phases and tasks, including reordering, phase-scoped validation, and cascading delete behavior

### Modified Capabilities
- None

## Impact

- **Database**: New `project_task_groups` table, new nullable FK `projectTaskGroupId` on `project_tasks`, new migration required
- **Backend**: `projectService.ts` (include nesting, progress calculation), `projectController.ts` (new handlers), `projectRoutes.ts` (new endpoints)
- **Frontend**: `projectService.ts` (types), `useProjectPhases.ts` (hooks), `ProjectList.tsx` (UI rendering in phases/updates tabs, task form), `ProjectGantt.tsx` (sub-row rendering)
- **API**: New endpoints under `/:id/phases/:phaseId/task-groups` and `/:id/task-groups/:groupId`
