"""Face recognition helper functions — image processing, embedding, voting."""

import math
import base64
import numpy as np
import cv2
from io import BytesIO
from PIL import Image
import PIL.ImageOps
from typing import Any
import deepface.DeepFace as DeepFace

from config import (
    logger, MODEL_NAME, ENROLL_DETECTOR, VERIFY_DETECTOR, VERIFY_DETECTOR_FB,
    THRESHOLD, MATCH_MIN_VOTE_RATIO,
    VOTE_WEIGHT_COUNT, VOTE_WEIGHT_DIST,
    MAX_FACE_TILT_DEG, MIN_EYE_SPAN_RATIO,
    LIVENESS_MIN_BRIGHTNESS, LIVENESS_MAX_BRIGHTNESS, LIVENESS_MIN_BLUR,
)

# Module-level state (set by app.py on startup)
_liveness_detector = None
_liveness_spoofer = None


def set_liveness_models(detector, spoofer):
    """Called from app.py after warmup to inject loaded models."""
    global _liveness_detector, _liveness_spoofer
    _liveness_detector = detector
    _liveness_spoofer = spoofer


def preprocess_image(img: np.ndarray) -> np.ndarray:
    """Normalize brightness/contrast để xử lý ánh sáng khác nhau."""
    pil = PIL.ImageOps.autocontrast(Image.fromarray(img), cutoff=1)
    return np.array(pil)


def base64_to_image(b64: str) -> np.ndarray:
    if "," in b64:
        b64 = b64.split(",")[1]
    img_bytes = base64.b64decode(b64)
    img = Image.open(BytesIO(img_bytes)).convert("RGB")
    return np.array(img)


