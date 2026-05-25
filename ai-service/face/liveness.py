"""Anti-spoofing / liveness detection logic."""

import numpy as np
import cv2
from typing import Any
import deepface.DeepFace as DeepFace

from config import (
    logger, VERIFY_DETECTOR,
    LIVENESS_MIN_VALID_FRAMES, LIVENESS_PASS_RATIO, LIVENESS_MIN_SCORE,
    LIVENESS_FINAL_MIN_SCORE, LIVENESS_MAX_FRAMES,
    LIVENESS_MIN_BRIGHTNESS, LIVENESS_MAX_BRIGHTNESS, LIVENESS_MIN_BLUR,
    FLAT_MOTION_MIN_SHIFT, FLAT_MOTION_MAX_ALIGNED_DIFF,
    LBP_SCREEN_THRESHOLD,
)
from face.helpers import (
    base64_to_image, _detect_liveness_face, _parse_spoof_result,
    _clamp01, _frame_quality, _crop_aligned_face, _lbp_texture_score,
)
import face.helpers as _face_helpers


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
    """Main liveness analysis: multi-frame anti-spoofing pipeline."""
    if not frames:
        return False, 0.0, "No frames provided"

    frames = frames[:LIVENESS_MAX_FRAMES]

    valid_scores: list[float] = []
    real_scores: list[float] = []
    quality_scores: list[float] = []
    lbp_scores: list[float] = []
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

            try:
                face_objs = DeepFace.extract_faces(
                    img_path=frame,
                    detector_backend=VERIFY_DETECTOR,
                    enforce_detection=True,
                    anti_spoofing=True,
                )
                if not face_objs:
                    reject_reasons["detect_fail"] += 1
                    continue
                face_obj = face_objs[0]
                is_real = face_obj.get("is_real", False)
                antispoof_score = face_obj.get("antispoof_score", 0.0)
            except Exception:
                face_obj = None
                is_real = False
                antispoof_score = 0.0

            face = _detect_liveness_face(frame)
            bbox = face.bbox

            quality, q_msg = _frame_quality(frame, bbox)
            if quality <= 0.0:
                logger.debug("Frame %d skipped: %s", idx + 1, q_msg)
                reason_code = q_msg.split(":")[0]
                if reason_code in reject_reasons:
                    reject_reasons[reason_code] += 1
                else:
                    reject_reasons["other"] += 1
                continue

            # MiniFASNet spoofing check
            spoofer = _face_helpers._liveness_spoofer
            if spoofer is not None:
                spoof_result = spoofer.predict(frame, bbox)
                mini_real, mini_score = _parse_spoof_result(spoof_result)
            else:
                mini_real, mini_score = is_real, antispoof_score

            # Combine DeepFace + MiniFASNet scores
            combined_score = 0.5 * antispoof_score + 0.5 * mini_score if face_obj else mini_score
            valid_scores.append(combined_score)
            if mini_real and (face_obj is None or is_real):
                real_scores.append(combined_score)

            quality_scores.append(quality)
            lbp_scores.append(_lbp_texture_score(frame, bbox))

            crop = _crop_aligned_face(frame, bbox)
            temporal_samples.append({"bbox": bbox, "crop": crop})

        except Exception as exc:
            exc_str = str(exc)
            if "No face detected" in exc_str:
                reject_reasons["detect_fail"] += 1
            elif "Multiple faces detected" in exc_str:
                reject_reasons["multi_face"] += 1
            else:
                reject_reasons["other"] += 1
            logger.warning("Liveness frame %s failed: reason=%s exc=%s", idx + 1, "detect_fail" if "No face" in exc_str else "other", exc)

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
