import { Router } from 'express';
import docsController from '@controllers/docsController';
import { authenticate } from '@middlewares/auth';

const router = Router();

router.get('/', authenticate, docsController.listDocs);
router.get('/:slug', authenticate, docsController.getDocContent);
router.put('/:slug', authenticate, docsController.updateDocContent);

export default router;
