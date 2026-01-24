import { Router } from 'express';
import { supplierController } from '../controllers/supplierController';

const router = Router();

// GET /api/suppliers - Get all suppliers with pagination
router.get('/', supplierController.getAllSuppliers);

// GET /api/suppliers/generate-code - Generate next supplier code
router.get('/generate-code', supplierController.generateCode);

// GET /api/suppliers/:id - Get supplier by ID
router.get('/:id', supplierController.getSupplierById);

// POST /api/suppliers - Create new supplier
router.post('/', supplierController.createSupplier);

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', supplierController.updateSupplier);

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', supplierController.deleteSupplier);

export default router;

