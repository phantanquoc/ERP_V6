import { Router } from 'express';
import lotProductController from '@controllers/lotProductController';
import { getLotProductReceiptHistory } from '@controllers/warehouseReceiptController';

const {
  getAllLotProducts,
  addProductToLot,
  removeProductFromLot,
  moveProductBetweenLots,
  updateProductQuantity,
  getLotsByProduct,
  getKienByProductAndLot,
  checkStockByNames,
} = lotProductController;
import { authenticate, deviceOrJwtAuth } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';

const router = Router();

// Kiosk-accessible endpoints — accept device key OR JWT
router.get('/lots', deviceOrJwtAuth('DATA_ENTRY'), getLotsByProduct);
router.get('/kien', deviceOrJwtAuth('DATA_ENTRY'), getKienByProductAndLot);

// Desktop-only endpoints — require JWT
router.get('/', authenticate, requireRule('lot-products', 'READ'), getAllLotProducts);
router.post('/stock-check', authenticate, requireRule('lot-products', 'READ'), checkStockByNames);
router.post('/', authenticate, requireRule('lot-products', 'CREATE'), addProductToLot);
router.put('/move', authenticate, requireRule('lot-products', 'UPDATE'), moveProductBetweenLots);
router.get('/:lotProductId/receipt-history', authenticate, requireRule('lot-products', 'READ'), getLotProductReceiptHistory);
router.put('/:id', authenticate, requireRule('lot-products', 'UPDATE'), updateProductQuantity);
router.delete('/:id', authenticate, requireRule('lot-products', 'DELETE'), removeProductFromLot);

export default router;

