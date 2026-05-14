"""
Face Recognition AI Service
Dùng DeepFace + ArcFace model để enroll và verify khuôn mặt.
"""
import os
import json
import math
import base64
import logging
import numpy as np
import cv2
from io import BytesIO
from PIL import Image
import PIL.ImageOps
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any
import deepface.DeepFace as DeepFace
from uniface import RetinaFace
from uniface.spoofing import MiniFASNet

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Face Recognition AI Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_NAME        = "ArcFace"      # ArcFace: 99.83% trên LFW — chuẩn công nghiệp
ENROLL_DETECTOR   = "retinaface"   # accurate detector cho enrollment
VERIFY_DETECTOR   = "yunet"        # OpenCV DNN detector: fast + reliable cho webcam kiosk
VERIFY_DETECTOR_FB= "ssd"          # fallback nếu yunet miss
THRESHOLD         = 0.50           # vote threshold; nới để không mất vote khi biểu cảm thay đổi (cười, etc.)
MATCH_MAX_DISTANCE = 0.38          # confidence >= 0.62; data thực tế scan tốt ~0.12-0.35
MATCH_MIN_SCORE  = 0.58            # scan hợp lệ thấp nhất ~0.61
MATCH_MIN_MARGIN = 0.050           # top-1 phải rõ ràng hơn top-2
MATCH_MIN_VOTE_RATIO = 0.30
ENROLL_MIN_CONF   = 0.65           # quality filter enroll
VOTE_WEIGHT_COUNT = 0.40
VOTE_WEIGHT_DIST  = 0.60
LIVENESS_MIN_VALID_FRAMES = 4
LIVENESS_PASS_RATIO = 0.65
LIVENESS_MIN_SCORE = 0.78          # khôi phục mức gốc — chặn phone screen tốt hơn
LIVENESS_FINAL_MIN_SCORE = 0.72   # khôi phục mức gốc
LIVENESS_MAX_FRAMES = 12
LIVENESS_MIN_BRIGHTNESS = 35.0
LIVENESS_MAX_BRIGHTNESS = 225.0
LIVENESS_MIN_BLUR = 18.0
FLAT_MOTION_MIN_SHIFT = 0.08
FLAT_MOTION_MAX_ALIGNED_DIFF = 0.018
# LBP texture analysis — detect screen moiré pattern
LBP_SCREEN_THRESHOLD = 0.35       # LBP variance below this → likely screen/print
TOP_K_MATCHES = 5
MAX_FACE_TILT_DEG  = 20.0   # roll > 20° → nghiêng đầu quá nhiều
MIN_EYE_SPAN_RATIO = 0.22   # inter-eye-width/face-width < 0.22 → quay ngang quá nhiều


# ─── Startup: warm up models ─────────────────────────────────────────────────

_models_loaded = False
_liveness_detector: Optional[RetinaFace] = None
_liveness_spoofer: Optional[MiniFASNet] = None

@app.on_event("startup")
async def warmup():
    """Pre-load ArcFace + yunet/ssd detector weights + anti-spoofing models."""
    global _models_loaded
    try:
        global _liveness_detector, _liveness_spoofer
        logger.info("Warming up ArcFace + yunet/ssd detectors + MiniFASNet + DeepFace anti-spoof...")
        dummy = np.zeros((112, 112, 3), dtype=np.uint8)
        for det in [VERIFY_DETECTOR, VERIFY_DETECTOR_FB]:
            try:
                DeepFace.represent(dummy, model_name=MODEL_NAME, detector_backend=det,
                                   enforce_detection=False)
            except Exception:
                pass
        # Warmup DeepFace anti-spoofing (downloads MiniFASNetV1+V2 on first run)
        try:
            DeepFace.extract_faces(dummy, detector_backend="skip", anti_spoofing=True, enforce_detection=False)
        except Exception:
            pass
        _liveness_detector = RetinaFace()
        _liveness_spoofer = MiniFASNet()
        _models_loaded = True
        logger.info("Warmup complete")
    except Exception as e:
        logger.warning(f"Warmup failed (non-fatal): {e}")

    # Init RAG chatbot (non-blocking)
    import asyncio
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _init_rag)


# ─── Helpers ─────────────────────────────────────────────────────────────────

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
    tilt_deg: góc nghiêng đầu (roll) tính từ đường nối 2 mắt
    eye_span_ratio: tỷ lệ khoảng cách 2 mắt / chiều rộng khuôn mặt
                    — nhỏ khi face quay ngang nhiều (yaw lớn)
    facial_area = {"x","y","w","h","left_eye":(x,y),"right_eye":(x,y)}
    """
    le = facial_area.get("left_eye")
    re = facial_area.get("right_eye")
    fw = facial_area.get("w", 0)
    if not le or not re or fw <= 0:
        return 0.0, 1.0  # không đủ data → không reject
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
    Raises ValueError nếu không phát hiện được khuôn mặt.
    """
    img_array = preprocess_image(img_array)

    detectors_to_try = [detector]
    # Thêm fallback nếu đang dùng verify detector
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
            # Kiểm tra góc mặt — chỉ áp dụng khi verify (không cần thiết lúc enroll)
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
                raise  # pose rejection — không thử fallback
            last_err = e
            continue
        except Exception as e:
            last_err = e
            continue

    raise ValueError(str(last_err) if last_err else "No face detected")


def cosine_distance_batch(probe: np.ndarray, gallery: np.ndarray) -> np.ndarray:
    """
    Vectorized cosine distance: probe (D,) vs gallery (N, D).
    Cả hai đều đã L2-normalized nên: distance = 1 - dot product.
    """
    return 1.0 - gallery @ probe


