import prisma from '@config/database';
import { env } from '@config/env';
import { NotFoundError, ValidationError } from '@utils/errors';
import { decryptText, encryptText } from '@utils/crypto';
import logger from '@config/logger';
import fs from 'fs';
import path from 'path';
import { EmployeeStatus } from '@prisma/client';
import attendanceService from './attendanceService';
import { getTodayInAppTz, nowInAppTz } from '@utils/dateUtils';
import { format } from 'date-fns';

const AI_URL = env.AI_SERVICE_URL;

// ─── Embedding Cache ─────────────────────────────────────────────────────────
// Caches ALL active embeddings in memory to avoid DB round-trip on every verify.
// Invalidated on enroll/delete. TTL: 5 minutes as safety net.

interface CachedProfile {
  id: string;
  employeeId: string;
  embeddings: number[][];  // pre-parsed, pre-normalized unit vectors
}

let embeddingCache: CachedProfile[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds (reduced from 5 min for faster cross-instance propagation)
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

// tx is the Prisma transaction client from verifyAndRecord — must be called inside the transaction
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

// ─── Late detection ───────────────────────────────────────────────────────────
const LATE_GRACE_MINUTES = 5; // cho phép trễ 5 phút trước khi tính muộn

/**
 * Tính số phút đi muộn so với ca làm gần nhất.
 * Trả về số phút dương nếu muộn, 0 nếu đúng giờ hoặc không tìm thấy ca.
 */
async function getLateMinutes(_checkInTime: Date): Promise<{ lateMinutes: number; shiftName: string | null }> {
  const shifts = await prisma.workShift.findMany({ where: { isActive: true } });
  if (shifts.length === 0) return { lateMinutes: 0, shiftName: null };

  const { hour, minute } = nowInAppTz();
  const nowMinutes = hour * 60 + minute;

  // Tìm ca phù hợp (giống logic determineShift)
  let bestShift: { name: string; startMinutes: number } | null = null;
  let bestDiff = Infinity;

  for (const shift of shifts) {
    const [sh, sm] = shift.startTime.split(':').map(Number);
    const [eh, em] = shift.endTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin   = eh * 60 + em;

    const inShift = endMin > startMin
      ? nowMinutes >= startMin && nowMinutes < endMin
      : nowMinutes >= startMin || nowMinutes < endMin;

    if (inShift) {
      const diff = (nowMinutes - startMin + 1440) % 1440;
      if (diff < bestDiff) { bestDiff = diff; bestShift = { name: shift.name, startMinutes: startMin }; }
    }
  }

  if (!bestShift) return { lateMinutes: 0, shiftName: null };

  const rawLate = (nowMinutes - bestShift.startMinutes + 1440) % 1440;
  const lateMinutes = rawLate > LATE_GRACE_MINUTES ? rawLate : 0;
  return { lateMinutes, shiftName: bestShift.name };
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

async function getEmbeddingCache(): Promise<CachedProfile[]> {
  if (embeddingCache && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return embeddingCache;
  }
  const profiles = await prisma.faceProfile.findMany({
    where: { isActive: true },
    include: {
      images: { select: { embedding: true } },
    },
  });
  embeddingCache = profiles
    .map(p => {
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
      return {
        id: p.id,
        employeeId: p.employeeId,
        embeddings: filteredEmbeddings,
      };
    })
    .filter(p => p.embeddings.length >= MIN_PROFILE_EMBEDDINGS);
  cacheTimestamp = Date.now();
  logger.info(`Embedding cache refreshed: ${embeddingCache.length} profiles`);
  return embeddingCache;
}

// ─── LISTEN/NOTIFY notifier ───────────────────────────────────────────────────
// Set by index.ts after the pg LISTEN client is created.
// Allows invalidateEmbeddingCache to broadcast to all backend instances.
let _pgNotify: (() => Promise<void>) | null = null;

export function setPgNotifier(fn: () => Promise<void>) {
  _pgNotify = fn;
}

export function invalidateEmbeddingCache() {
  embeddingCache = null;
  cacheTimestamp = 0;
  // Broadcast to all instances via Postgres NOTIFY (fire-and-forget)
  if (_pgNotify) {
    _pgNotify().catch(err => logger.warn('NOTIFY face_profile_changed failed:', err));
  }
}

/**
 * Reset only the local cache without re-broadcasting NOTIFY.
 * Called by the LISTEN handler in index.ts when a notification arrives from another instance.
 */
export function resetLocalEmbeddingCache() {
  embeddingCache = null;
  cacheTimestamp = 0;
}

// ─── AI Service Helpers ──────────────────────────────────────────────────────

async function callAiEnroll(images: string[]): Promise<number[][]> {
  const res = await fetch(`${AI_URL}/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new ValidationError(`AI service enroll failed: ${err}`);
  }
  const data = await res.json() as { embeddings: number[][] };
  return data.embeddings;
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
  frames: string[] = []
): Promise<AiBatchVerifyResult> {
  const res = await fetch(`${AI_URL}/verify-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageFaceCrop, frames, profiles, require_liveness: true }),
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
async function adaptiveEnroll(profileId: string, imageB64: string): Promise<void> {
  try {
    // Extract embedding mới từ AI service
    const newEmbeddings = await callAiEnroll([imageB64]);
    if (!newEmbeddings || newEmbeddings.length === 0) return;
    const newEmb = normalizeVec(newEmbeddings[0]);

    // Load embedding gallery hiện tại của profile
    const images = await prisma.faceImage.findMany({
      where: { faceProfileId: profileId },
      select: { embedding: true },
    });
    const gallery = images
      .map(img => img.embedding ? JSON.parse(decryptText(img.embedding)) as number[] : null)
      .filter((e): e is number[] => e !== null);

    if (gallery.length === 0) return;

    const filteredGallery = filterEmbeddingOutliers(gallery);
    if (filteredGallery.length === 0) return;

    // Tính centroid của gallery (L2-normalized vectors → centroid normalized lại)
    const centroid = normalizeVec(
      filteredGallery[0].map((_, i) =>
        filteredGallery.reduce((s, v) => s + v[i], 0) / filteredGallery.length
      )
    );

    const distToCentroid = cosineDistance(newEmb, centroid);
    if (distToCentroid < ADAPTIVE_MIN_DISTANCE) {
      logger.debug(`Adaptive enroll skipped for ${profileId}: too similar to centroid (d=${distToCentroid.toFixed(4)})`);
      return;
    }
    if (distToCentroid > ADAPTIVE_MAX_DISTANCE) {
      logger.debug(`Adaptive enroll skipped for ${profileId}: too different from gallery (d=${distToCentroid.toFixed(4)})`);
      return;
    }

    // Giới hạn số embedding
    if (gallery.length >= MAX_ADAPTIVE_EMBEDDINGS) {
      logger.debug(`Adaptive enroll skipped for ${profileId}: max embeddings reached (${gallery.length})`);
      return;
    }

    // Lưu embedding mới — imagePath để trống vì adaptive không lưu ảnh gốc
    await prisma.faceImage.create({
      data: {
        faceProfileId: profileId,
        imagePath: '',
        embedding: encryptText(JSON.stringify(newEmb)),
      },
    });

    logger.info(`Adaptive enrolled new embedding for profile ${profileId}: dist=${distToCentroid.toFixed(4)}, total=${gallery.length + 1}`);
    invalidateEmbeddingCache();
  } catch (err) {
    // Fire-and-forget — không ảnh hưởng gì nếu thất bại
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

  /** Enroll face cho nhân viên: nhận ảnh base64, gọi AI lấy embeddings, lưu DB + disk */
  async enrollFace(employeeId: string, images: string[]) {
    if (!images || images.length === 0) {
      throw new ValidationError('Cần ít nhất 1 ảnh để đăng ký khuôn mặt');
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundError('Nhân viên không tồn tại');

    // Gọi AI service lấy embeddings
    logger.info(`Enrolling face for employee ${employeeId}, ${images.length} images`);
    const rawEmbeddings = await callAiEnroll(images);
    const normalizedEmbeddings = rawEmbeddings.map(normalizeVec);
    const keepIndices = pairwiseCohesiveSubsetIndices(normalizedEmbeddings);
    const embeddings = keepIndices.map((index: number) => normalizedEmbeddings[index]);
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
    const created = await Promise.all(
      embeddings.map(async (emb, i) => {
        const filename = `face_${Date.now()}_${i}.jpg`;
        saveBase64Image(keptImages[i], uploadDir, filename);
        return prisma.faceImage.create({
          data: {
            faceProfileId: profile.id,
            imagePath: `faces/${employeeId}/${filename}`,
            embedding: encryptText(JSON.stringify(emb)),
          },
        });
      })
    );

    logger.info(`Enrolled ${created.length} face images for employee ${employeeId}`);
    invalidateEmbeddingCache();
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
    const rawEmbeddings = await callAiEnroll(images);
    const normalizedEmbeddings = rawEmbeddings.map(normalizeVec);
    const keepIndices = rawEmbeddings.length >= MIN_PROFILE_EMBEDDINGS
      ? pairwiseCohesiveSubsetIndices(normalizedEmbeddings)
      : normalizedEmbeddings.map((_, index: number) => index);
    const embeddings = keepIndices.map((index: number) => normalizedEmbeddings[index]);
    const keptImages = keepIndices.map((index: number) => images[index]);
    if (embeddings.length !== rawEmbeddings.length) {
      logger.warn(`Variation enrollment filtered outlier images for employee ${employeeId}: ${rawEmbeddings.length} -> ${embeddings.length}`);
    }

    const uploadDir = path.join(env.UPLOAD_DIR, 'faces', employeeId);
    const created = await Promise.all(
      embeddings.map(async (emb, i) => {
        const filename = `face_var_${Date.now()}_${i}.jpg`;
        saveBase64Image(keptImages[i], uploadDir, filename);
        return prisma.faceImage.create({
          data: {
            faceProfileId: profile.id,
            imagePath: `faces/${employeeId}/${filename}`,
            embedding: encryptText(JSON.stringify(emb)),
          },
        });
      })
    );

    const total = await prisma.faceImage.count({ where: { faceProfileId: profile.id } });
    logger.info(`Added ${created.length} variation images for employee ${employeeId}, total=${total}`);
    invalidateEmbeddingCache();
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
    invalidateEmbeddingCache();
    return result;
  }

  /** Xóa face profile */
  async deleteProfile(employeeId: string) {
    const profile = await prisma.faceProfile.findUnique({ where: { employeeId } });
    if (!profile) throw new NotFoundError('Face profile không tồn tại');
    await prisma.faceProfile.delete({ where: { id: profile.id } });
    invalidateEmbeddingCache();
  }

  /**
   * Verify khuôn mặt từ kiosk (optimized):
   * 1. Load embeddings từ cache (không query DB mỗi lần)
   * 2. Gọi AI service 1 lần duy nhất với TẤT CẢ profiles (batch)
   * 3. AI dùng vectorized cosine similarity với opencv detector (10x nhanh hơn retinaface)
   */
  async verifyAndRecord(imageB64: string, frames: string[] = [], deviceId?: string, ipAddress?: string) {
    const cachedProfiles = await getEmbeddingCache();

    if (cachedProfiles.length === 0) {
      return { matched: false, message: 'Chưa có nhân viên nào đăng ký khuôn mặt' };
    }

    // Single batch call: AI extracts probe embedding once, compares against all profiles
    const aiResult = await callAiBatchVerify(
      imageB64,
      cachedProfiles.map(p => ({ profile_id: p.id, embeddings: p.embeddings })),
      frames
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
      const todaysAttendances = await tx.attendance.findMany({
        where: { employeeId: employee.id, attendanceDate: today },
        orderBy: { createdAt: 'desc' },
        select: { id: true, checkInTime: true, checkOutTime: true },
      });
      const openAttendance = todaysAttendances.find(item => item.checkInTime && !item.checkOutTime) ?? null;

      let txAction: 'CHECK_IN' | 'CHECK_OUT' | 'ALREADY_RECORDED';
      let txAttendanceId: string | null = null;

      if (openAttendance) {
        const attendance = await attendanceService.checkOut(employee.id, new Date(), tx);
        txAction = 'CHECK_OUT';
        txAttendanceId = attendance.id;
      } else if (todaysAttendances.length === 0) {
        const attendance = await attendanceService.checkIn(employee.id, new Date(), tx);
        txAction = 'CHECK_IN';
        txAttendanceId = attendance.id;
      } else {
        txAction = 'ALREADY_RECORDED';
      }

      // Set cooldown inside the transaction so it is always consistent with the written record
      if (txAction === 'CHECK_IN' || txAction === 'CHECK_OUT') {
        await setCooldown(employee.id, tx);
      }

      return { txAction, txAttendanceId, todaysAttendances };
    });

    const { txAction, txAttendanceId, todaysAttendances } = txResult;

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

    // Tính đi muộn khi CHECK_IN
    let lateMinutes = 0;
    if (action === 'CHECK_IN') {
      const lateInfo = await getLateMinutes(new Date());
      lateMinutes = lateInfo.lateMinutes;
    }

    const baseMessage = action === 'CHECK_IN' ? 'Chấm công vào thành công' : 'Chấm công ra thành công';
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
      topK,
      message: lateMinutes > 0
        ? `${baseMessage} — Đi muộn ${lateMinutes} phút`
        : baseMessage,
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
        const dateFolder = format(getTodayInAppTz(), 'yyyyMMdd');
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
