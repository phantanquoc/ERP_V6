import { Router } from 'express';
import {
  getAllLotProducts,
  addProductToLot,
  removeProductFromLot,
  moveProductBetweenLots,
  updateProductQuantity,
} from '@controllers/lotProductController';
import { authenticate } from '@middlewares/auth';

const router = Router();

router.use(authenticate);

// GET /api/lot-products
router.get('/', getAllLotProducts);

// POST /api/lot-products
router.post('/', addProductToLot);

// PUT /api/lot-products/move  — phải đứng trước /:id
router.put('/move', moveProductBetweenLots);

// PUT /api/lot-products/:id
router.put('/:id', updateProductQuantity);

// DELETE /api/lot-products/:id
router.delete('/:id', removeProductFromLot);

export default router;