def top_k_vote(probe: np.ndarray, embeddings: np.ndarray) -> tuple[float, int, float, float]:
    """
    Top-K voting: kết hợp số phiếu + khoảng cách trung bình.
    Trả về (composite_score, vote_count).
    Score cao hơn = match tốt hơn.
    """
    distances = cosine_distance_batch(probe, embeddings)
    votes = int(np.sum(distances < THRESHOLD))
    if votes == 0:
        return 0.0, 0, float(np.min(distances)), 0.0
    # Khoảng cách trung bình của các embeddings thắng vote
    winning_dists = distances[distances < THRESHOLD]
    avg_dist = float(np.mean(winning_dists))
    # Tỷ lệ phiếu (0→1) + khoảng cách tốt nhất
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
        return 0.0, f"Frame quá tối ({brightness:.1f})"
    if brightness > LIVENESS_MAX_BRIGHTNESS:
        return 0.0, f"Frame quá sáng ({brightness:.1f})"
    if blur < LIVENESS_MIN_BLUR:
        return 0.0, f"Frame bị mờ ({blur:.1f})"
    if face_area_ratio < 0.035:
        return 0.0, f"Khuôn mặt quá nhỏ ({face_area_ratio:.3f})"

    brightness_score = 1.0 - min(abs(brightness - 125.0) / 125.0, 1.0)
    blur_score = _clamp01((blur - LIVENESS_MIN_BLUR) / 120.0)
    area_score = _clamp01((face_area_ratio - 0.035) / 0.16)
    return 0.45 * brightness_score + 0.35 * blur_score + 0.20 * area_score, "OK"


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
    Compute LBP (Local Binary Pattern) texture variance on face region.
    Real skin has rich micro-texture → high LBP entropy.
    Screen/print has uniform pixel grid (moiré) → low LBP entropy.
    Returns normalized score 0-1 (higher = more likely real).
    """
    h, w = image.shape[:2]
    x1, y1, x2, y2 = [int(v) for v in bbox[:4]]
    # Crop face region with small padding
    pad = int((x2 - x1) * 0.05)
    sx, sy = max(0, x1 - pad), max(0, y1 - pad)
    ex, ey = min(w, x2 + pad), min(h, y2 + pad)
    face_crop = image[sy:ey, sx:ex]
    if face_crop.size == 0:
        return 1.0  # can't analyze, don't penalize

    gray = cv2.cvtColor(face_crop, cv2.COLOR_RGB2GRAY) if len(face_crop.shape) == 3 else face_crop
    gray = cv2.resize(gray, (128, 128), interpolation=cv2.INTER_AREA).astype(np.int16)

    # Vectorized LBP computation (8-neighbor, radius=1)
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

    # Entropy of LBP histogram — higher entropy = more texture variety = real
    hist, _ = np.histogram(lbp.ravel(), bins=256, range=(0, 256))
    hist = hist.astype(np.float64)
    hist /= max(hist.sum(), 1.0)
    hist_nonzero = hist[hist > 0]
    entropy = -np.sum(hist_nonzero * np.log2(hist_nonzero))
    # Normalize: max entropy for 256 bins = 8.0
    return float(entropy / 8.0)


def _analyze_temporal_liveness(samples: list[dict[str, Any]]) -> tuple[bool, float, str]:
    if len(samples) < LIVENESS_MIN_VALID_FRAMES:
        return False, 0.0, "Không đủ frame hợp lệ để phân tích chuyển động"

    centers = []
    sizes = []
    crops = []
    for sample in samples:
        x1, y1, x2, y2 = [float(v) for v in sample["bbox"][:4]]
        width = max(1.0, x2 - x1)
        height = max(1.0, y2 - y1)
        centers.append(((x1 + x2) / 2.0, (y1 + y2) / 2.0))
        sizes.append((width, height))
        crops.append(sample["crop"])

    avg_w = max(1.0, float(np.mean([s[0] for s in sizes])))
    avg_h = max(1.0, float(np.mean([s[1] for s in sizes])))
    center_shift = max(
        abs(centers[i][0] - centers[i - 1][0]) / avg_w +
        abs(centers[i][1] - centers[i - 1][1]) / avg_h
        for i in range(1, len(centers))
    )
    size_shift = max(
        abs(sizes[i][0] - sizes[i - 1][0]) / avg_w +
        abs(sizes[i][1] - sizes[i - 1][1]) / avg_h
        for i in range(1, len(sizes))
    )

    aligned_diffs = [
        float(np.mean(cv2.absdiff(crops[i], crops[i - 1]))) / 255.0
        for i in range(1, len(crops))
    ]
    avg_aligned_diff = float(np.mean(aligned_diffs)) if aligned_diffs else 0.0
    external_motion = max(center_shift, size_shift)

    suspicious_flat_motion = (
        external_motion >= FLAT_MOTION_MIN_SHIFT and
        avg_aligned_diff <= FLAT_MOTION_MAX_ALIGNED_DIFF
    )
    if suspicious_flat_motion:
        return (
            False,
            0.0,
            "Phát hiện chuyển động phẳng giống ảnh bị lắc "
            f"(motion={external_motion:.3f}, diff={avg_aligned_diff:.3f})",
        )

    deformation_score = _clamp01(avg_aligned_diff / 0.055)
    stable_score = 1.0 - _clamp01(max(0.0, external_motion - 0.35) / 0.55)
    temporal_score = 0.65 * stable_score + 0.35 * deformation_score
    return True, temporal_score, (
        f"Temporal OK (motion={external_motion:.3f}, diff={avg_aligned_diff:.3f})"
    )


def analyze_liveness_frames(frames: list[str]) -> tuple[bool, float, str]:
    if not frames:
        return False, 0.0, "No frames provided"

    frames = frames[:LIVENESS_MAX_FRAMES]

    valid_scores: list[float] = []
    real_scores: list[float] = []
    quality_scores: list[float] = []
    lbp_scores: list[float] = []
    temporal_samples: list[dict[str, Any]] = []

    for idx, frame_b64 in enumerate(frames):
        try:
            frame = base64_to_image(frame_b64)

            # Use DeepFace anti_spoofing (MiniFASNetV1 + V2 combined)
            try:
                face_objs = DeepFace.extract_faces(
                    img_path=frame,
                    detector_backend=VERIFY_DETECTOR,
                    enforce_detection=True,
                    anti_spoofing=True,
                )
                if not face_objs:
                    logger.warning("Liveness frame %s: no face detected by DeepFace", idx + 1)
                    continue
                face_obj = face_objs[0]
                is_real = face_obj.get("is_real", False)
                score = float(face_obj.get("antispoof_score", 0.0))
            except ValueError as ve:
                # DeepFace raises ValueError on spoof detection or no face
                logger.warning("Liveness frame %s: DeepFace error: %s", idx + 1, ve)
                is_real = False
                score = 0.0

            # Also run uniface MiniFASNet for comparison/ensemble
            try:
                face = _detect_liveness_face(frame)
                uniface_real, uniface_score = _parse_spoof_result(_liveness_spoofer.predict(frame, face.bbox))

                quality_score, quality_message = _frame_quality(frame, face.bbox)
                if quality_score <= 0.0:
                    logger.warning("Liveness frame %s quality failed: %s", idx + 1, quality_message)
                    continue

                temporal_samples.append({
                    "bbox": face.bbox,
                    "crop": _crop_aligned_face(frame, face.bbox),
                })
                quality_scores.append(float(quality_score))

                # LBP texture analysis
                lbp_score = _lbp_texture_score(frame, face.bbox)
                lbp_scores.append(lbp_score)
            except Exception:
                uniface_real = is_real
                uniface_score = score
                quality_scores.append(0.5)
                lbp_scores.append(0.7)

            # Ensemble: both DeepFace AND uniface must agree it's real
            # Use average score from both
            combined_score = (score + uniface_score) / 2.0
            combined_real = is_real and uniface_real

            valid_scores.append(combined_score)
            if combined_real:
                real_scores.append(combined_score)

            logger.info(
                "Liveness frame %s: deepface(real=%s, score=%.4f) uniface(real=%s, score=%.4f) combined=%.4f lbp=%.4f",
                idx + 1, is_real, score, uniface_real, uniface_score, combined_score,
                lbp_scores[-1] if lbp_scores else 0,
            )
        except Exception as exc:
            logger.warning("Liveness frame %s failed: %s", idx + 1, exc)

    if len(valid_scores) < LIVENESS_MIN_VALID_FRAMES:
        return False, 0.0, "Không đủ frame hợp lệ để xác minh người thật"

    pass_ratio = len(real_scores) / len(valid_scores)
    avg_real_score = float(np.mean(real_scores)) if real_scores else 0.0

    if pass_ratio < LIVENESS_PASS_RATIO or avg_real_score < LIVENESS_MIN_SCORE:
        return False, avg_real_score, (
            f"Phát hiện giả mạo hoặc replay attack "
            f"(pass_ratio={pass_ratio:.2f}, score={avg_real_score:.2f})"
        )

    # LBP texture check
    avg_lbp = float(np.mean(lbp_scores)) if lbp_scores else 1.0
    if avg_lbp < LBP_SCREEN_THRESHOLD:
        return False, avg_real_score, (
            f"Phát hiện texture bất thường — nghi ngờ màn hình/ảnh in "
            f"(lbp_score={avg_lbp:.3f}, threshold={LBP_SCREEN_THRESHOLD})"
        )

    temporal_ok, temporal_score, temporal_message = _analyze_temporal_liveness(temporal_samples)
    if not temporal_ok:
        return False, avg_real_score, temporal_message

    quality_score = float(np.mean(quality_scores)) if quality_scores else 0.0
    final_score = (
        0.50 * _clamp01(avg_real_score) +
        0.20 * _clamp01(temporal_score) +
        0.15 * _clamp01(quality_score) +
        0.15 * _clamp01(avg_lbp)
    )
    if final_score < LIVENESS_FINAL_MIN_SCORE:
        return False, final_score, (
            f"Liveness score thấp (final={final_score:.2f}, anti_spoof={avg_real_score:.2f}, "
            f"temporal={temporal_score:.2f}, quality={quality_score:.2f}, lbp={avg_lbp:.2f})"
        )

    return True, final_score, f"Liveness passed; {temporal_message}; lbp={avg_lbp:.3f}"


# ─── Request/Response Models ─────────────────────────────────────────────────

class EnrollRequest(BaseModel):
    images: list[str]

class EnrollResponse(BaseModel):
    success: bool
    embeddings: list[list[float]]
    count: int
    message: str
    skipped: list[str]   # lý do bỏ qua ảnh

class ProfileEmbeddings(BaseModel):
    profile_id: str
    embeddings: list[list[float]]

class TopKMatch(BaseModel):
    profile_id: str
    confidence: float
    min_distance: float
    vote_count: int
    score: float

class BatchVerifyRequest(BaseModel):
    image: str
    frames: list[str] = []
    profiles: list[ProfileEmbeddings]
    require_liveness: bool = True

class BatchVerifyResponse(BaseModel):
    matched: bool
    profile_id: Optional[str]
    confidence: float
    vote_count: int
    liveness_passed: bool
    liveness_score: float
    message: str
    top_k_matches: list[TopKMatch] = []

class VerifyRequest(BaseModel):
    image: str
    stored_embeddings: list[list[float]]

class VerifyResponse(BaseModel):
    matched: bool
    confidence: float
    message: str


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "OK", "model": MODEL_NAME, "models_loaded": _models_loaded, "liveness": "MiniFASNet"}


@app.post("/enroll", response_model=EnrollResponse)
def enroll(req: EnrollRequest):
    """
    Enroll: dùng retinaface (chính xác) + quality filter.
    Ảnh bị bỏ qua nếu face_confidence < ENROLL_MIN_CONF.
    """
    if not req.images:
        raise HTTPException(status_code=400, detail="No images provided")

    embeddings = []
    skipped = []

    for i, img_b64 in enumerate(req.images):
        try:
            emb, face_conf = get_embedding(base64_to_image(img_b64), detector=ENROLL_DETECTOR)
            if face_conf < ENROLL_MIN_CONF:
                skipped.append(f"Ảnh {i+1}: chất lượng thấp ({face_conf:.2f} < {ENROLL_MIN_CONF})")
                logger.warning(f"Skipped image {i+1}: face_conf={face_conf:.2f}")
                continue
            embeddings.append(emb.tolist())
            logger.info(f"Enrolled image {i+1}/{len(req.images)}, conf={face_conf:.2f}")
        except Exception as e:
            skipped.append(f"Ảnh {i+1}: {str(e)}")
            logger.warning(f"Failed to enroll image {i+1}: {e}")

    if not embeddings:
        raise HTTPException(status_code=422,
            detail=f"No quality faces detected. Issues: {skipped}")

    return EnrollResponse(
        success=True,
        embeddings=embeddings,
        count=len(embeddings),
        message=f"Enrolled {len(embeddings)}/{len(req.images)} images"
                + (f" — skipped {len(skipped)}" if skipped else ""),
        skipped=skipped,
    )


@app.post("/verify-batch", response_model=BatchVerifyResponse)
def verify_batch(req: BatchVerifyRequest):
    """
    Batch verify với top-K voting:
    1. Anti-spoofing check (chặn ảnh in / video replay)
    2. Extract probe embedding với opencv (nhanh)
    3. Với mỗi profile: top-K voting (số embeddings thắng + avg distance)
    4. Chọn profile có composite score cao nhất
    """
    if not req.profiles:
        return BatchVerifyResponse(matched=False, profile_id=None, confidence=0.0,
                                   vote_count=0, liveness_passed=False,
                                   liveness_score=0.0, message="No profiles",
                                   top_k_matches=[])

    liveness_ok = True
    liveness_message = "Liveness skipped"
    if req.require_liveness:
        liveness_ok, liveness_score, liveness_message = analyze_liveness_frames(req.frames or [req.image])
        if not liveness_ok:
            logger.warning("Liveness failed: %s", liveness_message)
    else:
        liveness_score = 0.0

    # 1. Extract probe embedding even when liveness fails so the kiosk can log
    # top-K diagnostic candidates. Attendance is still blocked when liveness fails.
    try:
        probe, _ = get_embedding(base64_to_image(req.image),
                                 detector=VERIFY_DETECTOR,
                                 anti_spoofing=False)
    except Exception as e:
        err_msg = str(e)
        logger.warning(f"Probe failed ({err_msg})")
        return BatchVerifyResponse(
            matched=False,
            profile_id=None,
            confidence=0.0,
            vote_count=0,
            liveness_passed=(not req.require_liveness) or liveness_ok,
            liveness_score=round(liveness_score, 4),
            message=f"No face detected: {err_msg}",
            top_k_matches=[],
        )

    # 2. Top-K voting across all profiles
    best_score    = 0.0
    best_id       = None
    best_votes    = 0
    best_min_dist = float("inf")
    best_embedding_count = 0
    top_candidates = []

    for profile in req.profiles:
        if not profile.embeddings:
            continue
        gallery = np.array(profile.embeddings, dtype=np.float32)
        score, votes, min_dist, avg_vote_dist = top_k_vote(probe, gallery)
        distances = cosine_distance_batch(probe, gallery)
        confidence_for_profile = float(max(0.0, 1.0 - min_dist))
        required_votes = _required_votes(len(profile.embeddings))
        top_candidates.append({
            "profile_id": profile.profile_id,
            "confidence": round(confidence_for_profile, 4),
            "min_distance": round(min_dist, 4),
            "vote_count": int(votes),
            "score": round(float(score), 4),
        })

        candidate_eligible = (
            votes >= required_votes and
            min_dist <= MATCH_MAX_DISTANCE and
            score >= MATCH_MIN_SCORE
        )

        if candidate_eligible and (score > best_score or
           (score == best_score and
            min_dist < best_min_dist)):
            best_score = score
            best_id = profile.profile_id
            best_votes = votes
            best_min_dist = min_dist
            best_embedding_count = len(profile.embeddings)

    candidate_matched = best_id is not None and best_votes > 0
    confidence = round(float(max(0.0, 1.0 - best_min_dist)) if candidate_matched else 0.0, 4)
    top_k_matches = sorted(
        top_candidates,
        key=lambda item: (item["confidence"], item["vote_count"], item["score"]),
        reverse=True,
    )[:TOP_K_MATCHES]
    margin = 1.0
    if len(top_k_matches) > 1:
        margin = float(top_k_matches[0]["confidence"] - top_k_matches[1]["confidence"])

    if candidate_matched and margin < MATCH_MIN_MARGIN:
        logger.info(
            "BatchVerify rejected by margin: profile=%s confidence=%.4f margin=%.4f required=%.4f",
            best_id, confidence, margin, MATCH_MIN_MARGIN,
        )
        candidate_matched = False

    matched = candidate_matched and ((not req.require_liveness) or liveness_ok)

    logger.info(f"BatchVerify: matched={matched}, candidate={candidate_matched}, profile={best_id}, "
                f"votes={best_votes}, score={best_score:.4f}, dist={best_min_dist:.4f}, "
                f"margin={margin:.4f}, embeddings={best_embedding_count}, liveness={liveness_ok}")

    if req.require_liveness and not liveness_ok:
        message = liveness_message
    elif matched:
        message = "Match found"
    elif best_id is not None and margin < MATCH_MIN_MARGIN:
        message = "Không đủ chắc chắn: khuôn mặt quá giống nhiều hồ sơ"
    else:
        message = "No match"

    return BatchVerifyResponse(
        matched=matched,
        profile_id=best_id if matched else None,
        confidence=confidence,
        vote_count=best_votes,
        liveness_passed=(not req.require_liveness) or liveness_ok,
        liveness_score=round(liveness_score, 4),
        message=message,
        top_k_matches=top_k_matches,
    )


@app.post("/verify", response_model=VerifyResponse)
def verify(req: VerifyRequest):
    """Legacy single-profile verify (backward compat)."""
    if not req.stored_embeddings:
        return VerifyResponse(matched=False, confidence=0.0, message="No stored embeddings")
    try:
        probe, _ = get_embedding(base64_to_image(req.image), detector=VERIFY_DETECTOR)
    except Exception as e:
        return VerifyResponse(matched=False, confidence=0.0, message=f"No face: {str(e)}")

    gallery = np.array(req.stored_embeddings, dtype=np.float32)
    _, votes, _, _ = top_k_vote(probe, gallery)
    distances = cosine_distance_batch(probe, gallery)
    min_dist = float(np.min(distances))
    matched = votes > 0
    return VerifyResponse(matched=matched, confidence=round(max(0.0, 1.0 - min_dist), 4),
                          message="Match" if matched else "No match")


# ─── RAG Chatbot ─────────────────────────────────────────────────────────────

import glob as _glob
import re as _re
import threading as _threading
from pathlib import Path as _Path
from typing import List as _List

_rag_init_lock = _threading.Lock()

# Lazy-loaded RAG components
_chroma_client = None
_chroma_collection = None
_embedder = None
_bm25_index = None
_bm25_chunks: _List[dict] = []
_reranker = None
_rag_ready = False

# Semantic cache: list of (query_embedding, answer, sources)
_sem_cache: _List[tuple] = []
SEM_CACHE_THRESHOLD = 0.95   # cosine similarity ≥ này → cache hit
SEM_CACHE_MAX = 200          # tối đa 200 entries

DOCS_DIR = _Path("/app/docs/chatbot")
CHROMA_DIR = _Path("/app/chroma_data")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_GRADER_MODEL = os.environ.get("GROQ_GRADER_MODEL", "llama-3.1-8b-instant")
COMMON_FILE = "00-chung.md"
CONFIDENCE_THRESHOLD = 0.32  # cân bằng: đủ cao để chặn hallucination, đủ thấp để bắt enum/mã

SYSTEM_PROMPT = """Bạn là trợ lý ERP An Binh Foods. Hướng dẫn nhân viên sử dụng hệ thống theo ngôn ngữ người dùng thông thường.

