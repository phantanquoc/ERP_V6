import { Router } from 'express';
import meetingController from '@controllers/meetingController';
import { authenticate } from '@middlewares/auth';

const router = Router();

router.use(authenticate);

// List routes (must come before /:id to avoid "today"/"week" being treated as IDs)
router.get('/', (req, res, next) => meetingController.getAll(req, res, next));
router.get('/my', (req, res, next) => meetingController.getMyMeetings(req, res, next));

// Detail & mutations
router.get('/:id', (req, res, next) => meetingController.getById(req, res, next));
router.post('/', (req, res, next) => meetingController.create(req, res, next));
router.put('/:id', (req, res, next) => meetingController.update(req, res, next));
router.delete('/:id', (req, res, next) => meetingController.delete(req, res, next));

// Sub-resource actions
router.put('/:id/confirm', (req, res, next) => meetingController.confirm(req, res, next));
router.patch('/:id/confirm', (req, res, next) => meetingController.confirm(req, res, next));
router.patch('/:id/status', (req, res, next) => meetingController.updateStatus(req, res, next));

export default router;
