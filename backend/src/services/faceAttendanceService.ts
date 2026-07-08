import prisma from '@config/database';
import { env } from '@config/env';
import { NotFoundError, ValidationError } from '@utils/errors';
import { decryptText, encryptText } from '@utils/crypto';
import logger from '@config/logger';
import fs from 'fs';
import path from 'path';
import { EmployeeStatus } from '@prisma/client';
import attendanceService from './attendanceService';
import workShiftService from './workShiftService';
import { getTodayInAppTz } from '@utils/dateUtils';
import { getCursorPaginationParams, encodeCursor } from '@utils/helpers';
import type { CursorPaginatedResponse } from '@types';

const AI_URL = env.AI_SERVICE_URL;

// ─── Embedding Cache ─────────────────────────────────────────────────────────
// Caches ALL active embeddings in memory to avoid DB round-trip on every verify.
// Invalidated on enroll/delete. TTL: 5 minutes as safety net.

interface CachedProfile {
  id: string;
  employeeId: string;
  embeddings: number[][];  // pre-parsed, pre-normalized unit vectors
}

// Per-profile cache: mỗi profile có TTL riêng, invalidate targeted không phải global
interface CachedProfileEntry {
  data: CachedProfile;
  expiresAt: number;
}
const profileCache = new Map<string, CachedProfileEntry>();
let profileListCache: { ids: string[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds per profile
const PROFILE_CLUSTER_DISTANCE = 0.48;
const MIN_PROFILE_EMBEDDINGS = 2;
const LOW_PROFILE_EMBEDDINGS_WARNING = 3;
const MAX_EXHAUSTIVE_CLUSTER_SIZE = 12;

// ─── Cooldown: chống quẹt liên tục ───────────────────────────────────────────
// Sau khi CHECK_IN / CHECK_OUT thành công, block cùng employeeId trong 10 phút.
// Dual-store: in-memory Map (fast path) + DB column lastFaceScanAt (cross-instance).
const COOLDOWN_MS = 10 * 60 * 1000; // 10 phút
const recentScans = new Map<string, number>(); // employeeId → timestamp lần quẹt cuối

async function isCoolingDown(employeeId: string): Promise<boolean> {
  // Fast path: check in-memory Map first (avoids DB round-trip on same instance)
  const last = recentScans.get(employeeId);
  if (last !== undefined) {
    return Date.now() - last < COOLDOWN_MS;
  }
  // Fallback: query DB for cross-instance cooldown check
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { lastFaceScanAt: true },
  });
  if (employee?.lastFaceScanAt) {
    const elapsed = Date.now() - employee.lastFaceScanAt.getTime();
    if (elapsed < COOLDOWN_MS) {
      // Populate Map so subsequent checks on this instance are fast
      recentScans.set(employeeId, employee.lastFaceScanAt.getTime());
      setTimeout(() => recentScans.delete(employeeId), COOLDOWN_MS - elapsed + 1000);
      return true;
    }
  }
  return false;
}

// tx is the Prisma transaction client — must be called inside the transaction
// so that lastFaceScanAt is written atomically with the attendance record.
async function setCooldown(employeeId: string, tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) {
  const now = Date.now();
  recentScans.set(employeeId, now);
  setTimeout(() => recentScans.delete(employeeId), COOLDOWN_MS + 1000);
  // Persist to DB inside the transaction for cross-instance visibility
  await tx.employee.update({
    where: { id: employeeId },
    data: { lastFaceScanAt: new Date(now) },
  });
}


// Tự động lưu embedding mới sau mỗi lần nhận diện thành công (giống Face ID).
const ADAPTIVE_MIN_CONFIDENCE  = 0.60;  // trigger khi nhận diện được (confidence ≥ 0.60)
const ADAPTIVE_MIN_DISTANCE    = 0.08;  // không lưu nếu quá giống embedding cũ (duplicate)
const ADAPTIVE_MAX_DISTANCE    = 0.42;  // không lưu nếu quá khác (uncertain)
const MAX_ADAPTIVE_EMBEDDINGS  = 20;
const ADAPTIVE_MIN_QUALITY     = 0.55;  // ảnh dưới ngưỡng này không đủ tốt cho adaptive
const ADAPTIVE_REPLACE_MARGIN  = 0.05;  // replace chỉ khi ảnh mới HƠN slot thấp nhất ≥ 0.05 (tránh flip-flop)
const ADAPTIVE_TTL_DAYS        = 180;   // slot > 6 tháng bắt buộc rotate — chống quality inflation deadlock
const ADAPTIVE_POISON_DISTANCE = 0.35;  // nếu newEmb gần profile khác < 0.35 → reject để chống cross-contamination
const ADAPTIVE_HOUR_COVERAGE_MAX = 0.40; // không cho > 40% gallery cùng bucket 6h → chống overfit theo giờ chấm phổ biến
const ADAPTIVE_HOUR_BUCKET_SIZE = 6;    // bucket 4 khoảng: 0-5, 6-11, 12-17, 18-23

// ─── Late detection ───────────────────────────────────────────────────────────
const LATE_GRACE_MINUTES = 5; // cho phép trễ 5 phút trước khi tính muộn

/**
 * Wrapper trên workShiftService.getLateMinutes để giữ shape { lateMinutes, shiftName }
 * và áp dụng grace period 5 phút.
 */
async function getLateMinutes(checkInTime: Date): Promise<{ lateMinutes: number; shiftName: string | null }> {
  const info = await workShiftService.getLateMinutes(checkInTime);
  if (!info) return { lateMinutes: 0, shiftName: null };
  const lateMinutes = info.lateMinutes > LATE_GRACE_MINUTES ? info.lateMinutes : 0;
  return { lateMinutes, shiftName: info.shiftName };
}

function normalizeVec(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return norm === 0 ? v : v.map(x => x / norm);
}

function cosineDistance(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) dot += a[i] * b[i];
  return 1 - dot;
}

function centerClusterIndices(embeddings: number[][], threshold = PROFILE_CLUSTER_DISTANCE): number[] {
  if (embeddings.length <= 2) return embeddings.map((_, index) => index);

  let best: number[] = [];
  for (let i = 0; i < embeddings.length; i += 1) {
    const cluster: number[] = [];
    for (let j = 0; j < embeddings.length; j += 1) {
      if (cosineDistance(embeddings[i], embeddings[j]) <= threshold) {
        cluster.push(j);
      }
    }
    if (cluster.length > best.length) best = cluster;
  }

  return best.length >= MIN_PROFILE_EMBEDDINGS ? best : embeddings.map((_, index) => index);
}

function isPairwiseCohesive(indices: number[], embeddings: number[][], threshold = PROFILE_CLUSTER_DISTANCE): boolean {
  for (let i = 0; i < indices.length; i += 1) {
    for (let j = i + 1; j < indices.length; j += 1) {
      if (cosineDistance(embeddings[indices[i]], embeddings[indices[j]]) > threshold) {
        return false;
      }
    }
  }
  return true;
}

