"""
Face Recognition AI Service
Dùng DeepFace + FaceNet512 model để enroll và verify khuôn mặt.
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

app = FastAPI(title="Face Recognition AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_NAME      = "Facenet512"
ENROLL_DETECTOR = "retinaface"   # accurate detector for enrollment
VERIFY_DETECTOR = "opencv"       # fast detector for realtime kiosk verify (~10x faster)
THRESHOLD       = 0.38           # FaceNet512 cosine distance threshold


# ─── Startup: warm up models ─────────────────────────────────────────────────

_models_loaded = False

@app.on_event("startup")
async def warmup():
    """Pre-load model weights so first verify call is fast."""
    global _models_loaded
    try:
        logger.info("Warming up FaceNet512 + opencv detector...")
        dummy = np.zeros((160, 160, 3), dtype=np.uint8)
        try:
            DeepFace.represent(dummy, model_name=MODEL_NAME, detector_backend=VERIFY_DETECTOR,
                               enforce_detection=False)
        except Exception:
            pass
        _models_loaded = True
        logger.info("Warmup complete")
    except Exception as e:
        logger.warning(f"Warmup failed (non-fatal): {e}")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def preprocess_image(img: np.ndarray) -> np.ndarray:
    """Normalize brightness/contrast to handle lighting variation."""
    pil = PIL.ImageOps.autocontrast(Image.fromarray(img), cutoff=1)
    return np.array(pil)


def base64_to_image(b64: str) -> np.ndarray:
    if "," in b64:
        b64 = b64.split(",")[1]
    img_bytes = base64.b64decode(b64)
    img = Image.open(BytesIO(img_bytes)).convert("RGB")
    return np.array(img)


def get_embedding(img_array: np.ndarray, detector: str = ENROLL_DETECTOR) -> np.ndarray:
    """Extract L2-normalized face embedding."""
    img_array = preprocess_image(img_array)
    result = DeepFace.represent(
        img_path=img_array,
        model_name=MODEL_NAME,
        detector_backend=detector,
        enforce_detection=True,
    )
    if not result:
        raise ValueError("No face detected in image")
    emb = np.array(result[0]["embedding"], dtype=np.float32)
    norm = np.linalg.norm(emb)
    return emb / norm if norm > 0 else emb


def cosine_distance_batch(probe: np.ndarray, gallery: np.ndarray) -> np.ndarray:
    """
    Vectorized cosine distance: probe (512,) vs gallery (N, 512).
    Both are pre-normalized so distance = 1 - dot product.
    Returns distances array of shape (N,).
    """
    return 1.0 - gallery @ probe  # gallery rows are unit vectors


# ─── Request/Response Models ─────────────────────────────────────────────────

class EnrollRequest(BaseModel):
    images: list[str]

class EnrollResponse(BaseModel):
    success: bool
    embeddings: list[list[float]]
    count: int
    message: str

class ProfileEmbeddings(BaseModel):
    profile_id: str
    embeddings: list[list[float]]  # multiple samples per profile (pre-normalized from backend)

class BatchVerifyRequest(BaseModel):
    image: str                      # base64 from kiosk (full frame or face crop)
    profiles: list[ProfileEmbeddings]

class BatchVerifyResponse(BaseModel):
    matched: bool
    profile_id: Optional[str]
    confidence: float
    message: str

# Keep old single-profile verify for backwards compat
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
    """Enroll: uses accurate retinaface detector."""
    if not req.images:
        raise HTTPException(status_code=400, detail="No images provided")

    embeddings = []
    errors = []
    for i, img_b64 in enumerate(req.images):
        try:
            emb = get_embedding(base64_to_image(img_b64), detector=ENROLL_DETECTOR)
            embeddings.append(emb.tolist())
            logger.info(f"Enrolled image {i+1}/{len(req.images)}")
        except Exception as e:
            errors.append(f"Image {i+1}: {str(e)}")
            logger.warning(f"Failed to enroll image {i+1}: {e}")

    if not embeddings:
        raise HTTPException(status_code=422,
            detail=f"No faces detected in any image. Errors: {errors}")

    return EnrollResponse(
        success=True,
        embeddings=embeddings,
        count=len(embeddings),
        message=f"Enrolled {len(embeddings)}/{len(req.images)} images"
            + (f". Skipped: {errors}" if errors else ""),
    )


@app.post("/verify-batch", response_model=BatchVerifyResponse)
def verify_batch(req: BatchVerifyRequest):
    """
    Batch verify: ONE AI call for ALL profiles.
    - Uses fast opencv detector (vs retinaface in enroll)
    - Vectorized cosine similarity via numpy matrix ops
    - Returns which profile_id matched (or null)

    Speedup vs old approach: 10-50x depending on employee count.
    """
    if not req.profiles:
        return BatchVerifyResponse(matched=False, profile_id=None, confidence=0.0,
                                   message="No profiles to match against")

    # 1. Extract probe embedding (fast opencv detector)
    try:
        probe = get_embedding(base64_to_image(req.image), detector=VERIFY_DETECTOR)
    except Exception as e:
        logger.warning(f"Probe embedding failed: {e}")
        return BatchVerifyResponse(matched=False, profile_id=None, confidence=0.0,
                                   message=f"No face detected: {str(e)}")

    # 2. Build gallery matrix: for each profile take best (closest) sample
    #    Shape: (num_profiles, 512)
    best_distance = float("inf")
    best_profile_id = None

    for profile in req.profiles:
        if not profile.embeddings:
            continue
        # Stack all embeddings for this profile into matrix
        gallery = np.array(profile.embeddings, dtype=np.float32)
        # Vectorized cosine distances against all samples
        distances = cosine_distance_batch(probe, gallery)
        min_dist = float(np.min(distances))
        if min_dist < best_distance:
            best_distance = min_dist
            best_profile_id = profile.profile_id

    confidence = float(max(0.0, 1.0 - best_distance))
    matched = best_distance < THRESHOLD

    logger.info(f"BatchVerify: distance={best_distance:.4f}, threshold={THRESHOLD}, "
                f"matched={matched}, profile={best_profile_id if matched else 'none'}")

    return BatchVerifyResponse(
        matched=matched,
        profile_id=best_profile_id if matched else None,
        confidence=round(confidence, 4),
        message="Match found" if matched else "No match",
    )


@app.post("/verify", response_model=VerifyResponse)
def verify(req: VerifyRequest):
    """Legacy single-profile verify endpoint (kept for compatibility)."""
    if not req.stored_embeddings:
        return VerifyResponse(matched=False, confidence=0.0, message="No stored embeddings")

    try:
        probe = get_embedding(base64_to_image(req.image), detector=VERIFY_DETECTOR)
    except Exception as e:
        return VerifyResponse(matched=False, confidence=0.0, message=f"No face detected: {str(e)}")

    gallery = np.array(req.stored_embeddings, dtype=np.float32)
    distances = cosine_distance_batch(probe, gallery)
    min_distance = float(np.min(distances))
    confidence = float(max(0.0, 1.0 - min_distance))
    matched = min_distance < THRESHOLD

    logger.info(f"Verify: distance={min_distance:.4f}, matched={matched}")
    return VerifyResponse(matched=matched, confidence=round(confidence, 4),
                          message="Match found" if matched else "No match")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
