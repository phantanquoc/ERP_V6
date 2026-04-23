import { Router } from 'express';
import faceAttendanceController from '@controllers/faceAttendanceController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

// ─── Admin Routes (JWT + ADMIN role) ───────────────────────────────────────

/** GET /api/face-attendance/profiles — danh sách nhân viên + trạng thái khuôn mặt */
router.get('/profiles', authenticate, authorize('ADMIN'), faceAttendanceController.listProfiles.bind(faceAttendanceController));

/** POST /api/face-attendance/profiles/:employeeId/enroll — đăng ký khuôn mặt */
router.post('/profiles/:employeeId/enroll', authenticate, authorize('ADMIN'), faceAttendanceController.enrollFace.bind(faceAttendanceController));

/** POST /api/face-attendance/profiles/:employeeId/enroll-variation — thêm biến thể (kính, v.v.) */
router.post('/profiles/:employeeId/enroll-variation', authenticate, authorize('ADMIN'), faceAttendanceController.enrollVariation.bind(faceAttendanceController));

/** PATCH /api/face-attendance/profiles/:profileId/toggle — bật/tắt face profile */
router.patch('/profiles/:profileId/toggle', authenticate, authorize('ADMIN'), faceAttendanceController.toggleProfile.bind(faceAttendanceController));

/** DELETE /api/face-attendance/profiles/:employeeId — xóa face profile */
router.delete('/profiles/:employeeId', authenticate, authorize('ADMIN'), faceAttendanceController.deleteProfile.bind(faceAttendanceController));

/** GET /api/face-attendance/logs — xem lịch sử nhận diện */
router.get('/logs', authenticate, authorize('ADMIN'), faceAttendanceController.getLogs.bind(faceAttendanceController));

// ─── Device Management (ADMIN) ─────────────────────────────────────────────

/** GET /api/face-attendance/devices */
router.get('/devices', authenticate, authorize('ADMIN'), faceAttendanceController.listDevices.bind(faceAttendanceController));

/** POST /api/face-attendance/devices */
router.post('/devices', authenticate, authorize('ADMIN'), faceAttendanceController.createDevice.bind(faceAttendanceController));

/** PATCH /api/face-attendance/devices/:deviceId/toggle */
router.patch('/devices/:deviceId/toggle', authenticate, authorize('ADMIN'), faceAttendanceController.toggleDevice.bind(faceAttendanceController));

// ─── Kiosk Routes (device-key auth) ────────────────────────────────────────

/** POST /api/face-attendance/kiosk/verify — kiosk chấm công (dùng x-device-key) */
router.post('/kiosk/verify', faceAttendanceController.kioskVerify.bind(faceAttendanceController));

/** POST /api/face-attendance/kiosk/verify-dev — dev-only, không cần device key */
router.post('/kiosk/verify-dev', faceAttendanceController.kioskVerifyDev.bind(faceAttendanceController));

export default router;