NGUYÊN TẮC BẮT BUỘC:
1. CHỈ trả lời dựa trên thông tin có trong CONTEXT bên dưới. Nếu CONTEXT không chứa thông tin để trả lời → BẮT BUỘC nói: "Tôi không tìm thấy thông tin về [chủ đề] trong tài liệu. Vui lòng liên hệ quản trị viên hoặc trưởng phòng."
2. TUYỆT ĐỐI KHÔNG được suy luận, đoán, hay bịa đặt đường dẫn menu/tab/nút nếu không thấy rõ ràng trong CONTEXT.
3. TUYỆT ĐỐI không dùng tên kỹ thuật/component như: Modal, Component, Tab ID, camelCase, PascalCase
   - SAI: "Mở PrivateFeedbackModal", "vào QuotationRequestManagement", "tab quotationRequests"
   - ĐÚNG: "Nhấn nút **Góp ý riêng**", "vào tab **Danh sách yêu cầu BG**"
4. Dùng đúng tên hiển thị trên giao diện (in đậm), ví dụ:
   - Tên menu/tab: **Chức năng chung**, **Danh sách yêu cầu BG**, **Bộ phận chất lượng**
   - Tên nút: **"Thêm mới"**, **"Lưu"**, **"Xin nghỉ phép"**, **"Góp ý riêng"**
   - Tên trường: **Loại nghỉ phép**, **Ngày bắt đầu**, **Lý do**
