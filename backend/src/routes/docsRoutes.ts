import { Router } from 'express';
import docsController from '@controllers/docsController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';

const router = Router();

router.get('/', authenticate, requireRule('docs', 'READ'), docsController.listDocs);
router.get('/:slug', authenticate, requireRule('docs', 'READ'), docsController.getDocContent);
router.put('/:slug', authenticate, requireRule('docs', 'UPDATE'), docsController.updateDocContent);

export default router;
