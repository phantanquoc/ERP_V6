import { Router } from 'express';
import faceAttendanceController from '@controllers/faceAttendanceController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';

const router = Router();

// ─── Admin Routes (JWT + ADMIN role) ───────────────────────────────────────

/** GET /api/face-attendance/profiles — danh sách nhân viên + trạng thái khuôn mặt */
router.get('/profiles', authenticate, requireRule('face-attendance', 'READ'), faceAttendanceController.listProfiles.bind(faceAttendanceController));

/** GET /api/face-attendance/profiles/:employeeId/images — list ảnh gốc để admin xem thumbnail */
router.get('/profiles/:employeeId/images', authenticate, requireRule('face-attendance', 'READ'), faceAttendanceController.listProfileImages.bind(faceAttendanceController));

/** GET /api/face-attendance/profiles/:employeeId/stats — health stats gallery */
router.get('/profiles/:employeeId/stats', authenticate, requireRule('face-attendance', 'READ'), faceAttendanceController.getProfileStats.bind(faceAttendanceController));

/** GET /api/face-attendance/adaptive-metrics?days=7 — system-wide adaptive metrics */
router.get('/adaptive-metrics', authenticate, requireRule('face-attendance', 'READ'), faceAttendanceController.getAdaptiveMetrics.bind(faceAttendanceController));

/** POST /api/face-attendance/profiles/:employeeId/enroll — đăng ký khuôn mặt */
router.post('/profiles/:employeeId/enroll', authenticate, requireRule('face-attendance', 'READ'), faceAttendanceController.enrollFace.bind(faceAttendanceController));

/** POST /api/face-attendance/profiles/:employeeId/enroll-variation — thêm biến thể (kính, v.v.) */
router.post('/profiles/:employeeId/enroll-variation', authenticate, requireRule('face-attendance', 'CREATE'), faceAttendanceController.enrollVariation.bind(faceAttendanceController));

/** PATCH /api/face-attendance/profiles/:profileId/toggle — bật/tắt face profile */
router.patch('/profiles/:profileId/toggle', authenticate, requireRule('face-attendance', 'CREATE'), faceAttendanceController.toggleProfile.bind(faceAttendanceController));

/** DELETE /api/face-attendance/profiles/:employeeId — xóa face profile */
router.delete('/profiles/:employeeId', authenticate, requireRule('face-attendance', 'UPDATE'), faceAttendanceController.deleteProfile.bind(faceAttendanceController));

/** GET /api/face-attendance/logs — xem lịch sử nhận diện */
router.get('/logs', authenticate, requireRule('face-attendance', 'DELETE'), faceAttendanceController.getLogs.bind(faceAttendanceController));

// ─── Device Management (ADMIN) ─────────────────────────────────────────────

/** GET /api/face-attendance/devices */
router.get('/devices', authenticate, requireRule('face-attendance', 'READ'), faceAttendanceController.listDevices.bind(faceAttendanceController));

/** POST /api/face-attendance/devices */
router.post('/devices', authenticate, requireRule('face-attendance', 'READ'), faceAttendanceController.createDevice.bind(faceAttendanceController));

/** PATCH /api/face-attendance/devices/:deviceId/toggle */
router.patch('/devices/:deviceId/toggle', authenticate, requireRule('face-attendance', 'CREATE'), faceAttendanceController.toggleDevice.bind(faceAttendanceController));

// ─── Kiosk Routes (device-key auth) ────────────────────────────────────────

/** POST /api/face-attendance/kiosk/session — admin tạo session key cho kiosk */
router.post('/kiosk/session', authenticate, requireRule('face-attendance', 'UPDATE'), faceAttendanceController.createKioskSession.bind(faceAttendanceController));

/** GET /api/face-attendance/kiosk/validate-session — kiosk validate key (public, legacy) */
router.get('/kiosk/validate-session', faceAttendanceController.validateKioskSession.bind(faceAttendanceController));

/** GET /api/face-attendance/kiosk/validate-device — validate device key (public, persistent) */
router.get('/kiosk/validate-device', faceAttendanceController.validateDeviceKey.bind(faceAttendanceController));

/** POST /api/face-attendance/kiosk/verify — kiosk chấm công (dùng x-device-key) */
router.post('/kiosk/verify', faceAttendanceController.kioskVerify.bind(faceAttendanceController));

/** POST /api/face-attendance/kiosk/verify-dev — dev-only, không cần device key */
router.post('/kiosk/verify-dev', faceAttendanceController.kioskVerifyDev.bind(faceAttendanceController));

export default router;
