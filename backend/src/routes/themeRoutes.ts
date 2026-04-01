import { Router } from 'express';
import themeController from '@controllers/themeController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Themes
 *   description: Theme system — quản lý giao diện màu sắc theo sự kiện
 */

// ─── Public endpoints (không cần auth) ───────────────────────────────────────

/**
 * GET /api/themes/active — Lấy theme hôm nay (auto-detect event)
 */
router.get('/active', (req, res, next) => themeController.getActiveTheme(req, res, next));

/**
 * GET /api/themes — Lấy tất cả themes (public, cần để ThemePickerModal hoạt động)
 */
router.get('/', (req, res, next) => themeController.getAllThemes(req, res, next));

/**
 * GET /api/themes/:id
 */
router.get('/:id', (req, res, next) => themeController.getThemeById(req, res, next));

// ─── Admin-only endpoints ──────────────────────────────────────────────────────

/**
 * @swagger
 * /api/themes:
 *   post:
 *     summary: Tạo theme mới (Admin)
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, authorize('admin'), (req, res, next) => themeController.createTheme(req as any, res, next));

/**
 * @swagger
 * /api/themes/{id}:
 *   put:
 *     summary: Cập nhật theme (Admin)
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authenticate, authorize('admin'), (req, res, next) => themeController.updateTheme(req as any, res, next));

/**
 * @swagger
 * /api/themes/{id}:
 *   delete:
 *     summary: Xoá theme (Admin)
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, authorize('admin'), (req, res, next) => themeController.deleteTheme(req as any, res, next));

export default router;
