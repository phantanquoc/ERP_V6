# Tài liệu hệ thống chấm công khuôn mặt

## 1) Mục tiêu và phạm vi

Hệ thống chấm công khuôn mặt trong ERP gồm 2 luồng chính:

1. `FaceAdminPage` (`/diemdanh/admin`): quản trị đăng ký/duy trì hồ sơ khuôn mặt nhân viên.
2. `FaceKioskPage` (`/diemdanh/nhanvien`): kiosk tự phục vụ check-in/check-out bằng khuôn mặt.

---

## 2) Kiến trúc tổng thể

- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript + Prisma + PostgreSQL
- AI Service: Python (`ai-service/main.py`) cho embedding + anti-spoof + batch verify
- Face landmark trên frontend: MediaPipe Face Mesh (WASM assets trong `frontend/public/mediapipe`)

Luồng xử lý:

1. Frontend thu ảnh/frame.
2. Backend gọi AI service `/verify-batch` hoặc `/enroll`.
3. Backend xử lý nghiệp vụ chấm công, cooldown, đi muộn, logging.
4. Frontend hiển thị trạng thái và kết quả cho người dùng.

---

## 3) Các file chính

```txt
frontend/src/pages/face/FaceAdminPage.tsx
frontend/src/pages/face/FaceKioskPage.tsx
frontend/src/services/faceAttendanceService.ts
frontend/src/utils/loadFaceMesh.ts

backend/src/services/faceAttendanceService.ts
backend/src/controllers/faceAttendanceController.ts
backend/src/routes/faceAttendanceRoutes.ts

ai-service/main.py
```

---

## 4) Đăng ký khuôn mặt (Admin - `/diemdanh/admin`)

### 4.1 Quy trình capture

Hệ thống auto-capture 6 tư thế:

1. Chính diện
2. Xoay trái
3. Xoay phải
4. Ngẩng lên
5. Cúi xuống
6. Mỉm cười

Điều kiện chụp:

- Mặt nằm trong oval guide.
- Đúng pose theo yaw/pitch/smile.
- Giữ ổn định đủ thời gian rồi tự chụp.

### 4.2 Ngưỡng hiện tại (đồng bộ code)

```ts
const YAW_FRONT = 0.15;
const YAW_SIDE = 0.22;
const PITCH_UP = -0.13;
const PITCH_DOWN = 0.13;
const SMILE_MIN = 0.12;

const STABLE_MS = 900;
const SMILE_STABLE_MS = 550; // riêng pose cười
const COOLDOWN_MS = 1200;
```

Ghi chú: bước cười đã được nới để dễ lấy ảnh hơn (hạ ngưỡng smile + giảm thời gian giữ).

### 4.3 Ảnh lưu và embedding

- Ảnh capture được crop vuông `480x480`, ưu tiên crop theo bbox mặt + padding.
- Backend gọi AI `/enroll` để lấy embedding.
- Mỗi ảnh lưu vào `face_images` (image + embedding encrypted).
- Hồ sơ cũ được thay thế khi enroll mới, hoặc cộng thêm khi enroll variation.

---

## 5) Kiosk chấm công (Nhân viên - `/diemdanh/nhanvien`)

### 5.1 Quy trình runtime

1. Mở camera + FaceMesh.
2. Kiểm tra nhiều điều kiện chất lượng (mặt giữa khung, đủ gần, nhìn thẳng...).
3. Thu `QUALITY_GATE` frame tốt.
4. Bắt đầu challenge liveness (hiện tại chỉ `blink`).
5. Sau khi pass challenge, tiếp tục thu frame tốt và gọi verify backend.
6. Backend trả action: check-in/check-out/cooldown/no-match...

### 5.2 Ngưỡng frontend hiện tại

```ts
const CENTER_ZONE = 0.30;
const MAX_YAW = 0.25;
const MAX_PITCH = 0.28;
const MIN_FACE_AREA = 0.04;
const QUALITY_GATE = 8;

const CHALLENGES = ['blink'];
const CHALLENGE_EAR_THRESHOLD = 0.18;
const CHALLENGE_TIMEOUT_MS = 8000;
```

### 5.3 Thời điểm gửi frame lên backend

- Frontend **không gửi ngay khi bắt đầu**.
- Frontend chỉ gọi `doScan(...)` khi đã đạt `challengePhase === 'done'` (với challenge blink là sau khi chớp mắt pass) và đã có đủ frame chất lượng.
- API verify dùng:
  - Production: `POST /api/face-attendance/kiosk/verify` (cần `x-device-key`)
  - Dev: `POST /api/face-attendance/kiosk/verify-dev`

Payload kiosk verify:

```json
{
  "image": "base64_face_crop",
  "frames": ["base64_1", "base64_2", "..."]
}
```

---

## 6) AI service: verify + liveness

### 6.1 Cấu hình chính (hiện tại)

```py
MATCH_MAX_DISTANCE = 0.38
MATCH_MIN_SCORE = 0.58
MATCH_MIN_MARGIN = 0.050
MATCH_MIN_VOTE_RATIO = 0.30
TOP_K_MATCHES = 5

LIVENESS_MIN_VALID_FRAMES = 4
LIVENESS_PASS_RATIO = 0.65
LIVENESS_MIN_SCORE = 0.78
LIVENESS_FINAL_MIN_SCORE = 0.72
LIVENESS_MAX_FRAMES = 12
MIN_EYE_SPAN_RATIO = 0.22
```

### 6.2 Logic verify-batch

1. Chạy liveness trên `frames` (hoặc fallback `image`).
2. Extract 1 probe embedding.
3. Top-k vote với toàn bộ profile embeddings.
4. Áp dụng ràng buộc distance/score/vote/margin.
5. Trả `top_k_matches` để backend/frontend hiển thị/chẩn đoán.

---

## 7) Backend nghiệp vụ chấm công

### 7.1 Những điểm chính

- Cache embedding in-memory (`CACHE_TTL_MS = 5 phút`) để giảm query DB.
- Lọc embedding outlier trước khi đưa vào cache so khớp.
- Cooldown chấm công: `5 phút` cho mỗi nhân viên sau check-in/check-out thành công.
- Tính đi muộn theo ca làm việc (`LATE_GRACE_MINUTES = 5`).
- Log mọi lần quét vào `faceAttendanceLog`.
- Adaptive enrollment chạy nền sau nhận diện thành công (có ngưỡng confidence/distance).

### 7.2 Chuẩn hóa thông báo kiosk dễ hiểu

Backend đã map thông báo kỹ thuật sang hướng dẫn đơn giản:

- Thiếu frame hợp lệ / quality thấp:
  - `Vui lòng di chuyển ra giữa màn hình và thử lại`
- Nghi ngờ spoof/screen/photo/replay:
  - `Vui lòng đứng trực tiếp trước camera và thử lại`
- Không nhận diện rõ khuôn mặt:
  - `Không nhận diện rõ khuôn mặt. Vui lòng nhìn thẳng vào camera và thử lại`

---

## 8) API chính (đang dùng)

### 8.1 Profile admin

- `GET /api/face-attendance/profiles`
- `POST /api/face-attendance/profiles/:employeeId/enroll`
- `POST /api/face-attendance/profiles/:employeeId/enroll-variation`
- `PATCH /api/face-attendance/profiles/:profileId/toggle`
- `DELETE /api/face-attendance/profiles/:employeeId`
- `GET /api/face-attendance/profiles/:employeeId/images`

### 8.2 Kiosk verify

- `POST /api/face-attendance/kiosk/verify` (production, cần `x-device-key`)
- `POST /api/face-attendance/kiosk/verify-dev` (dev)

### 8.3 Logs / Device

- `GET /api/face-attendance/logs`
- `GET /api/face-attendance/devices`
- `POST /api/face-attendance/devices`
- `PATCH /api/face-attendance/devices/:deviceId/toggle`

---

## 9) Action/result hiển thị kiosk

- `CHECK_IN`: chấm công vào thành công
- `CHECK_OUT`: chấm công ra thành công
- `ALREADY_RECORDED`: hôm nay đã chấm công đủ
- `COOLDOWN`: chờ 5 phút trước khi quét lại
- `NO_MATCH`: không match hoặc fail liveness (đã chuẩn hóa thông báo dễ hiểu)

---

## 10) Vận hành và kiểm tra nhanh

1. Start dev stack:

```bash
docker compose -f docker-compose.dev.yml up -d
```

2. Frontend:
- Kiosk: `http://localhost:5173/diemdanh/nhanvien`
- Admin: `http://localhost:5173/diemdanh/admin`

3. Kiểm tra backend + AI:
- Backend: `http://localhost:5003`
- AI service: `http://localhost:8001`

4. Khi lỗi khó chẩn đoán:
- Xem backend logs (`faceAttendanceService`).
- Xem AI logs (`verify-batch`, `liveness failed`, `margin reject`).

---

## 11) Ghi chú cập nhật

Tài liệu này đã được cập nhật theo trạng thái code hiện tại của:

- `FaceAdminPage` (nới bước cười),
- `FaceKioskPage` (blink challenge + quality gate 8 frame),
- `backend/src/services/faceAttendanceService.ts` (message mapping thân thiện),
- `ai-service/main.py` (ngưỡng match/liveness hiện hành).
