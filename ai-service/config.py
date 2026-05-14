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
LIVENESS_MIN_VALID_FRAMES = 4
LIVENESS_PASS_RATIO = 0.65
LIVENESS_MIN_SCORE = 0.78
LIVENESS_FINAL_MIN_SCORE = 0.72
LIVENESS_MAX_FRAMES = 12
LIVENESS_MIN_BRIGHTNESS = 35.0
LIVENESS_MAX_BRIGHTNESS = 225.0
LIVENESS_MIN_BLUR = 18.0
FLAT_MOTION_MIN_SHIFT = 0.08
FLAT_MOTION_MAX_ALIGNED_DIFF = 0.018
LBP_SCREEN_THRESHOLD = 0.35
MAX_FACE_TILT_DEG = 20.0
MIN_EYE_SPAN_RATIO = 0.22


# ─── RAG Chatbot Constants ───────────────────────────────────────────────────
DOCS_DIR = Path("/app/docs/chatbot")
CHROMA_DIR = Path("/app/chroma_data")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_GRADER_MODEL = os.environ.get("GROQ_GRADER_MODEL", "llama-3.1-8b-instant")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
COMMON_FILE = "00-chung.md"
CONFIDENCE_THRESHOLD = 0.32

# Semantic cache
SEM_CACHE_THRESHOLD = 0.95
SEM_CACHE_MAX = 200
