import { Router } from 'express';
import invoiceController from '@controllers/invoiceController';
import { authenticate } from '@middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all invoices
router.get('/', invoiceController.getAllInvoices);

// Generate invoice number
router.post('/generate-code', invoiceController.generateInvoiceNumber);

// Get invoice by ID
router.get('/:id', invoiceController.getInvoiceById);

// Create invoice
router.post('/', invoiceController.createInvoice);

// Update invoice
router.put('/:id', invoiceController.updateInvoice);

// Delete invoice
router.delete('/:id', invoiceController.deleteInvoice);

export default router;

