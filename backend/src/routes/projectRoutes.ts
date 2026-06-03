import { Router } from 'express';
import projectController from '@controllers/projectController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';

const router = Router();
const upload = createSingleUploadMiddleware('projects');

router.use(authenticate);

router.get('/', projectController.getAll.bind(projectController));
router.get('/export/excel', projectController.exportExcel.bind(projectController));
router.get('/:id', projectController.getById.bind(projectController));
router.post('/', upload, projectController.create.bind(projectController));
router.put('/:id', upload, projectController.update.bind(projectController));
router.delete('/:id', projectController.remove.bind(projectController));

// Members
router.post('/:id/members', projectController.addMember.bind(projectController));
router.delete('/:id/members/:userId', projectController.removeMember.bind(projectController));

// Tasks
router.post('/:id/tasks', projectController.addTask.bind(projectController));
router.put('/:id/tasks/:taskId', projectController.updateTask.bind(projectController));
router.delete('/:id/tasks/:taskId', projectController.deleteTask.bind(projectController));

export default router;