def normalize_vec(v: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(v)
    return v / norm if norm > 0 else v


def _estimate_face_pose(facial_area: dict) -> tuple[float, float]:
    """
    Ước lượng góc mặt từ eye positions trong facial_area.
    Trả về (tilt_deg, eye_span_ratio).
    """
    le = facial_area.get("left_eye")
    re = facial_area.get("right_eye")
    fw = facial_area.get("w", 0)
    if not le or not re or fw <= 0:
        return 0.0, 1.0
    dx = float(re[0]) - float(le[0])
    dy = float(re[1]) - float(le[1])
    eye_dist = math.hypot(dx, dy)
    tilt_deg = abs(math.degrees(math.atan2(abs(dy), max(abs(dx), 1.0))))
    eye_span_ratio = eye_dist / float(fw)
    return tilt_deg, eye_span_ratio


def get_embedding(img_array: np.ndarray, detector: str = ENROLL_DETECTOR,
                  anti_spoofing: bool = False) -> tuple[np.ndarray, float]:
    """
    Trả về (embedding L2-normalized, face_confidence).
    Nếu detector chính fail, thử fallback detector.
    """
    img_array = preprocess_image(img_array)

    detectors_to_try = [detector]
    if detector == VERIFY_DETECTOR and detector != VERIFY_DETECTOR_FB:
        detectors_to_try.append(VERIFY_DETECTOR_FB)

    last_err = None
    for det in detectors_to_try:
        try:
            result = DeepFace.represent(
                img_path=img_array,
                model_name=MODEL_NAME,
                detector_backend=det,
                enforce_detection=True,
                anti_spoofing=anti_spoofing,
            )
            if not result:
                continue
            face_conf = result[0].get("face_confidence", 1.0)
            emb = np.array(result[0]["embedding"], dtype=np.float32)
            if det != detector:
                logger.info(f"Used fallback detector '{det}' (primary '{detector}' failed)")
            if detector == VERIFY_DETECTOR:
                facial_area = result[0].get("facial_area", {})
                tilt_deg, eye_span_ratio = _estimate_face_pose(facial_area)
                if tilt_deg > MAX_FACE_TILT_DEG:
                    raise ValueError(
                        f"Khuôn mặt nghiêng quá nhiều ({tilt_deg:.1f}°), vui lòng nhìn thẳng vào camera"
                    )
                if eye_span_ratio < MIN_EYE_SPAN_RATIO:
                    raise ValueError(
                        f"Khuôn mặt quay ngang quá nhiều (span={eye_span_ratio:.2f}), vui lòng nhìn thẳng vào camera"
                    )
            return normalize_vec(emb), float(face_conf)
        except ValueError as e:
            msg = str(e)
            if "nghiêng" in msg or "quay ngang" in msg:
                raise
            last_err = e
            continue
        except Exception as e:
            last_err = e
            continue

    raise ValueError(str(last_err) if last_err else "No face detected")


def cosine_distance_batch(probe: np.ndarray, gallery: np.ndarray) -> np.ndarray:
    """Vectorized cosine distance: probe (D,) vs gallery (N, D)."""
    return 1.0 - gallery @ probe


def top_k_vote(probe: np.ndarray, embeddings: np.ndarray) -> tuple[float, int, float, float]:
    """Top-K voting: kết hợp số phiếu + khoảng cách trung bình."""
    distances = cosine_distance_batch(probe, embeddings)
    votes = int(np.sum(distances < THRESHOLD))
    if votes == 0:
        return 0.0, 0, float(np.min(distances)), 0.0
    winning_dists = distances[distances < THRESHOLD]
    avg_dist = float(np.mean(winning_dists))
    vote_ratio = votes / len(embeddings)
    score = VOTE_WEIGHT_COUNT * vote_ratio + VOTE_WEIGHT_DIST * (1.0 - avg_dist)
    min_dist = float(np.min(distances))
    return score, votes, min_dist, avg_dist


def _required_votes(embedding_count: int) -> int:
    if embedding_count <= 2:
        return embedding_count
    return max(2, int(np.ceil(embedding_count * MATCH_MIN_VOTE_RATIO)))


def _pick_primary_face(image: np.ndarray):
    if _liveness_detector is None:
        raise ValueError("Liveness detector not initialized")

    faces = _liveness_detector.detect(image)
    if not faces:
        raise ValueError("No face detected for liveness")

    def face_area(face: Any) -> float:
        x1, y1, x2, y2 = face.bbox[:4]
        return max(0.0, float(x2 - x1)) * max(0.0, float(y2 - y1))

    return max(faces, key=face_area)


def _detect_liveness_face(image: np.ndarray) -> Any:
    if _liveness_detector is None:
        raise ValueError("Liveness detector not initialized")

    faces = _liveness_detector.detect(image)
    if not faces:
        raise ValueError("No face detected for liveness")

    def face_area(face: Any) -> float:
        x1, y1, x2, y2 = face.bbox[:4]
        return max(0.0, float(x2 - x1)) * max(0.0, float(y2 - y1))

    faces = sorted(faces, key=face_area, reverse=True)
    primary_area = face_area(faces[0])
    if len(faces) > 1 and primary_area > 0:
        secondary_area = face_area(faces[1])
        if secondary_area / primary_area > 0.25:
            raise ValueError("Multiple faces detected")

    return faces[0]


def _parse_spoof_result(result: Any) -> tuple[bool, float]:
    if hasattr(result, "is_real"):
        return bool(result.is_real), float(result.confidence)

    if isinstance(result, (tuple, list)) and len(result) >= 2:
        label_idx, score = result[0], result[1]
        return int(label_idx) == 1, float(score)

    raise ValueError(f"Unsupported spoofing result format: {type(result)!r}")


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _frame_quality(image: np.ndarray, bbox: Any) -> tuple[float, str]:
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    brightness = float(np.mean(gray))
    blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    x1, y1, x2, y2 = [int(v) for v in bbox[:4]]
    h, w = gray.shape[:2]
    face_w = max(1, x2 - x1)
    face_h = max(1, y2 - y1)
    face_area_ratio = (face_w * face_h) / max(1, w * h)

    if brightness < LIVENESS_MIN_BRIGHTNESS:
        return 0.0, f"brightness_low: value={brightness:.1f} threshold={LIVENESS_MIN_BRIGHTNESS}"
    if brightness > LIVENESS_MAX_BRIGHTNESS:
        return 0.0, f"brightness_high: value={brightness:.1f} threshold={LIVENESS_MAX_BRIGHTNESS}"
    if blur < LIVENESS_MIN_BLUR:
        return 0.0, f"blur_low: value={blur:.1f} threshold={LIVENESS_MIN_BLUR}"
    if face_area_ratio < 0.035:
        return 0.0, f"face_area_low: value={face_area_ratio:.4f} threshold=0.035"

    brightness_score = 1.0 - min(abs(brightness - 125.0) / 125.0, 1.0)
    blur_score = _clamp01((blur - LIVENESS_MIN_BLUR) / 120.0)
    area_score = _clamp01((face_area_ratio - 0.035) / 0.16)
    return 0.45 * brightness_score + 0.35 * blur_score + 0.20 * area_score, "OK"


def compute_pose(face_kps: Any, bbox: Any) -> tuple[float, float]:
    """
    Tính yaw/pitch từ 5 keypoints InsightFace: [left_eye, right_eye, nose, mouth_left, mouth_right].
    yaw < 0 = nghiêng trái, > 0 = nghiêng phải. pitch < 0 = ngẩng lên, > 0 = cúi.
    Trả về (yaw, pitch) tính bằng radian ước tính (không phải chính xác Euler nhưng ổn định).
    """
    try:
        kps = np.array(face_kps, dtype=np.float32)
        if kps.shape[0] < 5:
            return 0.0, 0.0
        left_eye, right_eye, nose_tip, mouth_l, mouth_r = kps[0], kps[1], kps[2], kps[3], kps[4]

        eye_center_x = (left_eye[0] + right_eye[0]) / 2
        eye_center_y = (left_eye[1] + right_eye[1]) / 2
        eye_width = abs(right_eye[0] - left_eye[0])
        if eye_width < 5:
            return 0.0, 0.0

        # Yaw: normalized horizontal offset of nose from eye center
        yaw = -(nose_tip[0] - eye_center_x) / eye_width

        # Pitch: ratio (eye→nose) vs (nose→mouth) — frontal ≈ 0, up = negative, down = positive
        mouth_center_y = (mouth_l[1] + mouth_r[1]) / 2
        eye_to_nose = nose_tip[1] - eye_center_y
        nose_to_mouth = mouth_center_y - nose_tip[1]
        total_v = eye_to_nose + nose_to_mouth
        pitch = (eye_to_nose - nose_to_mouth) / total_v if total_v > 0 else 0.0

        return float(yaw), float(pitch)
    except Exception:
        return 0.0, 0.0


def pose_score(yaw: float, pitch: float) -> float:
    """Score 0-1: 1.0 = frontal (yaw=0, pitch=0), 0.0 = severely angled."""
    yaw_penalty  = _clamp01(abs(yaw) / 0.35)   # 0.35 rad ≈ 20° max
    pitch_penalty = _clamp01(abs(pitch) / 0.35)
    return _clamp01(1.0 - 0.6 * yaw_penalty - 0.4 * pitch_penalty)


def _crop_aligned_face(image: np.ndarray, bbox: Any) -> np.ndarray:
    h, w = image.shape[:2]
    x1, y1, x2, y2 = [float(v) for v in bbox[:4]]
    pad_x = (x2 - x1) * 0.20
    pad_y = (y2 - y1) * 0.20
    sx = max(0, int(x1 - pad_x))
    sy = max(0, int(y1 - pad_y))
    ex = min(w, int(x2 + pad_x))
    ey = min(h, int(y2 + pad_y))
    crop = image[sy:ey, sx:ex]
    if crop.size == 0:
        raise ValueError("Invalid face crop")
    gray = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
    return cv2.resize(gray, (96, 96), interpolation=cv2.INTER_AREA)


def _lbp_texture_score(image: np.ndarray, bbox: Any) -> float:
    """
    Compute LBP texture variance on face region.
    Real skin → high entropy. Screen/print → low entropy.
    """
    h, w = image.shape[:2]
    x1, y1, x2, y2 = [int(v) for v in bbox[:4]]
    pad = int((x2 - x1) * 0.05)
    sx, sy = max(0, x1 - pad), max(0, y1 - pad)
    ex, ey = min(w, x2 + pad), min(h, y2 + pad)
    face_crop = image[sy:ey, sx:ex]
    if face_crop.size == 0:
        return 1.0

    gray = cv2.cvtColor(face_crop, cv2.COLOR_RGB2GRAY) if len(face_crop.shape) == 3 else face_crop
    gray = cv2.resize(gray, (128, 128), interpolation=cv2.INTER_AREA).astype(np.int16)

    center = gray[1:-1, 1:-1]
    lbp = np.zeros(center.shape, dtype=np.uint8)
    lbp |= ((gray[0:-2, 0:-2] >= center).astype(np.uint8) << 7)
    lbp |= ((gray[0:-2, 1:-1] >= center).astype(np.uint8) << 6)
    lbp |= ((gray[0:-2, 2:]   >= center).astype(np.uint8) << 5)
    lbp |= ((gray[1:-1, 2:]   >= center).astype(np.uint8) << 4)
    lbp |= ((gray[2:,   2:]   >= center).astype(np.uint8) << 3)
    lbp |= ((gray[2:,   1:-1] >= center).astype(np.uint8) << 2)
    lbp |= ((gray[2:,   0:-2] >= center).astype(np.uint8) << 1)
    lbp |= ((gray[1:-1, 0:-2] >= center).astype(np.uint8) << 0)

    hist, _ = np.histogram(lbp.ravel(), bins=256, range=(0, 256))
    hist = hist.astype(np.float64)
    hist /= max(hist.sum(), 1.0)
    hist_nonzero = hist[hist > 0]
    entropy = -np.sum(hist_nonzero * np.log2(hist_nonzero))
    return float(entropy / 8.0)
