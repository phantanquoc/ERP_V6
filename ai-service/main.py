"""
Face Recognition AI Service
Dùng DeepFace + ArcFace model để enroll và verify khuôn mặt.
"""
import os
import json
import base64
import logging
import numpy as np
from io import BytesIO
from PIL import Image
import PIL.ImageOps
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import deepface.DeepFace as DeepFace

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
THRESHOLD         = 0.68           # ArcFace cosine distance threshold (recommended)
ENROLL_MIN_CONF   = 0.70           # quality filter: giảm từ 0.85 để không bỏ sót ảnh hợp lệ
VOTE_WEIGHT_COUNT = 0.40           # trọng số số phiếu trong top-K voting
VOTE_WEIGHT_DIST  = 0.60           # trọng số khoảng cách trung bình


# ─── Startup: warm up models ─────────────────────────────────────────────────

_models_loaded = False

@app.on_event("startup")
async def warmup():
    """Pre-load ArcFace + yunet/ssd detector weights."""
    global _models_loaded
    try:
        logger.info("Warming up ArcFace + yunet/ssd detectors...")
        dummy = np.zeros((112, 112, 3), dtype=np.uint8)
        for det in [VERIFY_DETECTOR, VERIFY_DETECTOR_FB]:
            try:
                DeepFace.represent(dummy, model_name=MODEL_NAME, detector_backend=det,
                                   enforce_detection=False)
            except Exception:
                pass
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
            return normalize_vec(emb), float(face_conf)
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


def top_k_vote(probe: np.ndarray, embeddings: np.ndarray) -> tuple[float, int]:
    """
    Top-K voting: kết hợp số phiếu + khoảng cách trung bình.
    Trả về (composite_score, vote_count).
    Score cao hơn = match tốt hơn.
    """
    distances = cosine_distance_batch(probe, embeddings)
    votes = int(np.sum(distances < THRESHOLD))
    if votes == 0:
        return 0.0, 0
    # Khoảng cách trung bình của các embeddings thắng vote
    winning_dists = distances[distances < THRESHOLD]
    avg_dist = float(np.mean(winning_dists))
    # Tỷ lệ phiếu (0→1) + khoảng cách tốt nhất
    vote_ratio = votes / len(embeddings)
    score = VOTE_WEIGHT_COUNT * vote_ratio + VOTE_WEIGHT_DIST * (1.0 - avg_dist)
    return score, votes


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

class BatchVerifyRequest(BaseModel):
    image: str
    profiles: list[ProfileEmbeddings]
    anti_spoofing: bool = False  # tắt default: deepface anti-spoof quá aggressive với webcam thật

class BatchVerifyResponse(BaseModel):
    matched: bool
    profile_id: Optional[str]
    confidence: float
    vote_count: int
    message: str

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
    return {"status": "OK", "model": MODEL_NAME, "models_loaded": _models_loaded}


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
                                   vote_count=0, message="No profiles")

    # 1. Extract probe + optional anti-spoofing
    try:
        probe, _ = get_embedding(base64_to_image(req.image),
                                 detector=VERIFY_DETECTOR,
                                 anti_spoofing=req.anti_spoofing)
    except Exception as e:
        err_msg = str(e)
        is_spoof = "spoof" in err_msg.lower() or "fake" in err_msg.lower()
        logger.warning(f"Probe failed ({'spoofing detected' if is_spoof else err_msg})")
        return BatchVerifyResponse(
            matched=False, profile_id=None, confidence=0.0, vote_count=0,
            message="Phát hiện giả mạo — vui lòng không dùng ảnh hoặc video" if is_spoof
                    else f"No face detected: {err_msg}",
        )

    # 2. Top-K voting across all profiles
    best_score    = 0.0
    best_id       = None
    best_votes    = 0
    best_min_dist = float("inf")

    for profile in req.profiles:
        if not profile.embeddings:
            continue
        gallery = np.array(profile.embeddings, dtype=np.float32)
        score, votes = top_k_vote(probe, gallery)

        if votes > 0 and (score > best_score or
           (score == best_score and
            float(np.min(cosine_distance_batch(probe, gallery))) < best_min_dist)):
            best_score = score
            best_id = profile.profile_id
            best_votes = votes
            best_min_dist = float(np.min(cosine_distance_batch(probe, gallery)))

    matched = best_id is not None and best_votes > 0
    confidence = round(float(max(0.0, 1.0 - best_min_dist)) if matched else 0.0, 4)

    logger.info(f"BatchVerify: matched={matched}, profile={best_id}, "
                f"votes={best_votes}, score={best_score:.4f}, dist={best_min_dist:.4f}")

    return BatchVerifyResponse(
        matched=matched,
        profile_id=best_id if matched else None,
        confidence=confidence,
        vote_count=best_votes,
        message="Match found" if matched else "No match",
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
    _, votes = top_k_vote(probe, gallery)
    distances = cosine_distance_batch(probe, gallery)
    min_dist = float(np.min(distances))
    matched = votes > 0
    return VerifyResponse(matched=matched, confidence=round(max(0.0, 1.0 - min_dist), 4),
                          message="Match" if matched else "No match")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