5. Hướng dẫn theo đường dẫn thực tế: Menu → Tab → Nút → Form
6. Trường bắt buộc ghi ✅, không bắt buộc bỏ qua
7. Sau câu trả lời, gợi ý 1-2 câu hỏi tiếp theo ngắn gọn

VÍ DỤ ĐÚNG:
Câu hỏi: "Tôi muốn góp ý với sếp"
Trả lời:
Vào menu **Chức năng chung** → nhấn **"Góp ý riêng"**. Điền:
- **Nội dung góp ý** ✅
- **Mục đích góp ý** ✅
- Ghi chú, File đính kèm (tùy chọn)
Nhấn **"Gửi"** để hoàn tất.

Bạn có thể hỏi thêm: "Ai có thể xem góp ý của tôi?" hoặc "Nêu khó khăn khác với Góp ý riêng như thế nào?"

VÍ DỤ ĐÚNG:
Câu hỏi: "Tạo YCBG như thế nào?"
Trả lời:
Vào **Bộ phận kinh doanh** → tab **Danh sách yêu cầu BG** → nhấn **"Thêm yêu cầu báo giá"**. Điền:
- **Khách hàng** ✅ — chọn từ danh sách
- **Sản phẩm** ✅ — nhấn **"Thêm sản phẩm"** để thêm dòng, điền Số lượng ✅ và Đơn vị tính ✅
- Hình thức vận chuyển, thanh toán, Ghi chú (tùy chọn)
Nhấn **"Tạo mới"** để lưu.

Bạn có thể hỏi thêm: "Hình thức thanh toán có những lựa chọn nào?" hoặc "Sau khi tạo YCBG thì làm gì tiếp?"
"""


def _parse_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter từ markdown file."""
    if not content.startswith("---"):
        return {}, content
    end = content.find("---", 3)
    if end == -1:
        return {}, content
    fm_text = content[3:end].strip()
    body = content[end + 3:].strip()
    meta = {}
    for line in fm_text.splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            meta[key.strip()] = val.strip().strip('"')
    return meta, body


def _extract_tables(text: str) -> _List[str]:
    """Trích xuất các bảng markdown từ text."""
    tables = []
    lines = text.splitlines()
    current: _List[str] = []
    in_table = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("|") and "|" in stripped[1:]:
            in_table = True
            current.append(line)
        else:
            if in_table and current:
                tables.append("\n".join(current))
                current = []
            in_table = False
    if in_table and current:
        tables.append("\n".join(current))
    return tables


