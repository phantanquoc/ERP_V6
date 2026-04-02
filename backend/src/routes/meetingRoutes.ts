import { Router } from 'express';
import meetingController from '@controllers/meetingController';
import { authenticate } from '@middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => meetingController.getAll(req, res, next));
router.get('/my', (req, res, next) => meetingController.getMyMeetings(req, res, next));
router.get('/:id', (req, res, next) => meetingController.getById(req, res, next));
router.post('/', (req, res, next) => meetingController.create(req, res, next));
router.put('/:id', (req, res, next) => meetingController.update(req, res, next));
router.delete('/:id', (req, res, next) => meetingController.delete(req, res, next));
router.put('/:id/confirm', (req, res, next) => meetingController.confirm(req, res, next));

export default router;
