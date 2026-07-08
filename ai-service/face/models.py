"""Pydantic models for face recognition endpoints."""

from typing import Optional
from pydantic import BaseModel


class EnrollRequest(BaseModel):
    images: list[str]


class EnrollResponse(BaseModel):
    success: bool
    embeddings: list[list[float]]
    quality_scores: list[float] = []  # 0-1 pose-aware combined score
    pose_yaws: list[float] = []       # radians per embedding
    pose_pitches: list[float] = []    # radians per embedding
    count: int
    message: str
    skipped: list[str]


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
    min_score: Optional[float] = None
    min_margin: Optional[float] = None


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