def _summarize_table(table_md: str, section_title: str) -> str:
    """
    Tóm tắt bảng markdown thành plain-text để retrieval tốt hơn.
    Không dùng LLM, parse trực tiếp để nhanh và không tốn tài nguyên.
    """
    lines = [l.strip() for l in table_md.strip().splitlines() if l.strip()]
    # Lọc dòng separator (|---|---|)
    data_lines = [l for l in lines if not _re.match(r"^\|[-| :]+\|$", l)]
    if not data_lines:
        return ""

    # Parse header
    headers = [c.strip() for c in data_lines[0].strip("|").split("|")]
    rows = []
    for line in data_lines[1:]:
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) == len(headers):
            rows.append(dict(zip(headers, cells)))

    if not rows:
        return ""

    # Sinh plain-text summary
    parts = [f"Bảng '{section_title}' gồm {len(rows)} dòng với các cột: {', '.join(headers)}."]
    # Liệt kê tối đa 5 dòng đầu
    for row in rows[:5]:
        row_text = "; ".join(f"{k}: {v}" for k, v in row.items() if v and v not in ("-", "—", ""))
        if row_text:
            parts.append(row_text)
    if len(rows) > 5:
        parts.append(f"... và {len(rows) - 5} dòng khác.")
    return "\n".join(parts)


def _chunk_by_header(body: str, meta: dict, filename: str) -> _List[dict]:
    """
    Chunk markdown theo mọi cấp heading (##, ###, ####).
    Mỗi chunk = 1 section nhỏ, giữ nguyên nội dung bảng/list bên trong.
    Heading cha được prepend vào chunk con để giữ context.
    Sinh thêm chunk tóm tắt plain-text cho mỗi bảng markdown.
    """
    chunks = []
    lines = body.splitlines()

    heading_stack: list[tuple[int, str]] = []
    current_lines: list[str] = []
    current_title = ""
    current_level = 0

    def _heading_level(line: str) -> int:
        m = _re.match(r"^(#{2,4})\s", line)
        return len(m.group(1)) if m else 0

    def _flush(title: str, level: int, content_lines: list[str]):
        text = "\n".join(content_lines).strip()
        if not text:
            return
        breadcrumb = " > ".join(t for _, t in heading_stack if _ < level)
        full_title = f"{breadcrumb} > {title}" if breadcrumb else title
        chunk_text = f"## {full_title}\n\n{text}"
        chunks.append({
            "text": chunk_text,
            "metadata": {
                "department": meta.get("department", "ALL"),
                "filename": filename,
                "section": full_title,
                "type": "content",
            }
        })
        # Sinh thêm table summary chunks
        for table_md in _extract_tables(text):
            summary = _summarize_table(table_md, full_title)
            if summary:
                chunks.append({
                    "text": summary,
                    "metadata": {
                        "department": meta.get("department", "ALL"),
                        "filename": filename,
                        "section": full_title,
                        "type": "table_summary",
                    }
                })

    for line in lines:
        lvl = _heading_level(line)
        if lvl >= 2:
            if current_title:
                _flush(current_title, current_level, current_lines)
            heading_stack = [(l, t) for l, t in heading_stack if l < lvl]
            heading_stack.append((lvl, line.lstrip("#").strip()))
            current_title = line.lstrip("#").strip()
            current_level = lvl
            current_lines = []
        else:
            current_lines.append(line)

    if current_title:
        _flush(current_title, current_level, current_lines)

    return chunks


def _docs_hash() -> str:
    """Tính hash của tất cả docs để phát hiện thay đổi."""
    import hashlib
    h = hashlib.md5()
    for f in sorted(DOCS_DIR.glob("*.md")):
        h.update(f.read_bytes())
    return h.hexdigest()


def _init_rag():
    """Khởi tạo RAG: load docs, embed, lưu vào ChromaDB + BM25 + FlashRank. Chỉ rebuild khi docs thay đổi."""
    global _chroma_client, _chroma_collection, _embedder, _bm25_index, _bm25_chunks, _reranker, _rag_ready

    if _rag_ready:
        return

    with _rag_init_lock:
        if _rag_ready:  # double-checked locking
            return

        try:
            import chromadb
            from sentence_transformers import SentenceTransformer
            from rank_bm25 import BM25Okapi
            from flashrank import Ranker

            logger.info("Initializing RAG chatbot...")

            _embedder = SentenceTransformer("AITeamVN/Vietnamese_Embedding_v2")
            _reranker = Ranker(model_name="ms-marco-MultiBERT-L-12", cache_dir=str(CHROMA_DIR / "flashrank_cache"))
            logger.info("FlashRank reranker loaded")

            CHROMA_DIR.mkdir(parents=True, exist_ok=True)
            _chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))

            current_hash = _docs_hash()
            hash_file = CHROMA_DIR / "docs_hash.txt"
            stored_hash = hash_file.read_text().strip() if hash_file.exists() else ""

            collection_exists = "erp_docs" in _chroma_client.list_collections()

            doc_files = sorted(DOCS_DIR.glob("*.md"))
            if not doc_files:
                logger.warning(f"No docs found in {DOCS_DIR}")
                return

            all_chunks = []
            for doc_path in doc_files:
                content = doc_path.read_text(encoding="utf-8")
                meta, body = _parse_frontmatter(content)
                chunks = _chunk_by_header(body, meta, doc_path.name)
                all_chunks.extend(chunks)

            if not all_chunks:
                logger.warning("No chunks loaded from docs")
                return

            tokenized = [_re.findall(r"\w+", c["text"].lower()) for c in all_chunks]
            _bm25_index = BM25Okapi(tokenized)
            _bm25_chunks = all_chunks
            logger.info(f"BM25 index built: {len(all_chunks)} chunks (incl. table summaries)")

            if collection_exists and stored_hash == current_hash:
                logger.info("Docs unchanged — reusing existing ChromaDB index")
                _chroma_collection = _chroma_client.get_collection("erp_docs")
                _rag_ready = True
                return

            logger.info("Docs changed or first run — rebuilding ChromaDB index...")
            try:
                _chroma_client.delete_collection("erp_docs")
            except Exception:
                pass

            _chroma_collection = _chroma_client.create_collection(
                name="erp_docs",
                metadata={"hnsw:space": "cosine"}
            )

            batch_size = 50
            for i in range(0, len(all_chunks), batch_size):
                batch = all_chunks[i:i + batch_size]
                texts = [c["text"] for c in batch]
                embeddings = _embedder.encode(texts, normalize_embeddings=True).tolist()
                _chroma_collection.add(
                    ids=[f"chunk_{i + j}" for j in range(len(batch))],
                    embeddings=embeddings,
                    documents=texts,
                    metadatas=[c["metadata"] for c in batch],
                )
                logger.info(f"  Indexed {min(i + batch_size, len(all_chunks))}/{len(all_chunks)} chunks")

            hash_file.write_text(current_hash)
            _rag_ready = True
            logger.info(f"RAG ready: {len(all_chunks)} chunks indexed")

        except Exception as e:
            logger.error(f"RAG init failed: {e}")


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    department: str = ""
    role: str = ""
    history: _List[ChatMessage] = []


class ChatResponse(BaseModel):
    answer: str
    sources: _List[str] = []
    context_texts: _List[str] = []  # raw chunk texts cho RAGAS evaluation


class FeedbackRequest(BaseModel):
    message_id: str = ""  # optional: ID tin nhắn
    question: str
    answer: str
    rating: int  # 1 = 👍, -1 = 👎
    comment: str = ""
    department: str = ""
    role: str = ""


