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

// Tasks
router.post('/:id/tasks', projectAccess, projectController.addTask.bind(projectController));
router.put('/:id/tasks/:taskId', projectAccess, projectController.updateTask.bind(projectController));
router.delete('/:id/tasks/:taskId', projectAccess, projectController.deleteTask.bind(projectController));

export default router;
