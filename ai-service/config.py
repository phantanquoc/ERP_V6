"""Shared configuration — all constants and env vars for ai-service."""

import os
import logging
from pathlib import Path

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

# ─── Face Recognition Constants ──────────────────────────────────────────────
MODEL_NAME = "ArcFace"
ENROLL_DETECTOR = "retinaface"
VERIFY_DETECTOR = "yunet"
VERIFY_DETECTOR_FB = "ssd"
THRESHOLD = 0.50
MATCH_MAX_DISTANCE = 0.38
MATCH_MIN_SCORE = 0.58
MATCH_MIN_MARGIN = 0.050
MATCH_MIN_VOTE_RATIO = 0.30
ENROLL_MIN_CONF = 0.65
VOTE_WEIGHT_COUNT = 0.40
VOTE_WEIGHT_DIST = 0.60
TOP_K_MATCHES = 5

# Liveness
LIVENESS_MIN_VALID_FRAMES = 2
LIVENESS_PASS_RATIO = 0.65
LIVENESS_MIN_SCORE = 0.72
LIVENESS_FINAL_MIN_SCORE = 0.68
LIVENESS_MAX_FRAMES = 12
LIVENESS_MIN_BRIGHTNESS = 35.0
LIVENESS_MAX_BRIGHTNESS = 225.0
LIVENESS_MIN_BLUR = 12.0
FLAT_MOTION_MIN_SHIFT = 0.08
FLAT_MOTION_MAX_ALIGNED_DIFF = 0.018
LBP_SCREEN_THRESHOLD = 0.35
MAX_FACE_TILT_DEG = 20.0
MIN_EYE_SPAN_RATIO = 0.22


# ─── CORS ────────────────────────────────────────────────────────────────────
_cors_env = os.environ.get("CORS_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173")
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _cors_env.split(",") if o.strip()]

# ─── RAG Chatbot Constants ───────────────────────────────────────────────────
DOCS_DIR = Path("/app/docs/chatbot")
CHROMA_DIR = Path("/app/chroma_data")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "deepseek/deepseek-chat-v3-0324")
COMMON_FILE = "00-chung.md"
CONFIDENCE_THRESHOLD = 0.32

# Semantic cache
SEM_CACHE_THRESHOLD = 0.95
SEM_CACHE_MAX = 200
