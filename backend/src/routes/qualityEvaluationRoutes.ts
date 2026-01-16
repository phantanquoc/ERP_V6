import { Router } from 'express';
import qualityEvaluationController from '@controllers/qualityEvaluationController';
import { authenticate } from '@middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/quality-evaluations - Get all quality evaluations with pagination and filtering
router.get('/', qualityEvaluationController.getAllQualityEvaluations.bind(qualityEvaluationController));

// GET /api/quality-evaluations/:id - Get quality evaluation by ID
router.get('/:id', qualityEvaluationController.getQualityEvaluationById.bind(qualityEvaluationController));

// POST /api/quality-evaluations - Create new quality evaluation
router.post('/', qualityEvaluationController.createQualityEvaluation.bind(qualityEvaluationController));

// PUT /api/quality-evaluations/:id - Update quality evaluation
router.put('/:id', qualityEvaluationController.updateQualityEvaluation.bind(qualityEvaluationController));

// DELETE /api/quality-evaluations/:id - Delete quality evaluation
router.delete('/:id', qualityEvaluationController.deleteQualityEvaluation.bind(qualityEvaluationController));

export default router;