function averageInternalDistance(indices: number[], embeddings: number[][]): number {
  let total = 0;
  let count = 0;
  for (let i = 0; i < indices.length; i += 1) {
    for (let j = i + 1; j < indices.length; j += 1) {
      total += cosineDistance(embeddings[indices[i]], embeddings[indices[j]]);
      count += 1;
    }
  }
  return count === 0 ? 0 : total / count;
}

function pairwiseCohesiveSubsetIndices(embeddings: number[][]): number[] {
  if (embeddings.length <= MIN_PROFILE_EMBEDDINGS) {
    return embeddings.map((_, index) => index);
  }

  // Exhaustive largest-clique search is cheap for normal enroll batches (6-12 images)
  // and avoids retaining bridge/outlier embeddings that are close to the center only.
  if (embeddings.length > MAX_EXHAUSTIVE_CLUSTER_SIZE) {
    return centerClusterIndices(embeddings);
  }

  let best: number[] = [];
  const totalMasks = 1 << embeddings.length;
  for (let mask = 1; mask < totalMasks; mask += 1) {
    const indices: number[] = [];
    for (let index = 0; index < embeddings.length; index += 1) {
      if (mask & (1 << index)) indices.push(index);
    }
    if (indices.length < MIN_PROFILE_EMBEDDINGS || !isPairwiseCohesive(indices, embeddings)) {
      continue;
    }
    if (
      indices.length > best.length ||
      (indices.length === best.length && averageInternalDistance(indices, embeddings) < averageInternalDistance(best, embeddings))
    ) {
      best = indices;
    }
  }

  return best.length >= MIN_PROFILE_EMBEDDINGS ? best : embeddings.map((_, index) => index);
}

function filterEmbeddingOutliers(embeddings: number[][]): number[][] {
  const normalized = embeddings.map(normalizeVec);
  const indices = pairwiseCohesiveSubsetIndices(normalized);
  return indices.map(index => normalized[index]);
}

function buildCachedProfile(p: {
  id: string;
  employeeId: string;
  images: { embedding: string | null }[];
}): CachedProfile | null {
  const parsedEmbeddings = p.images
    .map(img => img.embedding ? JSON.parse(decryptText(img.embedding)) as number[] : null)
    .filter((e): e is number[] => e !== null);
  const filteredEmbeddings = filterEmbeddingOutliers(parsedEmbeddings);
  if (parsedEmbeddings.length !== filteredEmbeddings.length) {
    logger.warn(
      `Filtered face embedding outliers for profile ${p.id}: ${parsedEmbeddings.length} -> ${filteredEmbeddings.length}`
    );
  }
  if (filteredEmbeddings.length <= LOW_PROFILE_EMBEDDINGS_WARNING) {
    logger.warn(`Face profile ${p.id} has only ${filteredEmbeddings.length} usable embeddings; re-enrollment recommended`);
  }
  if (filteredEmbeddings.length < MIN_PROFILE_EMBEDDINGS) return null;
  return { id: p.id, employeeId: p.employeeId, embeddings: filteredEmbeddings };
}

/**
 * Cache toàn bộ active profile với TTL PER-PROFILE.
 * Khi adaptiveEnroll invalidate 1 profile → chỉ profile đó reload, không kéo full DB.
 * profileListCache track danh sách active ids để phát hiện add/remove profile.
 */
async function getEmbeddingCache(): Promise<CachedProfile[]> {
  const now = Date.now();

  // Refresh profile list nếu hết TTL
  if (!profileListCache || now >= profileListCache.expiresAt) {
    const activeProfiles = await prisma.faceProfile.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    const activeIds = new Set(activeProfiles.map(p => p.id));
    profileListCache = { ids: [...activeIds], expiresAt: now + CACHE_TTL_MS };
    // Purge profile bị disable/xóa khỏi cache
    for (const cachedId of profileCache.keys()) {
      if (!activeIds.has(cachedId)) profileCache.delete(cachedId);
    }
  }

  // Find profile chưa cache hoặc expired
  const staleIds: string[] = [];
  for (const id of profileListCache.ids) {
    const entry = profileCache.get(id);
    if (!entry || now >= entry.expiresAt) staleIds.push(id);
  }

  if (staleIds.length > 0) {
    const refreshed = await prisma.faceProfile.findMany({
      where: { id: { in: staleIds }, isActive: true },
      include: { images: { select: { embedding: true } } },
    });
    for (const p of refreshed) {
      const built = buildCachedProfile(p);
      if (built) profileCache.set(p.id, { data: built, expiresAt: now + CACHE_TTL_MS });
      else profileCache.delete(p.id);
    }
    logger.info(`Embedding cache: refreshed ${refreshed.length}/${staleIds.length} stale profiles (${profileCache.size} total)`);
  }

  return Array.from(profileCache.values()).map(e => e.data);
}

// ─── LISTEN/NOTIFY notifier ───────────────────────────────────────────────────
// Set by index.ts after the pg LISTEN client is created.
// Allows invalidateEmbeddingCache to broadcast to all backend instances.
let _pgNotify: (() => Promise<void>) | null = null;

export function setPgNotifier(fn: () => Promise<void>) {
  _pgNotify = fn;
}

export function invalidateEmbeddingCache(profileId?: string) {
  if (profileId) {
    profileCache.delete(profileId);
  } else {
    profileCache.clear();
    profileListCache = null;
  }
  // Broadcast to all instances via Postgres NOTIFY (fire-and-forget)
  if (_pgNotify) {
    _pgNotify().catch(err => logger.warn('NOTIFY face_profile_changed failed:', err));
  }
}

/**
 * Reset local cache without re-broadcasting NOTIFY.
 * Called by LISTEN handler khi nhận notification từ instance khác.
 * Full reset vì không biết instance kia thay đổi profile nào.
 */
export function resetLocalEmbeddingCache() {
  profileCache.clear();
  profileListCache = null;
}

// ─── AI Service Helpers ──────────────────────────────────────────────────────

interface AiEnrollResult {
  embeddings: number[][];
  qualityScores: number[];
  poseYaws: number[];
  posePitches: number[];
}

