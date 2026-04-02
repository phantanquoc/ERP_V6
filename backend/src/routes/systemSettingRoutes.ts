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

export default router;
