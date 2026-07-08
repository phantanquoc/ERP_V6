"""Face recognition API endpoints."""

import numpy as np
from fastapi import APIRouter, HTTPException

from config import (
    logger, MODEL_NAME, ENROLL_DETECTOR, VERIFY_DETECTOR, ENROLL_MIN_CONF,
    MATCH_MAX_DISTANCE, MATCH_MIN_SCORE, MATCH_MIN_MARGIN, TOP_K_MATCHES,
)
from face.models import (
    EnrollRequest, EnrollResponse,
    BatchVerifyRequest, BatchVerifyResponse, TopKMatch,
    VerifyRequest, VerifyResponse,
)
from face.helpers import (
    base64_to_image, get_embedding, cosine_distance_batch,
    top_k_vote, _required_votes,
    _detect_liveness_face, _frame_quality, compute_pose, pose_score,
)
from face.liveness import analyze_liveness_frames

router = APIRouter()

# Track model load state (set by app.py)
_models_loaded = False


def set_models_loaded(val: bool):
    global _models_loaded
    _models_loaded = val


@router.get("/health")
def health():
    return {"status": "OK", "model": MODEL_NAME, "models_loaded": _models_loaded, "liveness": "MiniFASNet"}


@router.post("/enroll", response_model=EnrollResponse)
def enroll(req: EnrollRequest):
    """Enroll: dùng retinaface (chính xác) + quality filter."""
    if not req.images:
        raise HTTPException(status_code=400, detail="No images provided")

    embeddings = []
    quality_scores = []
    yaws = []
    pitches = []
    skipped = []

    for i, img_b64 in enumerate(req.images):
        try:
            frame = base64_to_image(img_b64)
            emb, face_conf = get_embedding(frame, detector=ENROLL_DETECTOR)
            if face_conf < ENROLL_MIN_CONF:
                skipped.append(f"Ảnh {i+1}: chất lượng thấp ({face_conf:.2f} < {ENROLL_MIN_CONF})")
                logger.warning(f"Skipped image {i+1}: face_conf={face_conf:.2f}")
                continue

            # Compute quality (pose-aware) + pose angles
            quality = 0.0
            yaw, pitch = 0.0, 0.0
            try:
                face = _detect_liveness_face(frame)
                base_q, _ = _frame_quality(frame, face.bbox)
                # uniface RetinaFace exposes 5-point landmarks as `landmarks`
                # (uniface Face object không có `kps`, dùng `landmarks` là ndarray shape (5,2))
                kps = getattr(face, 'landmarks', None)
                if kps is None:
                    kps = getattr(face, 'kps', None)
                if kps is not None:
                    yaw, pitch = compute_pose(kps, face.bbox)
                p_score = pose_score(yaw, pitch)
                # pose-aware combined: 40% blur/brightness/area + 60% pose
                # pose weight cao vì ảnh nghiêng distort embedding mạnh dù độ nét OK
                quality = 0.40 * base_q + 0.60 * p_score
            except Exception as qexc:
                logger.warning(f"Quality/pose fallback for image {i+1}: {qexc}")

            embeddings.append(emb.tolist())
            quality_scores.append(round(float(quality), 4))
            yaws.append(round(float(yaw), 4))
            pitches.append(round(float(pitch), 4))
            logger.info(f"Enrolled image {i+1}/{len(req.images)}, conf={face_conf:.2f}, quality={quality:.3f}, yaw={yaw:.3f}, pitch={pitch:.3f}")
        except Exception as e:
            skipped.append(f"Ảnh {i+1}: {str(e)}")
            logger.warning(f"Failed to enroll image {i+1}: {e}")

    if not embeddings:
        raise HTTPException(status_code=422,
            detail=f"No quality faces detected. Issues: {skipped}")

    return EnrollResponse(
        success=True,
        embeddings=embeddings,
        quality_scores=quality_scores,
        pose_yaws=yaws,
        pose_pitches=pitches,
        count=len(embeddings),
        message=f"Enrolled {len(embeddings)}/{len(req.images)} images"
                + (f" — skipped {len(skipped)}" if skipped else ""),
        skipped=skipped,
    )


@router.post("/verify-batch", response_model=BatchVerifyResponse)
def verify_batch(req: BatchVerifyRequest):
    """Batch verify với top-K voting + anti-spoofing."""
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

    best_score = 0.0
    best_id = None
    best_votes = 0
    best_min_dist = float("inf")
    best_embedding_count = 0
    top_candidates = []

    for profile in req.profiles:
        if not profile.embeddings:
            continue
        gallery = np.array(profile.embeddings, dtype=np.float32)
        score, votes, min_dist, avg_vote_dist = top_k_vote(probe, gallery)
        confidence_for_profile = float(max(0.0, 1.0 - min_dist))
        required_votes = _required_votes(len(profile.embeddings))
        top_candidates.append({
            "profile_id": profile.profile_id,
            "confidence": round(confidence_for_profile, 4),
            "min_distance": round(min_dist, 4),
            "vote_count": int(votes),
            "score": round(float(score), 4),
        })

        min_score_gate = req.min_score if req.min_score is not None else MATCH_MIN_SCORE
        candidate_eligible = (
            votes >= required_votes and
            min_dist <= MATCH_MAX_DISTANCE and
            score >= min_score_gate
        )

        if candidate_eligible and (score > best_score or
           (score == best_score and min_dist < best_min_dist)):
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

    min_margin_gate = req.min_margin if req.min_margin is not None else MATCH_MIN_MARGIN
    if candidate_matched and margin < min_margin_gate:
        logger.info(
            "BatchVerify rejected by margin: profile=%s confidence=%.4f margin=%.4f required=%.4f",
            best_id, confidence, margin, min_margin_gate,
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


@router.post("/verify", response_model=VerifyResponse)
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