async function callAiEnroll(images: string[]): Promise<AiEnrollResult> {
  const res = await fetch(`${AI_URL}/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new ValidationError(`AI service enroll failed: ${err}`);
  }
  const data = await res.json() as {
    embeddings: number[][];
    quality_scores?: number[];
    pose_yaws?: number[];
    pose_pitches?: number[];
  };
  return {
    embeddings: data.embeddings,
    qualityScores: data.quality_scores ?? [],
    poseYaws: data.pose_yaws ?? [],
    posePitches: data.pose_pitches ?? [],
  };
}

interface AiBatchVerifyResult {
  matched: boolean;
  profile_id: string | null;
  confidence: number;
  vote_count: number;
  liveness_passed: boolean;
  liveness_score: number;
  message: string;
  top_k_matches?: AiTopKMatch[];
}

interface AiTopKMatch {
  profile_id: string;
  confidence: number;
  min_distance: number;
  vote_count: number;
  score: number;
}

interface HydratedTopKMatch {
  rank: number;
  profileId: string;
  employeeId: string | null;
  employeeCode: string | null;
  fullName: string | null;
  position: string | null;
  department: string | null;
  confidence: number;
  minDistance: number;
  voteCount: number;
  score: number;
}

async function callAiBatchVerify(
  imageFaceCrop: string,
  profiles: Array<{ profile_id: string; embeddings: number[][] }>,
  frames: string[] = [],
  thresholds?: { min_score?: number; min_margin?: number }
): Promise<AiBatchVerifyResult> {
  const body: Record<string, unknown> = { image: imageFaceCrop, frames, profiles, require_liveness: true };
  if (thresholds?.min_score !== undefined) body.min_score = thresholds.min_score;
  if (thresholds?.min_margin !== undefined) body.min_margin = thresholds.min_margin;
  const res = await fetch(`${AI_URL}/verify-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI service verify failed: ${err}`);
  }
  return res.json() as Promise<AiBatchVerifyResult>;
}

/**
 * Adaptive enrollment — tự động lưu thêm embedding sau khi nhận diện thành công.
 * Chạy background (fire-and-forget), không block response chấm công.
 *
 * Logic:
 * 1. Gọi AI extract embedding từ ảnh vừa verify
 * 2. Tính khoảng cách đến centroid của gallery hiện tại
 * 3. Chỉ lưu nếu: confidence đủ cao && khoảng cách trong ngưỡng "hợp lý"
 *    (không quá gần — tránh duplicate, không quá xa — tránh poisoning)
 * 4. Cập nhật DB và invalidate cache
 */
// ─── Adaptive Enrollment ───────────────────────────────────────────────────
//
// Selection order khi chọn slot để replace (cap reached):
//   1. Slot cùng bucket 6h với ảnh mới NẾU bucket đó đã > ADAPTIVE_HOUR_COVERAGE_MAX
//      → chống overfit theo giờ chấm phổ biến
//   2. Slot có rotatedAt > ADAPTIVE_TTL_DAYS (stale, chống quality inflation deadlock)
//   3. Slot quality thấp nhất (base case)
//
// Guards:
//   - Quality gate: newQuality >= ADAPTIVE_MIN_QUALITY
//   - Distance: ADAPTIVE_MIN_DISTANCE < dist < ADAPTIVE_MAX_DISTANCE
//   - Cross-profile poison: newEmb không được gần profile khác < ADAPTIVE_POISON_DISTANCE
//   - Không đụng slot enrolled (imagePath không rỗng — admin đăng ký ban đầu)
//   - Replace margin: newQuality > oldQuality + ADAPTIVE_REPLACE_MARGIN (chống flip-flop)

interface GallerySlot {
  id: string;
  emb: number[];
  quality: number | null;
  isAdaptive: boolean;
  rotatedAt: Date;
  capturedHour: number | null;
}

function computeHourBucket(hour: number): number {
  return Math.floor(hour / ADAPTIVE_HOUR_BUCKET_SIZE);
}

async function logAdaptiveEvent(params: {
  profileId: string;
  eventType: 'inserted' | 'replaced' | 'rejected';
  reason?: string;
  newQuality?: number;
  replacedId?: string;
  replacedQuality?: number | null;
  distToCentroid?: number;
}) {
  try {
    await prisma.faceAdaptiveEvent.create({
      data: {
        faceProfileId: params.profileId,
        eventType: params.eventType,
        reason: params.reason,
        newQuality: params.newQuality,
        replacedId: params.replacedId,
        replacedQuality: params.replacedQuality,
        distToCentroid: params.distToCentroid,
      },
    });
  } catch (err) {
    logger.warn(`FaceAdaptiveEvent log failed for ${params.profileId}: ${err}`);
  }
}

/**
 * Cross-profile poison check: newEmb không được gần centroid của profile KHÁC.
 * Dùng cho case anh em ruột giống nhau hoặc detect nhầm mặt lẫn vào frame.
 */
function checkCrossProfilePoisoning(
  newEmb: number[],
  currentProfileId: string,
  allProfiles: CachedProfile[]
): { risk: boolean; nearestProfile?: string; distance?: number } {
  let nearestDist = Infinity;
  let nearestId: string | undefined;

  for (const p of allProfiles) {
    if (p.id === currentProfileId) continue;
    if (p.embeddings.length === 0) continue;

    // Centroid của profile khác
    const c = normalizeVec(
      p.embeddings[0].map((_, i) =>
        p.embeddings.reduce((s, v) => s + v[i], 0) / p.embeddings.length
      )
    );
    const d = cosineDistance(newEmb, c);
    if (d < nearestDist) { nearestDist = d; nearestId = p.id; }
  }

  return {
    risk: nearestDist < ADAPTIVE_POISON_DISTANCE,
    nearestProfile: nearestId,
    distance: nearestDist,
  };
}

/**
 * Chọn slot để replace theo priority order:
 *   1. Coverage-based: nếu bucket của ảnh mới đã > 40% → replace slot cũ CÙNG bucket
 *   2. TTL-based: slot rotatedAt > 6 tháng
 *   3. Quality-based: slot quality thấp nhất
 * Trả về null nếu không tìm được slot nào phù hợp để replace.
 */
function selectReplaceSlot(
  gallery: GallerySlot[],
  newQuality: number,
  newHourBucket: number | null
): { slot: GallerySlot; reason: string } | null {
  const adaptiveSlots = gallery.filter(g => g.isAdaptive);
  if (adaptiveSlots.length === 0) return null;

  const now = Date.now();
  const ttlThresholdMs = ADAPTIVE_TTL_DAYS * 24 * 60 * 60 * 1000;

  // Priority 1: Coverage guard
  if (newHourBucket !== null) {
    const bucketCounts = new Map<number, GallerySlot[]>();
    for (const g of gallery) {
      if (g.capturedHour === null) continue;
      const bucket = computeHourBucket(g.capturedHour);
      if (!bucketCounts.has(bucket)) bucketCounts.set(bucket, []);
      bucketCounts.get(bucket)!.push(g);
    }
    const sameBucketSlots = (bucketCounts.get(newHourBucket) ?? []).filter(g => g.isAdaptive);
    const bucketRatio = sameBucketSlots.length / gallery.length;
    if (bucketRatio >= ADAPTIVE_HOUR_COVERAGE_MAX && sameBucketSlots.length > 0) {
      const lowest = sameBucketSlots.reduce((min, g) => ((g.quality ?? 0) < (min.quality ?? 0) ? g : min));
      return { slot: lowest, reason: `hour_coverage: bucket=${newHourBucket} ratio=${bucketRatio.toFixed(2)}` };
    }
  }

  // Priority 2: TTL — slot cũ nhất nếu > TTL
  const staleSlots = adaptiveSlots.filter(g => now - g.rotatedAt.getTime() > ttlThresholdMs);
  if (staleSlots.length > 0) {
    const oldest = staleSlots.reduce((min, g) => (g.rotatedAt < min.rotatedAt ? g : min));
    const ageDays = ((now - oldest.rotatedAt.getTime()) / (24 * 60 * 60 * 1000)).toFixed(0);
    return { slot: oldest, reason: `ttl_expired: age=${ageDays}d` };
  }

  // Priority 3: Quality — slot thấp nhất, chỉ replace nếu new hơn đáng kể
  const lowest = adaptiveSlots.reduce((min, g) => ((g.quality ?? 0) < (min.quality ?? 0) ? g : min));
  const lowestQ = lowest.quality ?? 0;
  if (newQuality > lowestQ + ADAPTIVE_REPLACE_MARGIN) {
    return { slot: lowest, reason: `quality: ${lowestQ.toFixed(3)}→${newQuality.toFixed(3)}` };
  }

  return null;
}

async function adaptiveEnroll(profileId: string, imageB64: string): Promise<void> {
  try {
    // 1. Extract embedding + quality + pose
    const aiResult = await callAiEnroll([imageB64]);
    if (!aiResult.embeddings || aiResult.embeddings.length === 0) return;
    const newEmb = normalizeVec(aiResult.embeddings[0]);
    const newQuality = aiResult.qualityScores[0] ?? 0;
    const newYaw = aiResult.poseYaws[0] ?? null;
    const newPitch = aiResult.posePitches[0] ?? null;

    // 2. Quality gate
    if (newQuality < ADAPTIVE_MIN_QUALITY) {
      await logAdaptiveEvent({ profileId, eventType: 'rejected', reason: 'low_quality', newQuality });
      logger.debug(`Adaptive rejected ${profileId}: quality ${newQuality.toFixed(3)} < ${ADAPTIVE_MIN_QUALITY}`);
      return;
    }

    // 3. Load gallery
    const images = await prisma.faceImage.findMany({
      where: { faceProfileId: profileId },
      select: { id: true, embedding: true, qualityScore: true, imagePath: true, rotatedAt: true, capturedHour: true },
    });
    const gallery: GallerySlot[] = images
      .map(img => ({
        id: img.id,
        emb: img.embedding ? JSON.parse(decryptText(img.embedding)) as number[] : null,
        quality: img.qualityScore,
        isAdaptive: img.imagePath === '',
        rotatedAt: img.rotatedAt,
        capturedHour: img.capturedHour,
      }))
      .filter((s): s is GallerySlot => s.emb !== null);

    if (gallery.length === 0) return;

    // 4. Distance gate against own centroid
    const filteredGalleryEmbs = filterEmbeddingOutliers(gallery.map(g => g.emb));
    if (filteredGalleryEmbs.length === 0) return;
    const ownCentroid = normalizeVec(
      filteredGalleryEmbs[0].map((_, i) =>
        filteredGalleryEmbs.reduce((s, v) => s + v[i], 0) / filteredGalleryEmbs.length
      )
    );
    const distToCentroid = cosineDistance(newEmb, ownCentroid);

    if (distToCentroid < ADAPTIVE_MIN_DISTANCE) {
      await logAdaptiveEvent({ profileId, eventType: 'rejected', reason: 'too_similar', newQuality, distToCentroid });
      return;
    }
    if (distToCentroid > ADAPTIVE_MAX_DISTANCE) {
      await logAdaptiveEvent({ profileId, eventType: 'rejected', reason: 'too_different', newQuality, distToCentroid });
      return;
    }

    // 5. Cross-profile poison check
    const allProfiles = await getEmbeddingCache();
    const poisonCheck = checkCrossProfilePoisoning(newEmb, profileId, allProfiles);
    if (poisonCheck.risk) {
      await logAdaptiveEvent({
        profileId, eventType: 'rejected',
        reason: `poison_risk: near=${poisonCheck.nearestProfile} dist=${poisonCheck.distance?.toFixed(4)}`,
        newQuality, distToCentroid,
      });
      logger.warn(
        `Adaptive REJECTED ${profileId}: cross-profile risk — new emb gần profile ${poisonCheck.nearestProfile} ` +
        `(dist=${poisonCheck.distance?.toFixed(4)} < ${ADAPTIVE_POISON_DISTANCE})`
      );
      return;
    }

    const nowDate = new Date();
    const newHour = nowDate.getHours();
    const newHourBucket = computeHourBucket(newHour);

    // 6a. Chưa đạt cap → insert
    if (gallery.length < MAX_ADAPTIVE_EMBEDDINGS) {
      await prisma.faceImage.create({
        data: {
          faceProfileId: profileId,
          imagePath: '',
          embedding: encryptText(JSON.stringify(newEmb)),
          qualityScore: newQuality,
          poseYaw: newYaw,
          posePitch: newPitch,
          capturedHour: newHour,
          rotatedAt: nowDate,
        },
      });
      await logAdaptiveEvent({ profileId, eventType: 'inserted', reason: `total=${gallery.length + 1}`, newQuality, distToCentroid });
      logger.info(`Adaptive INSERTED ${profileId}: dist=${distToCentroid.toFixed(4)}, quality=${newQuality.toFixed(3)}, total=${gallery.length + 1}`);
      invalidateEmbeddingCache(profileId);
      return;
    }

    // 6b. Đạt cap → chọn slot replace theo priority
    const target = selectReplaceSlot(gallery, newQuality, newHourBucket);
    if (!target) {
      await logAdaptiveEvent({ profileId, eventType: 'rejected', reason: 'no_slot_worth_replacing', newQuality, distToCentroid });
      logger.debug(`Adaptive replace skipped ${profileId}: no slot worth replacing (quality=${newQuality.toFixed(3)})`);
      return;
    }

    // 7. Atomic replace
    await prisma.$transaction([
      prisma.faceImage.delete({ where: { id: target.slot.id } }),
      prisma.faceImage.create({
        data: {
          faceProfileId: profileId,
          imagePath: '',
          embedding: encryptText(JSON.stringify(newEmb)),
          qualityScore: newQuality,
          poseYaw: newYaw,
          posePitch: newPitch,
          capturedHour: newHour,
          rotatedAt: nowDate,
        },
      }),
    ]);

    await logAdaptiveEvent({
      profileId, eventType: 'replaced', reason: target.reason,
      newQuality, replacedId: target.slot.id, replacedQuality: target.slot.quality, distToCentroid,
    });
    logger.info(
      `Adaptive REPLACED ${profileId}: reason=[${target.reason}] ` +
      `slot=${target.slot.id.slice(-8)} q ${(target.slot.quality ?? 0).toFixed(3)}→${newQuality.toFixed(3)}, ` +
      `dist=${distToCentroid.toFixed(4)}`
    );
    invalidateEmbeddingCache(profileId);
  } catch (err) {
    logger.warn(`Adaptive enroll failed for profile ${profileId}: ${err}`);
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────
function saveBase64Image(b64: string, dir: string, filename: string): string {
  const data = b64.includes(',') ? b64.split(',')[1] : b64;
  const buffer = Buffer.from(data, 'base64');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class FaceAttendanceService {

  /** Lấy danh sách tất cả employees kèm trạng thái face profile */
  async listProfiles() {
    const employees = await prisma.employee.findMany({
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        faceProfile: { select: { id: true, isActive: true, enrolledAt: true, images: { select: { id: true } } } },
      },
      where: { status: EmployeeStatus.ACTIVE },
      orderBy: { employeeCode: 'asc' },
    });

    return employees.map(e => ({
      employeeId: e.id,
      employeeCode: e.employeeCode,
      fullName: `${e.user.lastName} ${e.user.firstName}`,
      email: e.user.email,
      faceProfile: e.faceProfile
        ? {
            id: e.faceProfile.id,
            isActive: e.faceProfile.isActive,
            enrolledAt: e.faceProfile.enrolledAt,
            imageCount: e.faceProfile.images.length,
          }
        : null,
    }));
  }

  /** Danh sách ảnh gốc đã enroll cho 1 employee — dùng cho admin gallery */
  async listProfileImages(employeeId: string) {
    const profile = await prisma.faceProfile.findUnique({
      where: { employeeId },
      select: {
        id: true,
        isActive: true,
        enrolledAt: true,
        employee: { include: { user: { select: { firstName: true, lastName: true } } } },
        images: {
          where: { imagePath: { not: '' } },
          select: { id: true, imagePath: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { images: true } },
      },
    });

    if (!profile) {
      throw new NotFoundError('Nhân viên chưa đăng ký khuôn mặt');
    }

    const totalCount = profile._count.images;
    const withFileCount = profile.images.length;

    return {
      employeeId,
      fullName: `${profile.employee.user.lastName} ${profile.employee.user.firstName}`,
      isActive: profile.isActive,
      enrolledAt: profile.enrolledAt,
      totalCount,
      missingFileCount: totalCount - withFileCount,
      images: profile.images.map(img => ({
        ...img,
        imagePath: img.imagePath.startsWith('/') ? img.imagePath : `/uploads/${img.imagePath}`,
      })),
    };
  }

  /** Gallery health stats: quality/age/hour distribution + last 30d adaptive events */
  async getProfileStats(employeeId: string) {
    const profile = await prisma.faceProfile.findUnique({
      where: { employeeId },
      select: {
        id: true,
        enrolledAt: true,
        employee: { include: { user: { select: { firstName: true, lastName: true } } } },
        images: {
          select: {
            id: true,
            imagePath: true,
            qualityScore: true,
            poseYaw: true,
            posePitch: true,
            capturedHour: true,
            rotatedAt: true,
            createdAt: true,
          },
          orderBy: { rotatedAt: 'desc' },
        },
      },
    });
    if (!profile) throw new NotFoundError('Nhân viên chưa đăng ký khuôn mặt');

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const enrolledCount = profile.images.filter(i => i.imagePath !== '').length;
    const adaptiveCount = profile.images.filter(i => i.imagePath === '').length;

    // Quality distribution buckets
    const qualityBuckets = { unknown: 0, low: 0, mid: 0, high: 0 }; // <0.5, 0.5-0.7, >0.7
    for (const img of profile.images) {
      if (img.qualityScore === null) qualityBuckets.unknown++;
      else if (img.qualityScore < 0.5) qualityBuckets.low++;
      else if (img.qualityScore < 0.7) qualityBuckets.mid++;
      else qualityBuckets.high++;
    }

    // Age distribution based on rotatedAt
    const ageBuckets = { fresh: 0, recent: 0, mid: 0, old: 0 }; // <7d, 7-30d, 30-90d, >90d
    for (const img of profile.images) {
      const ageDays = (now - img.rotatedAt.getTime()) / dayMs;
      if (ageDays < 7) ageBuckets.fresh++;
      else if (ageDays < 30) ageBuckets.recent++;
      else if (ageDays < 90) ageBuckets.mid++;
      else ageBuckets.old++;
    }

    // Hour bucket coverage (6h buckets)
    const hourCoverage: Record<string, number> = { '0-5': 0, '6-11': 0, '12-17': 0, '18-23': 0 };
    for (const img of profile.images) {
      if (img.capturedHour === null) continue;
      if (img.capturedHour < 6) hourCoverage['0-5']++;
      else if (img.capturedHour < 12) hourCoverage['6-11']++;
      else if (img.capturedHour < 18) hourCoverage['12-17']++;
      else hourCoverage['18-23']++;
    }

    // Adaptive events last 30 days
    const events30d = await prisma.faceAdaptiveEvent.findMany({
      where: { faceProfileId: profile.id, createdAt: { gte: new Date(now - 30 * dayMs) } },
      select: { eventType: true, reason: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const eventCounts: Record<string, number> = { inserted: 0, replaced: 0, rejected: 0 };
    for (const e of events30d) eventCounts[e.eventType] = (eventCounts[e.eventType] ?? 0) + 1;

    // Health flags — signal khi profile cần attention
    const flags: string[] = [];
    if (profile.images.length === 0) flags.push('empty');
    if (adaptiveCount >= MAX_ADAPTIVE_EMBEDDINGS && ageBuckets.old === profile.images.length) flags.push('quality_inflation_stale');
    if (qualityBuckets.unknown > profile.images.length / 2) flags.push('legacy_no_quality');
    const dominantBucketCount = Math.max(...Object.values(hourCoverage));
    if (dominantBucketCount / Math.max(1, profile.images.length) > 0.6) flags.push('hour_skew');
    if (eventCounts.rejected > eventCounts.inserted + eventCounts.replaced) flags.push('high_rejection_rate');

    return {
      employeeId,
      fullName: `${profile.employee.user.lastName} ${profile.employee.user.firstName}`,
      enrolledAt: profile.enrolledAt,
      totals: { total: profile.images.length, enrolled: enrolledCount, adaptive: adaptiveCount, cap: MAX_ADAPTIVE_EMBEDDINGS },
      qualityDistribution: qualityBuckets,
      ageDistribution: ageBuckets,
      hourCoverage,
      adaptiveEvents30d: eventCounts,
      flags,
      recentEvents: events30d.slice(0, 20),
    };
  }

  /** System-wide adaptive metrics — dùng cho dashboard admin */
  async getAdaptiveMetrics(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const events = await prisma.faceAdaptiveEvent.groupBy({
      by: ['eventType', 'reason'],
      where: { createdAt: { gte: since } },
      _count: true,
    });
    const totals: Record<string, number> = { inserted: 0, replaced: 0, rejected: 0 };
    const reasons: Record<string, number> = {};
    for (const e of events) {
      totals[e.eventType] = (totals[e.eventType] ?? 0) + e._count;
      const key = `${e.eventType}:${e.reason ?? 'none'}`;
      reasons[key] = (reasons[key] ?? 0) + e._count;
    }
    return { days, totals, reasons };
  }

  /** Enroll face cho nhân viên: nhận ảnh base64, gọi AI lấy embeddings, lưu DB + disk */
  async enrollFace(employeeId: string, images: string[]) {
    if (!images || images.length === 0) {
      throw new ValidationError('Cần ít nhất 1 ảnh để đăng ký khuôn mặt');
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundError('Nhân viên không tồn tại');

    // Gọi AI service lấy embeddings
    logger.info(`Enrolling face for employee ${employeeId}, ${images.length} images`);
    const aiResult = await callAiEnroll(images);
    const rawEmbeddings = aiResult.embeddings;
    const rawQualities = aiResult.qualityScores;
    const rawYaws = aiResult.poseYaws;
    const rawPitches = aiResult.posePitches;
    const normalizedEmbeddings = rawEmbeddings.map(normalizeVec);
    const keepIndices = pairwiseCohesiveSubsetIndices(normalizedEmbeddings);
    const embeddings = keepIndices.map((index: number) => normalizedEmbeddings[index]);
    const keptQualities = keepIndices.map((index: number) => rawQualities[index] ?? null);
    const keptYaws = keepIndices.map((index: number) => rawYaws[index] ?? null);
    const keptPitches = keepIndices.map((index: number) => rawPitches[index] ?? null);
    const keptImages = keepIndices.map((index: number) => images[index]);
    if (embeddings.length < MIN_PROFILE_EMBEDDINGS) {
      throw new ValidationError('Ảnh đăng ký khuôn mặt không nhất quán, vui lòng đăng ký lại với nhiều góc rõ mặt hơn');
    }
    if (embeddings.length !== rawEmbeddings.length) {
      logger.warn(`Enrollment filtered outlier images for employee ${employeeId}: ${rawEmbeddings.length} -> ${embeddings.length}`);
    }

    // Upsert FaceProfile
    const profile = await prisma.faceProfile.upsert({
      where: { employeeId },
      create: { employeeId, isActive: true },
      update: { isActive: true, updatedAt: new Date() },
    });

    // Xóa ảnh cũ và tạo ảnh mới
    await prisma.faceImage.deleteMany({ where: { faceProfileId: profile.id } });

    const uploadDir = path.join(env.UPLOAD_DIR, 'faces', employeeId);
    const enrollHour = new Date().getHours();
    const created = await Promise.all(
      embeddings.map(async (emb, i) => {
        const filename = `face_${Date.now()}_${i}.jpg`;
        saveBase64Image(keptImages[i], uploadDir, filename);
        return prisma.faceImage.create({
          data: {
            faceProfileId: profile.id,
            imagePath: `faces/${employeeId}/${filename}`,
            embedding: encryptText(JSON.stringify(emb)),
            qualityScore: keptQualities[i],
            poseYaw: keptYaws[i],
            posePitch: keptPitches[i],
            capturedHour: enrollHour,
          },
        });
      })
    );

    logger.info(`Enrolled ${created.length} face images for employee ${employeeId}`);
    invalidateEmbeddingCache(profile.id);
    return { profileId: profile.id, imageCount: created.length };
  }

  /** Thêm biến thể khuôn mặt (ví dụ: có kính) — KHÔNG xoá embeddings cũ */
  async enrollVariation(employeeId: string, images: string[]) {
    if (!images || images.length === 0) {
      throw new ValidationError('Cần ít nhất 1 ảnh để thêm biến thể');
    }

    const profile = await prisma.faceProfile.findUnique({ where: { employeeId } });
    if (!profile) throw new NotFoundError('Nhân viên chưa đăng ký khuôn mặt, hãy đăng ký lần đầu trước');

    logger.info(`Adding face variation for employee ${employeeId}, ${images.length} images`);
    const aiResult = await callAiEnroll(images);
    const rawEmbeddings = aiResult.embeddings;
    const rawQualities = aiResult.qualityScores;
    const rawYaws = aiResult.poseYaws;
    const rawPitches = aiResult.posePitches;
    const normalizedEmbeddings = rawEmbeddings.map(normalizeVec);
    const keepIndices = rawEmbeddings.length >= MIN_PROFILE_EMBEDDINGS
      ? pairwiseCohesiveSubsetIndices(normalizedEmbeddings)
      : normalizedEmbeddings.map((_, index: number) => index);
    const embeddings = keepIndices.map((index: number) => normalizedEmbeddings[index]);
    const keptQualities = keepIndices.map((index: number) => rawQualities[index] ?? null);
    const keptYaws = keepIndices.map((index: number) => rawYaws[index] ?? null);
    const keptPitches = keepIndices.map((index: number) => rawPitches[index] ?? null);
    const keptImages = keepIndices.map((index: number) => images[index]);
    if (embeddings.length !== rawEmbeddings.length) {
      logger.warn(`Variation enrollment filtered outlier images for employee ${employeeId}: ${rawEmbeddings.length} -> ${embeddings.length}`);
    }

    const uploadDir = path.join(env.UPLOAD_DIR, 'faces', employeeId);
    const varHour = new Date().getHours();
    const created = await Promise.all(
      embeddings.map(async (emb, i) => {
        const filename = `face_var_${Date.now()}_${i}.jpg`;
        saveBase64Image(keptImages[i], uploadDir, filename);
        return prisma.faceImage.create({
          data: {
            faceProfileId: profile.id,
            imagePath: `faces/${employeeId}/${filename}`,
            embedding: encryptText(JSON.stringify(emb)),
            qualityScore: keptQualities[i],
            poseYaw: keptYaws[i],
            posePitch: keptPitches[i],
            capturedHour: varHour,
          },
        });
      })
    );

    const total = await prisma.faceImage.count({ where: { faceProfileId: profile.id } });
    logger.info(`Added ${created.length} variation images for employee ${employeeId}, total=${total}`);
    invalidateEmbeddingCache(profile.id);
    return { profileId: profile.id, addedCount: created.length, totalCount: total };
  }

  /** Toggle active/inactive face profile */
  async toggleProfile(profileId: string) {
    const profile = await prisma.faceProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundError('Face profile không tồn tại');

    const result = await prisma.faceProfile.update({
      where: { id: profileId },
      data: { isActive: !profile.isActive },
    });
    invalidateEmbeddingCache(profileId);
    return result;
  }

  /** Xóa face profile */
  async deleteProfile(employeeId: string) {
    const profile = await prisma.faceProfile.findUnique({ where: { employeeId } });
    if (!profile) throw new NotFoundError('Face profile không tồn tại');
    await prisma.faceProfile.delete({ where: { id: profile.id } });
    invalidateEmbeddingCache(profile.id);
  }

  /**
   * Verify khuôn mặt từ kiosk (optimized):
   * 1. Load embeddings từ cache (không query DB mỗi lần)
   * 2. Gọi AI service 1 lần duy nhất với TẤT CẢ profiles (batch)
   * 3. AI dùng vectorized cosine similarity với opencv detector (10x nhanh hơn retinaface)
   */
  async verifyAndRecord(imageB64: string, frames: string[] = [], deviceId?: string, ipAddress?: string, mode?: 'strict' | 'relaxed') {
    // Capture ONCE at entry so downstream shift-detection & attendance rows
    // see the same instant. Avoids drift when AI + DB writes take a few seconds.
    const capturedAt = new Date();

    const cachedProfiles = await getEmbeddingCache();

    if (cachedProfiles.length === 0) {
      return { matched: false, message: 'Chưa có nhân viên nào đăng ký khuôn mặt' };
    }

    const thresholds = mode === 'relaxed'
      ? { min_score: 0.52, min_margin: 0.04 }
      : undefined;

    // Single batch call: AI extracts probe embedding once, compares against all profiles
    const aiResult = await callAiBatchVerify(
      imageB64,
      cachedProfiles.map(p => ({ profile_id: p.id, embeddings: p.embeddings })),
      frames,
      thresholds
    );

    const topK = await this.hydrateTopK(aiResult.top_k_matches ?? [], cachedProfiles);
    const matchedCached = aiResult.matched && aiResult.profile_id
      ? cachedProfiles.find(p => p.id === aiResult.profile_id) ?? null
      : null;
    const bestConfidence = aiResult.confidence;
    const snapshotOwnerId = matchedCached?.employeeId ?? undefined;
    const snapshotPath = this.saveSnapshot(imageB64, snapshotOwnerId);

    if (!aiResult.liveness_passed) {
      await prisma.faceAttendanceLog.create({
        data: {
          action: 'LIVENESS_FAILED',
          confidence: bestConfidence,
          snapshotPath,
          deviceId,
          ipAddress,
        },
      });
      logger.warn(
        `Face liveness failed: score=${aiResult.liveness_score}, message=${aiResult.message}, device=${deviceId || 'unknown'}`
      );
      return {
        matched: false,
        action: 'NO_MATCH',
        confidence: bestConfidence,
        livenessPassed: false,
        livenessScore: aiResult.liveness_score,
        topK,
        message: aiResult.message || 'Không xác minh được người thật',
      };
    }

    if (!matchedCached) {
      await prisma.faceAttendanceLog.create({
        data: { action: 'UNRECOGNIZED', confidence: bestConfidence, snapshotPath, deviceId, ipAddress },
      });
      return {
        matched: false,
        action: 'NO_MATCH',
        confidence: bestConfidence,
        livenessPassed: true,
        livenessScore: aiResult.liveness_score,
        topK,
        message: 'Không nhận diện được khuôn mặt',
      };
    }

    // Load employee data (not in cache to keep cache lean)
    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id: matchedCached.employeeId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        subDepartment: { select: { name: true } },
      },
    });

    // Cooldown: chặn quẹt liên tục trong 10 phút
    if (await isCoolingDown(employee.id)) {
      logger.info(`Cooldown active for employee ${employee.id}, skipping scan`);
      return {
        matched: true,
        action: 'COOLDOWN',
        employee: {
          id: employee.id,
          fullName: `${employee.user.lastName} ${employee.user.firstName}`,
          employeeCode: employee.employeeCode,
          department: employee.subDepartment?.name ?? null,
        },
        confidence: bestConfidence,
        livenessPassed: true,
        livenessScore: aiResult.liveness_score,
        topK,
        message: 'Vui lòng chờ 10 phút trước khi quẹt lại',
      };
    }

    // Wrap read-decide-write in a transaction with a per-employee advisory lock
    // to prevent duplicate CHECK_IN/CHECK_OUT from concurrent kiosk scans.
    let action: 'CHECK_IN' | 'CHECK_OUT';
    let attendanceId: string;

    const txResult = await prisma.$transaction(async (tx) => {
      // Acquire per-employee advisory lock — serializes concurrent verifications for same employee
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${employee.id}))`;

      const today = getTodayInAppTz();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      // Include yesterday to properly handle:
      //   1. Ca 3 (cross-midnight): worker scans out next morning — legitimate CHECK_OUT.
      //   2. Forgot-to-check-out: yesterday's record left open — mark it as forgotten,
      //      then create today's CHECK_IN so the current scan is not lost.
      // Only consider regular attendance (isOvertime=false) — overtime records must
      // not block a regular shift check-in on the same day.
      const recentAttendances = await tx.attendance.findMany({
        where: {
          employeeId: employee.id,
          attendanceDate: { in: [today, yesterday] },
          isOvertime: false,
        },
        orderBy: [{ attendanceDate: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, attendanceDate: true, checkInTime: true, checkOutTime: true },
      });

      const todaysAttendances = recentAttendances.filter(
        r => r.attendanceDate.getTime() === today.getTime()
      );
      const yesterdaysAttendances = recentAttendances.filter(
        r => r.attendanceDate.getTime() === yesterday.getTime()
      );

      const openToday = todaysAttendances.find(item => item.checkInTime && !item.checkOutTime) ?? null;
      const openYesterday = yesterdaysAttendances.find(item => item.checkInTime && !item.checkOutTime) ?? null;

      let txAction: 'CHECK_IN' | 'CHECK_OUT' | 'ALREADY_RECORDED';
      let txAttendanceId: string | null = null;
      let txForgotten = false;

      if (openToday) {
        // Ca hôm nay đang mở → chấm ra bình thường
        const attendance = await attendanceService.checkOut(employee.id, capturedAt, tx);
        txAction = 'CHECK_OUT';
        txAttendanceId = attendance.id;
      } else if (openYesterday && openYesterday.checkInTime) {
        // Có ca hôm qua đang mở — phân biệt "Ca 3 đóng hợp lệ" vs "Quên chấm ra"
        const yesterdayCheckIn = openYesterday.checkInTime;
        const isCrossMidnight = await workShiftService.isCrossMidnightShiftAt(yesterdayCheckIn);
        const deltaHours = (capturedAt.getTime() - yesterdayCheckIn.getTime()) / (1000 * 60 * 60);
        // Ca 3 tiêu chuẩn ~8h; nới ra [4, 14] để bao gồm tăng giờ / trễ về sớm.
        const legitCa3Close = isCrossMidnight && deltaHours >= 4 && deltaHours <= 14;

        if (legitCa3Close) {
          const attendance = await attendanceService.checkOut(employee.id, capturedAt, tx);
          txAction = 'CHECK_OUT';
          txAttendanceId = attendance.id;
        } else {
          // Quên chấm ra hôm qua → đánh dấu record cũ, tạo CHECK_IN mới cho hôm nay
          await attendanceService.markForgotten(openYesterday.id, tx);
          const attendance = await attendanceService.checkIn(employee.id, capturedAt, tx);
          txAction = 'CHECK_IN';
          txAttendanceId = attendance.id;
          txForgotten = true;
        }
      } else if (todaysAttendances.length === 0) {
        const attendance = await attendanceService.checkIn(employee.id, capturedAt, tx);
        txAction = 'CHECK_IN';
        txAttendanceId = attendance.id;
      } else {
        txAction = 'ALREADY_RECORDED';
      }

      // Set cooldown inside the transaction so it is always consistent with the written record
      if (txAction === 'CHECK_IN' || txAction === 'CHECK_OUT') {
        await setCooldown(employee.id, tx);
      }

      return { txAction, txAttendanceId, todaysAttendances, txForgotten };
    });

    const { txAction, txAttendanceId, todaysAttendances, txForgotten } = txResult;

    if (txAction === 'ALREADY_RECORDED') {
      await prisma.faceAttendanceLog.create({
        data: {
          faceProfileId: matchedCached.id,
          employeeId: employee.id,
          action: 'ALREADY_RECORDED',
          confidence: bestConfidence,
          snapshotPath,
          deviceId,
          ipAddress,
          attendanceId: todaysAttendances[0]?.id,
        },
      });
      // Vẫn học thêm embedding dù đã chấm công — cơ hội tốt để adaptive
      if (bestConfidence >= ADAPTIVE_MIN_CONFIDENCE) {
        adaptiveEnroll(matchedCached.id, imageB64).catch(() => {});
      }
      return {
        matched: true,
        action: 'ALREADY_RECORDED',
        employee: {
          id: employee.id,
          fullName: `${employee.user.lastName} ${employee.user.firstName}`,
          employeeCode: employee.employeeCode,
          department: employee.subDepartment?.name ?? null,
        },
        confidence: bestConfidence,
        livenessPassed: true,
        livenessScore: aiResult.liveness_score,
        topK,
        message: 'Hôm nay bạn đã chấm công đầy đủ rồi',
      };
    }

    action = txAction;
    attendanceId = txAttendanceId!;

    await prisma.faceAttendanceLog.create({
      data: { faceProfileId: matchedCached.id, employeeId: employee.id, action, confidence: bestConfidence, snapshotPath, deviceId, ipAddress, attendanceId },
    });

    // Adaptive enrollment
    if (bestConfidence >= ADAPTIVE_MIN_CONFIDENCE) {
      adaptiveEnroll(matchedCached.id, imageB64).catch(() => {});
    }

    // Tính đi muộn khi CHECK_IN — dùng capturedAt để trùng với row đã ghi
    let lateMinutes = 0;
    if (action === 'CHECK_IN') {
      const lateInfo = await getLateMinutes(capturedAt);
      lateMinutes = lateInfo.lateMinutes;
    }

    const baseMessage = action === 'CHECK_IN' ? 'Chấm công vào thành công' : 'Chấm công ra thành công';
    const forgottenSuffix = txForgotten ? ' — Đã đánh dấu ca hôm qua "quên chấm ra"' : '';
    return {
      matched: true,
      action,
      employee: {
        id: employee.id,
        fullName: `${employee.user.lastName} ${employee.user.firstName}`,
        employeeCode: employee.employeeCode,
        department: employee.subDepartment?.name ?? null,
      },
      confidence: bestConfidence,
      livenessPassed: true,
      livenessScore: aiResult.liveness_score,
      lateMinutes,
      forgottenPreviousShift: txForgotten,
      topK,
      message: lateMinutes > 0
        ? `${baseMessage} — Đi muộn ${lateMinutes} phút${forgottenSuffix}`
        : `${baseMessage}${forgottenSuffix}`,
    };
  }

  /** Validate device API key */
  async validateDevice(apiKey: string) {
    const device = await prisma.attendanceDevice.findUnique({ where: { apiKey } });
    return device?.isActive ? device : null;
  }

  /** Lấy danh sách logs */
  async getLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      prisma.faceAttendanceLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          faceProfile: {
            include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } },
          },
        },
      }),
      prisma.faceAttendanceLog.count(),
    ]);
    return { logs, total, page, limit };
  }

  async getLogsCursor(cursor?: string, limit?: number): Promise<CursorPaginatedResponse<any>> {
    const { cursorPayload, take } = getCursorPaginationParams(cursor, limit ?? 50);

    const where: any = {};

    if (cursorPayload) {
      where.OR = [
        { createdAt: { lt: new Date(cursorPayload.createdAt) } },
        { createdAt: new Date(cursorPayload.createdAt), id: { lt: cursorPayload.id } },
      ];
    }

    const rows = await prisma.faceAttendanceLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      include: {
        faceProfile: {
          include: { employee: { include: { user: { select: { firstName: true, lastName: true } } } } },
        },
      },
    });

    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;
    const last = data[data.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

    return { data, nextCursor, hasMore };
  }

  // ─── Device Management ──────────────────────────────────────────────────

  async listDevices() {
    return prisma.attendanceDevice.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createDevice(name: string, location?: string) {
    return prisma.attendanceDevice.create({ data: { name, location } });
  }

  async toggleDevice(deviceId: string) {
    const device = await prisma.attendanceDevice.findUnique({ where: { id: deviceId } });
    if (!device) throw new NotFoundError('Thiết bị không tồn tại');
    return prisma.attendanceDevice.update({ where: { id: deviceId }, data: { isActive: !device.isActive } });
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private saveSnapshot(imageB64: string, employeeId?: string): string {
    try {
      let dir: string;
      if (employeeId) {
        dir = path.join(env.UPLOAD_DIR, 'snapshots', employeeId);
        const filename = `snapshot_${Date.now()}.jpg`;
        saveBase64Image(imageB64, dir, filename);
        return `snapshots/${employeeId}/${filename}`;
      } else {
        // Unrecognized face: store under snapshots/unknown/YYYYMMDD/
        const today = getTodayInAppTz();
        const dateFolder = today.toISOString().slice(0, 10).replace(/-/g, '');
        dir = path.join(env.UPLOAD_DIR, 'snapshots', 'unknown', dateFolder);
        const filename = `snapshot_${Date.now()}.jpg`;
        saveBase64Image(imageB64, dir, filename);
        return `snapshots/unknown/${dateFolder}/${filename}`;
      }
    } catch {
      return '';
    }
  }

  private async hydrateTopK(aiTopK: AiTopKMatch[], cachedProfiles: CachedProfile[]): Promise<HydratedTopKMatch[]> {
    if (aiTopK.length === 0) return [];

    const profileToEmployee = new Map(cachedProfiles.map(profile => [profile.id, profile.employeeId]));
    const employeeIds = aiTopK
      .map(item => profileToEmployee.get(item.profile_id))
      .filter((employeeId): employeeId is string => Boolean(employeeId));

    const employees = employeeIds.length > 0
      ? await prisma.employee.findMany({
          where: { id: { in: employeeIds } },
          include: {
            user: { select: { firstName: true, lastName: true } },
            position: { select: { name: true } },
            subDepartment: { select: { name: true } },
          },
        })
      : [];

    const employeeById = new Map(employees.map(employee => [employee.id, employee]));

    return aiTopK.map((item, index) => {
      const employeeId = profileToEmployee.get(item.profile_id) ?? null;
      const employee = employeeId ? employeeById.get(employeeId) : null;
      return {
        rank: index + 1,
        profileId: item.profile_id,
        employeeId,
        employeeCode: employee?.employeeCode ?? null,
        fullName: employee ? `${employee.user.lastName} ${employee.user.firstName}` : null,
        position: employee?.position?.name ?? null,
        department: employee?.subDepartment?.name ?? null,
        confidence: item.confidence,
        minDistance: item.min_distance,
        voteCount: item.vote_count,
        score: item.score,
      };
    });
  }
}

export default new FaceAttendanceService();
