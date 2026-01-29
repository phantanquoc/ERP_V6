import { Router } from 'express';
import internationalCustomerController from '@controllers/internationalCustomerController';
import { authenticate, authorize } from '@middlewares/auth';
import { zodValidate } from '@middlewares/zodValidation';
import { createCustomerSchema, updateCustomerSchema } from '@schemas';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all international customers
router.get('/',
  internationalCustomerController.getAllCustomers
);

// Generate customer code
router.post('/generate-code',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  internationalCustomerController.generateCustomerCode
);

// Get customer by code
router.get('/code/:code',
  internationalCustomerController.getCustomerByCode
);

// Get customer by ID
router.get('/:id',
  internationalCustomerController.getCustomerById
);

// Create customer (Admin, Department Head only)
router.post('/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  zodValidate(createCustomerSchema),
  internationalCustomerController.createCustomer
);

// Update customer (Admin, Department Head only)
router.patch('/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  zodValidate(updateCustomerSchema),
  internationalCustomerController.updateCustomer
);

// Delete customer (Admin only)
router.delete('/:id',
  authorize(UserRole.ADMIN),
  internationalCustomerController.deleteCustomer
);

export default router;

