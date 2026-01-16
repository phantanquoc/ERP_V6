import { Router } from 'express';
import positionLevelController from '@controllers/positionLevelController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all levels
router.get('/', positionLevelController.getAllLevels);

// Get all levels for a position
router.get('/:positionId/levels', positionLevelController.getAllLevelsByPosition);

// Get single level by ID
router.get('/level/:id', positionLevelController.getLevelById);

// Create new level for a position (requires ADMIN or DEPARTMENT_HEAD)
router.post('/:positionId/levels', authorize('ADMIN', 'DEPARTMENT_HEAD'), positionLevelController.createLevel);

// Update level (requires ADMIN or DEPARTMENT_HEAD)
router.patch('/level/:id', authorize('ADMIN', 'DEPARTMENT_HEAD'), positionLevelController.updateLevel);

// Delete level (requires ADMIN)
router.delete('/level/:id', authorize('ADMIN'), positionLevelController.deleteLevel);

export default router;