def _rrf_fuse(
    dense_ids: list[str],
    dense_docs: list[str],
    dense_metas: list[dict],
    dense_distances: list[float],
    bm25_chunks: list[dict],
    bm25_indices: list[int],
    k: int = 60,
    top_n: int = 20,
) -> list[dict]:
    """
    Reciprocal Rank Fusion: kết hợp kết quả dense (ChromaDB) và sparse (BM25).
    BM25 dùng cùng ID scheme `chunk_N` với ChromaDB để deduplication hoạt động đúng.
    Trả về top_n chunks kèm _cosine_sim để dùng cho confidence gate.
    """
    scores: dict[str, float] = {}
    chunk_map: dict[str, dict] = {}
    dist_map: dict[str, float] = {}

    # Dense results — IDs dạng "chunk_N"
    for rank, (cid, doc, meta, dist) in enumerate(zip(dense_ids, dense_docs, dense_metas, dense_distances)):
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank + 1)
        chunk_map[cid] = {"text": doc, "metadata": meta}
        dist_map[cid] = dist  # cosine distance (0=identical)

    # BM25 results — dùng cùng ID "chunk_N" để dedup với dense
    for rank, idx in enumerate(bm25_indices):
        cid = f"chunk_{idx}"  # khớp với ChromaDB IDs
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank + 1)
        if cid not in chunk_map:
            chunk_map[cid] = bm25_chunks[idx]
            # BM25-only chunk: dùng score BM25 làm proxy confidence (normalize về [0,1])
            # Không có cosine distance → đặt dist=0.4 (tương đương sim=0.6, trên threshold)
            dist_map[cid] = 0.4

    sorted_ids = sorted(scores, key=lambda x: scores[x], reverse=True)

    result = []
    for cid in sorted_ids[:top_n]:
        chunk = dict(chunk_map[cid])
        chunk["_rrf_score"] = scores[cid]
        chunk["_cosine_sim"] = 1.0 - dist_map.get(cid, 1.0)
        result.append(chunk)
    return result


def _rerank(query: str, candidates: list[dict], top_n: int) -> list[dict]:
    """
    FlashRank cross-encoder reranking: score lại candidates theo relevance với query.
    Fallback về RRF order nếu reranker chưa sẵn sàng.
    """
    if _reranker is None:
        return candidates[:top_n]
    try:
        from flashrank import RerankRequest
        passages = [{"id": i, "text": c["text"]} for i, c in enumerate(candidates)]
        request = RerankRequest(query=query, passages=passages)
        results = _reranker.rerank(request)
        # results là list[dict] với "id" và "score"
        reranked = sorted(results, key=lambda x: x["score"], reverse=True)[:top_n]
        return [candidates[r["id"]] for r in reranked]
    except Exception as e:
        logger.warning(f"Reranking failed, using RRF order: {e}")
        return candidates[:top_n]


def _build_retrieval(
    query_text: str,
    original_message: str,
    department: str,
    role: str = "",
) -> tuple[list[dict], bool]:
    """
    Pipeline retrieval: dense + BM25 -> RRF -> confidence gate -> rerank.
    Tra ve (chunks, is_confident).
    """
    # ADMIN hoặc câu hỏi hỏi về bộ phận khác -> không filter, tìm toàn bộ KB
    CROSS_DEPT_KEYWORDS = ["bộ phận", "phòng ban", "kế toán", "kinh doanh", "thu mua",
                           "sản xuất", "kỹ thuật", "chất lượng", "tổng hợp", "admin"]
    # Chức năng HR/chung — nằm trong DEPT_QUALITY nhưng áp dụng cho tất cả bộ phận
    # Dùng phrase patterns (verb + noun) để tránh false positive
    HR_ACTION_PATTERNS = [
        "xóa nhân viên", "thêm nhân viên", "sửa nhân viên", "tạo nhân viên",
        "quản lý nhân viên", "danh sách nhân viên", "hồ sơ nhân viên",
        "bảng lương", "tính lương", "xem lương", "quản lý lương",
        "đánh giá nhân viên", "điểm danh", "chấm công",
        "quản lý vị trí", "cấp độ lương", "quản lý user", "tạo tài khoản",
        "khóa tài khoản", "đơn nghỉ phép", "duyệt nghỉ phép",
    ]
    # Fallback: single keywords chỉ khi kết hợp với action verbs
    HR_NOUNS = ["nhân viên", "lương", "vị trí", "cấp độ", "tài khoản", "user"]
    HR_VERBS = ["xóa", "thêm", "sửa", "tạo", "quản lý", "danh sách", "cập nhật", "khóa", "mở khóa"]

    msg_lower = original_message.lower()
    is_admin = role.upper() == "ADMIN"
    is_cross_dept = any(kw in msg_lower for kw in CROSS_DEPT_KEYWORDS)

    # Detect HR intent: phrase match hoặc (verb + noun) combo
    is_hr_intent = any(p in msg_lower for p in HR_ACTION_PATTERNS)
    if not is_hr_intent:
        has_hr_noun = any(n in msg_lower for n in HR_NOUNS)
        has_hr_verb = any(v in msg_lower for v in HR_VERBS)
        is_hr_intent = has_hr_noun and has_hr_verb

    use_filter = department and not is_admin and not is_cross_dept

    # Dense retrieval
    query_embedding = _embedder.encode([query_text], normalize_embeddings=True).tolist()[0]

    where_filter = None
    if use_filter:
        dept_conditions = [
            {"department": {"$eq": department}},
            {"department": {"$eq": "ALL"}},
            {"filename": {"$eq": COMMON_FILE}},
        ]
        # HR intent → thêm DEPT_QUALITY vào filter (nơi chứa quản lý nhân viên)
        if is_hr_intent and department != "DEPT_QUALITY":
            dept_conditions.append({"department": {"$eq": "DEPT_QUALITY"}})
        where_filter = {"$or": dept_conditions}

    dense_results = _chroma_collection.query(
        query_embeddings=[query_embedding],
        n_results=20,
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )
    dense_ids = dense_results.get("ids", [[]])[0]
    dense_docs = dense_results.get("documents", [[]])[0]
    dense_metas = dense_results.get("metadatas", [[]])[0]
    dense_distances = dense_results.get("distances", [[]])[0]

    # BM25 retrieval
    query_tokens = _re.findall(r"\w+", query_text.lower())
    bm25_scores = _bm25_index.get_scores(query_tokens).copy()
    if use_filter:
        for i, chunk in enumerate(_bm25_chunks):
            dept = chunk["metadata"].get("department", "ALL")
            fname = chunk["metadata"].get("filename", "")
            # Cho phép: cùng department, ALL, common file, hoặc DEPT_QUALITY nếu HR intent
            allowed = (dept == department or dept == "ALL" or fname == COMMON_FILE)
            if is_hr_intent and dept == "DEPT_QUALITY":
                allowed = True
            if not allowed:
                bm25_scores[i] = 0.0
    bm25_top = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)[:20]

    # RRF fusion — lấy top-20 candidates cho reranker
    candidates = _rrf_fuse(
        dense_ids, dense_docs, dense_metas, dense_distances,
        _bm25_chunks, bm25_top,
        k=60, top_n=20,
    )

    if not candidates:
        return [], False

    # Confidence gate: kiểm tra top-1 cosine similarity
    top_sim = candidates[0].get("_cosine_sim", 0.0)
    is_confident = top_sim >= CONFIDENCE_THRESHOLD

    if not is_confident:
        logger.info(f"Low confidence (top_sim={top_sim:.3f}) for query: {original_message[:60]}")
        return [], False

    # Rerank top-20 → top-N
    how_to_kw = ["làm thế nào", "hướng dẫn", "tạo", "thêm", "điền",
                 "nhập", "các bước", "quy trình", "form", "trường", "ô"]
    top_n = 6 if any(kw in original_message.lower() for kw in how_to_kw) else 4
    reranked = _rerank(original_message, candidates, top_n)

    # Lost-in-the-middle mitigation
    if len(reranked) > 2:
        reranked = [reranked[0]] + reranked[1:-1] + [reranked[-1]]

    return reranked, True


