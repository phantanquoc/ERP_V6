"""FastAPI application — init, CORS, startup, router registration."""

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import logger, MODEL_NAME, VERIFY_DETECTOR, VERIFY_DETECTOR_FB, ALLOWED_ORIGINS
from face.routes import router as face_router, set_models_loaded

app = FastAPI(title="AI Service — Face Recognition", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(face_router)


@app.on_event("startup")
async def warmup():
    """Pre-load ArcFace + detectors + anti-spoofing models."""
    try:
        import deepface.DeepFace as DeepFace
        from uniface import RetinaFace
        from uniface.spoofing import MiniFASNet
        from face.helpers import set_liveness_models

        logger.info("Warming up ArcFace + yunet/ssd detectors + MiniFASNet...")
        dummy = np.zeros((112, 112, 3), dtype=np.uint8)
        for det in [VERIFY_DETECTOR, VERIFY_DETECTOR_FB]:
            try:
                DeepFace.represent(dummy, model_name=MODEL_NAME, detector_backend=det,
                                   enforce_detection=False)
            except Exception:
                pass
        try:
            DeepFace.extract_faces(dummy, detector_backend="skip", anti_spoofing=True, enforce_detection=False)
        except Exception:
            pass

        liveness_detector = RetinaFace()
        liveness_spoofer = MiniFASNet()
        set_liveness_models(liveness_detector, liveness_spoofer)
        set_models_loaded(True)
        logger.info("Warmup complete")
    except Exception as e:
        logger.warning(f"Warmup failed (non-fatal): {e}")
