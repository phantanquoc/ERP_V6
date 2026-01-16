import { Router } from 'express';
import authController from '@controllers/authController';
import { validate } from '@middlewares/validation';

const router = Router();

// Register
router.post(
  '/register',
  validate([
    { field: 'email', required: true, type: 'email' },
    { field: 'password', required: true, type: 'string', minLength: 6 },
    { field: 'firstName', required: true, type: 'string' },
    { field: 'lastName', required: true, type: 'string' },
  ]),
  (req, res) => authController.register(req, res)
);

// Login
router.post(
  '/login',
  validate([
    { field: 'email', required: true, type: 'email' },
    { field: 'password', required: true, type: 'string' },
  ]),
  (req, res) => authController.login(req, res)
);

// Refresh Token
router.post(
  '/refresh-token',
  validate([{ field: 'refreshToken', required: true, type: 'string' }]),
  (req, res) => authController.refreshToken(req, res)
);

// Logout
router.post('/logout', (req, res) => authController.logout(req, res));

export default router;