# ─── Semantic Cache ───────────────────────────────────────────────────────────

def _cosine_sim_vec(a: list[float], b: list[float]) -> float:
    """Cosine similarity giữa 2 vectors đã normalize."""
    dot = sum(x * y for x, y in zip(a, b))
    return min(1.0, max(-1.0, dot))


def _sem_cache_lookup(query_emb: list[float]) -> tuple | None:
    """Tìm cache hit: trả về (answer, sources) nếu similarity >= threshold."""
    best_sim = 0.0
    best_entry = None
    for cached_emb, answer, sources in _sem_cache:
        sim = _cosine_sim_vec(query_emb, cached_emb)
        if sim > best_sim:
            best_sim = sim
            best_entry = (answer, sources)
    if best_sim >= SEM_CACHE_THRESHOLD and best_entry:
        logger.info(f"Semantic cache hit (sim={best_sim:.3f})")
        return best_entry
    return None


def _sem_cache_put(query_emb: list[float], answer: str, sources: list[str]):
    """Lưu vào cache, giữ tối đa SEM_CACHE_MAX entries (FIFO)."""
    _sem_cache.append((query_emb, answer, sources))
    if len(_sem_cache) > SEM_CACHE_MAX:
        _sem_cache.pop(0)


# ─── Faithfulness Check ───────────────────────────────────────────────────────

_FAITHFULNESS_PROMPT = """Bạn là một hệ thống kiểm tra tính trung thực.

CONTEXT:
{context}

CÂU TRẢ LỜI CẦN KIỂM TRA:
{answer}

Hãy đánh giá: Câu trả lời có mâu thuẫn hoặc bịa đặt thông tin KHÔNG có trong CONTEXT không?
Chỉ trả lời một trong hai: PASS hoặc FAIL
- PASS: câu trả lời dựa trên context, không bịa đặt
- FAIL: câu trả lời có thông tin không có trong context hoặc mâu thuẫn với context"""


def _faithfulness_check(answer: str, chunks: list[dict]) -> bool:
    """
    Dùng Groq (model nhỏ, nhanh) để kiểm tra answer có faithful với context không.
    Trả về True nếu PASS, False nếu FAIL.
    Fallback True nếu check lỗi (không block response).
    """
    if not GROQ_API_KEY:
        return True  # skip nếu không có API key

    try:
        from groq import Groq
        context_short = "\n\n".join(c["text"][:300] for c in chunks[:3])
        prompt = _FAITHFULNESS_PROMPT.format(
            context=context_short,
            answer=answer[:500],
        )
        client = Groq(api_key=GROQ_API_KEY)
        resp = client.chat.completions.create(
            model=GROQ_GRADER_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=10,
        )
        verdict = resp.choices[0].message.content.strip().upper()
        passed = "PASS" in verdict
        if not passed:
            logger.warning(f"Faithfulness FAIL — verdict: {verdict[:50]}")
        return passed
    except Exception as e:
        logger.warning(f"Faithfulness check skipped: {e}")
        return True  # fail-open: không block nếu grader lỗi


# ─── LLM (Groq only) ──────────────────────────────────────────────────────────

def _call_llm(messages: list[dict]) -> str:
    """Gọi Groq LLM với retry khi rate limit."""
    import time as _time
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.1,
                max_tokens=600,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            err_str = str(e)
            if "429" in err_str:
                # Daily limit (TPD) → không retry, raise ngay
                if "tokens per day" in err_str or "TPD" in err_str:
                    logger.error("Groq daily token limit reached")
                    raise RuntimeError("DAILY_LIMIT_REACHED")
                # Rate limit tạm thời → retry
                if attempt < 2:
                    wait = (attempt + 1) * 5  # 5s, 10s
                    logger.warning(f"Groq rate limit, retry in {wait}s (attempt {attempt + 1})")
                    _time.sleep(wait)
                else:
                    raise
            else:
                raise


def _stream_llm(messages: list[dict]):
    """Generator: yield từng token từ Groq LLM."""
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    stream = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.1,
        max_tokens=600,
        stream=True,
    )
    for chunk in stream:
        token = chunk.choices[0].delta.content or ""
        if token:
            yield token


SYNONYMS = {
    "đh": "đơn hàng",
    "ncc": "nhà cung cấp",
    "nvl": "nguyên vật liệu",
    "kh": "khách hàng",
    "nv": "nhân viên",
    "sl": "số lượng",
    "đvt": "đơn vị tính",
    "tt": "thanh toán",
    "sx": "sản xuất",
    "kd": "kinh doanh",
}


def _expand_query(message: str) -> str:
    expanded = message.lower()
    for abbr, full in SYNONYMS.items():
        expanded = _re.sub(rf"\b{abbr}\b", full, expanded)
    return message if expanded == message.lower() else f"{message} {expanded}"


_REWRITE_PROMPT = """Bạn là query rewriter cho hệ thống ERP An Binh Foods.
Nhiệm vụ: viết lại câu hỏi của nhân viên thành dạng rõ ràng, đầy đủ hơn để tìm kiếm tài liệu.

QUY TẮC:
- Giữ nguyên ý nghĩa gốc, KHÔNG thêm thông tin mới
- Mở rộng viết tắt, thêm từ đồng nghĩa liên quan
- Nếu câu hỏi đã rõ ràng → trả về nguyên văn
- CHỈ trả về câu hỏi đã rewrite, không giải thích

Ví dụ:
- "tạo ycbg" → "hướng dẫn tạo yêu cầu báo giá, các bước và trường cần điền"
- "xóa nv" → "cách xóa nhân viên khỏi hệ thống, quy trình xóa nhân viên"
- "quy trình đặt hàng quốc tế" → "quy trình đặt hàng quốc tế"
"""


def _rewrite_query(message: str) -> str:
    """Rewrite query mơ hồ/ngắn thành dạng rõ ràng hơn cho retrieval. Fail-safe: trả về original."""
    # Chỉ rewrite khi query ngắn hoặc mơ hồ (< 30 ký tự hoặc < 5 từ)
    words = message.split()
    if len(message) > 60 or len(words) > 8:
        return message  # query đã đủ rõ, không cần rewrite

    if not GROQ_API_KEY:
        return message

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        resp = client.chat.completions.create(
            model=GROQ_GRADER_MODEL,  # dùng model nhẹ cho rewrite
            messages=[
                {"role": "system", "content": _REWRITE_PROMPT},
                {"role": "user", "content": message},
            ],
            temperature=0.0,
            max_tokens=100,
        )
        rewritten = resp.choices[0].message.content.strip()
        # Sanity check: không quá dài, không rỗng
        if rewritten and len(rewritten) < 200:
            logger.info(f"Query rewrite: '{message}' → '{rewritten}'")
            return rewritten
        return message
    except Exception as e:
        logger.warning(f"Query rewrite failed (using original): {e}")
        return message


