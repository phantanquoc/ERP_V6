import { Router } from 'express';
import systemSettingController from '@controllers/systemSettingController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

/**
 * GET /api/system-settings/banner
 * Public — lấy giá trị banner hiện tại (cần thiết cho tất cả user khi load trang)
 */
router.get('/banner', (req, res) =>
  systemSettingController.getBanner(req as any, res)
);

/**
 * PUT /api/system-settings/banner
 * Admin only — đổi banner + broadcast WebSocket realtime đến tất cả client
 */
router.put('/banner', authenticate, authorize('ADMIN'), (req, res) =>
  systemSettingController.setBanner(req as any, res)
);

/**
 * GET /api/system-settings/slogan
 * Public — lấy slogan hiện tại (có thể rỗng)
 */
router.get('/slogan', (req, res) =>
  systemSettingController.getSlogan(req as any, res)
);

/**
 * PUT /api/system-settings/slogan
 * Admin only — đổi slogan + broadcast WebSocket realtime. Cho phép value rỗng (xoá slogan).
 */
router.put('/slogan', authenticate, authorize('ADMIN'), (req, res) =>
  systemSettingController.setSlogan(req as any, res)
);

export default router;
