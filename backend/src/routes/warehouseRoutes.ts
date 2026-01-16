import express from 'express';
import {
  getAllWarehouses,
  generateWarehouseCode,
  createWarehouse,
  deleteWarehouse,
} from '../controllers/warehouseController';
import {
  getLotsByWarehouse,
  createLot,
  deleteLot,
} from '../controllers/lotController';
import {
  getAllLotProducts,
  addProductToLot,
  removeProductFromLot,
  moveProductBetweenLots,
  updateProductQuantity,
} from '../controllers/lotProductController';

const router = express.Router();

// Warehouse routes
router.get('/warehouses', getAllWarehouses);
router.get('/warehouses/generate-code', generateWarehouseCode);
router.post('/warehouses', createWarehouse);
router.delete('/warehouses/:id', deleteWarehouse);

// Lot routes
router.get('/warehouses/:warehouseId/lots', getLotsByWarehouse);
router.post('/lots', createLot);
router.delete('/lots/:id', deleteLot);

// Lot Product routes
router.get('/lot-products', getAllLotProducts);
router.post('/lot-products', addProductToLot);
router.delete('/lot-products/:id', removeProductFromLot);
router.put('/lot-products/move', moveProductBetweenLots);
router.put('/lot-products/:id', updateProductQuantity);

export default router;