def _build_messages(req: "ChatRequest", chunks: list[dict]) -> list[dict]:
    # Chỉ dùng content chunks cho LLM context, bỏ table_summary (đã dùng để retrieve)
    content_chunks = [c for c in chunks if c.get("metadata", {}).get("type") != "table_summary"]
    # Fallback: nếu không có content chunk nào thì dùng tất cả
    if not content_chunks:
        content_chunks = chunks

    # Giới hạn context: tối đa 6 chunks, mỗi chunk tối đa 800 ký tự
    MAX_CHUNKS = 6
    MAX_CHUNK_CHARS = 800
    trimmed = []
    for c in content_chunks[:MAX_CHUNKS]:
        text = c["text"]
        if len(text) > MAX_CHUNK_CHARS:
            text = text[:MAX_CHUNK_CHARS] + "\n...(còn nữa)"
        trimmed.append(text)

    context = "\n\n---\n\n".join(trimmed)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in req.history[-4:]:  # giảm history để tiết kiệm context
        messages.append({"role": h.role, "content": h.content})
    role_line = f"[Vai trò: {req.role}] " if req.role else ""
    messages.append({"role": "user", "content": (
        f"CONTEXT:\n{context}\n\n---\n\n"
        f"LƯU Ý: Nếu CONTEXT ở trên KHÔNG chứa thông tin liên quan đến câu hỏi, "
        f"hãy trả lời: 'Tôi không tìm thấy thông tin này trong tài liệu.'\n\n"
        f"{role_line}CÂU HỎI: {req.message}"
    )})
    return messages


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """RAG chatbot: semantic cache + hybrid search + confidence gate + reranking + faithfulness."""
    if not _rag_ready:
        _init_rag()
        if not _rag_ready:
            raise HTTPException(status_code=503, detail="RAG not ready, please retry")

    try:
        query_text = _expand_query(req.message)
        rewritten = _rewrite_query(query_text)
        query_emb = _embedder.encode([rewritten], normalize_embeddings=True).tolist()[0]

        # ── Semantic cache lookup ─────────────────────────────────────────────
        if not req.history:
            cached = _sem_cache_lookup(query_emb)
            if cached:
                return ChatResponse(answer=cached[0], sources=cached[1])

        # ── Retrieval ─────────────────────────────────────────────────────────
        chunks, confident = _build_retrieval(rewritten, req.message, req.department, req.role)

        if not confident or not chunks:
            return ChatResponse(
                answer="Tôi không tìm thấy thông tin liên quan trong tài liệu ERP. Vui lòng thử hỏi theo cách khác hoặc liên hệ quản trị viên.",
                sources=[]
            )

        sources = []
        context_texts = []
        for c in chunks:
            meta = c.get("metadata", {})
            label = f"{meta.get('filename', '')} - {meta.get('section', '')}".strip(" -")
            if label and label not in sources:
                sources.append(label)
            context_texts.append(c["text"])

        # ── Generate ──────────────────────────────────────────────────────────
        messages = _build_messages(req, chunks)
        answer = _call_llm(messages)

        # ── Faithfulness check ────────────────────────────────────────────────
        if not _faithfulness_check(answer, chunks):
            answer = (
                "Xin lỗi, tôi không thể đưa ra câu trả lời chắc chắn dựa trên tài liệu hiện có. "
                "Vui lòng liên hệ quản trị viên hoặc trưởng phòng để được hỗ trợ."
            )
            return ChatResponse(answer=answer, sources=sources, context_texts=context_texts)

        # ── Cache kết quả ─────────────────────────────────────────────────────
        if not req.history:
            _sem_cache_put(query_emb, answer, sources)

        return ChatResponse(answer=answer, sources=sources, context_texts=context_texts)

    except Exception as e:
        if "DAILY_LIMIT_REACHED" in str(e):
            return ChatResponse(
                answer="Hệ thống trợ lý đang tạm quá tải. Vui lòng thử lại sau 30 phút hoặc liên hệ quản trị viên.",
                sources=[]
            )
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """Streaming RAG: semantic cache + hybrid search + confidence gate + reranking."""
    from fastapi.responses import StreamingResponse as _StreamingResponse

    if not _rag_ready:
        _init_rag()
        if not _rag_ready:
            raise HTTPException(status_code=503, detail="RAG not ready, please retry")

    query_text = _expand_query(req.message)
    rewritten = _rewrite_query(query_text)
    query_emb = _embedder.encode([rewritten], normalize_embeddings=True).tolist()[0]

    # Semantic cache (chỉ khi không có history)
    if not req.history:
        cached = _sem_cache_lookup(query_emb)
        if cached:
            async def _from_cache():
                yield cached[0]
            return _StreamingResponse(_from_cache(), media_type="text/plain; charset=utf-8")

    chunks, confident = _build_retrieval(rewritten, req.message, req.department)

    if not confident or not chunks:
        async def _no_info():
            yield "Tôi không tìm thấy thông tin liên quan trong tài liệu ERP. Vui lòng thử hỏi theo cách khác hoặc liên hệ quản trị viên."
        return _StreamingResponse(_no_info(), media_type="text/plain; charset=utf-8")

    messages = _build_messages(req, chunks)

    collected: list[str] = []
    sources = []
    for c in chunks:
        meta = c.get("metadata", {})
        label = f"{meta.get('filename', '')} - {meta.get('section', '')}".strip(" -")
        if label and label not in sources:
            sources.append(label)

    async def _generate():
        import asyncio
        import queue as _queue

        token_queue: _queue.Queue = _queue.Queue()
        loop = asyncio.get_event_loop()

        def _sync_stream():
            try:
                for token in _stream_llm(messages):
                    token_queue.put(token)
            finally:
                token_queue.put(None)

        loop.run_in_executor(None, _sync_stream)

        while True:
            try:
                token = await loop.run_in_executor(None, lambda: token_queue.get(timeout=300))
            except Exception:
                break
            if token is None:
                break
            collected.append(token)
            yield token

        if not req.history and collected:
            _sem_cache_put(query_emb, "".join(collected), sources)

    return _StreamingResponse(_generate(), media_type="text/plain; charset=utf-8")


# ─── Feedback endpoint ────────────────────────────────────────────────────────

_FEEDBACK_FILE = _Path("/app/chroma_data/feedback.jsonl")


@app.post("/chat/feedback")
def chat_feedback(req: FeedbackRequest):
    """Lưu feedback 👍/👎 từ user vào JSONL file để phân tích sau."""
    import datetime as _dt
    entry = {
        "timestamp": _dt.datetime.now().isoformat(),
        "message_id": req.message_id,
        "question": req.question,
        "answer": req.answer[:500],  # truncate để tiết kiệm disk
        "rating": req.rating,
        "comment": req.comment,
        "department": req.department,
        "role": req.role,
    }
    try:
        _FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(_FEEDBACK_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        logger.info(f"Feedback saved: rating={req.rating} dept={req.department} q='{req.question[:40]}'")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Feedback save error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save feedback")


@app.get("/chat/feedback/stats")
def chat_feedback_stats():
    """Thống kê feedback: tổng, positive, negative."""
    if not _FEEDBACK_FILE.exists():
        return {"total": 0, "positive": 0, "negative": 0, "recent": []}
    lines = _FEEDBACK_FILE.read_text(encoding="utf-8").strip().split("\n")
    entries = [json.loads(l) for l in lines if l.strip()]
    positive = sum(1 for e in entries if e.get("rating", 0) > 0)
    negative = sum(1 for e in entries if e.get("rating", 0) < 0)
    recent = entries[-10:][::-1]  # 10 gần nhất, mới nhất trước
    return {"total": len(entries), "positive": positive, "negative": negative, "recent": recent}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
