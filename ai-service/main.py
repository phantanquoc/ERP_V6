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

MODEL_NAME = "Facenet512"
DETECTOR = "retinaface"
DISTANCE_METRIC = "cosine"
# FaceNet512 + cosine: DeepFace recommended threshold is 0.40.
# Using 0.38 — robust enough for glasses/lighting variation, strict enough to avoid false matches.
THRESHOLD = 0.38


def preprocess_image(img: np.ndarray) -> np.ndarray:
    """Normalize brightness/contrast before embedding to handle lighting variation."""
    pil = Image.fromarray(img)
    # Auto-level: stretch histogram to [0,255] per channel
    import PIL.ImageOps
    pil = PIL.ImageOps.autocontrast(pil, cutoff=1)
    return np.array(pil)


def base64_to_image(b64: str) -> np.ndarray:
    """Decode base64 image string to numpy array."""
    if "," in b64:
        b64 = b64.split(",")[1]
    img_bytes = base64.b64decode(b64)
    img = Image.open(BytesIO(img_bytes)).convert("RGB")
    return np.array(img)


def get_embedding(img_array: np.ndarray) -> list[float]:
    """Extract face embedding from image array."""
    img_array = preprocess_image(img_array)
    result = DeepFace.represent(
        img_path=img_array,
        model_name=MODEL_NAME,
        detector_backend=DETECTOR,
        enforce_detection=True,
    )
    if not result:
        raise ValueError("No face detected in image")
    return result[0]["embedding"]


# ─── Request/Response Models ────────────────────────────────────────────────

class EnrollRequest(BaseModel):
    images: list[str]  # list of base64 encoded images


class EnrollResponse(BaseModel):
    success: bool
    embeddings: list[list[float]]
    count: int
    message: str


class VerifyRequest(BaseModel):
    image: str                          # base64 image from kiosk
    stored_embeddings: list[list[float]]  # embeddings from DB


class VerifyResponse(BaseModel):
    matched: bool
    confidence: float   # 1 - cosine_distance (higher = better match)
    message: str


# ─── Endpoints ────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "OK", "model": MODEL_NAME}


@app.post("/enroll", response_model=EnrollResponse)
def enroll(req: EnrollRequest):
    """
    Nhận danh sách ảnh base64, trả về embeddings.
    Backend gọi endpoint này khi admin enroll nhân viên.
    """
    if not req.images:
        raise HTTPException(status_code=400, detail="No images provided")

    embeddings = []
    errors = []

    for i, img_b64 in enumerate(req.images):
        try:
            img_array = base64_to_image(img_b64)
            emb = get_embedding(img_array)
            embeddings.append(emb)
            logger.info(f"Enrolled image {i+1}/{len(req.images)}")
        except Exception as e:
            errors.append(f"Image {i+1}: {str(e)}")
            logger.warning(f"Failed to enroll image {i+1}: {e}")

    if not embeddings:
        raise HTTPException(
            status_code=422,
            detail=f"No faces detected in any image. Errors: {errors}"
        )

    return EnrollResponse(
        success=True,
        embeddings=embeddings,
        count=len(embeddings),
        message=f"Enrolled {len(embeddings)}/{len(req.images)} images successfully"
        + (f". Skipped: {errors}" if errors else ""),
    )


@app.post("/verify", response_model=VerifyResponse)
def verify(req: VerifyRequest):
    """
    So khớp ảnh kiosk với danh sách embeddings đã lưu.
    Trả về matched=True nếu cosine distance < threshold.
    """
    if not req.stored_embeddings:
        return VerifyResponse(matched=False, confidence=0.0, message="No stored embeddings")

    try:
        img_array = base64_to_image(req.image)
        probe_emb = np.array(get_embedding(img_array))
    except Exception as e:
        logger.warning(f"Failed to extract embedding from probe image: {e}")
        return VerifyResponse(matched=False, confidence=0.0, message=f"No face detected: {str(e)}")

    # Find minimum cosine distance across all stored embeddings
    min_distance = float("inf")
    for stored in req.stored_embeddings:
        stored_arr = np.array(stored)
        # Cosine distance
        dot = np.dot(probe_emb, stored_arr)
        norm = np.linalg.norm(probe_emb) * np.linalg.norm(stored_arr)
        distance = 1 - (dot / norm if norm > 0 else 0)
        if distance < min_distance:
            min_distance = distance

    confidence = float(max(0.0, 1.0 - min_distance))
    matched = min_distance < THRESHOLD

    logger.info(f"Verify: distance={min_distance:.4f}, threshold={THRESHOLD}, matched={matched}")

    return VerifyResponse(
        matched=matched,
        confidence=round(confidence, 4),
        message="Match found" if matched else "No match",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
