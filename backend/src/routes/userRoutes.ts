import { Router } from 'express';
import userController from '@controllers/userController';
import { authenticate, authorize } from '@middlewares/auth';
import { validate } from '@middlewares/validation';
import { UserRole } from '@types';

const router = Router();

// Get profile (authenticated users)
router.get('/profile', authenticate, (req, res) => userController.getProfile(req, res));

// Change password (authenticated users)
router.post('/change-password', authenticate, (req, res) => userController.changePassword(req, res));

// Update profile (authenticated users)
router.patch('/profile', authenticate, (req, res) => userController.updateProfile(req, res));

// Create user (admin only)
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validate([
    { field: 'email', type: 'string' },
    { field: 'password', type: 'string' },
    { field: 'firstName', type: 'string' },
    { field: 'lastName', type: 'string' },
    { field: 'role', type: 'string' },
  ]),
  (req, res) => userController.createUser(req, res)
);

// Get all users (admin only)
router.get(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  (req, res) => userController.getAllUsers(req, res)
);

// Get user by ID (admin only)
router.get(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  (req, res) => userController.getUserById(req, res)
);

// Update user (admin only)
router.patch(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate([
    { field: 'firstName', type: 'string' },
    { field: 'lastName', type: 'string' },
    { field: 'role', type: 'string' },
    { field: 'isActive', type: 'boolean' },
  ]),
  (req, res) => userController.updateUser(req, res)
);

// Delete user (admin only)
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  (req, res) => userController.deleteUser(req, res)
);

// Recalculate supervisors for all users (admin only)
router.post(
  '/recalculate-supervisors',
  authenticate,
  authorize(UserRole.ADMIN),
  (req, res) => userController.recalculateSupervisors(req, res)
);

export default router;

