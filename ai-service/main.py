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
LIVENESS_MIN_VALID_FRAMES = 2
LIVENESS_PASS_RATIO = 0.65
LIVENESS_MIN_SCORE = 0.72          # nới từ 0.78 — webcam thường không đủ điều kiện lý tưởng
LIVENESS_FINAL_MIN_SCORE = 0.68   # nới từ 0.72
LIVENESS_MAX_FRAMES = 12
LIVENESS_MIN_BRIGHTNESS = 35.0
LIVENESS_MAX_BRIGHTNESS = 225.0
LIVENESS_MIN_BLUR = 12.0
FLAT_MOTION_MIN_SHIFT = 0.08
FLAT_MOTION_MAX_ALIGNED_DIFF = 0.018
TOP_K_MATCHES = 5
MAX_FACE_TILT_DEG  = 20.0   # roll > 20° → nghiêng đầu quá nhiều
MIN_EYE_SPAN_RATIO = 0.22   # inter-eye-width/face-width < 0.22 → quay ngang quá nhiều


# ─── Startup: warm up models ─────────────────────────────────────────────────

_models_loaded = False
_liveness_detector: Optional[RetinaFace] = None
_liveness_spoofer: Optional[MiniFASNet] = None

@app.on_event("startup")
async def warmup():
    """Pre-load ArcFace + yunet/ssd detector weights."""
    global _models_loaded
    try:
        global _liveness_detector, _liveness_spoofer
        logger.info("Warming up ArcFace + yunet/ssd detectors + MiniFASNet...")
        dummy = np.zeros((112, 112, 3), dtype=np.uint8)
        for det in [VERIFY_DETECTOR, VERIFY_DETECTOR_FB]:
            try:
                DeepFace.represent(dummy, model_name=MODEL_NAME, detector_backend=det,
                                   enforce_detection=False)
            except Exception:
                pass
        _liveness_detector = RetinaFace()
        _liveness_spoofer = MiniFASNet()
        _models_loaded = True
        logger.info("Warmup complete")
    except Exception as e:
        logger.warning(f"Warmup failed (non-fatal): {e}")


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
        return 0.0, f"brightness_low: value={brightness:.1f} threshold={LIVENESS_MIN_BRIGHTNESS}"
    if brightness > LIVENESS_MAX_BRIGHTNESS:
        return 0.0, f"brightness_high: value={brightness:.1f} threshold={LIVENESS_MAX_BRIGHTNESS}"
    if blur < LIVENESS_MIN_BLUR:
        return 0.0, f"blur_low: value={blur:.1f} threshold={LIVENESS_MIN_BLUR}"
    if face_area_ratio < 0.035:
        return 0.0, f"face_area_low: value={face_area_ratio:.3f} threshold=0.035"

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
    if _liveness_spoofer is None:
        raise ValueError("Liveness spoofer not initialized")

    if not frames:
        return False, 0.0, "No frames provided"

    frames = frames[:LIVENESS_MAX_FRAMES]

    valid_scores: list[float] = []
    real_scores: list[float] = []
    quality_scores: list[float] = []
    temporal_samples: list[dict[str, Any]] = []
    reject_reasons: dict[str, int] = {
        "detect_fail": 0,
        "brightness_low": 0,
        "brightness_high": 0,
        "blur_low": 0,
        "face_area_low": 0,
        "multi_face": 0,
        "other": 0,
    }

    for idx, frame_b64 in enumerate(frames):
        try:
            frame = base64_to_image(frame_b64)
            face = _detect_liveness_face(frame)
            quality_score, quality_message = _frame_quality(frame, face.bbox)
            if quality_score <= 0.0:
                reason_code = quality_message.split(":")[0] if ":" in quality_message else "other"
                if reason_code not in reject_reasons:
                    reason_code = "other"
                reject_reasons[reason_code] += 1
                logger.warning("Frame %s rejected: reason=%s details=%s", idx + 1, reason_code, quality_message)
                continue

            is_real, score = _parse_spoof_result(_liveness_spoofer.predict(frame, face.bbox))
            valid_scores.append(float(score))
            quality_scores.append(float(quality_score))
            temporal_samples.append({
                "bbox": face.bbox,
                "crop": _crop_aligned_face(frame, face.bbox),
            })
            if is_real:
                real_scores.append(float(score))
            logger.info(
                "Liveness frame %s: is_real=%s score=%.4f quality=%.4f",
                idx + 1, is_real, score, quality_score,
            )
        except Exception as exc:
            exc_str = str(exc)
            if "No face detected" in exc_str:
                reason_code = "detect_fail"
            elif "Multiple faces detected" in exc_str:
                reason_code = "multi_face"
            else:
                reason_code = "other"
            reject_reasons[reason_code] += 1
            logger.warning("Frame %s rejected: reason=%s exc=%s", idx + 1, reason_code, exc)

    logger.info(
        "Liveness batch: %d frames input, %d valid, rejects=%s",
        len(frames), len(valid_scores), dict(reject_reasons),
    )

    if len(valid_scores) < LIVENESS_MIN_VALID_FRAMES:
        return False, 0.0, "Không đủ frame hợp lệ để xác minh người thật"

    pass_ratio = len(real_scores) / len(valid_scores)
    avg_real_score = float(np.mean(real_scores)) if real_scores else 0.0

    if pass_ratio < LIVENESS_PASS_RATIO or avg_real_score < LIVENESS_MIN_SCORE:
        return False, avg_real_score, (
            f"Phát hiện giả mạo hoặc replay attack "
            f"(pass_ratio={pass_ratio:.2f}, score={avg_real_score:.2f})"
        )

    temporal_ok, temporal_score, temporal_message = _analyze_temporal_liveness(temporal_samples)
    if not temporal_ok:
        return False, avg_real_score, temporal_message

    quality_score = float(np.mean(quality_scores)) if quality_scores else 0.0
    final_score = (
        0.60 * _clamp01(avg_real_score) +
        0.25 * _clamp01(temporal_score) +
        0.15 * _clamp01(quality_score)
    )
    if final_score < LIVENESS_FINAL_MIN_SCORE:
        return False, final_score, (
            f"Liveness score thấp (final={final_score:.2f}, anti_spoof={avg_real_score:.2f}, "
            f"temporal={temporal_score:.2f}, quality={quality_score:.2f})"
        )

    return True, final_score, f"Liveness passed; {temporal_message}"


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
