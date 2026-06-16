import { Router } from 'express';
import projectController from '@controllers/projectController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const upload = createSingleUploadMiddleware('projects');
const projectAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.PROJECTS);

router.use(authenticate);

router.get('/', projectAccess, projectController.getAll.bind(projectController));
router.get('/export/excel', projectAccess, projectController.exportExcel.bind(projectController));
router.get('/:id', projectAccess, projectController.getById.bind(projectController));
router.post('/', projectAccess, upload, projectController.create.bind(projectController));
router.put('/:id', projectAccess, upload, projectController.update.bind(projectController));
router.delete('/:id', projectAccess, projectController.remove.bind(projectController));

// Members
router.post('/:id/members', projectAccess, projectController.addMember.bind(projectController));
router.delete('/:id/members/:userId', projectAccess, projectController.removeMember.bind(projectController));

// Phases
router.post('/:id/phases', projectAccess, projectController.addPhase.bind(projectController));
router.put('/:id/phases/:phaseId', projectAccess, projectController.updatePhase.bind(projectController));
router.delete('/:id/phases/:phaseId', projectAccess, projectController.deletePhase.bind(projectController));
router.post('/:id/phases/reorder', projectAccess, projectController.reorderPhases.bind(projectController));

// Task Groups
router.post('/:id/phases/:phaseId/task-groups', projectAccess, projectController.addTaskGroup.bind(projectController));
router.put('/:id/task-groups/:groupId', projectAccess, projectController.updateTaskGroup.bind(projectController));
router.delete('/:id/task-groups/:groupId', projectAccess, projectController.deleteTaskGroup.bind(projectController));
router.post('/:id/task-groups/reorder', projectAccess, projectController.reorderTaskGroups.bind(projectController));

// Tasks
router.post('/:id/tasks', projectAccess, projectController.addTask.bind(projectController));
router.put('/:id/tasks/:taskId', projectAccess, projectController.updateTask.bind(projectController));
router.delete('/:id/tasks/:taskId', projectAccess, projectController.deleteTask.bind(projectController));
router.post('/:id/tasks/reorder', projectAccess, projectController.reorderTasks.bind(projectController));

// Updates
router.get('/:id/updates', projectAccess, projectController.getUpdates.bind(projectController));
router.post('/:id/updates', projectAccess, projectController.addUpdate.bind(projectController));
router.put('/:id/updates/:updateId', projectAccess, projectController.updateUpdate.bind(projectController));
router.delete('/:id/updates/:updateId', projectAccess, projectController.deleteUpdate.bind(projectController));

// Costs
router.get('/:id/costs', projectAccess, projectController.getCosts.bind(projectController));
router.post('/:id/costs', projectAccess, projectController.addCost.bind(projectController));
router.put('/:id/costs/:costId', projectAccess, projectController.updateCost.bind(projectController));
router.delete('/:id/costs/:costId', projectAccess, projectController.deleteCost.bind(projectController));

// Approval workflow
router.get('/:id/approvals', projectAccess, projectController.getApprovals.bind(projectController));
router.post('/:id/submit-approval', projectAccess, projectController.submitForApproval.bind(projectController));
router.post('/:id/approve', projectAccess, projectController.approveProject.bind(projectController));
router.post('/:id/reject', projectAccess, projectController.rejectProject.bind(projectController));

export default router;
