import { Router } from 'express';
import lotProductController from '@controllers/lotProductController';

const {
  getAllLotProducts,
  addProductToLot,
  removeProductFromLot,
  moveProductBetweenLots,
  updateProductQuantity,
  getLotsByProduct,
  getKienByProductAndLot,
} = lotProductController;
import { authenticate, deviceOrJwtAuth } from '@middlewares/auth';

const router = Router();

// Kiosk-accessible endpoints — accept device key OR JWT
router.get('/lots', deviceOrJwtAuth('DATA_ENTRY'), getLotsByProduct);
router.get('/kien', deviceOrJwtAuth('DATA_ENTRY'), getKienByProductAndLot);

// Desktop-only endpoints — require JWT
router.get('/', authenticate, getAllLotProducts);
router.post('/', authenticate, addProductToLot);
router.put('/move', authenticate, moveProductBetweenLots);
router.put('/:id', authenticate, updateProductQuantity);
router.delete('/:id', authenticate, removeProductFromLot);

export default router;

